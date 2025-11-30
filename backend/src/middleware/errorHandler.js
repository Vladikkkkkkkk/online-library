const ApiError = require('../utils/ApiError');

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Log error for debugging in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode,
    });
  }

  // If error is not an ApiError, convert it
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, false, err.stack);
  }

  // Prisma errors handling
  if (err.code === 'P2002') {
    // Get more details about which field caused the duplicate
    const target = err.meta?.target;
    let message = 'Duplicate field value entered';
    
    if (target && Array.isArray(target)) {
      const fieldName = target[0];
      if (fieldName === 'isbn') {
        message = 'A book with this ISBN already exists';
      } else if (fieldName === 'open_library_id') {
        message = 'A book with this Open Library ID already exists';
      } else {
        message = `Duplicate value for field: ${fieldName}`;
      }
    }
    
    error = ApiError.conflict(message);
  }
  if (err.code === 'P2025') {
    error = ApiError.notFound('Record not found');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized('Invalid token');
  }
  if (err.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('Token expired');
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    error = ApiError.badRequest(err.message);
  }

  const response = {
    success: false,
    message: error.message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
    }),
  };

  res.status(error.statusCode).json(response);
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
  const error = ApiError.notFound(`Route ${req.originalUrl} not found`);
  next(error);
};

module.exports = { errorHandler, notFoundHandler };

