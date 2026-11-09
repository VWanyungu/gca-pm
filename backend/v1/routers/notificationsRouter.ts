import express from 'express';
import { Notifications, NotificationPreferences } from '../database/utils/database.js';
import { sendRouteError } from '../utils/errors.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const userId = req.user!.userId;
  const unreadOnly = req.query.filter === 'unread';

  try {
    const notifications = await Notifications.listForUser(userId, { unreadOnly });
    const unreadCount = await Notifications.unreadCount(userId);
    res.status(200).json({
      status: 'success',
      data: { notifications, unreadCount },
      message: 'Notifications retrieved successfully',
    });
  } catch (err) {
    sendRouteError(res, err);
  }
});

router.patch('/:notificationId/read', async (req, res) => {
  const userId = req.user!.userId;
  const { notificationId } = req.params;

  try {
    const updated = await Notifications.markRead(notificationId, userId);
    if (!updated) {
      res.status(404).json({ status: 'error', data: null, message: 'Notification not found' });
      return;
    }
    res.status(200).json({ status: 'success', data: null, message: 'Notification marked as read' });
  } catch (err) {
    sendRouteError(res, err);
  }
});

router.post('/read-all', async (req, res) => {
  const userId = req.user!.userId;
  try {
    await Notifications.markAllRead(userId);
    res.status(200).json({ status: 'success', data: null, message: 'All notifications marked as read' });
  } catch (err) {
    sendRouteError(res, err);
  }
});

router.get('/preferences', async (req, res) => {
  const userId = req.user!.userId;
  try {
    const [types, preferences] = await Promise.all([
      NotificationPreferences.listTypes(),
      NotificationPreferences.getForUser(userId),
    ]);
    const enabledByType = new Map(preferences.map((p) => [`${p.type_code}:${p.channel}`, p.enabled]));
    const result = types.map((type) => ({
      type_code: type.type_code,
      enabled: enabledByType.get(`${type.type_code}:in_app`) ?? type.default_in_app,
    }));
    res.status(200).json({ status: 'success', data: { preferences: result }, message: 'Preferences retrieved successfully' });
  } catch (err) {
    sendRouteError(res, err);
  }
});

router.patch('/preferences', async (req, res) => {
  const userId = req.user!.userId;
  const { type_code: typeCode, enabled } = req.body as { type_code?: string; enabled?: boolean };

  if (!typeCode || typeof enabled !== 'boolean') {
    res.status(400).json({ status: 'error', data: null, message: 'type_code and enabled are required' });
    return;
  }

  try {
    await NotificationPreferences.setForUser(userId, typeCode, 'in_app', enabled);
    res.status(200).json({ status: 'success', data: null, message: 'Preference updated' });
  } catch (err) {
    sendRouteError(res, err);
  }
});

export default router;
