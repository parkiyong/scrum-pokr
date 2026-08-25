import { describe, it, expect } from 'vitest';
import {
  deckConfigSchema,
  joinRequestSchema,
  voteRequestSchema,
  addStorySchema,
  reorderBacklogSchema,
  setDeckSchema,
} from '../schemas';

describe('Shared Zod Schemas Validation', () => {
  it('validates deck config schemas correctly', () => {
    const validDeck = deckConfigSchema.safeParse({
      type: 'fibonacci',
      cards: ['1', '2', '3', '5', '8', '?'],
    });
    expect(validDeck.success).toBe(true);

    const invalidType = deckConfigSchema.safeParse({
      type: 'invalid-deck-type',
      cards: ['1', '2'],
    });
    expect(invalidType.success).toBe(false);

    const emptyCards = deckConfigSchema.safeParse({
      type: 'fibonacci',
      cards: [],
    });
    expect(emptyCards.success).toBe(false);
  });

  it('validates join request schemas', () => {
    const validJoin = joinRequestSchema.safeParse({
      name: 'Alice',
      role: 'Estimator',
    });
    expect(validJoin.success).toBe(true);

    const missingName = joinRequestSchema.safeParse({
      name: '',
    });
    expect(missingName.success).toBe(false);
  });

  it('validates vote request schemas', () => {
    const validVote = voteRequestSchema.safeParse({
      participant_id: 'p-1',
      vote: '5',
    });
    expect(validVote.success).toBe(true);

    const retractVote = voteRequestSchema.safeParse({
      participant_id: 'p-1',
      vote: null,
    });
    expect(retractVote.success).toBe(true);
  });

  it('validates add story request schema', () => {
    const validStory = addStorySchema.safeParse({
      participant_id: 'p-1',
      story: {
        title: 'Story 1',
        description: 'A description',
        acceptance_criteria: ['AC 1'],
      },
    });
    expect(validStory.success).toBe(true);

    const missingTitle = addStorySchema.safeParse({
      participant_id: 'p-1',
      story: {
        title: '',
      },
    });
    expect(missingTitle.success).toBe(false);
  });

  it('validates set deck schema', () => {
    const validSetDeck = setDeckSchema.safeParse({
      participant_id: 'p-1',
      deck: {
        type: 'tshirt',
        cards: ['S', 'M', 'L'],
      },
    });
    expect(validSetDeck.success).toBe(true);
  });

  it('validates reorder backlog schema', () => {
    const validReorder = reorderBacklogSchema.safeParse({
      participant_id: 'p-1',
      story_ids: ['s-2', 's-1'],
    });
    expect(validReorder.success).toBe(true);
  });
});
