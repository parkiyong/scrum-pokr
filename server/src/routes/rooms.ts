import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  addStorySchema,
  createRoomSchema,
  finalizeRequestSchema,
  joinRequestSchema,
  participantActionSchema,
  reorderBacklogSchema,
  setDeckSchema,
  setStoryRequestSchema,
  transferFacilitatorSchema,
  updateRoleSchema,
  updateStorySchema,
  voteRequestSchema,
} from '@scrumpokr/shared';
import type { Story } from '@scrumpokr/shared';
import { roomRegistry } from '../room/registry';
import type { RoomActor } from '../room/room-actor';

function isAuthorizedFacilitator(room: RoomActor, participantId?: string): boolean {
  const currentFacilitatorId = room.getState().facilitator_id;
  if (!currentFacilitatorId) return true;
  return currentFacilitatorId === participantId;
}

export const roomRoutes = new Hono()
  // 1. Create Room
  .post('/api/rooms', zValidator('json', createRoomSchema, (result, _c) => {
    if (!result.success) {
      // Optional body; proceed even if empty
      return;
    }
  }), async (c) => {
    const actor = roomRegistry.createRoom();
    return c.json({
      slug: actor.slug,
      short_code: actor.shortCode,
      shortCode: actor.shortCode,
    }, 201);
  })

  // 2. Get Room State (Masked)
  .get('/api/rooms/:code', async (c) => {
    const code = c.req.param('code');
    const participantId = c.req.query('participantId') || '';
    const room = roomRegistry.get(code);

    if (!room) {
      return c.json({ error: 'Room not found' }, 404);
    }

    return c.json(room.getMaskedState(participantId), 200);
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
    }, 200);
  })

  // 4. Start Voting (Facilitator only)
  .post('/api/rooms/:code/start-voting', zValidator('json', participantActionSchema), async (c) => {
    const code = c.req.param('code');
    const body = c.req.valid('json');
    const participantId = body.participant_id || body.participantId;

    const room = roomRegistry.get(code);
    if (!room) return c.json({ error: 'Room not found' }, 404);

    if (!isAuthorizedFacilitator(room, participantId)) {
      return c.json({ error: 'Only the facilitator can perform this action' }, 403);
    }

    room.dispatch({ type: 'START_VOTING' });
    return c.json({ success: true }, 200);
  })

  // 5. Cast or Retract Vote
  .post('/api/rooms/:code/vote', zValidator('json', voteRequestSchema), async (c) => {
    const code = c.req.param('code');
    const body = c.req.valid('json');
    const participantId = body.participant_id || body.participantId || '';

    const room = roomRegistry.get(code);
    if (!room) return c.json({ error: 'Room not found' }, 404);

    const phase = room.getState().phase;
    if (phase !== 'Voting' && phase !== 'Idle') {
      return c.json({ error: 'Voting is closed for this round' }, 400);
    }

    room.dispatch({
      type: 'CAST_VOTE',
      payload: { participantId, vote: body.vote || null },
    });

    return c.json({ success: true }, 200);
  })

  // 6. Reveal Cards (Facilitator only)
  .post('/api/rooms/:code/reveal', zValidator('json', participantActionSchema), async (c) => {
    const code = c.req.param('code');
    const body = c.req.valid('json');
    const participantId = body.participant_id || body.participantId;

    const room = roomRegistry.get(code);
    if (!room) return c.json({ error: 'Room not found' }, 404);

    if (!isAuthorizedFacilitator(room, participantId)) {
      return c.json({ error: 'Only the facilitator can perform this action' }, 403);
    }

    room.dispatch({ type: 'REVEAL_CARDS' });
    return c.json({ success: true }, 200);
  })

  // 7. Reset Round (Facilitator only)
  .post('/api/rooms/:code/reset', zValidator('json', participantActionSchema), async (c) => {
    const code = c.req.param('code');
    const body = c.req.valid('json');
    const participantId = body.participant_id || body.participantId;

    const room = roomRegistry.get(code);
    if (!room) return c.json({ error: 'Room not found' }, 404);

    if (!isAuthorizedFacilitator(room, participantId)) {
      return c.json({ error: 'Only the facilitator can perform this action' }, 403);
    }

    room.dispatch({ type: 'RESET_ROUND' });
    return c.json({ success: true }, 200);
  })

  // 8. Finalize Story (Facilitator only)
  .post('/api/rooms/:code/finalize', zValidator('json', finalizeRequestSchema), async (c) => {
    const code = c.req.param('code');
    const body = c.req.valid('json');
    const participantId = body.participant_id || body.participantId;

    const room = roomRegistry.get(code);
    if (!room) return c.json({ error: 'Room not found' }, 404);

    if (!isAuthorizedFacilitator(room, participantId)) {
      return c.json({ error: 'Only the facilitator can perform this action' }, 403);
    }

    room.dispatch({
      type: 'FINALIZE_STORY',
      payload: { estimate: body.estimate || body.points || null },
    });
    return c.json({ success: true }, 200);
  })

  // 9. Set Deck Configuration (Facilitator only)
  .post('/api/rooms/:code/deck', zValidator('json', setDeckSchema), async (c) => {
    const code = c.req.param('code');
    const body = c.req.valid('json');
    const participantId = body.participant_id || body.participantId;

    const room = roomRegistry.get(code);
    if (!room) return c.json({ error: 'Room not found' }, 404);

    if (!isAuthorizedFacilitator(room, participantId)) {
      return c.json({ error: 'Only the facilitator can perform this action' }, 403);
    }

    room.dispatch({
      type: 'SET_DECK',
      payload: { deck: body.deck },
    });
    return c.json({ success: true }, 200);
  })

  // 10. Set Current Story (Facilitator only)
  .post('/api/rooms/:code/story', zValidator('json', setStoryRequestSchema), async (c) => {
    const code = c.req.param('code');
    const body = c.req.valid('json');
    const participantId = body.participant_id || body.participantId;

    const room = roomRegistry.get(code);
    if (!room) return c.json({ error: 'Room not found' }, 404);

    if (!isAuthorizedFacilitator(room, participantId)) {
      return c.json({ error: 'Only the facilitator can perform this action' }, 403);
    }

    room.dispatch({
      type: 'SET_STORY',
      payload: { story: body.story as Story | null },
    });
    return c.json({ success: true }, 200);
  })

  // 11. Add Story to Backlog
  .post('/api/rooms/:code/stories', zValidator('json', addStorySchema), async (c) => {
    const code = c.req.param('code');
    const body = c.req.valid('json');
    const room = roomRegistry.get(code);
    if (!room) return c.json({ error: 'Room not found' }, 404);

    const newStory: Story = {
      id: body.story.id || `story-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: body.story.title,
      description: body.story.description || '',
      acceptance_criteria: body.story.acceptance_criteria || [],
      points: body.story.points || null,
    };

    room.dispatch({
      type: 'ADD_STORY',
      payload: { story: newStory },
    });

    return c.json({ success: true, story: newStory }, 201);
  })

  // 12. Update Story in Backlog or Current Story
  .put('/api/rooms/:code/stories/:storyId', zValidator('json', updateStorySchema), async (c) => {
    const code = c.req.param('code');
    const storyId = c.req.param('storyId');
    const body = c.req.valid('json');
    const participantId = body.participant_id || body.participantId;

    const room = roomRegistry.get(code);
    if (!room) return c.json({ error: 'Room not found' }, 404);

    if (!isAuthorizedFacilitator(room, participantId)) {
      return c.json({ error: 'Only the facilitator can perform this action' }, 403);
    }

    const updates: Partial<Omit<Story, 'id'>> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.acceptance_criteria !== undefined) updates.acceptance_criteria = body.acceptance_criteria;
    if (body.points !== undefined) updates.points = body.points;

    room.dispatch({
      type: 'UPDATE_STORY',
      payload: { storyId, updates },
    });

    return c.json({ success: true }, 200);
  })

  // 13. Remove Story from Backlog (Facilitator only)
  .delete('/api/rooms/:code/stories/:storyId', async (c) => {
    const code = c.req.param('code');
    const storyId = c.req.param('storyId');
    const participantId = c.req.query('participantId') || c.req.query('participant_id');

    const room = roomRegistry.get(code);
    if (!room) return c.json({ error: 'Room not found' }, 404);

    if (!isAuthorizedFacilitator(room, participantId)) {
      return c.json({ error: 'Only the facilitator can perform this action' }, 403);
    }

    room.dispatch({
      type: 'REMOVE_STORY',
      payload: { storyId },
    });

    return c.json({ success: true }, 200);
  })

  // 14. Reorder Backlog (Facilitator only)
  .post('/api/rooms/:code/reorder-backlog', zValidator('json', reorderBacklogSchema), async (c) => {
    const code = c.req.param('code');
    const body = c.req.valid('json');
    const participantId = body.participant_id || body.participantId;
    const storyIds = body.story_ids || body.storyIds || [];

    const room = roomRegistry.get(code);
    if (!room) return c.json({ error: 'Room not found' }, 404);

    if (!isAuthorizedFacilitator(room, participantId)) {
      return c.json({ error: 'Only the facilitator can perform this action' }, 403);
    }

    room.dispatch({
      type: 'REORDER_BACKLOG',
      payload: { storyIds },
    });

    return c.json({ success: true }, 200);
  })

  // 15. Advance to Next Story in Backlog (Facilitator only)
  .post('/api/rooms/:code/next-story', zValidator('json', participantActionSchema), async (c) => {
    const code = c.req.param('code');
    const body = c.req.valid('json');
    const participantId = body.participant_id || body.participantId;

    const room = roomRegistry.get(code);
    if (!room) return c.json({ error: 'Room not found' }, 404);

    if (!isAuthorizedFacilitator(room, participantId)) {
      return c.json({ error: 'Only the facilitator can perform this action' }, 403);
    }

    room.dispatch({ type: 'NEXT_STORY' });
    return c.json({ success: true }, 200);
  })

  // 16. Update Participant Role
  .post('/api/rooms/:code/role', zValidator('json', updateRoleSchema), async (c) => {
    const code = c.req.param('code');
    const body = c.req.valid('json');
    const targetId = body.target_id || body.targetId || '';
    const newRole = body.role || body.new_role || body.newRole || 'Estimator';

    const room = roomRegistry.get(code);
    if (!room) return c.json({ error: 'Room not found' }, 404);

    room.dispatch({
      type: 'UPDATE_ROLE',
      payload: { targetId, newRole },
    });

    return c.json({ success: true }, 200);
  })

  // 17. Transfer Facilitator Authority (Facilitator only)
  .post('/api/rooms/:code/transfer-facilitator', zValidator('json', transferFacilitatorSchema), async (c) => {
    const code = c.req.param('code');
    const body = c.req.valid('json');
    const participantId = body.participant_id || body.participantId;
    const targetId = body.target_id || body.targetId || '';

    const room = roomRegistry.get(code);
    if (!room) return c.json({ error: 'Room not found' }, 404);

    if (!isAuthorizedFacilitator(room, participantId)) {
      return c.json({ error: 'Only the facilitator can perform this action' }, 403);
    }

    room.dispatch({
      type: 'TRANSFER_FACILITATOR',
      payload: { targetId },
    });

    return c.json({ success: true }, 200);
  });
