import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { roomRegistry } from '../room/registry';
import {
  analyzeDivergence,
  analyzeStoryWithStoryDoctor,
  sliceStoryWithSPIDR,
} from '../ai/gemini-client';

const aiStoryRequestSchema = z.object({
  story_id: z.string().optional(),
});

export const aiRoutes = new Hono()
  // 1. Analyze Active Story with Story Doctor
  .post('/api/rooms/:code/ai/story-doctor', zValidator('json', aiStoryRequestSchema), async (c) => {
    const code = c.req.param('code');
    const room = roomRegistry.get(code);

    if (!room) {
      return c.json({ error: 'Room not found' }, 404);
    }

    const story = room.getState().current_story;
    if (!story) {
      return c.json({ error: 'No active story to analyze' }, 400);
    }

    const result = await analyzeStoryWithStoryDoctor(story);
    room.dispatch({
      type: 'SET_STORY_DOCTOR_REPORT',
      payload: { report: result.data },
    });

    return c.json({ success: true, report: result.data, data: result.data, fallback: result.fallback });
  })

  // 2. SPIDR Vertical Slicer (Gated behind Revealed Phase)
  .post('/api/rooms/:code/ai/slice', zValidator('json', aiStoryRequestSchema), async (c) => {
    const code = c.req.param('code');
    const room = roomRegistry.get(code);

    if (!room) {
      return c.json({ error: 'Room not found' }, 404);
    }

    const state = room.getState();
    if (state.phase !== 'Revealed' && state.phase !== 'Finalized' && state.phase !== 'Discussing' && state.phase !== 'Slicing') {
      return c.json({ error: 'SPIDR slicing is restricted behind the Reveal Gate' }, 403);
    }

    if (!state.current_story) {
      return c.json({ error: 'No active story to slice' }, 400);
    }

    const result = await sliceStoryWithSPIDR(state.current_story);
    return c.json({ success: true, slices: result.data.slices, data: result.data, fallback: result.fallback });
  })

  // 3. Divergence Analysis (Strictly Gated Behind Revealed Phase)
  .post('/api/rooms/:code/ai/divergence', async (c) => {
    const code = c.req.param('code');
    const room = roomRegistry.get(code);

    if (!room) {
      return c.json({ error: 'Room not found' }, 404);
    }

    const state = room.getState();
    if (state.phase !== 'Revealed' && state.phase !== 'Finalized' && state.phase !== 'Discussing' && state.phase !== 'Slicing') {
      return c.json({ error: 'Divergence analysis is restricted behind the Reveal Gate' }, 403);
    }

    if (!state.current_story) {
      return c.json({ error: 'No active story' }, 400);
    }

    const result = await analyzeDivergence(state.current_story, state.participants, state.consensus);
    return c.json({ success: true, ...result.data, data: result.data, fallback: result.fallback });
  });
