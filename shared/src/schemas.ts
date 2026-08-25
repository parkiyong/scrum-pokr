import { z } from 'zod';

// Roles & Phases
export const roleSchema = z.enum(['Estimator', 'Observer']);
export const deckTypeSchema = z.enum(['fibonacci', 'modified_fibonacci', 'tshirt', 'sequential', 'custom']);

export const deckConfigSchema = z.object({
  type: deckTypeSchema,
  cards: z.array(z.string()).min(1, 'Deck must contain at least one card'),
});

export const storySchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().default(''),
  acceptance_criteria: z.array(z.string()).default([]),
  points: z.string().nullable().optional(),
});

export const storyInputSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().default(''),
  acceptance_criteria: z.array(z.string()).optional().default([]),
});

// Request Schemas
export const createRoomSchema = z.object({
  initial_story: storyInputSchema.optional(),
  deck: deckConfigSchema.optional(),
}).optional();

export const joinRequestSchema = z.object({
  participant_id: z.string().optional(),
  participantId: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  avatar: z.string().default(''),
  role: roleSchema.optional().default('Estimator'),
});

export const participantActionSchema = z.object({
  participant_id: z.string().optional(),
  participantId: z.string().optional(),
});

export const voteRequestSchema = z.object({
  participant_id: z.string().optional(),
  participantId: z.string().optional(),
  vote: z.string().nullable().optional(),
});

export const finalizeRequestSchema = z.object({
  participant_id: z.string().optional(),
  participantId: z.string().optional(),
  points: z.string().nullable().optional(),
  estimate: z.string().nullable().optional(),
});

export const setDeckSchema = z.object({
  participant_id: z.string().optional(),
  participantId: z.string().optional(),
  deck: deckConfigSchema,
});

export const setStoryRequestSchema = z.object({
  participant_id: z.string().optional(),
  participantId: z.string().optional(),
  story: storySchema.nullable(),
});

export const addStorySchema = z.object({
  participant_id: z.string().optional(),
  participantId: z.string().optional(),
  story: z.object({
    id: z.string().optional(),
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional().default(''),
    acceptance_criteria: z.array(z.string()).optional().default([]),
    points: z.string().nullable().optional(),
  }),
});

export const updateStorySchema = z.object({
  participant_id: z.string().optional(),
  participantId: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  acceptance_criteria: z.array(z.string()).optional(),
  points: z.string().nullable().optional(),
});

export const removeStorySchema = z.object({
  participant_id: z.string().optional(),
  participantId: z.string().optional(),
  story_id: z.string().optional(),
  storyId: z.string().optional(),
});

export const reorderBacklogSchema = z.object({
  participant_id: z.string().optional(),
  participantId: z.string().optional(),
  story_ids: z.array(z.string()).optional(),
  storyIds: z.array(z.string()).optional(),
});

export const updateRoleSchema = z.object({
  participant_id: z.string().optional(),
  participantId: z.string().optional(),
  target_id: z.string().optional(),
  targetId: z.string().optional(),
  new_role: roleSchema.optional(),
  newRole: roleSchema.optional(),
  role: roleSchema.optional(),
});

export const transferFacilitatorSchema = z.object({
  participant_id: z.string().optional(),
  participantId: z.string().optional(),
  target_id: z.string().optional(),
  targetId: z.string().optional(),
});

export type JoinRequest = z.infer<typeof joinRequestSchema>;
export type VoteRequest = z.infer<typeof voteRequestSchema>;
export type FinalizeRequest = z.infer<typeof finalizeRequestSchema>;
export type SetDeckRequest = z.infer<typeof setDeckSchema>;
export type SetStoryRequest = z.infer<typeof setStoryRequestSchema>;
export type AddStoryRequest = z.infer<typeof addStorySchema>;
export type UpdateStoryRequest = z.infer<typeof updateStorySchema>;
export type RemoveStoryRequest = z.infer<typeof removeStorySchema>;
export type ReorderBacklogRequest = z.infer<typeof reorderBacklogSchema>;
export type UpdateRoleRequest = z.infer<typeof updateRoleSchema>;
export type TransferFacilitatorRequest = z.infer<typeof transferFacilitatorSchema>;
