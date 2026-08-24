import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { roomRegistry } from '../room/registry';

export const eventRoutes = new Hono().get('/api/rooms/:code/events', async (c) => {
  const code = c.req.param('code');
  const participantId = c.req.query('participantId') || '';

  const room = roomRegistry.get(code);
  if (!room) {
    return c.json({ error: 'Room not found' }, 404);
  }

  return streamSSE(c, async (stream) => {
    // 1. Send Initial State Immediately (Masked for this participant)
    if (participantId) {
      const initialState = room.getMaskedState(participantId);
      await stream.writeSSE({
        event: 'room_state',
        data: JSON.stringify(initialState),
      });
    }

    // 2. Subscribe to state broadcasts
    const unsubscribe = room.subscribe(participantId, async (maskedState) => {
      try {
        await stream.writeSSE({
          event: 'room_state',
          data: JSON.stringify(maskedState),
        });
      } catch {
        // Ignored, client stream will abort
      }
    });

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
