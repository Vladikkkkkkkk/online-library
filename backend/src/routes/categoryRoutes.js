const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticate, authorize } = require('../middleware/auth');


router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategoryById);
router.get('/:id/books', categoryController.getBooksByCategory);


router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  categoryController.createCategory
);

router.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  categoryController.updateCategory
);

router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  categoryController.deleteCategory
);

module.exports = router;

