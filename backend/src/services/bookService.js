const { prisma } = require('../config/database');
const openLibraryService = require('./openLibraryService');
const ApiError = require('../utils/ApiError');
const { paginate, paginationResponse } = require('../utils/helpers');
const { getOpenLibrarySubject, getOpenLibrarySubjects } = require('../utils/categoryMapper');

/**
 * Book Service - handles all book-related business logic
 */
class BookService {
  /**
   * Search books (local DB + Open Library)
   * @param {object} params - Search parameters
   * @returns {Promise<object>} - Search results
   */
  async searchBooks(params) {
    const {
      query,
      page = 1,
      limit = 10,
      category,
      author,
      language,
      yearFrom,
      yearTo,
      source = 'all', // 'local', 'openlibrary', 'all'
    } = params;

    const results = {
      local: { data: [], total: 0 },
      openLibrary: { data: [], total: 0 },
    };

    // Search in local database
    if (source === 'local' || source === 'all') {
      const { skip, take } = paginate(page, limit);
      
      const where = {
        ...(query && {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { isbn: { contains: query, mode: 'insensitive' } },
          ],
        }),
        ...(language && { language }),
        ...(yearFrom && { publishYear: { gte: yearFrom } }),
        ...(yearTo && { publishYear: { lte: yearTo } }),
        ...(category && {
          categories: {
            some: {
              category: {
                OR: [
                  { name: { contains: category, mode: 'insensitive' } },
                  { slug: category },
                ],
              },
            },
          },
        }),
        ...(author && {
          authors: {
            some: {
              author: {
                name: { contains: author, mode: 'insensitive' },
              },
            },
          },
        }),
      };

      const [books, total] = await Promise.all([
        prisma.book.findMany({
          where,
          skip,
          take,
          include: {
            authors: {
              include: { author: true },
            },
            categories: {
              include: { category: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.book.count({ where }),
      ]);

      results.local = paginationResponse(
        books.map(this.transformLocalBook),
        total,
        page,
        limit
      );
    }

    // Search in Open Library
    if (source === 'openlibrary' || source === 'all') {
      try {
        let olResults = null;
        const olSubject = category ? getOpenLibrarySubject(category) : null;
        
        // If we have a category but no query, use getBooksBySubject
        if (category && !query && olSubject) {
          const offset = (page - 1) * limit;
          olResults = await openLibraryService.getBooksBySubject(olSubject, {
            limit,
            offset,
          });
          
          // Transform to match search results format
          results.openLibrary = {
            data: olResults.books || [],
            total: olResults.total || 0,
          };
        } 
        // If we have a query, use searchBooks (with optional category filter)
        else if (query) {
          olResults = await openLibraryService.searchBooks(query, {
            page,
            limit,
            language,
            subject: olSubject,
            author,
          });
          
          results.openLibrary = {
            data: olResults.books || [],
            total: olResults.total || 0,
          };
        }
        // If we have only category (fallback - should be handled above, but just in case)
        else if (category && olSubject) {
          const offset = (page - 1) * limit;
          olResults = await openLibraryService.getBooksBySubject(olSubject, {
            limit,
            offset,
          });
          
          results.openLibrary = {
            data: olResults.books || [],
            total: olResults.total || 0,
          };
        }
      } catch (error) {
        console.error('Open Library search failed:', error.message);
        // Don't throw, just return empty results
        results.openLibrary = {
          data: [],
          total: 0,
        };
      }
    }

    return results;
  }

  /**
   * Get book by ID (local or Open Library)
   * @param {string} id - Book ID or Open Library ID
   * @param {string} source - Source: 'local' or 'openlibrary'
   * @returns {Promise<object>} - Book details
   */
  async getBookById(id, source = 'local') {
    if (source === 'openlibrary') {
      const book = await openLibraryService.getBookById(id);
      if (!book) {
        throw ApiError.notFound('Book not found');
      }
      return book;
    }

    // Get from local database
    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        authors: {
          include: { author: true },
        },
        categories: {
          include: { category: true },
        },
      },
    });

    if (!book) {
      throw ApiError.notFound('Book not found');
    }

    return this.transformLocalBook(book);
  }

  /**
   * Get book by Open Library ID from local DB
   * @param {string} openLibraryId - Open Library ID
   * @returns {Promise<object|null>} - Book or null
   */
  async getBookByOpenLibraryId(openLibraryId) {
    const book = await prisma.book.findUnique({
      where: { openLibraryId },
      include: {
        authors: {
          include: { author: true },
        },
        categories: {
          include: { category: true },
        },
      },
    });

    return book ? this.transformLocalBook(book) : null;
  }

  /**
   * Create a new book (admin only)
   * @param {object} bookData - Book data
   * @returns {Promise<object>} - Created book
   */
  async createBook(bookData) {
    const {
      title,
      description,
      isbn,
      publishYear,
      publisher,
      language = 'uk',
      pageCount,
      coverUrl,
      fileUrl,
      fileFormat,
      openLibraryId,
      authorIds = [],
      categoryIds = [],
    } = bookData;

    // Check if ISBN already exists
    if (isbn) {
      const existingBook = await prisma.book.findUnique({
        where: { isbn },
      });
      if (existingBook) {
        throw ApiError.conflict('Book with this ISBN already exists');
      }
    }

    const book = await prisma.book.create({
      data: {
        title,
        description,
        isbn,
        publishYear,
        publisher,
        language,
        pageCount,
        coverUrl,
        fileUrl,
        fileFormat,
        openLibraryId,
        authors: {
          create: authorIds.map((authorId) => ({
            author: { connect: { id: authorId } },
          })),
        },
        categories: {
          create: categoryIds.map((categoryId) => ({
            category: { connect: { id: categoryId } },
          })),
        },
      },
      include: {
        authors: { include: { author: true } },
        categories: { include: { category: true } },
      },
    });

    return this.transformLocalBook(book);
  }

  /**
   * Update book (admin only)
   * @param {string} id - Book ID
   * @param {object} updateData - Data to update
   * @returns {Promise<object>} - Updated book
   */
  async updateBook(id, updateData) {
    const existingBook = await prisma.book.findUnique({
      where: { id },
    });

    if (!existingBook) {
      throw ApiError.notFound('Book not found');
    }

    const {
      title,
      description,
      isbn,
      publishYear,
      publisher,
      language,
      pageCount,
      coverUrl,
      fileUrl,
      fileFormat,
      status,
      authorIds,
      categoryIds,
    } = updateData;

    // Update book with transaction
    const book = await prisma.$transaction(async (tx) => {
      // Update authors if provided
      if (authorIds) {
        await tx.bookAuthor.deleteMany({ where: { bookId: id } });
        await tx.bookAuthor.createMany({
          data: authorIds.map((authorId) => ({
            bookId: id,
            authorId,
          })),
        });
      }

      // Update categories if provided
      if (categoryIds) {
        await tx.bookCategory.deleteMany({ where: { bookId: id } });
        await tx.bookCategory.createMany({
          data: categoryIds.map((categoryId) => ({
            bookId: id,
            categoryId,
          })),
        });
      }

      // Update book
      return tx.book.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(isbn && { isbn }),
          ...(publishYear && { publishYear }),
          ...(publisher && { publisher }),
          ...(language && { language }),
          ...(pageCount && { pageCount }),
          ...(coverUrl && { coverUrl }),
          ...(fileUrl && { fileUrl }),
          ...(fileFormat && { fileFormat }),
          ...(status && { status }),
        },
        include: {
          authors: { include: { author: true } },
          categories: { include: { category: true } },
        },
      });
    });

    return this.transformLocalBook(book);
  }

  /**
   * Delete book (admin only)
   * @param {string} id - Book ID
   */
  async deleteBook(id) {
    const book = await prisma.book.findUnique({
      where: { id },
    });

    if (!book) {
      throw ApiError.notFound('Book not found');
    }

    await prisma.book.delete({
      where: { id },
    });
  }

  /**
   * Import book from Open Library
   * @param {string} openLibraryId - Open Library ID
   * @param {array} categoryIds - Category IDs to assign
   * @returns {Promise<object>} - Created book
   */
  async importFromOpenLibrary(openLibraryId, categoryIds = []) {
    // Check if already imported
    const existingBook = await prisma.book.findUnique({
      where: { openLibraryId },
    });

    if (existingBook) {
      throw ApiError.conflict('Book already imported');
    }

    // Get book details from Open Library
    const olBook = await openLibraryService.getBookById(openLibraryId);

    if (!olBook) {
      throw ApiError.notFound('Book not found in Open Library');
    }

    // Create or get authors
    const authorIds = [];
    for (const authorData of olBook.authors) {
      let author = await prisma.author.findFirst({
        where: { name: authorData.name },
      });

      if (!author) {
        author = await prisma.author.create({
          data: {
            name: authorData.name,
            biography: authorData.biography,
            photoUrl: authorData.photoUrl,
          },
        });
      }
      authorIds.push(author.id);
    }

    // Create book
    const book = await prisma.book.create({
      data: {
        title: olBook.title,
        description: olBook.description,
        isbn: olBook.editions?.[0]?.isbn,
        publishYear: olBook.firstPublishDate 
          ? parseInt(olBook.firstPublishDate, 10) 
          : null,
        publisher: olBook.editions?.[0]?.publishers?.[0],
        language: olBook.editions?.[0]?.language?.[0] || 'en',
        pageCount: olBook.editions?.[0]?.pageCount,
        coverUrl: olBook.coverUrl,
        openLibraryId,
        authors: {
          create: authorIds.map((authorId) => ({
            author: { connect: { id: authorId } },
          })),
        },
        categories: {
          create: categoryIds.map((categoryId) => ({
            category: { connect: { id: categoryId } },
          })),
        },
      },
      include: {
        authors: { include: { author: true } },
        categories: { include: { category: true } },
      },
    });

    return this.transformLocalBook(book);
  }

  /**
   * Get trending books
   * @param {string} period - Period: daily, weekly, monthly
   * @param {number} limit - Number of books
   * @returns {Promise<Array>} - Trending books
   */
  async getTrendingBooks(period = 'weekly', limit = 10) {
    return openLibraryService.getTrendingBooks(period, limit);
  }

  /**
   * Increment download count
   * @param {string} bookId - Book ID
   * @param {string} userId - User ID
   */
  async recordDownload(bookId, userId) {
    await prisma.$transaction([
      prisma.book.update({
        where: { id: bookId },
        data: { downloadCount: { increment: 1 } },
      }),
      prisma.download.create({
        data: {
          bookId,
          userId,
        },
      }),
    ]);
  }

  /**
   * Transform local book data
   */
  transformLocalBook(book) {
    return {
      id: book.id,
      title: book.title,
      description: book.description,
      isbn: book.isbn,
      publishYear: book.publishYear,
      publisher: book.publisher,
      language: book.language,
      pageCount: book.pageCount,
      coverUrl: book.coverUrl,
      fileUrl: book.fileUrl,
      fileFormat: book.fileFormat,
      status: book.status,
      openLibraryId: book.openLibraryId,
      rating: book.rating,
      ratingCount: book.ratingCount,
      downloadCount: book.downloadCount,
      authors: book.authors?.map((ba) => ({
        id: ba.author.id,
        name: ba.author.name,
      })) || [],
      categories: book.categories?.map((bc) => ({
        id: bc.category.id,
        name: bc.category.name,
        slug: bc.category.slug,
      })) || [],
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
    };
  }
}

module.exports = new BookService();

