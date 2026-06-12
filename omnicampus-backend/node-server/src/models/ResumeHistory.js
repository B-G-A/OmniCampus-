/**
 * ResumeHistory model.
 *
 * Stores every resume analysis a student has performed so they can
 * view past reports and track improvements over time.
 */

const mongoose = require('mongoose');

const resumeHistorySchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
    },

    fileName: {
      type: String,
      default: 'resume.pdf',
    },

    // ── Scores ─────────────────────────────────────────────────────────
    overallScore: { type: Number, default: 0 },
    atsScore: { type: Number, default: 0 },
    technicalSkillsScore: { type: Number, default: 0 },
    projectsScore: { type: Number, default: 0 },
    experienceScore: { type: Number, default: 0 },
    formattingScore: { type: Number, default: 0 },
    grammarScore: { type: Number, default: 0 },

    // ── Feedback ────────────────────────────────────────────────────────
    strengths: {
      type: [String],
      default: [],
    },

    weaknesses: {
      type: [String],
      default: [],
    },

    suggestions: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// ── Indexes ─────────────────────────────────────────────────────────────────
resumeHistorySchema.index({ student: 1, createdAt: -1 });

const ResumeHistory = mongoose.model('ResumeHistory', resumeHistorySchema);

module.exports = ResumeHistory;
