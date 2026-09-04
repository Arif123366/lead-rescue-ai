import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { query, run } from '@/lib/db/db';

export async function GET(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const notifications = await query<any>(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [session.id]
  );

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return NextResponse.json({
    notifications,
    unread_count: unreadCount
  });
}

export async function PUT(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const notificationId = body.id || body.notification_id;
  const markAll = body.mark_all_read || body.mark_all;

  if (markAll) {
    await run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [session.id]);
    return NextResponse.json({ message: 'All notifications marked as read.' });
  }

  if (notificationId) {
    await run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [notificationId, session.id]);
    return NextResponse.json({ message: 'Notification marked as read.' });
  }

  return NextResponse.json({ error: 'notification_id or mark_all required.' }, { status: 400 });
}
