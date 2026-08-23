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

  it('renders sync estimate button in Finalized phase when active story exists', () => {
    const handleSync = vi.fn();
    render(
      <FacilitatorBar
        phase="Finalized"
        activeStory={{
          id: 'story-1',
          title: 'Implement Auth',
          description: '',
          acceptance_criteria: [],
          key: 'ENG-101',
        }}
        hasTracker={true}
        onStartVoting={vi.fn()}
        onRevealCards={vi.fn()}
        onTriggerReVote={vi.fn()}
        onFinalize={vi.fn()}
        onSyncEstimate={handleSync}
        isFacilitator={true}
      />
    );

    const syncBtn = screen.getByRole('button', { name: /Sync Estimate to Tracker/i });
    expect(syncBtn).toBeInTheDocument();
    fireEvent.click(syncBtn);
    expect(handleSync).toHaveBeenCalled();
  });

  it('renders SPIDR slices button in Revealed phase', () => {
    const handleDecompose = vi.fn();
    render(
      <FacilitatorBar
        phase="Revealed"
        activeStory={{
          id: 'story-1',
          title: 'Large Story',
          description: '',
          acceptance_criteria: [],
        }}
        onStartVoting={vi.fn()}
        onRevealCards={vi.fn()}
        onTriggerReVote={vi.fn()}
        onFinalize={vi.fn()}
        onDecomposeSlices={handleDecompose}
        isFacilitator={true}
      />
    );

    const sliceBtn = screen.getByRole('button', { name: /SPIDR Slices/i });
    expect(sliceBtn).toBeInTheDocument();
    fireEvent.click(sliceBtn);
    expect(handleDecompose).toHaveBeenCalled();
  });
});

