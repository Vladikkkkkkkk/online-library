const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');


router.use(authenticate);
router.use(authorize('ADMIN'));


router.get('/stats', adminController.getDashboardStats);


router.get('/users', adminController.getUsers);


router.get('/users/:id', adminController.getUserById);


router.put('/users/:id/role', adminController.updateUserRole);


router.put('/users/:id/block', adminController.toggleUserBlock);


router.get('/authors', adminController.getAuthors);


router.post('/authors', adminController.createAuthor);


router.put('/authors/:id', adminController.updateAuthor);


router.delete('/authors/:id', adminController.deleteAuthor);

module.exports = router;

