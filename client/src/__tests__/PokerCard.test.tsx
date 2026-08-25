import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PokerCard } from '../components/PokerCard';
import { Participant } from '../types/room';

describe('PokerCard component', () => {
  const participantVoted: Participant = {
    id: 'user-1',
    name: 'Sarah',
    avatar: 'emerald',
    role: 'Estimator',
    connected: true,
    has_voted: true,
    vote: '5',
  };

  it('renders voted state without revealing value for peers in voting phase', () => {
    render(
      <PokerCard
        participant={participantVoted}
        isSelf={false}
        isFacilitator={false}
        phase="Voting"
      />
    );

    expect(screen.getByText('Sarah')).toBeInTheDocument();
    expect(screen.getByText('Voted')).toBeInTheDocument();
  });

  it('reveals vote value in revealed phase', () => {
    render(
      <PokerCard
        participant={participantVoted}
        isSelf={false}
        isFacilitator={false}
        phase="Revealed"
        isConsensus={true}
      />
    );

    expect(screen.getByText('Sarah')).toBeInTheDocument();
    expect(screen.getAllByText('5').length).toBeGreaterThan(0);
  });
});
