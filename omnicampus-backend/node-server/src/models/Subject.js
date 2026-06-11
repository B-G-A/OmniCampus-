/**
 * Subject model.
 *
 * Each subject belongs to a semester and is owned by a teacher.
 * A compound unique index on [code, semester] prevents duplicate subject
 * codes within the same semester.
 */

const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
    },

    code: {
      type: String,
      required: [true, 'Subject code is required'],
      uppercase: true,
      trim: true,
    },

    description: {
      type: String,
      default: '',
      trim: true,
    },

    semester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Semester',
      required: [true, 'Semester is required'],
    },

    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Teacher is required'],
    },

    enrolledStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    announcements: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Announcement',
      },
    ],

    materials: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Material',
      },
    ],

    bannerColor: {
      type: String,
      default: '#4F46E5',
    },
  },
  { timestamps: true }
);

// ── Compound unique index — no duplicate codes per semester ──────────────────
subjectSchema.index({ code: 1, semester: 1 }, { unique: true });

const Subject = mongoose.model('Subject', subjectSchema);

module.exports = Subject;
