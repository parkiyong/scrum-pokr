import { describe, it, expect } from 'vitest';
import { roomReducer } from '../room-reducer';
import type { RoomState, Story } from '../domain';
import { DEFAULT_DECKS } from '../domain';

describe('Room Reducer State Transitions', () => {
  const initial: RoomState = {
    slug: 'swift-badger-42',
    short_code: 'SWB-42',
    phase: 'Idle',
    deck: { type: 'fibonacci', cards: [...DEFAULT_DECKS.fibonacci] },
    facilitator_id: '',
    current_story: null,
    backlog: [],
    consensus: null,
    participants: [],
  };

  it('handles JOIN action and assigns initial facilitator', () => {
    const s1 = roomReducer(initial, {
      type: 'JOIN',
      payload: {
        participant: {
          id: 'p-1',
          name: 'Alice',
          avatar: '',
          role: 'Estimator',
          connected: true,
          has_voted: false,
          vote: null,
        },
      },
    });

    expect(s1.participants).toHaveLength(1);
    expect(s1.facilitator_id).toBe('p-1');
    expect(s1.participants[0].role).toBe('Estimator');

    const s2 = roomReducer(s1, {
      type: 'JOIN',
      payload: {
        participant: {
          id: 'p-2',
          name: 'Bob',
          avatar: '',
          role: 'Observer',
          connected: true,
          has_voted: false,
          vote: null,
        },
      },
    });

    expect(s2.participants).toHaveLength(2);
    expect(s2.facilitator_id).toBe('p-1');
    expect(s2.participants[1].role).toBe('Observer');
  });

  it('allows facilitator to toggle between Estimator and Observer without losing authority', () => {
    const s1 = roomReducer(initial, {
      type: 'JOIN',
      payload: {
        participant: { id: 'p-1', name: 'Alice', avatar: '', role: 'Estimator', connected: true, has_voted: false, vote: null },
      },
    });
    expect(s1.facilitator_id).toBe('p-1');
    expect(s1.participants[0].role).toBe('Estimator');

    // Facilitator switches to Observer
    const s2 = roomReducer(s1, {
      type: 'UPDATE_ROLE',
      payload: { targetId: 'p-1', newRole: 'Observer' },
    });
    expect(s2.facilitator_id).toBe('p-1');
    expect(s2.participants[0].role).toBe('Observer');

    // Facilitator switches back to Estimator
    const s3 = roomReducer(s2, {
      type: 'UPDATE_ROLE',
      payload: { targetId: 'p-1', newRole: 'Estimator' },
    });
    expect(s3.facilitator_id).toBe('p-1');
    expect(s3.participants[0].role).toBe('Estimator');
  });

  it('updates deck configuration with SET_DECK', () => {
    const s1 = roomReducer(initial, {
      type: 'SET_DECK',
      payload: { deck: { type: 'tshirt', cards: [...DEFAULT_DECKS.tshirt] } },
    });

    expect(s1.deck.type).toBe('tshirt');
    expect(s1.deck.cards).toContain('XS');
    expect(s1.deck.cards).toContain('XXL');
  });

  it('transitions from Idle to Voting on CAST_VOTE', () => {
    const state: RoomState = {
      ...initial,
      participants: [
        { id: 'p-1', name: 'Alice', avatar: '', role: 'Estimator', connected: true, has_voted: false, vote: null },
      ],
    };

    const s1 = roomReducer(state, {
      type: 'CAST_VOTE',
      payload: { participantId: 'p-1', vote: '5' },
    });

    expect(s1.phase).toBe('Voting');
    expect(s1.participants[0].has_voted).toBe(true);
    expect(s1.participants[0].vote).toBe('5');
  });

  it('rejects CAST_VOTE when phase is Revealed or Finalized', () => {
    const revealedState: RoomState = {
      ...initial,
      phase: 'Revealed',
      participants: [
        { id: 'p-1', name: 'Alice', avatar: '', role: 'Estimator', connected: true, has_voted: true, vote: '5' },
      ],
    };

    const s1 = roomReducer(revealedState, {
      type: 'CAST_VOTE',
      payload: { participantId: 'p-1', vote: '8' },
    });

    // Vote should remain unchanged ('5')
    expect(s1.participants[0].vote).toBe('5');
  });

  it('handles ADD_STORY on empty room and appends to backlog when current_story exists', () => {
    const storyA: Story = { id: 's-A', title: 'Story A', description: '', acceptance_criteria: [] };
    const storyB: Story = { id: 's-B', title: 'Story B', description: '', acceptance_criteria: [] };

    const s1 = roomReducer(initial, {
      type: 'ADD_STORY',
      payload: { story: storyA },
    });

    expect(s1.current_story?.id).toBe('s-A');
    expect(s1.backlog).toHaveLength(0);

    const s2 = roomReducer(s1, {
      type: 'ADD_STORY',
      payload: { story: storyB },
    });

    expect(s2.current_story?.id).toBe('s-A');
    expect(s2.backlog).toHaveLength(1);
    expect(s2.backlog[0].id).toBe('s-B');
  });

  it('updates story in current_story or backlog via UPDATE_STORY', () => {
    const story1: Story = { id: 's-1', title: 'Story 1', description: 'Desc 1', acceptance_criteria: [] };
    const story2: Story = { id: 's-2', title: 'Story 2', description: 'Desc 2', acceptance_criteria: [] };

    const state: RoomState = {
      ...initial,
      current_story: story1,
      backlog: [story2],
    };

    // Update current story
    const s1 = roomReducer(state, {
      type: 'UPDATE_STORY',
      payload: { storyId: 's-1', updates: { title: 'Updated Story 1' } },
    });
    expect(s1.current_story?.title).toBe('Updated Story 1');

    // Update backlog story
    const s2 = roomReducer(s1, {
      type: 'UPDATE_STORY',
      payload: { storyId: 's-2', updates: { description: 'Updated Desc 2' } },
    });
    expect(s2.backlog[0].description).toBe('Updated Desc 2');
  });

  it('removes story from backlog with REMOVE_STORY', () => {
    const story1: Story = { id: 's-1', title: 'Story 1', description: '', acceptance_criteria: [] };
    const story2: Story = { id: 's-2', title: 'Story 2', description: '', acceptance_criteria: [] };

    const state: RoomState = {
      ...initial,
      backlog: [story1, story2],
    };

    const s1 = roomReducer(state, {
      type: 'REMOVE_STORY',
      payload: { storyId: 's-1' },
    });

    expect(s1.backlog).toHaveLength(1);
    expect(s1.backlog[0].id).toBe('s-2');
  });

  it('validates strict permutation on REORDER_BACKLOG and ignores invalid reorders', () => {
    const story1: Story = { id: 's-1', title: 'Story 1', description: '', acceptance_criteria: [] };
    const story2: Story = { id: 's-2', title: 'Story 2', description: '', acceptance_criteria: [] };
    const story3: Story = { id: 's-3', title: 'Story 3', description: '', acceptance_criteria: [] };

    const state: RoomState = {
      ...initial,
      backlog: [story1, story2, story3],
    };

    // Valid permutation: [3, 1, 2]
    const validState = roomReducer(state, {
      type: 'REORDER_BACKLOG',
      payload: { storyIds: ['s-3', 's-1', 's-2'] },
    });
    expect(validState.backlog.map((s) => s.id)).toEqual(['s-3', 's-1', 's-2']);

    // Duplicate IDs: [3, 3, 1] -> ignored
    const dupState = roomReducer(state, {
      type: 'REORDER_BACKLOG',
      payload: { storyIds: ['s-3', 's-3', 's-1'] },
    });
    expect(dupState.backlog.map((s) => s.id)).toEqual(['s-1', 's-2', 's-3']);

    // Missing IDs: [3, 1] -> ignored
    const missingState = roomReducer(state, {
      type: 'REORDER_BACKLOG',
      payload: { storyIds: ['s-3', 's-1'] },
    });
    expect(missingState.backlog.map((s) => s.id)).toEqual(['s-1', 's-2', 's-3']);

    // Unknown IDs: [3, 1, 999] -> ignored
    const unknownState = roomReducer(state, {
      type: 'REORDER_BACKLOG',
      payload: { storyIds: ['s-3', 's-1', 's-999'] },
    });
    expect(unknownState.backlog.map((s) => s.id)).toEqual(['s-1', 's-2', 's-3']);
  });

  it('advances to next story, clears votes, and resets phase to Idle on NEXT_STORY', () => {
    const story1: Story = { id: 's-1', title: 'Story 1', description: '', acceptance_criteria: [] };
    const story2: Story = { id: 's-2', title: 'Story 2', description: '', acceptance_criteria: [] };
    const story3: Story = { id: 's-3', title: 'Story 3', description: '', acceptance_criteria: [] };

    const state: RoomState = {
      ...initial,
      phase: 'Finalized',
      current_story: story1,
      backlog: [story2, story3],
      consensus: { category: 'Consensus', consensus_pct: 100, agreement_count: 2, total_votes: 2, suggested_points: '5' },
      participants: [
        { id: 'p-1', name: 'Alice', avatar: '', role: 'Estimator', connected: true, has_voted: true, vote: '5' },
        { id: 'p-2', name: 'Bob', avatar: '', role: 'Estimator', connected: true, has_voted: true, vote: '5' },
      ],
    };

    const s1 = roomReducer(state, { type: 'NEXT_STORY' });

    expect(s1.phase).toBe('Idle');
    expect(s1.current_story?.id).toBe('s-2');
    expect(s1.backlog).toHaveLength(1);
    expect(s1.backlog[0].id).toBe('s-3');
    expect(s1.consensus).toBeNull();
    expect(s1.participants[0].vote).toBeNull();
    expect(s1.participants[0].has_voted).toBe(false);
    expect(s1.participants[1].vote).toBeNull();
    expect(s1.participants[1].has_voted).toBe(false);
  });

  it('clears previous round votes on START_VOTING from Finalized phase', () => {
    const finalizedState: RoomState = {
      ...initial,
      phase: 'Finalized',
      participants: [
        { id: 'p-1', name: 'Alice', avatar: '', role: 'Estimator', connected: true, has_voted: true, vote: '5' },
      ],
    };

    const s1 = roomReducer(finalizedState, { type: 'START_VOTING' });
    expect(s1.phase).toBe('Voting');
    expect(s1.participants[0].vote).toBeNull();
    expect(s1.participants[0].has_voted).toBe(false);
  });

  it('resets round cleanly on RESET_ROUND', () => {
    const votingState: RoomState = {
      ...initial,
      phase: 'Revealed',
      consensus: { category: 'Consensus', consensus_pct: 100, agreement_count: 2, total_votes: 2, suggested_points: '5' },
      participants: [
        { id: 'p-1', name: 'Alice', avatar: '', role: 'Estimator', connected: true, has_voted: true, vote: '5' },
        { id: 'p-2', name: 'Bob', avatar: '', role: 'Estimator', connected: true, has_voted: true, vote: '5' },
      ],
    };

    const s1 = roomReducer(votingState, { type: 'RESET_ROUND' });
    expect(s1.phase).toBe('Idle');
    expect(s1.consensus).toBeNull();
    expect(s1.participants[0].vote).toBeNull();
    expect(s1.participants[0].has_voted).toBe(false);
    expect(s1.participants[1].vote).toBeNull();
    expect(s1.participants[1].has_voted).toBe(false);
  });
});
