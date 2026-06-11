const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Input validation rules
const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('email').trim().isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
    .matches(/\d/).withMessage('Password must contain at least one number.'),
  body('role').isIn(['student', 'teacher']).withMessage('Role must be either student or teacher.'),
];

const loginRules = [
  body('email').trim().isEmail().withMessage('Please provide a valid email address.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

const forgotPasswordRules = [
  body('email').trim().isEmail().withMessage('Please provide a valid email address.'),
];

const resetPasswordRules = [
  body('token').notEmpty().withMessage('Reset token is required.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
    .matches(/\d/).withMessage('Password must contain at least one number.'),
];

// Routes
router.post('/register', registerRules, authController.register);
router.post('/login', loginRules, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authMiddleware, authController.logout);
router.post('/forgot-password', forgotPasswordRules, authController.forgotPassword);

// Reset password - support both param or body token
router.post('/reset-password/:token', (req, res, next) => {
  req.body.token = req.params.token;
  next();
}, resetPasswordRules, authController.resetPassword);

router.post('/reset-password', resetPasswordRules, authController.resetPassword);

// Verify email - support both param or query token
router.get('/verify-email/:token', (req, res, next) => {
  req.query.token = req.params.token;
  next();
}, authController.verifyEmail);

router.get('/verify-email', authController.verifyEmail);

router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
