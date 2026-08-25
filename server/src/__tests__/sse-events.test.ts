import { describe, it, expect } from 'vitest';
import app from '../index';

describe('Server-Sent Events (SSE) Stream Endpoint', () => {
  it('returns 404 for non-existent room SSE stream', async () => {
    const res = await app.request('/api/rooms/NON_EXISTENT_ROOM/events?participantId=p-1');
    expect(res.status).toBe(404);
  });

  it('connects to SSE stream and streams initial masked state', async () => {
    const createRes = await app.request('/api/rooms', { method: 'POST' });
    const { slug } = await createRes.json();

    const joinRes = await app.request(`/api/rooms/${slug}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice', role: 'Estimator' }),
    });
    const { participant_id: aliceId } = await joinRes.json();

    const sseRes = await app.request(`/api/rooms/${slug}/events?participantId=${aliceId}`);
    expect(sseRes.status).toBe(200);
    expect(sseRes.headers.get('content-type')).toContain('text/event-stream');
    expect(sseRes.headers.get('x-accel-buffering')).toBe('no');

    const reader = sseRes.body?.getReader();
    if (reader) {
      const { value } = await reader.read();
      const text = new TextDecoder().decode(value);
      expect(text).toContain('event: room_state');
      expect(text).toContain('data:');
      expect(text).toContain(slug);
      await reader.cancel();
    }
  });
});
