const jwt = require('jsonwebtoken');
const config = require('../config');
const { prisma } = require('../config/database');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Middleware to verify JWT token and attach user to request
 */
const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  // Get token from header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check if token exists
  if (!token) {
    throw ApiError.unauthorized('Not authorized to access this route');
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isBlocked: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    // Check if user is blocked
    if (user.isBlocked) {
      throw ApiError.forbidden('Ваш акаунт заблоковано. Зверніться до адміністратора для отримання допомоги.');
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw ApiError.unauthorized('Not authorized to access this route');
  }
});

/**
 * Middleware to optionally authenticate (for guest access with optional user data)
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          avatar: true,
        },
      });
      req.user = user;
    } catch (error) {
      // Token is invalid, but we still allow access as guest
      req.user = null;
    }
  } else {
    req.user = null;
  }

  next();
});

/**
 * Middleware to restrict access to specific roles
 * @param  {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Not authorized to access this route'));
    }

    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('Not authorized to access this route'));
    }

    next();
  };
};

/**
 * Generate JWT token
 * @param {string} id - User ID
 * @returns {string} - JWT token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  generateToken,
};

