import { Hono } from 'hono';
import { validator } from 'hono/validator';
import {
  ConnectionPreview,
  PointReference,
  Role,
  Story,
  StorySlice,
  TrackerConfig,
  TrackerQuery,
} from '../types/room';

/**
 * Authoritative Hono route definitions contract.
 * Uses Hono's typed validator middleware so hc<AppType> derives strict RPC input types.
 */
export const roomApp = new Hono()
  .post('/api/rooms', async (c) => {
    return c.json({ slug: 'SWB-42', short_code: 'SWB-42' });
  })
  .get('/api/rooms/:code/events', async (c) => {
    return c.text('');
  })
  .post(
    '/api/rooms/:code/join',
    validator('json', (v) => v as {
      participant_id: string;
      name: string;
      avatar: string;
      role?: Role;
    }),
    async (c) => {
      return c.json({ success: true });
    }
  )
  .post(
    '/api/rooms/:code/start-voting',
    validator('json', (v) => v as { participant_id: string }),
    async (c) => {
      return c.json({ success: true });
    }
  )
  .post(
    '/api/rooms/:code/vote',
    validator('json', (v) => v as { participant_id: string; vote: string | null }),
    async (c) => {
      return c.json({ success: true });
    }
  )
  .post(
    '/api/rooms/:code/reveal',
    validator('json', (v) => v as { participant_id: string }),
    async (c) => {
      return c.json({ success: true });
    }
  )
  .post(
    '/api/rooms/:code/reset',
    validator('json', (v) => v as { participant_id: string }),
    async (c) => {
      return c.json({ success: true });
    }
  )
  .post(
    '/api/rooms/:code/finalize',
    validator('json', (v) => v as { participant_id: string; estimate?: string }),
    async (c) => {
      return c.json({ success: true });
    }
  )
  .post(
    '/api/rooms/:code/story',
    validator('json', (v) => v as { participant_id: string; story: Story | null }),
    async (c) => {
      return c.json({ success: true });
    }
  )
  .post(
    '/api/rooms/:code/point-references',
    validator('json', (v) => v as { participant_id: string; references: PointReference[] }),
    async (c) => {
      return c.json({ success: true });
    }
  )
  .post(
    '/api/rooms/:code/edge-case',
    validator('json', (v) => v as { participant_id: string; edge_case_id: string; checked: boolean }),
    async (c) => {
      return c.json({ success: true });
    }
  )
  .post(
    '/api/rooms/:code/import-backlog',
    validator('json', (v) => v as { participant_id: string; stories: Story[] }),
    async (c) => {
      return c.json({ success: true });
    }
  )
  .post(
    '/api/rooms/:code/reorder-backlog',
    validator('json', (v) => v as { participant_id: string; story_ids: string[] }),
    async (c) => {
      return c.json({ success: true });
    }
  )
  .post(
    '/api/rooms/:code/remove-story',
    validator('json', (v) => v as { participant_id: string; story_id: string }),
    async (c) => {
      return c.json({ success: true });
    }
  )
  .post(
    '/api/rooms/:code/role',
    validator('json', (v) => v as { participant_id: string; target_id: string; new_role: Role }),
    async (c) => {
      return c.json({ success: true });
    }
  )
  .post(
    '/api/rooms/:code/transfer-facilitator',
    validator('json', (v) => v as { participant_id: string; target_id: string }),
    async (c) => {
      return c.json({ success: true });
    }
  )
  .post(
    '/api/rooms/:code/connect-tracker',
    validator('json', (v) => v as { participant_id: string; config: TrackerConfig }),
    async (c) => {
      return c.json({ success: true });
    }
  )
  .post(
    '/api/rooms/:code/disconnect-tracker',
    validator('json', (v) => v as { participant_id: string }),
    async (c) => {
      return c.json({ success: true });
    }
  )
  .post(
    '/api/rooms/:code/test-tracker',
    validator('json', (v) => v as { participant_id: string; config: TrackerConfig }),
    async (c) => {
      return c.json({ success: true, preview: undefined as ConnectionPreview | undefined });
    }
  )
  .post(
    '/api/rooms/:code/fetch-backlog',
    validator('json', (v) => v as { participant_id: string; query?: TrackerQuery }),
    async (c) => {
      return c.json({ success: true, stories: [] as Story[] });
    }
  )
  .post(
    '/api/rooms/:code/sync-estimate',
    validator('json', (v) => v as { participant_id: string; story_id: string; points: number; post_comment?: boolean }),
    async (c) => {
      return c.json({ success: true, story_id: '', message: undefined as string | undefined });
    }
  )
  .post(
    '/api/rooms/:code/push-slices',
    validator('json', (v) => v as { participant_id: string; parent_id: string; slices: StorySlice[] }),
    async (c) => {
      return c.json({ success: true, created_stories: [] as Story[] });
    }
  );

export type AppType = typeof roomApp;
