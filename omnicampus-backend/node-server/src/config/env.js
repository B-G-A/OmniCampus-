/**
 * Centralized environment variable access.
 * Loads dotenv and exports all configuration values with sensible defaults.
 */

const dotenv = require('dotenv');
const path = require('path');

// Load .env from the project root (node-server directory)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  // ── Server ────────────────────────────────────────────────────────
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,

  // ── Database ──────────────────────────────────────────────────────
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/omnicampus',

  // ── JWT ───────────────────────────────────────────────────────────
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'default_access_secret',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',

  // ── Frontend ──────────────────────────────────────────────────────
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

  // ── AI / Python FastAPI Service ───────────────────────────────────
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  INTERNAL_SERVICE_KEY: process.env.INTERNAL_SERVICE_KEY || 'default_internal_key',

  // ── Email (SMTP) ──────────────────────────────────────────────────
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT, 10) || 587,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'OmniCampus <noreply@omnicampus.com>',

  // ── File Uploads ──────────────────────────────────────────────────
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 50,

  /** Convenience getter — max file size in bytes */
  get MAX_FILE_SIZE_BYTES() {
    return this.MAX_FILE_SIZE_MB * 1024 * 1024;
  },
};

module.exports = env;
