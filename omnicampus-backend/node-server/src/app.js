const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth.routes');
const semesterRoutes = require('./routes/semester.routes');
const subjectRoutes = require('./routes/subject.routes');
const materialRoutes = require('./routes/material.routes');
const chatRoutes = require('./routes/chat.routes');
const teacherRoutes = require('./routes/teacher.routes');
const studentRoutes = require('./routes/student.routes');
<<<<<<< HEAD
const placementRoutes = require('./routes/placement.routes');
const adminRoutes = require('./routes/admin.routes');
=======
const resumeRoutes = require('./routes/resume.routes');
const placementRoutes = require('./routes/placement.routes');
const adminRoutes = require('./routes/admin.routes');
const notificationRoutes = require('./routes/notification.routes');
const assignmentRoutes = require('./routes/assignment.routes');
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)

const app = express();

// ── Security Headers & CORS ──────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    exposedHeaders: ['X-Total-Count'],
  })
);

// ── Morgan Logging ───────────────────────────────────────────────────────────
app.use(morgan('dev'));

// ── Body Parsers & Sanitation ────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());

// ── Rate Limiting ────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiter specifically to auth endpoints
app.use('/api/auth', authLimiter);

<<<<<<< HEAD
=======
// ── AI Rate Limiting (resume + chat) ─────────────────────────────────────
const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 AI requests per minute per IP
  message: {
    success: false,
    message: 'Too many AI requests. Please wait a moment before trying again.',
    code: 'AI_RATE_LIMIT_EXCEEDED',
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/student/resume', aiLimiter);
app.use('/api/chat', aiLimiter);

>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
// ── Routes Mount ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/semesters', semesterRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
<<<<<<< HEAD
app.use('/api/placement', placementRoutes);
app.use('/api/admin', adminRoutes);
=======
app.use('/api/student/resume', resumeRoutes);
app.use('/api/placement', placementRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/assignments', assignmentRoutes);
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)

// Static directory for file downloads (if needed)
app.use('/uploads', express.static(env.UPLOAD_DIR));

// ── 404 Route ────────────────────────────────────────────────────────────────
app.use('*', (req, res, next) => {
  const { AppError } = require('./middleware/errorHandler');
  next(new AppError(`Route ${req.originalUrl} not found.`, 404, 'NOT_FOUND'));
});

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
