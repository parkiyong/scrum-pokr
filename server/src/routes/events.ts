import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { roomRegistry } from '../room/registry';

export const eventRoutes = new Hono().get('/api/rooms/:code/events', async (c) => {
  const code = c.req.param('code');
  const participantId = c.req.query('participantId') || '';

  const room = roomRegistry.getOrCreate(code);

  c.header('Content-Type', 'text/event-stream');
  c.header('Connection', 'keep-alive');
  c.header('X-Accel-Buffering', 'no');
  c.header('Cache-Control', 'no-cache, no-transform');

  return streamSSE(c, async (stream) => {
    // Flush headers immediately so reverse proxies (e.g. Render) don't buffer indefinitely
    await stream.writeSSE({ event: 'ping', data: 'connected' });

    const pushState = async (maskedState: Awaited<ReturnType<typeof room.getMaskedState>>) => {
      try {
        await stream.writeSSE({
          event: 'room_state',
          data: JSON.stringify(maskedState),
        });
      } catch {
        // Ignored, client stream will abort
      }
    };

    // Subscribe before the initial snapshot so broadcasts are not missed mid-connect.
    const unsubscribe = room.subscribe(participantId, pushState);

    // Send the latest state after subscribing so a delayed snapshot cannot be stale.
    if (participantId) {
      await pushState(room.getMaskedState(participantId));
    }

    // 3. Handle stream abort (disconnect / tab close)
    stream.onAbort(() => {
      unsubscribe();
      if (participantId) {
        room.handleParticipantDisconnect(participantId);
      }
    });

    // 4. Periodic Keep-Alive Heartbeat Loop (every 15 seconds)
    while (!stream.aborted) {
      await stream.sleep(15000);
      try {
        await stream.writeSSE({
          event: 'ping',
          data: 'heartbeat',
        });
      } catch {
        break;
      }
    }
  });
});
