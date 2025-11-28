const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

// All admin routes require authentication and ADMIN role
router.use(authenticate);
router.use(authorize('ADMIN'));

// Dashboard
router.get('/stats', adminController.getDashboardStats);

// User management
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id/role', adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);

// Author management
router.get('/authors', adminController.getAuthors);
router.post('/authors', adminController.createAuthor);
router.put('/authors/:id', adminController.updateAuthor);
router.delete('/authors/:id', adminController.deleteAuthor);

module.exports = router;

