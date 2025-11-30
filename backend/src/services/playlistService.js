const { prisma } = require('../config/database');
const ApiError = require('../utils/ApiError');
const { paginate, paginationResponse } = require('../utils/helpers');
const openLibraryService = require('./openLibraryService');

/**
 * Playlist Service - manages user playlists
 */
class PlaylistService {
  /**
   * Get user's playlists
   * @param {string} userId - User ID
   * @param {object} params - Pagination params
   * @returns {Promise<object>} - Playlists with pagination
   */
  async getUserPlaylists(userId, params = {}) {
    const { page = 1, limit = 10, includePublic = false } = params;
    const { skip, take } = paginate(page, limit);

    const where = { userId };
    if (includePublic) {
      // Include public playlists from other users
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
            take: 1, // Just to get count
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

    // Get book count for each playlist
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

  /**
   * Get playlist by ID with books
   * @param {string} playlistId - Playlist ID
   * @param {string} userId - User ID (for checking access)
   * @returns {Promise<object>} - Playlist with books
   */
  async getPlaylistById(playlistId, userId = null) {
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

    // Check if user has access (owner or public)
    if (userId && playlist.userId !== userId && !playlist.isPublic) {
      throw ApiError.forbidden('You do not have access to this playlist');
    }

    // Get books in playlist
    const playlistBooks = await prisma.playlistBook.findMany({
      where: { playlistId },
      orderBy: { order: 'asc' },
    });

    // Fetch book details from Open Library
    const books = await Promise.all(
      playlistBooks.map(async (pb) => {
        try {
          const bookData = await openLibraryService.getBookById(pb.openLibraryId);
          return {
            order: pb.order,
            addedAt: pb.addedAt,
            book: {
              id: pb.openLibraryId,
              title: bookData.title,
              description: bookData.description,
              authors: bookData.authors?.map(a => ({ name: a.name || a })) || [],
              coverUrl: bookData.coverUrl,
              publishYear: bookData.firstPublishDate ? new Date(bookData.firstPublishDate).getFullYear() : null,
              subjects: bookData.subjects || [],
            },
          };
        } catch (error) {
          console.error(`Failed to fetch Open Library book ${pb.openLibraryId}:`, error.message);
          return {
            order: pb.order,
            addedAt: pb.addedAt,
            book: {
              id: pb.openLibraryId,
              title: 'Book not available',
              authors: [],
              coverUrl: null,
            },
          };
        }
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
    };
  }

  /**
   * Create playlist
   * @param {string} userId - User ID
   * @param {object} data - Playlist data
   * @returns {Promise<object>} - Created playlist
   */
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

  /**
   * Update playlist
   * @param {string} playlistId - Playlist ID
   * @param {string} userId - User ID
   * @param {object} data - Update data
   * @returns {Promise<object>} - Updated playlist
   */
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

  /**
   * Delete playlist
   * @param {string} playlistId - Playlist ID
   * @param {string} userId - User ID
   */
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

  /**
   * Add book to playlist
   * @param {string} playlistId - Playlist ID
   * @param {string} userId - User ID
   * @param {string} openLibraryId - Open Library ID
   * @returns {Promise<object>} - Added book
   */
  async addBookToPlaylist(playlistId, userId, openLibraryId) {
    // Verify playlist exists and user owns it
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      throw ApiError.notFound('Playlist not found');
    }

    if (playlist.userId !== userId) {
      throw ApiError.forbidden('You can only add books to your own playlists');
    }

    // Verify book exists in Open Library
    try {
      await openLibraryService.getBookById(openLibraryId);
    } catch (error) {
      throw ApiError.notFound('Book not found in Open Library');
    }

    // Check if book already in playlist
    const existing = await prisma.playlistBook.findFirst({
      where: {
        playlistId,
        openLibraryId,
      },
    });

    if (existing) {
      throw ApiError.conflict('Book already in playlist');
    }

    // Get max order for this playlist
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

  /**
   * Remove book from playlist
   * @param {string} playlistId - Playlist ID
   * @param {string} userId - User ID
   * @param {string} openLibraryId - Open Library ID
   */
  async removeBookFromPlaylist(playlistId, userId, openLibraryId) {
    // Verify playlist exists and user owns it
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

  /**
   * Reorder books in playlist
   * @param {string} playlistId - Playlist ID
   * @param {string} userId - User ID
   * @param {Array<{openLibraryId: string, order: number}>} orderData - New order
   */
  async reorderPlaylistBooks(playlistId, userId, orderData) {
    // Verify playlist exists and user owns it
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      throw ApiError.notFound('Playlist not found');
    }

    if (playlist.userId !== userId) {
      throw ApiError.forbidden('You can only reorder books in your own playlists');
    }

    // Update order for each book
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

