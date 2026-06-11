/**
 * Semester model.
 *
 * Only ONE semester should have `isActive: true` at any time.
 * `vectorCollectionName` links to the AI service's vector store.
 */

const mongoose = require('mongoose');

const semesterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Semester name is required'],
      trim: true,
    },

    year: {
      type: String,
      required: [true, 'Year is required'],
      trim: true,
    },

    semesterNumber: {
      type: Number,
      required: [true, 'Semester number is required'],
    },

    isActive: {
      type: Boolean,
      default: false,
    },

    startDate: {
      type: Date,
      default: null,
    },

    endDate: {
      type: Date,
      default: null,
    },

    vectorCollectionName: {
      type: String,
      default: null,
    },

    archivedAt: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

// ── Indexes ─────────────────────────────────────────────────────────────────
semesterSchema.index({ isActive: 1 });
semesterSchema.index({ year: 1, semesterNumber: 1 });

const Semester = mongoose.model('Semester', semesterSchema);

module.exports = Semester;
