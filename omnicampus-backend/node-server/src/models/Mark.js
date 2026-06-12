const mongoose = require('mongoose');

const markSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    midTerm: {
      type: Number,
      default: 0,
    },
    endTerm: {
      type: Number,
      default: 0,
    },
    practical: {
      type: Number,
      default: 0,
    },
    // ── New detailed marking fields ────────────────────────────────────
    internal1: {
      type: Number,
      default: 0,
    },
    internal2: {
      type: Number,
      default: 0,
    },
    assignment: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
    grade: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

// Ensure one mark record per student per subject
markSchema.index({ student: 1, subject: 1 }, { unique: true });

const Mark = mongoose.model('Mark', markSchema);

module.exports = Mark;
