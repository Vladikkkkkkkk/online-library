const bookService = require('../services/bookService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Book Controller - handles book-related routes
 * Now works only with Open Library API
 */

/**
 * @desc    Search books from Open Library
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
    title,
    publisher,
    keywords,
    language,
    yearFrom,
    yearTo,
  } = req.query;

  const results = await bookService.searchBooks({
    query,
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
    category,
    author,
    title,
    publisher,
    keywords,
    language,
    yearFrom: yearFrom ? parseInt(yearFrom, 10) : undefined,
    yearTo: yearTo ? parseInt(yearTo, 10) : undefined,
  });

  res.json({
    success: true,
    ...results,
  });
});

/**
 * @desc    Get all books (from Open Library)
 * @route   GET /api/books
 * @access  Public
 */
const getBooks = asyncHandler(async (req, res) => {
  const { page, limit, category, language, q: query } = req.query;

  const results = await bookService.searchBooks({
    query,
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
    category,
    language,
  });

  res.json({
    success: true,
    ...results,
  });
});

/**
 * @desc    Get book by Open Library ID
 * @route   GET /api/books/:id
 * @access  Public
 */
const getBookById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const book = await bookService.getBookById(id);

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

module.exports = {
  searchBooks,
  getBooks,
  getBookById,
  getTrendingBooks,
};
