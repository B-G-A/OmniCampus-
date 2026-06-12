/**
 * Notification controller.
 *
 * Manages CRUD for in-app notifications and provides a helper
 * function `createNotification` for other controllers to use.
 */

const Notification = require('../models/Notification');
const { AppError } = require('../middleware/errorHandler');

/**
 * Helper: Create a notification for a specific user.
 * Called programmatically from other controllers (not an endpoint).
 */
const createNotification = async ({ userId, type, title, message, relatedId }) => {
  try {
    await Notification.create({
      user: userId,
      type: type || 'general',
      title,
      message: message || '',
      relatedId: relatedId || null,
    });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
};

/**
 * Helper: Create notifications for multiple users at once.
 */
const createBulkNotifications = async (userIds, { type, title, message, relatedId }) => {
  try {
    const docs = userIds.map(uid => ({
      user: uid,
      type: type || 'general',
      title,
      message: message || '',
      relatedId: relatedId || null,
    }));
    if (docs.length > 0) {
      await Notification.insertMany(docs);
    }
  } catch (err) {
    console.error('Failed to create bulk notifications:', err.message);
  }
};

/**
 * GET /api/notifications
 * Fetch notifications for the logged-in user.
 */
const getNotifications = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit);

    const unreadCount = await Notification.countDocuments({ user: req.user.id, isRead: false });

    res.json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for the logged-in user.
 */
const markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read.
 */
const markOneRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: { isRead: true } },
      { new: true }
    );
    if (!notification) {
      throw new AppError('Notification not found.', 404, 'NOT_FOUND');
    }
    res.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createNotification,
  createBulkNotifications,
  getNotifications,
  markAllRead,
  markOneRead,
};
