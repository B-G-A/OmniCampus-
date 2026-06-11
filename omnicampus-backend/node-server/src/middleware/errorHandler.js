/**
 * Custom application error class & global Express error handler.
 *
 * AppError carries a machine-readable `code` (e.g. "VALIDATION_ERROR")
 * and an HTTP `statusCode` so the handler can build a consistent response.
 */

// ── AppError ──────────────────────────────────────────────────────────────────

class AppError extends Error {
  /**
   * @param {string}  message    – Human-readable error description
   * @param {number}  statusCode – HTTP status code (default 500)
   * @param {string}  code       – Machine-readable error code
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // distinguishes expected errors from bugs

    // Capture stack trace (excludes constructor call from trace)
    Error.captureStackTrace(this, this.constructor);
  }
}

// ── Global error-handling middleware ───────────────────────────────────────────

/**
 * Express error-handling middleware (4-arg signature).
 * Must be registered AFTER all routes.
 */
const errorHandler = (err, _req, res, _next) => {
  // Default values
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Something went wrong';

  // ── Mongoose-specific errors ─────────────────────────────────────

  // Duplicate key (unique index violation)
  if (err.code === 11000 || err.code === '11000') {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    statusCode = 409;
    code = 'DUPLICATE_KEY';
    message = `A record with that ${field} already exists.`;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = messages.join('. ');
  }

  // Bad ObjectId cast
  if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token.';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired.';
  }

  // Multer file-size limit
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    code = 'FILE_TOO_LARGE';
    message = 'Uploaded file exceeds the maximum allowed size.';
  }

  // Log unexpected errors in development
  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    console.error('🔥  Unhandled error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    code,
    statusCode,
  });
};

module.exports = { AppError, errorHandler };
