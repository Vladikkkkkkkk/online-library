/**
 * Async handler wrapper to avoid try-catch blocks in controllers
 * Automatically catches errors and passes them to the error handling middleware
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;

