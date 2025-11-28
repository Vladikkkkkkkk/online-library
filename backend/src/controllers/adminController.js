const { prisma } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { paginate, paginationResponse } = require('../utils/helpers');

/**
 * Admin Controller - handles admin-specific routes
 */

/**
 * @desc    Get all users (admin)
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, role, search } = req.query;
  const { skip, take } = paginate(parseInt(page, 10), parseInt(limit, 10));

  const where = {
    ...(role && { role }),
    ...(search && {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        createdAt: true,
        _count: {
          select: {
            savedBooks: true,
            downloads: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    success: true,
    ...paginationResponse(users, total, parseInt(page, 10), parseInt(limit, 10)),
  });
});

/**
 * @desc    Get user by ID (admin)
 * @route   GET /api/admin/users/:id
 * @access  Private/Admin
 */
const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      avatar: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          savedBooks: true,
          downloads: true,
        },
      },
    },
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  res.json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Update user role (admin)
 * @route   PUT /api/admin/users/:id/role
 * @access  Private/Admin
 */
const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!['USER', 'ADMIN'].includes(role)) {
    throw ApiError.badRequest('Invalid role');
  }

  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Prevent changing own role
  if (user.id === req.user.id) {
    throw ApiError.badRequest('Cannot change your own role');
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { role },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  });

  res.json({
    success: true,
    message: 'User role updated successfully',
    data: updatedUser,
  });
});

/**
 * @desc    Delete user (admin)
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Prevent deleting own account
  if (user.id === req.user.id) {
    throw ApiError.badRequest('Cannot delete your own account');
  }

  // Prevent deleting other admins
  if (user.role === 'ADMIN') {
    throw ApiError.badRequest('Cannot delete admin users');
  }

  await prisma.user.delete({
    where: { id },
  });

  res.json({
    success: true,
    message: 'User deleted successfully',
  });
});

/**
 * @desc    Get dashboard statistics (admin)
 * @route   GET /api/admin/stats
 * @access  Private/Admin
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalBooks,
    totalCategories,
    totalDownloads,
    recentUsers,
    recentDownloads,
    topBooks,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.book.count(),
    prisma.category.count(),
    prisma.download.count(),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    }),
    prisma.download.findMany({
      take: 10,
      orderBy: { downloadedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        book: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
    prisma.book.findMany({
      take: 5,
      orderBy: { downloadCount: 'desc' },
      select: {
        id: true,
        title: true,
        downloadCount: true,
        coverUrl: true,
      },
    }),
  ]);

  // Get user registration stats for last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const userRegistrations = await prisma.user.groupBy({
    by: ['createdAt'],
    where: {
      createdAt: {
        gte: sevenDaysAgo,
      },
    },
    _count: true,
  });

  // Format recent activity
  const recentActivity = recentDownloads.map((d) => ({
    text: `${d.user.firstName} ${d.user.lastName} завантажив "${d.book.title}"`,
    time: new Date(d.downloadedAt).toLocaleDateString('uk-UA', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }),
  }));

  res.json({
    success: true,
    data: {
      totalUsers,
      totalBooks,
      totalCategories,
      totalDownloads,
      recentUsers,
      recentDownloads,
      recentActivity,
      topBooks,
      userRegistrations,
    },
  });
});

/**
 * @desc    Get all authors (admin)
 * @route   GET /api/admin/authors
 * @access  Private/Admin
 */
const getAuthors = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const { skip, take } = paginate(parseInt(page, 10), parseInt(limit, 10));

  const where = search
    ? { name: { contains: search, mode: 'insensitive' } }
    : {};

  const [authors, total] = await Promise.all([
    prisma.author.findMany({
      where,
      skip,
      take,
      include: {
        _count: {
          select: { books: true },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.author.count({ where }),
  ]);

  res.json({
    success: true,
    ...paginationResponse(authors, total, parseInt(page, 10), parseInt(limit, 10)),
  });
});

/**
 * @desc    Create author (admin)
 * @route   POST /api/admin/authors
 * @access  Private/Admin
 */
const createAuthor = asyncHandler(async (req, res) => {
  const { name, biography, birthYear, deathYear, photoUrl } = req.body;

  const author = await prisma.author.create({
    data: {
      name,
      biography,
      birthYear,
      deathYear,
      photoUrl,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Author created successfully',
    data: author,
  });
});

/**
 * @desc    Update author (admin)
 * @route   PUT /api/admin/authors/:id
 * @access  Private/Admin
 */
const updateAuthor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, biography, birthYear, deathYear, photoUrl } = req.body;

  const existingAuthor = await prisma.author.findUnique({
    where: { id },
  });

  if (!existingAuthor) {
    throw ApiError.notFound('Author not found');
  }

  const author = await prisma.author.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(biography !== undefined && { biography }),
      ...(birthYear !== undefined && { birthYear }),
      ...(deathYear !== undefined && { deathYear }),
      ...(photoUrl !== undefined && { photoUrl }),
    },
  });

  res.json({
    success: true,
    message: 'Author updated successfully',
    data: author,
  });
});

/**
 * @desc    Delete author (admin)
 * @route   DELETE /api/admin/authors/:id
 * @access  Private/Admin
 */
const deleteAuthor = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const author = await prisma.author.findUnique({
    where: { id },
    include: {
      _count: {
        select: { books: true },
      },
    },
  });

  if (!author) {
    throw ApiError.notFound('Author not found');
  }

  if (author._count.books > 0) {
    throw ApiError.badRequest('Cannot delete author with books. Remove books first.');
  }

  await prisma.author.delete({
    where: { id },
  });

  res.json({
    success: true,
    message: 'Author deleted successfully',
  });
});

module.exports = {
  getUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getDashboardStats,
  getAuthors,
  createAuthor,
  updateAuthor,
  deleteAuthor,
};

