/**
 * Multer configuration for file uploads.
 *
 * - Disk storage under `uploads/materials/`
 * - Filenames are UUID-based to avoid collisions
 * - Only allows pdf, pptx, docx, txt MIME types
 * - Max file size driven by env.MAX_FILE_SIZE_BYTES
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');

// ── Allowed MIME types ──────────────────────────────────────────────
const ALLOWED_MIMES = [
  'application/pdf',                                                           // .pdf
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',   // .docx
  'text/plain',                                                                // .txt
];

// ── Storage engine ──────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dest = path.resolve(env.UPLOAD_DIR, 'materials');
    // Ensure directory exists (recursive)
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },

  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

// ── File filter ─────────────────────────────────────────────────────
const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only PDF, PPTX, DOCX, and TXT files are allowed.'),
      false
    );
  }
};

// ── Configured Multer instance ──────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_FILE_SIZE_BYTES,
  },
});

module.exports = upload;
