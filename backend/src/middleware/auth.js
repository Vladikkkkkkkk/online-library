const jwt = require('jsonwebtoken');
const config = require('../config');
const { prisma } = require('../config/database');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');


const authenticate = asyncHandler(async (req, res, next) => {
  let token;


  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }


  if (!token) {
    throw ApiError.unauthorized('Not authorized to access this route');
  }

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
        isBlocked: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw ApiError.unauthorized('User not found');
    }


    if (user.isBlocked) {
      throw ApiError.forbidden('Ваш акаунт заблоковано. Зверніться до адміністратора для отримання допомоги.');
    }


    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw ApiError.unauthorized('Not authorized to access this route');
  }
});


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

      req.user = null;
    }
  } else {
    req.user = null;
  }

  next();
});


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

