const { prisma } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { generateSlug, paginate, paginationResponse } = require('../utils/helpers');

/**
 * Category Controller - handles category routes
 */

/**
 * @desc    Get all categories
 * @route   GET /api/categories
 * @access  Public
 */
const getCategories = asyncHandler(async (req, res) => {
  const { page, limit, withBookCount } = req.query;

  if (page && limit) {
    const { skip, take } = paginate(parseInt(page, 10), parseInt(limit, 10));

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        skip,
        take,
        orderBy: { name: 'asc' },
        ...(withBookCount === 'true' && {
          include: {
            _count: {
              select: { books: true },
            },
          },
        }),
      }),
      prisma.category.count(),
    ]);

    return res.json({
      success: true,
      ...paginationResponse(categories, total, parseInt(page, 10), parseInt(limit, 10)),
    });
  }

  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    ...(withBookCount === 'true' && {
      include: {
        _count: {
          select: { books: true },
        },
      },
    }),
  });

  res.json({
    success: true,
    data: categories,
  });
});

/**
 * @desc    Get category by ID or slug
 * @route   GET /api/categories/:id
 * @access  Public
 */
const getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await prisma.category.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
    include: {
      _count: {
        select: { books: true },
      },
    },
  });

  if (!category) {
    throw ApiError.notFound('Category not found');
  }

  res.json({
    success: true,
    data: category,
  });
});

/**
 * @desc    Get books by category
 * @route   GET /api/categories/:id/books
 * @access  Public
 */
const getBooksByCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const { skip, take } = paginate(parseInt(page, 10), parseInt(limit, 10));

  // Find category first
  const category = await prisma.category.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
  });

  if (!category) {
    throw ApiError.notFound('Category not found');
  }

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where: {
        categories: {
          some: { categoryId: category.id },
        },
      },
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
    prisma.book.count({
      where: {
        categories: {
          some: { categoryId: category.id },
        },
      },
    }),
  ]);

  const transformedBooks = books.map((book) => ({
    id: book.id,
    title: book.title,
    description: book.description,
    coverUrl: book.coverUrl,
    publishYear: book.publishYear,
    language: book.language,
    authors: book.authors.map((ba) => ({
      id: ba.author.id,
      name: ba.author.name,
    })),
    categories: book.categories.map((bc) => ({
      id: bc.category.id,
      name: bc.category.name,
      slug: bc.category.slug,
    })),
  }));

  res.json({
    success: true,
    category: {
      id: category.id,
      name: category.name,
      slug: category.slug,
    },
    ...paginationResponse(transformedBooks, total, parseInt(page, 10), parseInt(limit, 10)),
  });
});

/**
 * @desc    Create category (admin)
 * @route   POST /api/categories
 * @access  Private/Admin
 */
const createCategory = asyncHandler(async (req, res) => {
  const { name, nameUk, description } = req.body;

  const slug = generateSlug(name);

  // Check if category already exists
  const existingCategory = await prisma.category.findFirst({
    where: {
      OR: [{ name }, { slug }],
    },
  });

  if (existingCategory) {
    throw ApiError.conflict('Category already exists');
  }

  const category = await prisma.category.create({
    data: {
      name,
      nameUk,
      description,
      slug,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: category,
  });
});

/**
 * @desc    Update category (admin)
 * @route   PUT /api/categories/:id
 * @access  Private/Admin
 */
const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, nameUk, description } = req.body;

  const existingCategory = await prisma.category.findUnique({
    where: { id },
  });

  if (!existingCategory) {
    throw ApiError.notFound('Category not found');
  }

  const updateData = {};
  if (name) {
    updateData.name = name;
    updateData.slug = generateSlug(name);
  }
  if (nameUk !== undefined) updateData.nameUk = nameUk;
  if (description !== undefined) updateData.description = description;

  const category = await prisma.category.update({
    where: { id },
    data: updateData,
  });

  res.json({
    success: true,
    message: 'Category updated successfully',
    data: category,
  });
});

/**
 * @desc    Delete category (admin)
 * @route   DELETE /api/categories/:id
 * @access  Private/Admin
 */
const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: { books: true },
      },
    },
  });

  if (!category) {
    throw ApiError.notFound('Category not found');
  }

  if (category._count.books > 0) {
    throw ApiError.badRequest('Cannot delete category with books. Remove books first.');
  }

  await prisma.category.delete({
    where: { id },
  });

  res.json({
    success: true,
    message: 'Category deleted successfully',
  });
});

module.exports = {
  getCategories,
  getCategoryById,
  getBooksByCategory,
  createCategory,
  updateCategory,
  deleteCategory,
};

