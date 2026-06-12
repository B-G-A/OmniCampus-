/**
 * Notification model.
 *
 * Stores in-app notifications for users. Supports types for
 * materials, attendance, marks, assignments, placements, and events.
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },

    type: {
      type: String,
      enum: ['material', 'attendance', 'marks', 'assignment', 'placement', 'event', 'general'],
      default: 'general',
    },

    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },

    message: {
      type: String,
      default: '',
      trim: true,
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    // Optional link to a related resource
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true }
);

// ── Indexes ─────────────────────────────────────────────────────────────────
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
