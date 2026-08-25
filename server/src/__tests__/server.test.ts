import { describe, it, expect } from 'vitest';
import app from '../index';

describe('Scrum Pokr Hono Server REST Endpoints', () => {
  it('GET /health returns ok status', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('POST /api/rooms creates a room with slug and shortCode', async () => {
    const res = await app.request('/api/rooms', { method: 'POST' });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.slug).toBeDefined();
    expect(body.short_code).toBeDefined();
  });

  it('GET /api/rooms/:code returns 404 for non-existent room', async () => {
    const res = await app.request('/api/rooms/NON_EXISTENT_ROOM_123');
    expect(res.status).toBe(404);
  });

  it('enforces Reveal Gate and Facilitator Authorization across Join, Vote, and Reveal cycles', async () => {
    // 1. Create Room
    const createRes = await app.request('/api/rooms', { method: 'POST' });
    const { slug } = await createRes.json();

    // 2. Join Alice (Facilitator)
    const joinAliceRes = await app.request(`/api/rooms/${slug}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice', role: 'Estimator' }),
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

    // Non-facilitator cannot start voting
    const bobStartRes = await app.request(`/api/rooms/${slug}/start-voting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId: bobId }),
    });
    expect(bobStartRes.status).toBe(403);

    // 4. Set Deck Configuration (Alice is Facilitator)
    const deckRes = await app.request(`/api/rooms/${slug}/deck`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participantId: aliceId,
        deck: { type: 'fibonacci', cards: ['1', '2', '3', '5', '8', '?'] },
      }),
    });
    expect(deckRes.status).toBe(200);

    // 5. Start Voting (Alice is Facilitator)
    const aliceStartRes = await app.request(`/api/rooms/${slug}/start-voting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId: aliceId }),
    });
    expect(aliceStartRes.status).toBe(200);

    // 6. Cast votes
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

    // 7. Verify Reveal Gate Masking for Bob
    const stateForBobRes = await app.request(`/api/rooms/${slug}?participantId=${bobId}`);
    const stateForBob = await stateForBobRes.json();

    expect(stateForBob.phase).toBe('Voting');
    const bobViewOfAlice = stateForBob.participants.find((p: any) => p.id === aliceId);
    const bobViewOfBob = stateForBob.participants.find((p: any) => p.id === bobId);

    expect(bobViewOfAlice.has_voted).toBe(true);
    expect(bobViewOfAlice.vote).toBeNull(); // Masked!
    expect(bobViewOfBob.has_voted).toBe(true);
    expect(bobViewOfBob.vote).toBe('8'); // Bob sees his own vote

    // Non-facilitator cannot reveal cards
    const bobRevealRes = await app.request(`/api/rooms/${slug}/reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId: bobId }),
    });
    expect(bobRevealRes.status).toBe(403);

    // 8. Reveal Cards (Alice)
    const aliceRevealRes = await app.request(`/api/rooms/${slug}/reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId: aliceId }),
    });
    expect(aliceRevealRes.status).toBe(200);

    // 9. Verify Unmasked State
    const revealedRes = await app.request(`/api/rooms/${slug}?participantId=${bobId}`);
    const revealedState = await revealedRes.json();

    expect(revealedState.phase).toBe('Revealed');
    const revealedAlice = revealedState.participants.find((p: any) => p.id === aliceId);
    const revealedBob = revealedState.participants.find((p: any) => p.id === bobId);

    expect(revealedAlice.vote).toBe('5'); // Unmasked!
    expect(revealedBob.vote).toBe('8'); // Unmasked!
    expect(revealedState.consensus).toBeDefined();

    // 10. Verify that voting after reveal is strictly rejected (400 Bad Request)
    const postRevealVoteRes = await app.request(`/api/rooms/${slug}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId: bobId, vote: '13' }),
    });
    expect(postRevealVoteRes.status).toBe(400);

    // 11. Finalize Story (Alice)
    const finalizeRes = await app.request(`/api/rooms/${slug}/finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId: aliceId, points: '5' }),
    });
    expect(finalizeRes.status).toBe(200);

    // 12. Advance to Next Story (Alice)
    const nextStoryRes = await app.request(`/api/rooms/${slug}/next-story`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId: aliceId }),
    });
    expect(nextStoryRes.status).toBe(200);

    const nextRoundStateRes = await app.request(`/api/rooms/${slug}?participantId=${bobId}`);
    const nextRoundState = await nextRoundStateRes.json();
    expect(nextRoundState.phase).toBe('Idle');
    expect(nextRoundState.consensus).toBeNull();
  });

  it('handles backlog story CRUD and reordering via REST endpoints', async () => {
    const createRes = await app.request('/api/rooms', { method: 'POST' });
    const { slug } = await createRes.json();

    const joinRes = await app.request(`/api/rooms/${slug}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice', role: 'Estimator' }),
    });
    const { participant_id: aliceId } = await joinRes.json();

    // Add Story
    const addRes1 = await app.request(`/api/rooms/${slug}/stories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participant_id: aliceId,
        story: { id: 's-1', title: 'Story 1', description: 'Desc 1', acceptance_criteria: ['AC1'] },
      }),
    });
    expect(addRes1.status).toBe(201);

    const addRes2 = await app.request(`/api/rooms/${slug}/stories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participant_id: aliceId,
        story: { id: 's-2', title: 'Story 2', description: 'Desc 2', acceptance_criteria: ['AC2'] },
      }),
    });
    expect(addRes2.status).toBe(201);

    // Update Story
    const updateRes = await app.request(`/api/rooms/${slug}/stories/s-2`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participant_id: aliceId,
        title: 'Story 2 Updated',
      }),
    });
    expect(updateRes.status).toBe(200);

    // Reorder Backlog
    const reorderRes = await app.request(`/api/rooms/${slug}/reorder-backlog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participant_id: aliceId,
        story_ids: ['s-2'],
      }),
    });
    expect(reorderRes.status).toBe(200);

    // Delete Story
    const deleteRes = await app.request(`/api/rooms/${slug}/stories/s-2?participantId=${aliceId}`, {
      method: 'DELETE',
    });
    expect(deleteRes.status).toBe(200);
  });
});
