/**
 * Role-based access control middleware.
 *
 * Usage:
 *   router.get('/admin-only', auth, roleGuard('teacher'), handler);
 *   router.get('/both',       auth, roleGuard('teacher', 'student'), handler);
 *
 * Must be used AFTER the `auth` middleware so `req.user` is available.
 */

const { AppError } = require('./errorHandler');

/**
 * Returns Express middleware that checks whether `req.user.role` is
 * included in the supplied list of allowed roles.
 *
 * @param  {...string} allowedRoles – One or more role strings
 * @returns {Function} Express middleware
 */
const roleGuard = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(
        new AppError('Authentication required before checking roles.', 401, 'UNAUTHORIZED')
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Required role(s): ${allowedRoles.join(', ')}`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
};

module.exports = roleGuard;
