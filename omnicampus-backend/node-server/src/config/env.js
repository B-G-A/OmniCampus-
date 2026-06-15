/**
 * Centralized environment variable access.
 * Loads dotenv and exports all configuration values with sensible defaults.
 */

const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load .env from the node-server directory first, then fall back to the repo root.
const envPaths = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(process.cwd(), '.env'),
];

const envPath = envPaths.find((candidatePath) => fs.existsSync(candidatePath));
dotenv.config({ path: envPath || envPaths[0] });

const env = {
  // ── Server ────────────────────────────────────────────────────────
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,

  // ── Database ──────────────────────────────────────────────────────
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/omnicampus',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || 'omnicampus-bucket',

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

  // ── AI Gateway Providers ──────────────────────────────────────────
  OLLAMA_URL: process.env.OLLAMA_URL || 'http://localhost:11434',
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'llama3.2:1b',

  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.0-flash',

  GROK_API_KEY: process.env.GROK_API_KEY || '',
  GROK_BASE_URL: process.env.GROK_BASE_URL || 'https://api.x.ai/v1',
  GROK_MODEL: process.env.GROK_MODEL || 'grok-3-mini',

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
