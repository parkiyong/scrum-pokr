import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PokerTableArena } from '../components/PokerTableArena';
import { Participant } from '../types/room';

describe('PokerTableArena component', () => {
  const participants: Participant[] = [
    {
      id: 'p-1',
      name: 'Alice',
      avatar: 'indigo',
      role: 'Estimator',
      connected: true,
      has_voted: true,
      vote: '5',
    },
    {
      id: 'p-2',
      name: 'Bob',
      avatar: 'emerald',
      role: 'Estimator',
      connected: true,
      has_voted: true,
      vote: '8',
    },
  ];

  it('renders 2-player seating without crashing', () => {
    render(
      <PokerTableArena
        participants={participants}
        currentUserId="p-1"
        facilitatorId="p-1"
        phase="Voting"
      />
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText(/ROUND 1 • VOTING/i)).toBeInTheDocument();
  });

  it('renders consensus hub and revealed scores legibly in Revealed phase', () => {
    render(
      <PokerTableArena
        participants={participants}
        currentUserId="p-1"
        facilitatorId="p-1"
        phase="Revealed"
        consensus={{
          category: 'WideSpread',
          consensus_pct: 50,
          agreement_count: 1,
          total_votes: 2,
          suggested_points: '5',
          min_vote: '5',
          max_vote: '8',
        }}
      />
    );

    expect(screen.getByText(/ROUND 1 • REVEALED/i)).toBeInTheDocument();
    expect(screen.getByText(/WideSpread/i)).toBeInTheDocument();
    expect(screen.getAllByText('5').length).toBeGreaterThan(0);
    expect(screen.getAllByText('8').length).toBeGreaterThan(0);
  });
});
