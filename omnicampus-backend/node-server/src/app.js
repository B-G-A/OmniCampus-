const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const assignmentRoutes = require('./routes/assignment.routes');
const chatRoutes = require('./routes/chat.routes');
const materialRoutes = require('./routes/material.routes');
const notificationRoutes = require('./routes/notification.routes');
const placementRoutes = require('./routes/placement.routes');
const semesterRoutes = require('./routes/semester.routes');
const studentRoutes = require('./routes/student.routes');
const subjectRoutes = require('./routes/subject.routes');
const teacherRoutes = require('./routes/teacher.routes');
const eventRoutes = require('./routes/event.routes');

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


// ── Routes Mount ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/placements', placementRoutes);
app.use('/api/semesters', semesterRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/events', eventRoutes);

// Static directory for file downloads (if needed)
app.use('/uploads', express.static(env.UPLOAD_DIR));

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 Route ────────────────────────────────────────────────────────────────
app.use('*', (req, res, next) => {
  const { AppError } = require('./middleware/errorHandler');
  next(new AppError(`Route ${req.originalUrl} not found.`, 404, 'NOT_FOUND'));
});

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
