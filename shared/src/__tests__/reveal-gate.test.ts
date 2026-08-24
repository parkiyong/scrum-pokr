import { describe, it, expect } from 'vitest';
import { maskRoomStateForParticipant, computeConsensus } from '../reveal-gate';
import type { RoomState } from '../domain';

describe('Reveal Gate & Consensus Invariants', () => {
  const baseState: RoomState = {
    slug: 'swift-badger-42',
    short_code: 'SWB-42',
    phase: 'Voting',
    facilitator_id: 'p-1',
    current_story: null,
    backlog: [],
    point_references: [],
    story_doctor_report: null,
    consensus: null,
    participants: [
      { id: 'p-1', name: 'Alice', avatar: '', role: 'Facilitator', connected: true, has_voted: true, vote: '5' },
      { id: 'p-2', name: 'Bob', avatar: '', role: 'Estimator', connected: true, has_voted: true, vote: '8' },
      { id: 'p-3', name: 'Charlie', avatar: '', role: 'Estimator', connected: true, has_voted: false, vote: null },
    ],
  };

  it('masks peer votes during Voting phase while showing own vote', () => {
    const maskedForBob = maskRoomStateForParticipant(baseState, 'p-2');

    expect(maskedForBob.phase).toBe('Voting');
    expect(maskedForBob.consensus).toBeNull();

    const alice = maskedForBob.participants.find((p) => p.id === 'p-1')!;
    expect(alice.has_voted).toBe(true);
    expect(alice.vote).toBeNull(); // Masked!

    const bob = maskedForBob.participants.find((p) => p.id === 'p-2')!;
    expect(bob.has_voted).toBe(true);
    expect(bob.vote).toBe('8'); // Own vote visible

    const charlie = maskedForBob.participants.find((p) => p.id === 'p-3')!;
    expect(charlie.has_voted).toBe(false);
    expect(charlie.vote).toBeNull();
  });

  it('reveals all card values and computes consensus when phase is Revealed', () => {
    const revealedState: RoomState = {
      ...baseState,
      phase: 'Revealed',
    };

    const masked = maskRoomStateForParticipant(revealedState, 'p-3');
    expect(masked.phase).toBe('Revealed');

    const alice = masked.participants.find((p) => p.id === 'p-1')!;
    expect(alice.vote).toBe('5'); // Revealed!

    const bob = masked.participants.find((p) => p.id === 'p-2')!;
    expect(bob.vote).toBe('8'); // Revealed!

    expect(masked.consensus).not.toBeNull();
    expect(masked.consensus?.total_votes).toBe(2);
  });

  it('correctly calculates 100% consensus', () => {
    const participants = [
      { id: 'p-1', name: 'Alice', avatar: '', role: 'Estimator' as const, connected: true, has_voted: true, vote: '5' },
      { id: 'p-2', name: 'Bob', avatar: '', role: 'Estimator' as const, connected: true, has_voted: true, vote: '5' },
      { id: 'p-3', name: 'Charlie', avatar: '', role: 'Estimator' as const, connected: true, has_voted: true, vote: '5' },
    ];

    const consensus = computeConsensus(participants);
    expect(consensus).not.toBeNull();
    expect(consensus?.category).toBe('Consensus');
    expect(consensus?.consensus_pct).toBe(100);
    expect(consensus?.suggested_points).toBe('5');
  });
});
