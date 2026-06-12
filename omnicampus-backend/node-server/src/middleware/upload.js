/**
 * Multer configuration for file uploads.
 *
 * - Disk storage under `uploads/materials/`
 * - Filenames are UUID-based to avoid collisions
<<<<<<< HEAD
 * - Only allows pdf, pptx, docx, txt MIME types
 * - Max file size driven by env.MAX_FILE_SIZE_BYTES
=======
 * - Supports PDF, PPTX, PPT, DOCX, TXT, images, videos, and ZIP
 * - Max file size driven by env.MAX_FILE_SIZE_BYTES (default 50MB)
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
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
<<<<<<< HEAD
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',   // .docx
  'text/plain',                                                                // .txt
=======
  'application/vnd.ms-powerpoint',                                             // .ppt
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',   // .docx
  'text/plain',                                                                // .txt
  'image/png',                                                                 // .png
  'image/jpeg',                                                                // .jpg/.jpeg
  'video/mp4',                                                                 // .mp4
  'application/zip',                                                           // .zip
  'application/x-zip-compressed',                                             // .zip (alt)
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
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
<<<<<<< HEAD
      new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only PDF, PPTX, DOCX, and TXT files are allowed.'),
=======
      new multer.MulterError(
        'LIMIT_UNEXPECTED_FILE',
        `File type '${file.mimetype}' is not allowed. Supported: PDF, PPTX, PPT, DOCX, TXT, PNG, JPG, MP4, ZIP.`
      ),
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
      false
    );
  }
};

// ── Configured Multer instance ──────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
<<<<<<< HEAD
    fileSize: env.MAX_FILE_SIZE_BYTES,
=======
    fileSize: env.MAX_FILE_SIZE_BYTES || 50 * 1024 * 1024, // 50MB default
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
  },
});

module.exports = upload;
