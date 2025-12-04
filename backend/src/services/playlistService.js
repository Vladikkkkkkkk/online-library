const { prisma } = require('../config/database');
const ApiError = require('../utils/ApiError');
const { paginate, paginationResponse } = require('../utils/helpers');
const openLibraryService = require('./openLibraryService');
const bookService = require('./bookService');
const cache = require('../utils/cache');
const axios = require('axios');
const config = require('../config');


class PlaylistService {

  async getUserPlaylists(userId, params = {}) {
    const { page = 1, limit = 10, includePublic = false } = params;
    const { skip, take } = paginate(page, limit);

    const where = { userId };
    if (includePublic) {

      delete where.userId;
      where.OR = [
        { userId },
        { isPublic: true },
      ];
    }

    const [playlists, total] = await Promise.all([
      prisma.playlist.findMany({
        where,
        skip,
        take,
        include: {
          books: {
            orderBy: { order: 'asc' },
            take: 1, 
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.playlist.count({ where }),
    ]);


    const playlistsWithCounts = await Promise.all(
      playlists.map(async (playlist) => {
        const bookCount = await prisma.playlistBook.count({
          where: { playlistId: playlist.id },
        });

        return {
          id: playlist.id,
          name: playlist.name,
          description: playlist.description,
          isPublic: playlist.isPublic,
          bookCount,
          createdAt: playlist.createdAt,
          updatedAt: playlist.updatedAt,
          user: playlist.user,
        };
      })
    );

    return paginationResponse(playlistsWithCounts, total, page, limit);
  }


  async getPlaylistById(playlistId, userId = null, params = {}) {
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    if (!playlist) {
      throw ApiError.notFound('Playlist not found');
    }


    if (userId && playlist.userId !== userId && !playlist.isPublic) {
      throw ApiError.forbidden('You do not have access to this playlist');
    }


    const totalBooks = await prisma.playlistBook.count({
      where: { playlistId },
    });


    const { page = 1, limit = 10 } = params;
    const { skip, take } = paginate(page, limit);

    const playlistBooks = await prisma.playlistBook.findMany({
      where: { playlistId },
      orderBy: { order: 'asc' },
      skip,
      take,
    });


    const bookIds = playlistBooks.map(pb => pb.openLibraryId);


    const cachedBooksMap = {};
    const uncachedBookIds = [];

    for (const bookId of bookIds) {
      const bookCacheKey = `book:${bookId}`;
      const cachedBook = await cache.get(bookCacheKey);
      if (cachedBook) {
        cachedBooksMap[bookId] = cachedBook;
      } else {
        uncachedBookIds.push(bookId);
      }
    }


    const fetchedBooksMap = {};
    if (uncachedBookIds.length > 0) {
      try {

        const keys = uncachedBookIds.map(id => `key:/works/${id}`).join(' OR ');
        const batchResponse = await axios.get(
          `${config.openLibrary.baseUrl}/search.json?q=(${keys})&fields=key,title,author_name,first_publish_year,isbn,cover_i,subject,language,number_of_pages_median,publisher,has_fulltext,ia,ratings_count,ratings_average&limit=${uncachedBookIds.length}`,
          { timeout: 10000 } 
        );

        if (batchResponse.data.docs) {

          for (const doc of batchResponse.data.docs) {
            const id = doc.key?.replace('/works/', '');
            if (id && uncachedBookIds.includes(id)) {

              let coverUrl = null;
              if (doc.cover_i) {
                coverUrl = `${config.openLibrary.coversUrl}/b/id/${doc.cover_i}-M.jpg`;
              } else if (doc.isbn && doc.isbn[0]) {

                coverUrl = `${config.openLibrary.coversUrl}/b/isbn/${doc.isbn[0]}-M.jpg`;
              }

              fetchedBooksMap[id] = {
                id,
                title: doc.title || 'Unknown Title',
                authors: doc.author_name?.map(name => ({ name })) || [],
                coverUrl,
                coverId: doc.cover_i || null,
                isbn: doc.isbn?.[0] || null,
                publishYear: doc.first_publish_year || null,
                subjects: doc.subject?.slice(0, 5) || [],
                openLibraryRating: doc.ratings_average ? Number(doc.ratings_average) : null,
                openLibraryRatingCount: doc.ratings_count || 0,

              };


              await cache.set(`book:${id}`, fetchedBooksMap[id], 1800); 
            }
          }
        }
      } catch (batchError) {
        console.error('Batch fetch error in playlists:', batchError.message);
      }
    }


    const booksNeedingFullDetails = playlistBooks
      .map((pb, index) => ({ pb, index }))
      .filter(({ pb }) => {
        const bookId = pb.openLibraryId;
        const bookData = cachedBooksMap[bookId] || fetchedBooksMap[bookId];
        return !bookData || !bookData.description;
      })
      .slice(0, 6); 


    const fullDetailsPromises = booksNeedingFullDetails.map(async ({ pb }) => {
      const bookId = pb.openLibraryId;
      const existingData = cachedBooksMap[bookId] || fetchedBooksMap[bookId];

      try {
        const fullBookData = await Promise.race([
          openLibraryService.getBookById(bookId),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 8000)
          ),
        ]);

        const mergedData = {
          ...(existingData || {}),
          ...fullBookData,

          coverUrl: fullBookData.coverUrl || existingData?.coverUrl || null,
          coverId: fullBookData.coverId || existingData?.coverId || null,
          description: fullBookData.description || '',
          downloadLinks: fullBookData.downloadLinks || [],
        };


        await cache.set(`book:${bookId}`, mergedData, 1800);

        return { bookId, data: mergedData };
      } catch (error) {
        console.warn(`Could not fetch full details for ${bookId} in playlist:`, error.message);
        return { bookId, data: existingData };
      }
    });

    const fullDetailsResults = await Promise.all(fullDetailsPromises);
    const fullDetailsMap = {};
    fullDetailsResults.forEach(({ bookId, data }) => {
      if (data) {
        fullDetailsMap[bookId] = data;
        fetchedBooksMap[bookId] = data;
      }
    });


    const books = await Promise.all(
      playlistBooks.map(async (pb) => {
        const bookId = pb.openLibraryId;
        const bookData = fullDetailsMap[bookId] || cachedBooksMap[bookId] || fetchedBooksMap[bookId];

        if (bookData) {


          const combinedRatings = await bookService.combineRatings(
            bookId,
            bookData.openLibraryRating || null,
            bookData.openLibraryRatingCount || 0
          );

          return {
            order: pb.order,
            addedAt: pb.addedAt,
            openLibraryId: bookId,
            book: {
              id: bookId,
              title: bookData.title || 'Unknown Title',
              description: bookData.description || '',
              authors: bookData.authors || [],
              coverUrl: bookData.coverUrl,
              publishYear: bookData.publishYear || (bookData.firstPublishDate ? new Date(bookData.firstPublishDate).getFullYear() : null),
              subjects: bookData.subjects || [],
              downloadLinks: bookData.downloadLinks || [],
              averageRating: combinedRatings.averageRating,
              ratingCount: combinedRatings.ratingCount,
            },
          };
        }


        return {
          order: pb.order,
          addedAt: pb.addedAt,
          openLibraryId: bookId,
          book: {
            id: bookId,
            title: 'Book unavailable',
            authors: [],
            coverUrl: null,
          },
        };
      })
    );

    return {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      isPublic: playlist.isPublic,
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt,
      user: playlist.user,
      books,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalBooks / limit),
        totalItems: totalBooks,
        itemsPerPage: limit,
        hasNextPage: page < Math.ceil(totalBooks / limit),
        hasPrevPage: page > 1,
      },
    };
  }


  async createPlaylist(userId, data) {
    const { name, description, isPublic = false } = data;

    if (!name || name.trim() === '') {
      throw ApiError.badRequest('Playlist name is required');
    }

    const playlist = await prisma.playlist.create({
      data: {
        userId,
        name: name.trim(),
        description: description?.trim() || null,
        isPublic: Boolean(isPublic),
      },
    });

    return {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      isPublic: playlist.isPublic,
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt,
      bookCount: 0,
    };
  }


  async updatePlaylist(playlistId, userId, data) {
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      throw ApiError.notFound('Playlist not found');
    }

    if (playlist.userId !== userId) {
      throw ApiError.forbidden('You can only update your own playlists');
    }

    const { name, description, isPublic } = data;
    const updateData = {};

    if (name !== undefined) {
      if (!name || name.trim() === '') {
        throw ApiError.badRequest('Playlist name cannot be empty');
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (isPublic !== undefined) {
      updateData.isPublic = Boolean(isPublic);
    }

    const updated = await prisma.playlist.update({
      where: { id: playlistId },
      data: updateData,
    });

    const bookCount = await prisma.playlistBook.count({
      where: { playlistId },
    });

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      isPublic: updated.isPublic,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      bookCount,
    };
  }


  async deletePlaylist(playlistId, userId) {
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      throw ApiError.notFound('Playlist not found');
    }

    if (playlist.userId !== userId) {
      throw ApiError.forbidden('You can only delete your own playlists');
    }

    await prisma.playlist.delete({
      where: { id: playlistId },
    });
  }


  async addBookToPlaylist(playlistId, userId, openLibraryId) {

    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      throw ApiError.notFound('Playlist not found');
    }

    if (playlist.userId !== userId) {
      throw ApiError.forbidden('You can only add books to your own playlists');
    }


    try {
      await openLibraryService.getBookById(openLibraryId);
    } catch (error) {
      throw ApiError.notFound('Book not found in Open Library');
    }


    const existing = await prisma.playlistBook.findFirst({
      where: {
        playlistId,
        openLibraryId,
      },
    });

    if (existing) {
      throw ApiError.conflict('Book already in playlist');
    }


    const maxOrder = await prisma.playlistBook.aggregate({
      where: { playlistId },
      _max: { order: true },
    });

    const newOrder = (maxOrder._max.order ?? -1) + 1;

    const playlistBook = await prisma.playlistBook.create({
      data: {
        playlistId,
        openLibraryId,
        order: newOrder,
      },
    });

    return {
      id: playlistBook.id,
      openLibraryId: playlistBook.openLibraryId,
      order: playlistBook.order,
      addedAt: playlistBook.addedAt,
    };
  }


  async removeBookFromPlaylist(playlistId, userId, openLibraryId) {

    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      throw ApiError.notFound('Playlist not found');
    }

    if (playlist.userId !== userId) {
      throw ApiError.forbidden('You can only remove books from your own playlists');
    }

    const playlistBook = await prisma.playlistBook.findFirst({
      where: {
        playlistId,
        openLibraryId,
      },
    });

    if (!playlistBook) {
      throw ApiError.notFound('Book not found in playlist');
    }

    await prisma.playlistBook.delete({
      where: { id: playlistBook.id },
    });
  }


  async reorderPlaylistBooks(playlistId, userId, orderData) {

    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      throw ApiError.notFound('Playlist not found');
    }

    if (playlist.userId !== userId) {
      throw ApiError.forbidden('You can only reorder books in your own playlists');
    }


    await prisma.$transaction(
      orderData.map(({ openLibraryId, order }) =>
        prisma.playlistBook.updateMany({
          where: {
            playlistId,
            openLibraryId,
          },
          data: { order },
        })
      )
    );
  }
}

module.exports = new PlaylistService();

