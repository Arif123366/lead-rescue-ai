/**
 * server/routes/notifications.js
 * Express router for /api/v1/notifications
 */

const express = require('express');
const router = express.Router();

const { query, run } = require('../../lib/db/db');
const { getCurrentUser } = require('../../lib/auth/auth');

// GET /api/v1/notifications
router.get('/', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const notifications = await query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [session.id]
    );

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return res.json({
      notifications,
      unread_count: unreadCount
    });
  } catch (err) {
    console.error('[notifications GET]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/notifications/stream (SSE)
router.get('/stream', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).send('Unauthorized');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    let lastCheckTime = new Date(Date.now() - 5000).toISOString();

    res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Real-time event stream active', user_id: session.id })}\n\n`);

    const intervalId = setInterval(async () => {
      try {
        const newNotifications = await query(
          `SELECT * FROM notifications 
           WHERE user_id = ? AND is_read = 0 AND created_at > ?
           ORDER BY created_at ASC`,
          [session.id, lastCheckTime]
        );

        if (newNotifications.length > 0) {
          lastCheckTime = new Date().toISOString();
          for (const notif of newNotifications) {
            res.write(`event: notification\ndata: ${JSON.stringify(notif)}\n\n`);
          }
        } else {
          res.write(`: keep-alive\n\n`);
        }
      } catch (err) {
        console.error('SSE Stream error:', err);
      }
    }, 3000);

    req.on('close', () => {
      clearInterval(intervalId);
      res.end();
    });
  } catch (err) {
    console.error('[notifications stream]', err);
    if (!res.headersSent) res.status(500).send('SSE Error');
  }
});

// PUT /api/v1/notifications
router.put('/', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const body = req.body || {};
    const notificationId = body.id || body.notification_id;
    const markAll = body.mark_all_read || body.mark_all;

    if (markAll) {
      await run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [session.id]);
      return res.json({ message: 'All notifications marked as read.' });
    }

    if (notificationId) {
      await run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [notificationId, session.id]);
      return res.json({ message: 'Notification marked as read.' });
    }

    return res.status(400).json({ error: 'notification_id or mark_all required.' });
  } catch (err) {
    console.error('[notifications PUT]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
