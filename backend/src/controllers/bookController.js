const bookService = require('../services/bookService');
const asyncHandler = require('../utils/asyncHandler');
const axios = require('axios');

/**
 * Book Controller - handles book-related routes
 */

/**
 * @desc    Search books
 * @route   GET /api/books/search
 * @access  Public
 */
const searchBooks = asyncHandler(async (req, res) => {
  const {
    q: query,
    page,
    limit,
    category,
    author,
    language,
    yearFrom,
    yearTo,
    source,
  } = req.query;

  const results = await bookService.searchBooks({
    query,
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
    category,
    author,
    language,
    yearFrom: yearFrom ? parseInt(yearFrom, 10) : undefined,
    yearTo: yearTo ? parseInt(yearTo, 10) : undefined,
    source,
  });

  res.json({
    success: true,
    data: results,
  });
});

/**
 * @desc    Get all books (local)
 * @route   GET /api/books
 * @access  Public
 */
const getBooks = asyncHandler(async (req, res) => {
  const { page, limit, category, language } = req.query;

  const results = await bookService.searchBooks({
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
    category,
    language,
    source: 'local',
  });

  res.json({
    success: true,
    ...results.local,
  });
});

/**
 * @desc    Get book by ID
 * @route   GET /api/books/:id
 * @access  Public
 */
const getBookById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { source = 'local' } = req.query;

  const book = await bookService.getBookById(id, source);

  res.json({
    success: true,
    data: book,
  });
});

/**
 * @desc    Get trending books from Open Library
 * @route   GET /api/books/trending
 * @access  Public
 */
const getTrendingBooks = asyncHandler(async (req, res) => {
  const { period = 'weekly', limit = 10 } = req.query;

  const books = await bookService.getTrendingBooks(period, parseInt(limit, 10));

  res.json({
    success: true,
    data: books,
  });
});

/**
 * @desc    Create a new book (admin)
 * @route   POST /api/books
 * @access  Private/Admin
 */
const createBook = asyncHandler(async (req, res) => {
  const book = await bookService.createBook(req.body);

  res.status(201).json({
    success: true,
    message: 'Book created successfully',
    data: book,
  });
});

/**
 * @desc    Update book (admin)
 * @route   PUT /api/books/:id
 * @access  Private/Admin
 */
const updateBook = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const book = await bookService.updateBook(id, req.body);

  res.json({
    success: true,
    message: 'Book updated successfully',
    data: book,
  });
});

/**
 * @desc    Delete book (admin)
 * @route   DELETE /api/books/:id
 * @access  Private/Admin
 */
const deleteBook = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await bookService.deleteBook(id);

  res.json({
    success: true,
    message: 'Book deleted successfully',
  });
});

/**
 * @desc    Import book from Open Library (admin)
 * @route   POST /api/books/import
 * @access  Private/Admin
 */
const importFromOpenLibrary = asyncHandler(async (req, res) => {
  const { openLibraryId, categoryIds } = req.body;

  const book = await bookService.importFromOpenLibrary(openLibraryId, categoryIds);

  res.status(201).json({
    success: true,
    message: 'Book imported successfully',
    data: book,
  });
});

/**
 * @desc    Download book (track download)
 * @route   POST /api/books/:id/download
 * @access  Private
 */
const downloadBook = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Record download
  await bookService.recordDownload(id, req.user.id);

  // Get book with file URL
  const book = await bookService.getBookById(id, 'local');

  res.json({
    success: true,
    data: {
      fileUrl: book.fileUrl,
      fileFormat: book.fileFormat,
      title: book.title,
    },
  });
});

/**
 * @desc    Get PDF file for reading (proxy to avoid CORS)
 * @route   GET /api/books/:id/read
 * @access  Public
 */
const getBookForReading = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { source = 'local' } = req.query;

  // Get book details
  const book = await bookService.getBookById(id, source);

  // Get PDF URL
  let pdfUrl = book.fileUrl;
  
  if (source === 'openlibrary' && book.downloadLinks) {
    const pdfLink = book.downloadLinks.find(link => link.format === 'PDF');
    if (pdfLink) {
      pdfUrl = pdfLink.url;
    }
  }

  if (!pdfUrl) {
    return res.status(404).json({
      success: false,
      message: 'PDF file not available for this book',
    });
  }

  // If it's a local file, serve it directly
  if (pdfUrl.startsWith('/uploads/')) {
    const path = require('path');
    const fs = require('fs');
    const filePath = path.join(__dirname, '..', '..', pdfUrl);
    
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${book.title}.pdf"`);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.sendFile(path.resolve(filePath));
    } else {
      return res.status(404).json({
        success: false,
        message: 'PDF file not found on server',
      });
    }
  }

  // If it's an external URL (Open Library), proxy it
  try {
    const response = await axios.get(pdfUrl, {
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OnlineLibrary/1.0)',
        'Accept': 'application/pdf,application/octet-stream,*/*',
      },
      timeout: 30000,
      validateStatus: (status) => status < 500, // Accept 404, 403, etc. to handle gracefully
    });

    // Check if file exists
    if (response.status === 404 || response.status === 403) {
      return res.status(404).json({
        success: false,
        message: 'PDF file not available. The book may not have a downloadable PDF on Archive.org.',
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', response.headers['content-type'] || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${book.title}.pdf"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // Pipe the PDF stream to response
    response.data.pipe(res);
  } catch (error) {
    console.error('Error proxying PDF:', error.message);
    
    // Handle specific error cases
    if (error.response?.status === 404 || error.response?.status === 403) {
      return res.status(404).json({
        success: false,
        message: 'PDF file not available. The book may not have a downloadable PDF on Archive.org.',
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to load PDF file. Please try again later.',
    });
  }
});

module.exports = {
  searchBooks,
  getBooks,
  getBookById,
  getTrendingBooks,
  createBook,
  updateBook,
  deleteBook,
  importFromOpenLibrary,
  downloadBook,
  getBookForReading,
};

