import { z } from 'zod';

export const roleSchema = z.enum(['Estimator', 'Observer']);

export const storySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().default(''),
  acceptance_criteria: z.array(z.string()).default([]),
  points: z.string().nullable().optional(),
  key: z.string().optional(),
  url: z.string().optional(),
  tracker_provider: z.string().optional(),
  external_id: z.string().optional(),
  status: z.string().optional(),
});

export const pointReferenceSchema = z.object({
  points: z.union([z.string(), z.number()]),
  title: z.string(),
  description: z.string(),
});

export const joinRequestSchema = z.object({
  participant_id: z.string().optional(),
  participantId: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  avatar: z.string().default(''),
  role: roleSchema.optional().default('Estimator'),
});

export const voteRequestSchema = z.object({
  participant_id: z.string().optional(),
  participantId: z.string().optional(),
  vote: z.string().nullable().optional(),
});

export const participantActionSchema = z.object({
  participant_id: z.string().optional(),
  participantId: z.string().optional(),
});

export const finalizeRequestSchema = z.object({
  participant_id: z.string().optional(),
  participantId: z.string().optional(),
  estimate: z.string().nullable().optional(),
  points: z.string().nullable().optional(),
});

export const setStoryRequestSchema = z.object({
  participant_id: z.string().optional(),
  participantId: z.string().optional(),
  story: storySchema.nullable(),
});

export const importBacklogSchema = z.object({
  participant_id: z.string().optional(),
  participantId: z.string().optional(),
  stories: z.array(storySchema),
});

export const updatePointReferencesSchema = z.object({
  participant_id: z.string().optional(),
  participantId: z.string().optional(),
  references: z.array(pointReferenceSchema),
});

export const toggleEdgeCaseSchema = z.object({
  participant_id: z.string().optional(),
  participantId: z.string().optional(),
  edge_case_id: z.string().optional(),
  edgeCaseId: z.string().optional(),
  checked: z.boolean(),
});

export const updateRoleSchema = z.object({
  participant_id: z.string().optional(),
  participantId: z.string().optional(),
  target_id: z.string().optional(),
  targetId: z.string().optional(),
  new_role: roleSchema.optional(),
  newRole: roleSchema.optional(),
});

export const transferFacilitatorSchema = z.object({
  participant_id: z.string().optional(),
  participantId: z.string().optional(),
  target_id: z.string().optional(),
  targetId: z.string().optional(),
});

export const reorderBacklogSchema = z.object({
  participant_id: z.string().optional(),
  participantId: z.string().optional(),
  story_ids: z.array(z.string()).optional(),
  storyIds: z.array(z.string()).optional(),
});

export const removeStorySchema = z.object({
  participant_id: z.string().optional(),
  participantId: z.string().optional(),
  story_id: z.string().optional(),
  storyId: z.string().optional(),
});

export const trackerConfigSchema = z.union([
  z.object({
    provider: z.literal('Linear'),
    config: z.object({
      api_key: z.string(),
      endpoint: z.string().optional(),
    }),
  }),
  z.object({
    provider: z.literal('GitHub'),
    config: z.object({
      personal_access_token: z.string(),
      owner: z.string(),
      repo: z.string(),
      endpoint: z.string().optional(),
    }),
  }),
  z.object({
    provider: z.literal('Jira'),
    config: z.object({
      domain: z.string(),
      email: z.string(),
      api_token: z.string(),
      project_key: z.string(),
      endpoint: z.string().optional(),
      points_field: z.string().optional(),
    }),
  }),
]);

export const connectTrackerSchema = z.object({
  participant_id: z.string().optional(),
  participantId: z.string().optional(),
  config: trackerConfigSchema,
});

export const testTrackerSchema = z.object({
  participant_id: z.string().optional(),
  participantId: z.string().optional(),
  config: trackerConfigSchema,
});

export const fetchBacklogSchema = z.object({
  participant_id: z.string().optional(),
  participantId: z.string().optional(),
  query: z.record(z.any()).optional(),
});

export const syncEstimateSchema = z.object({
  participant_id: z.string().optional(),
  participantId: z.string().optional(),
  story_id: z.string().optional(),
  storyId: z.string().optional(),
  points: z.number().optional(),
  post_comment: z.boolean().optional(),
});

export const pushSlicesSchema = z.object({
  participant_id: z.string().optional(),
  participantId: z.string().optional(),
  parent_id: z.string().optional(),
  parentId: z.string().optional(),
  slices: z.array(z.any()).optional(),
});

export type JoinRequest = z.infer<typeof joinRequestSchema>;
export type VoteRequest = z.infer<typeof voteRequestSchema>;
export type FinalizeRequest = z.infer<typeof finalizeRequestSchema>;
export type SetStoryRequest = z.infer<typeof setStoryRequestSchema>;
export type ImportBacklogRequest = z.infer<typeof importBacklogSchema>;
export type UpdatePointReferencesRequest = z.infer<typeof updatePointReferencesSchema>;
export type ToggleEdgeCaseRequest = z.infer<typeof toggleEdgeCaseSchema>;
export type UpdateRoleRequest = z.infer<typeof updateRoleSchema>;
export type TransferFacilitatorRequest = z.infer<typeof transferFacilitatorSchema>;
export type ReorderBacklogRequest = z.infer<typeof reorderBacklogSchema>;
export type RemoveStoryRequest = z.infer<typeof removeStorySchema>;
export type ConnectTrackerRequest = z.infer<typeof connectTrackerSchema>;
export type TestTrackerRequest = z.infer<typeof testTrackerSchema>;
export type FetchBacklogRequest = z.infer<typeof fetchBacklogSchema>;
export type SyncEstimateRequest = z.infer<typeof syncEstimateSchema>;
export type PushSlicesRequest = z.infer<typeof pushSlicesSchema>;
