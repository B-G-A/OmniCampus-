/**
 * JWT authentication middleware.
 *
 * Extracts the Bearer token from the Authorization header, verifies it
 * against JWT_ACCESS_SECRET, and attaches the decoded payload to `req.user`.
 */

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { AppError } = require('./errorHandler');

const auth = async (req, _res, next) => {
  try {
    // ── 1. Extract token ────────────────────────────────────────────
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Please provide a valid token.', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new AppError('Authentication required. Please provide a valid token.', 401, 'UNAUTHORIZED');
    }

    // ── 2. Verify token ─────────────────────────────────────────────
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

    // Attach decoded payload (id, email, role, etc.) to the request
    req.user = decoded;

    next();
  } catch (error) {
    // jwt.verify throws JsonWebTokenError / TokenExpiredError —
    // the global error handler will map those to 401 automatically,
    // but we can also handle them explicitly here for clarity.
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid authentication token.', 401, 'INVALID_TOKEN'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Authentication token has expired.', 401, 'TOKEN_EXPIRED'));
    }
    next(error);
  }
};

module.exports = auth;
