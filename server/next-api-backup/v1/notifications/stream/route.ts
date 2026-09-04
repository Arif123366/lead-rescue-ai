import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastCheckTime = new Date(Date.now() - 5000).toISOString();

      // Send initial connection event
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ message: 'Real-time event stream active', user_id: session.id })}\n\n`)
      );

      const intervalId = setInterval(async () => {
        try {
          // Poll for new unread notifications since last check
          const newNotifications = await query<any>(
            `SELECT * FROM notifications 
             WHERE user_id = ? AND is_read = 0 AND created_at > ?
             ORDER BY created_at ASC`,
            [session.id, lastCheckTime]
          );

          if (newNotifications.length > 0) {
            lastCheckTime = new Date().toISOString();
            for (const notif of newNotifications) {
              controller.enqueue(
                encoder.encode(`event: notification\ndata: ${JSON.stringify(notif)}\n\n`)
              );
            }
          } else {
            // Heartbeat keep-alive every 15s
            controller.enqueue(encoder.encode(`: keep-alive\n\n`));
          }
        } catch (err) {
          console.error('SSE Stream error:', err);
        }
      }, 3000);

      req.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
}
