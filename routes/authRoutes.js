const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController/authController');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { 
    validateRegister, 
    validateLogin, 
    validateUpdateProfile, 
    validateChangePassword 
} = require('../middleware/validation');

// Routes không cần authentication
router.post('/register', validateRegister, AuthController.register);
router.post('/login', validateLogin, AuthController.login);

// Routes cần authentication
router.get('/profile', authenticateToken, AuthController.getProfile);
router.put('/profile', authenticateToken, validateUpdateProfile, AuthController.updateProfile);
router.post('/profile/avatar', authenticateToken, upload.single('avatar'), AuthController.uploadAvatar);
router.put('/change-password', authenticateToken, validateChangePassword, AuthController.changePassword);

module.exports = router;
