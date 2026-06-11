/**
 * Material model.
 *
 * Represents an uploaded course material (PDF, PPTX, etc.).
 * Tracks ingestion state so the frontend can poll/show progress.
 */

const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Material title is required'],
      trim: true,
    },

    description: {
      type: String,
      default: '',
      trim: true,
    },

    fileType: {
      type: String,
      enum: {
        values: ['pdf', 'pptx', 'docx', 'txt', 'other'],
        message: 'Unsupported file type',
      },
      default: 'other',
    },

    fileName: {
      type: String,
      default: null,
    },

    filePath: {
      type: String,
      default: null,
    },

    fileSize: {
      type: Number, // bytes
      default: 0,
    },

    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject is required'],
    },

    semester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Semester',
      required: [true, 'Semester is required'],
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader is required'],
    },

    // ── Ingestion tracking ──────────────────────────────────────────
    isIngested: {
      type: Boolean,
      default: false,
    },

    ingestedAt: {
      type: Date,
      default: null,
    },

    chunkCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// ── Indexes ─────────────────────────────────────────────────────────────────
materialSchema.index({ subject: 1 });
materialSchema.index({ semester: 1 });

const Material = mongoose.model('Material', materialSchema);

module.exports = Material;
