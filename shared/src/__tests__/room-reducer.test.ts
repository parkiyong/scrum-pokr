import { describe, it, expect } from 'vitest';
import { roomReducer } from '../room-reducer';
import type { RoomState } from '../domain';

describe('Room Reducer State Transitions', () => {
  const initial: RoomState = {
    slug: 'swift-badger-42',
    short_code: 'SWB-42',
    phase: 'Idle',
    facilitator_id: '',
    current_story: null,
    backlog: [],
    point_references: [],
    story_doctor_report: null,
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
