/**
 * Auth controller.
 *
 * Handles registration, login, token refresh, logout, email verification,
 * password reset, and "get me" profile retrieval.
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const env = require('../config/env');
const { AppError } = require('../middleware/errorHandler');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/email.service');

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a signed JWT access token. */
const generateAccessToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, role: user.role, name: user.name },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRY }
  );

/** Generate a signed JWT refresh token. */
const generateRefreshToken = (user) =>
  jwt.sign(
    { id: user._id },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRY }
  );

/** Hash a token string with SHA-256 (for safe storage). */
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// ── Validation helper ───────────────────────────────────────────────────────
const checkValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg).join('. ');
    throw new AppError(messages, 400, 'VALIDATION_ERROR');
  }
};

// ── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Create a new user, send verification email.
 */
const register = async (req, res, next) => {
  try {
    checkValidation(req);

    const { name, email, password, role } = req.body;

    // Check if email already taken
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new AppError('An account with this email already exists.', 409, 'DUPLICATE_EMAIL');
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create user (password hashed by pre-save hook)
    const user = await User.create({
      name,
      email,
      password,
      role,
      verificationToken,
    });

    // Send verification email (fire-and-forget with error logging)
    sendVerificationEmail(user.email, user.name, verificationToken).catch((err) =>
      console.error('⚠️  Failed to send verification email:', err.message)
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Authenticate user, return access & refresh tokens.
 */
const login = async (req, res, next) => {
  try {
    checkValidation(req);

    const { email, password } = req.body;

    // Find user (explicitly select password & refreshTokens)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password +refreshTokens');
    if (!user) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    // Check verification
    if (!user.isVerified) {
      throw new AppError('Please verify your email before logging in.', 403, 'EMAIL_NOT_VERIFIED');
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store hashed refresh token
    user.refreshTokens.push(hashToken(refreshToken));
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profilePicture: user.profilePicture,
          isVerified: user.isVerified,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/refresh-token
 * Issue a new access token using a valid refresh token.
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      throw new AppError('Refresh token is required.', 400, 'VALIDATION_ERROR');
    }

    // Verify JWT signature
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
    } catch (_err) {
      throw new AppError('Invalid or expired refresh token.', 401, 'INVALID_TOKEN');
    }

    // Find user with refreshTokens
    const user = await User.findById(decoded.id).select('+refreshTokens');
    if (!user) {
      throw new AppError('User not found.', 401, 'UNAUTHORIZED');
    }

    // Check that the hashed token exists in the stored array
    const tokenHash = hashToken(token);
    const tokenIndex = user.refreshTokens.indexOf(tokenHash);
    if (tokenIndex === -1) {
      throw new AppError('Refresh token has been revoked.', 401, 'TOKEN_REVOKED');
    }

    // Issue new access token
    const newAccessToken = generateAccessToken(user);

    res.json({
      success: true,
      data: { accessToken: newAccessToken },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 * Remove the provided refresh token from the user's stored tokens.
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      // Nothing to revoke — just acknowledge
      return res.json({ success: true, message: 'Logged out.' });
    }

    // Verify so we can find the user
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
    } catch (_err) {
      // Token already invalid — treat as logged out
      return res.json({ success: true, message: 'Logged out.' });
    }

    const user = await User.findById(decoded.id).select('+refreshTokens');
    if (user) {
      const tokenHash = hashToken(token);
      user.refreshTokens = user.refreshTokens.filter((t) => t !== tokenHash);
      await user.save({ validateBeforeSave: false });
    }

    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/forgot-password
 * Generate a password-reset token and email it.
 */
const forgotPassword = async (req, res, next) => {
  try {
    checkValidation(req);

    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal whether the email exists
      return res.json({
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    }

    // Generate plain token, store hashed version
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = hashToken(resetToken);
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save({ validateBeforeSave: false });

    // Send email (fire-and-forget with logging)
    sendPasswordResetEmail(user.email, user.name, resetToken).catch((err) =>
      console.error('⚠️  Failed to send password-reset email:', err.message)
    );

    res.json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/reset-password
 * Reset password using the token from the email link.
 */
const resetPassword = async (req, res, next) => {
  try {
    checkValidation(req);

    const { token, password } = req.body;

    const hashedToken = hashToken(token);

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new AppError('Invalid or expired reset token.', 400, 'INVALID_TOKEN');
    }

    // Update password (pre-save hook hashes it)
    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    // Invalidate all refresh tokens (force re-login)
    user.refreshTokens = [];

    await user.save();

    res.json({ success: true, message: 'Password has been reset successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/verify-email?token=...
 * Verify the user's email address.
 */
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      throw new AppError('Verification token is required.', 400, 'VALIDATION_ERROR');
    }

    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      throw new AppError('Invalid or expired verification token.', 400, 'INVALID_TOKEN');
    }

    user.isVerified = true;
    user.verificationToken = null;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, message: 'Email verified successfully. You can now log in.' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Return the currently authenticated user's profile.
 */
const getMe = async (req, res, next) => {
  try {
    let query = User.findById(req.user.id);

    // Populate enrolled subjects for students
    if (req.user.role === 'student') {
      query = query.populate({
        path: 'enrolledSubjects',
        select: 'name code description semester bannerColor',
        populate: { path: 'semester', select: 'name year semesterNumber isActive' },
      });
    }

    const user = await query;

    if (!user) {
      throw new AppError('User not found.', 404, 'NOT_FOUND');
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  getMe,
};
