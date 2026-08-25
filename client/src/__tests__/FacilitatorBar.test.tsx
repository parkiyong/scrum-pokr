import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FacilitatorBar } from '../components/FacilitatorBar';

describe('FacilitatorBar component', () => {
  it('renders start voting in Idle phase', () => {
    const handleStart = vi.fn();
    render(
      <FacilitatorBar
        phase="Idle"
        onStartVoting={handleStart}
        onRevealCards={vi.fn()}
        onTriggerReVote={vi.fn()}
        onFinalize={vi.fn()}
        isFacilitator={true}
      />
    );

    const btn = screen.getByText(/Start Voting/i);
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(handleStart).toHaveBeenCalled();
  });

  it('renders reveal cards in Voting phase', () => {
    const handleReveal = vi.fn();
    render(
      <FacilitatorBar
        phase="Voting"
        onStartVoting={vi.fn()}
        onRevealCards={handleReveal}
        onTriggerReVote={vi.fn()}
        onFinalize={vi.fn()}
        isFacilitator={true}
      />
    );

    const btn = screen.getByText(/Reveal Cards/i);
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(handleReveal).toHaveBeenCalled();
  });

  it('renders revote and finalize buttons in Revealed phase', () => {
    const handleReVote = vi.fn();
    const handleFinalize = vi.fn();
    render(
      <FacilitatorBar
        phase="Revealed"
        onStartVoting={vi.fn()}
        onRevealCards={vi.fn()}
        onTriggerReVote={handleReVote}
        onFinalize={handleFinalize}
        isFacilitator={true}
      />
    );

    const revoteBtn = screen.getByText(/Re-Vote/i);
    expect(revoteBtn).toBeInTheDocument();
    fireEvent.click(revoteBtn);
    expect(handleReVote).toHaveBeenCalled();

    const finalizeBtn = screen.getByText(/Finalize/i);
    expect(finalizeBtn).toBeInTheDocument();
    fireEvent.click(finalizeBtn);
    expect(handleFinalize).toHaveBeenCalled();
  });

  it('renders nothing when not facilitator', () => {
    const { container } = render(
      <FacilitatorBar
        phase="Voting"
        onStartVoting={vi.fn()}
        onRevealCards={vi.fn()}
        onTriggerReVote={vi.fn()}
        onFinalize={vi.fn()}
        isFacilitator={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders next story button in Finalized phase', () => {
    const handleNextStory = vi.fn();
    render(
      <FacilitatorBar
        phase="Finalized"
        onStartVoting={vi.fn()}
        onRevealCards={vi.fn()}
        onTriggerReVote={vi.fn()}
        onFinalize={vi.fn()}
        onNextStory={handleNextStory}
        isFacilitator={true}
      />
    );

    const nextBtn = screen.getByRole('button', { name: /Next Story/i });
    expect(nextBtn).toBeInTheDocument();
    fireEvent.click(nextBtn);
    expect(handleNextStory).toHaveBeenCalled();
  });

  it('renders deck config button when onOpenDeckConfig provided', () => {
    const handleDeck = vi.fn();
    render(
      <FacilitatorBar
        phase="Idle"
        onStartVoting={vi.fn()}
        onRevealCards={vi.fn()}
        onTriggerReVote={vi.fn()}
        onFinalize={vi.fn()}
        onOpenDeckConfig={handleDeck}
        isFacilitator={true}
      />
    );

    const deckBtn = screen.getByText(/Deck/i);
    expect(deckBtn).toBeInTheDocument();
    fireEvent.click(deckBtn);
    expect(handleDeck).toHaveBeenCalled();
  });
});
