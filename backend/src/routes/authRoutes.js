const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');


router.post('/register', validate(schemas.register), authController.register);


router.post('/login', validate(schemas.login), authController.login);


router.get('/me', authenticate, authController.getMe);


router.put('/profile', authenticate, validate(schemas.updateProfile), authController.updateProfile);


router.put('/password', authenticate, validate(schemas.changePassword), authController.changePassword);


router.post('/logout', authenticate, authController.logout);

module.exports = router;

