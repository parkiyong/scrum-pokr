import { describe, it, expect } from 'vitest';
import app from '../index';

describe('Scrum Pokr AI Hono Server Endpoints', () => {
  it('GET /health returns ok status', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('POST /api/rooms creates a room with slug and shortCode', async () => {
    const res = await app.request('/api/rooms', { method: 'POST' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slug).toBeDefined();
    expect(body.short_code).toBeDefined();
  });

  it('enforces Reveal Gate across Join, Vote, and Reveal cycles', async () => {
    // 1. Create Room
    const createRes = await app.request('/api/rooms', { method: 'POST' });
    const { slug } = await createRes.json();

    // 2. Join Alice (Facilitator)
    const joinAliceRes = await app.request(`/api/rooms/${slug}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice', role: 'Facilitator' }),
    });
    expect(joinAliceRes.status).toBe(200);
    const { participant_id: aliceId } = await joinAliceRes.json();

    // 3. Join Bob (Estimator)
    const joinBobRes = await app.request(`/api/rooms/${slug}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Bob', role: 'Estimator' }),
    });
    expect(joinBobRes.status).toBe(200);
    const { participant_id: bobId } = await joinBobRes.json();

    // 4. Start Voting
    await app.request(`/api/rooms/${slug}/start-voting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId: aliceId }),
    });

    // 5. Cast votes
    await app.request(`/api/rooms/${slug}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId: aliceId, vote: '5' }),
    });

    await app.request(`/api/rooms/${slug}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId: bobId, vote: '8' }),
    });

    // 6. Verify Reveal Gate Masking for Bob
    const stateForBobRes = await app.request(`/api/rooms/${slug}?participantId=${bobId}`);
    const stateForBob = await stateForBobRes.json();

    expect(stateForBob.phase).toBe('Voting');
    const bobViewOfAlice = stateForBob.participants.find((p: any) => p.id === aliceId);
    const bobViewOfBob = stateForBob.participants.find((p: any) => p.id === bobId);

    expect(bobViewOfAlice.has_voted).toBe(true);
    expect(bobViewOfAlice.vote).toBeNull(); // Masked!
    expect(bobViewOfBob.has_voted).toBe(true);
    expect(bobViewOfBob.vote).toBe('8'); // Bob sees his own vote

    // 7. Reveal Cards
    await app.request(`/api/rooms/${slug}/reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId: aliceId }),
    });

    // 8. Verify Unmasked State
    const revealedRes = await app.request(`/api/rooms/${slug}?participantId=${bobId}`);
    const revealedState = await revealedRes.json();

    expect(revealedState.phase).toBe('Revealed');
    const revealedAlice = revealedState.participants.find((p: any) => p.id === aliceId);
    const revealedBob = revealedState.participants.find((p: any) => p.id === bobId);

    expect(revealedAlice.vote).toBe('5'); // Unmasked!
    expect(revealedBob.vote).toBe('8'); // Unmasked!
    expect(revealedState.consensus).toBeDefined();
  });

  it('gating check: rejects divergence analysis during Voting phase', async () => {
    const createRes = await app.request('/api/rooms', { method: 'POST' });
    const { slug } = await createRes.json();

    const divergenceRes = await app.request(`/api/rooms/${slug}/ai/divergence`, {
      method: 'POST',
    });

    expect(divergenceRes.status).toBe(403);
  });
});
