import { activityEmitter } from '@/lib/events';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          // stream closed
        }
      };

      send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }));

      // Replay recent activity log so the client catches up
      const history = store.getActivityLog();
      const recent = history.slice(-50);
      for (const event of recent) {
        send(JSON.stringify(event));
      }

      const unsubscribe = activityEmitter.subscribe((event) => {
        send(JSON.stringify(event));
      });

      const heartbeat = setInterval(() => {
        try {
          send(JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() }));
        } catch {
          cleanup();
        }
      }, 10000);

      function cleanup() {
        clearInterval(heartbeat);
        unsubscribe();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
