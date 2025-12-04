const bookService = require('../services/bookService');
const asyncHandler = require('../utils/asyncHandler');


const searchBooks = asyncHandler(async (req, res) => {
  const {
    q: query,
    page,
    limit,
    category,
    author,
    title,
    publisher,
    language,
    yearFrom,
    yearTo,
    sortBy,
  } = req.query;


  const currentYear = new Date().getFullYear();
  let validatedYearFrom = yearFrom ? parseInt(yearFrom, 10) : undefined;
  let validatedYearTo = yearTo ? parseInt(yearTo, 10) : undefined;

  if (validatedYearFrom !== undefined) {
    if (validatedYearFrom < 0 || validatedYearFrom > currentYear) {
      validatedYearFrom = undefined;
    }
  }

  if (validatedYearTo !== undefined) {
    if (validatedYearTo < 0 || validatedYearTo > currentYear) {
      validatedYearTo = undefined;
    }
  }

  const results = await bookService.searchBooks({
    query,
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
    category,
    author,
    title,
    publisher,
    language,
    yearFrom: validatedYearFrom,
    yearTo: validatedYearTo,
    sortBy: sortBy || 'relevance',
  });

  res.json({
    success: true,
    ...results,
  });
});


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


const getBookById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const book = await bookService.getBookById(id);

  res.json({
    success: true,
    data: book,
  });
});


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
