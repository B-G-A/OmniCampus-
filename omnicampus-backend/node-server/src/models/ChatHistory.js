/**
 * ChatHistory model.
 *
 * Each document represents a chat session between a student and the AI
 * for a specific subject within a semester.
 */

const mongoose = require('mongoose');

const messageSubSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },

    content: {
      type: String,
      required: true,
    },

    sources: {
      type: [String],
      default: [],
    },

    usedExternalSearch: {
      type: Boolean,
      default: false,
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const chatHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
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

    sessionId: {
      type: String,
      required: true,
      unique: true,
    },

    messages: {
      type: [messageSubSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// ── Indexes ─────────────────────────────────────────────────────────────────
chatHistorySchema.index({ user: 1, subject: 1, semester: 1 });
chatHistorySchema.index({ sessionId: 1 });

const ChatHistory = mongoose.model('ChatHistory', chatHistorySchema);

module.exports = ChatHistory;
