import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  finalizeRequestSchema,
  importBacklogSchema,
  joinRequestSchema,
  participantActionSchema,
  removeStorySchema,
  reorderBacklogSchema,
  setStoryRequestSchema,
  toggleEdgeCaseSchema,
  transferFacilitatorSchema,
  updatePointReferencesSchema,
  updateRoleSchema,
  voteRequestSchema,
} from '@scrumpokr/shared';
import { roomRegistry } from '../room/registry';

export const roomRoutes = new Hono()
  // 1. Create Room
  .post('/api/rooms', async (c) => {
    const actor = roomRegistry.createRoom();
    return c.json({
      slug: actor.slug,
      short_code: actor.shortCode,
      shortCode: actor.shortCode,
    });
  })

  // 2. Get Room State (Masked)
  .get('/api/rooms/:code', async (c) => {
    const code = c.req.param('code');
    const participantId = c.req.query('participantId') || '';
    const room = roomRegistry.getOrCreate(code);
    return c.json(room.getMaskedState(participantId));
  })

  // 3. Join Room
  .post('/api/rooms/:code/join', zValidator('json', joinRequestSchema), async (c) => {
    const code = c.req.param('code');
    const body = c.req.valid('json');
    const participantId = body.participant_id || body.participantId;

    const room = roomRegistry.getOrCreate(code);
    const participant = room.join(participantId, body.name, body.avatar, body.role);
    const state = room.getMaskedState(participant.id);

    return c.json({
      participant_id: participant.id,
      participantId: participant.id,
      state,
    });
  })

  // 4. Start Voting
  .post('/api/rooms/:code/start-voting', zValidator('json', participantActionSchema), async (c) => {
    const code = c.req.param('code');
    const room = roomRegistry.getOrCreate(code);
    room.dispatch({ type: 'START_VOTING' });
    return c.json({ success: true });
  })

  // 5. Cast or Retract Vote
  .post('/api/rooms/:code/vote', zValidator('json', voteRequestSchema), async (c) => {
    const code = c.req.param('code');
    const body = c.req.valid('json');
    const participantId = body.participant_id || body.participantId || '';

    const room = roomRegistry.getOrCreate(code);
    const phase = room.getState().phase;
    if (phase !== 'Voting' && phase !== 'Idle') {
      return c.json({ error: 'Voting is closed for this round' }, 400);
    }

    room.dispatch({
      type: 'CAST_VOTE',
      payload: { participantId, vote: body.vote || null },
    });

    return c.json({ success: true });
  })

  // 6. Reveal Cards
  .post('/api/rooms/:code/reveal', zValidator('json', participantActionSchema), async (c) => {
    const code = c.req.param('code');
    const room = roomRegistry.getOrCreate(code);
    room.dispatch({ type: 'REVEAL_CARDS' });
    return c.json({ success: true });
  })

  // 7. Reset Round
  .post('/api/rooms/:code/reset', zValidator('json', participantActionSchema), async (c) => {
    const code = c.req.param('code');
    const room = roomRegistry.getOrCreate(code);
    room.dispatch({ type: 'RESET_ROUND' });
    return c.json({ success: true });
  })

  // 8. Finalize Story
  .post('/api/rooms/:code/finalize', zValidator('json', finalizeRequestSchema), async (c) => {
    const code = c.req.param('code');
    const body = c.req.valid('json');
    const room = roomRegistry.getOrCreate(code);
    room.dispatch({
      type: 'FINALIZE_STORY',
      payload: { estimate: body.estimate || body.points || null },
    });
    return c.json({ success: true });
  })

  // 9. Set Current Story
  .post('/api/rooms/:code/story', zValidator('json', setStoryRequestSchema), async (c) => {
    const code = c.req.param('code');
    const body = c.req.valid('json');
    const room = roomRegistry.getOrCreate(code);
    room.dispatch({
      type: 'SET_STORY',
      payload: { story: body.story },
    });
    return c.json({ success: true });
  })

  // 10. Import Backlog
  .post('/api/rooms/:code/import-backlog', zValidator('json', importBacklogSchema), async (c) => {
    const code = c.req.param('code');
    const body = c.req.valid('json');
    const room = roomRegistry.getOrCreate(code);
    room.dispatch({
      type: 'IMPORT_BACKLOG',
      payload: { stories: body.stories },
    });
    return c.json({ success: true });
  })

  // 11. Update Point References
  .post('/api/rooms/:code/point-references', zValidator('json', updatePointReferencesSchema), async (c) => {
    const code = c.req.param('code');
    const body = c.req.valid('json');
    const room = roomRegistry.getOrCreate(code);
    room.dispatch({
      type: 'UPDATE_POINT_REFERENCES',
      payload: { references: body.references },
    });
    return c.json({ success: true });
  })

  // 12. Toggle Edge Case Checklist Item
  .post('/api/rooms/:code/edge-case', zValidator('json', toggleEdgeCaseSchema), async (c) => {
    const code = c.req.param('code');
    const body = c.req.valid('json');
    const edgeCaseId = body.edge_case_id || body.edgeCaseId || '';
    const room = roomRegistry.getOrCreate(code);
    room.dispatch({
      type: 'TOGGLE_EDGE_CASE',
      payload: { edgeCaseId, checked: body.checked },
    });
    return c.json({ success: true });
  })

  // 13. Update Participant Role
  .post('/api/rooms/:code/role', zValidator('json', updateRoleSchema), async (c) => {
    const code = c.req.param('code');
    const body = c.req.valid('json');
    const targetId = body.target_id || body.targetId || '';
    const newRole = body.new_role || body.newRole || 'Estimator';
    const room = roomRegistry.getOrCreate(code);
    room.dispatch({
      type: 'UPDATE_ROLE',
      payload: { targetId, newRole },
    });
    return c.json({ success: true });
  })

  // 14. Transfer Facilitator Authority
  .post('/api/rooms/:code/transfer-facilitator', zValidator('json', transferFacilitatorSchema), async (c) => {
    const code = c.req.param('code');
    const body = c.req.valid('json');
    const targetId = body.target_id || body.targetId || '';
    const room = roomRegistry.getOrCreate(code);
    room.dispatch({
      type: 'TRANSFER_FACILITATOR',
      payload: { targetId },
    });
    return c.json({ success: true });
  })

  // 15. Reorder Backlog
  .post('/api/rooms/:code/reorder-backlog', zValidator('json', reorderBacklogSchema), async (c) => {
    const code = c.req.param('code');
    const body = c.req.valid('json');
    const storyIds = body.story_ids || body.storyIds || [];
    const room = roomRegistry.getOrCreate(code);
    room.dispatch({
      type: 'REORDER_BACKLOG',
      payload: { storyIds },
    });
    return c.json({ success: true });
  })

  // 16. Remove Story from Backlog
  .post('/api/rooms/:code/remove-story', zValidator('json', removeStorySchema), async (c) => {
    const code = c.req.param('code');
    const body = c.req.valid('json');
    const storyId = body.story_id || body.storyId || '';
    const room = roomRegistry.getOrCreate(code);
    room.dispatch({
      type: 'REMOVE_STORY',
      payload: { storyId },
    });
    return c.json({ success: true });
  })

  // 17. Advance to Next Story in Backlog
  .post('/api/rooms/:code/next-story', zValidator('json', participantActionSchema), async (c) => {
    const code = c.req.param('code');
    const room = roomRegistry.getOrCreate(code);
    room.dispatch({ type: 'NEXT_STORY' });
    return c.json({ success: true });
  });
