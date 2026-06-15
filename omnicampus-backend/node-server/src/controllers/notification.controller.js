const { getSupabaseAdmin } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

const db = () => getSupabaseAdmin();

const toNotification = (row) => ({
  _id: row.notification_id,
  id: row.notification_id,
  userId: row.user_id,
  title: row.title,
  message: row.message,
  type: row.type,
  isRead: row.is_read,
  createdAt: row.created_at,
});

const createNotification = async ({ userId, type, title, message, relatedId }) => {
  try {
    const client = db();
    await client.from('notifications').insert({
      user_id: userId,
      type: type || 'system',
      title,
      message: message || '',
    });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
};

const createBulkNotifications = async (userIds, { type, title, message, relatedId }) => {
  try {
    const client = db();
    const docs = userIds.map((uid) => ({
      user_id: uid,
      type: type || 'system',
      title,
      message: message || '',
    }));
    if (docs.length > 0) {
      await client.from('notifications').insert(docs);
    }
  } catch (err) {
    console.error('Failed to create bulk notifications:', err.message);
  }
};

const getNotifications = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const client = db();
    const { data, error } = await client
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const notifications = (data || []).map(toNotification);
    const unreadCount = notifications.filter((n) => !n.isRead).length;

    res.json({ success: true, data: notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    const client = db();
    const { error } = await client
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    if (error) throw error;
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    next(error);
  }
};

const markOneRead = async (req, res, next) => {
  try {
    const client = db();
    const { data, error } = await client
      .from('notifications')
      .update({ is_read: true })
      .eq('notification_id', req.params.id)
      .eq('user_id', req.user.id)
      .select('*')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new AppError('Notification not found.', 404, 'NOT_FOUND');

    res.json({ success: true, data: toNotification(data) });
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
