import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BacklogDrawer } from '../components/BacklogDrawer';
import { Story } from '../types/room';

describe('BacklogDrawer', () => {
  const sampleBacklog: Story[] = [
    {
      id: 'story-1',
      key: 'ENG-101',
      title: 'Auth Integration',
      description: 'Add OAuth logins',
      acceptance_criteria: ['Google OAuth'],
      points: '5',
      status: 'Estimated',
      url: 'https://linear.app/team/ENG-101',
    },
    {
      id: 'story-2',
      key: 'ENG-102',
      title: 'Payment Flow',
      description: 'Stripe integration',
      acceptance_criteria: ['Credit card support'],
      status: 'Ready',
    },
  ];

  it('renders story cards with key badges and points', () => {
    render(
      <BacklogDrawer
        isOpen={true}
        onClose={vi.fn()}
        backlog={sampleBacklog}
        activeStoryId="story-1"
        isFacilitator={true}
        onSelectStory={vi.fn()}
        onReorder={vi.fn()}
        onRemove={vi.fn()}
        onOpenConnectModal={vi.fn()}
      />
    );

    expect(screen.getByText('ENG-101')).toBeDefined();
    expect(screen.getByText('Auth Integration')).toBeDefined();
    expect(screen.getByText('5 pts')).toBeDefined();
    expect(screen.getByText('Payment Flow')).toBeDefined();
  });

  it('triggers story selection when clicking Estimate button', () => {
    const onSelectStory = vi.fn();
    render(
      <BacklogDrawer
        isOpen={true}
        onClose={vi.fn()}
        backlog={sampleBacklog}
        activeStoryId="story-1"
        isFacilitator={true}
        onSelectStory={onSelectStory}
        onReorder={vi.fn()}
        onRemove={vi.fn()}
        onOpenConnectModal={vi.fn()}
      />
    );

    const estimateButtons = screen.getAllByRole('button', { name: /Estimate/i });
    fireEvent.click(estimateButtons[0]);
    expect(onSelectStory).toHaveBeenCalledWith('story-2');
  });

  it('triggers reorder on move up/down clicks', () => {
    const onReorder = vi.fn();
    render(
      <BacklogDrawer
        isOpen={true}
        onClose={vi.fn()}
        backlog={sampleBacklog}
        activeStoryId="story-1"
        isFacilitator={true}
        onSelectStory={vi.fn()}
        onReorder={onReorder}
        onRemove={vi.fn()}
        onOpenConnectModal={vi.fn()}
      />
    );

    const moveDownButtons = screen.getAllByTitle('Move down');
    fireEvent.click(moveDownButtons[0]);
    expect(onReorder).toHaveBeenCalledWith(['story-2', 'story-1']);
  });

  it('triggers remove on remove click', () => {
    const onRemove = vi.fn();
    render(
      <BacklogDrawer
        isOpen={true}
        onClose={vi.fn()}
        backlog={sampleBacklog}
        activeStoryId="story-1"
        isFacilitator={true}
        onSelectStory={vi.fn()}
        onReorder={vi.fn()}
        onRemove={onRemove}
        onOpenConnectModal={vi.fn()}
      />
    );

    const removeButtons = screen.getAllByTitle('Remove from queue');
    fireEvent.click(removeButtons[0]);
    expect(onRemove).toHaveBeenCalledWith('story-1');
  });
});
