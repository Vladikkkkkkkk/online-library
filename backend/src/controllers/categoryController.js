const { prisma } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { generateSlug, paginate, paginationResponse } = require('../utils/helpers');


const getCategories = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;

  if (page && limit) {
    const { skip, take } = paginate(parseInt(page, 10), parseInt(limit, 10));

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        skip,
        take,
        orderBy: { name: 'asc' },
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
  });

  res.json({
    success: true,
    data: categories,
  });
});


const getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await prisma.category.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
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


const getBooksByCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 10 } = req.query;


  const category = await prisma.category.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
  });

  if (!category) {
    throw ApiError.notFound('Category not found');
  }


  const bookService = require('../services/bookService');
  const { getOpenLibrarySubject } = require('../utils/categoryMapper');


  const olSubject = getOpenLibrarySubject(category.slug);


  const searchSubject = olSubject || category.name.toLowerCase();

  const results = await bookService.searchBooks({
    category: searchSubject,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  });

  res.json({
    success: true,
    category: {
      id: category.id,
      name: category.name,
      nameUk: category.nameUk,
      slug: category.slug,
      description: category.description,
    },
    data: results.data || [],
    total: results.total || 0,
  });
});


const createCategory = asyncHandler(async (req, res) => {
  const { name, nameUk, description } = req.body;

  const slug = generateSlug(name);


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


const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category) {
    throw ApiError.notFound('Category not found');
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

