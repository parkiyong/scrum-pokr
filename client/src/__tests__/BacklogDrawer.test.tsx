import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BacklogDrawer } from '../components/BacklogDrawer';
import { Story } from '../types/room';

describe('BacklogDrawer', () => {
  const sampleBacklog: Story[] = [
    {
      id: 'story-1',
      title: 'Auth Integration',
      description: 'Add OAuth logins',
      acceptance_criteria: ['Google OAuth'],
      points: '5',
    },
    {
      id: 'story-2',
      title: 'Payment Flow',
      description: 'Stripe integration',
      acceptance_criteria: ['Credit card support'],
    },
  ];

  it('renders story cards and points', () => {
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
      />
    );

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
      />
    );

    const removeButtons = screen.getAllByTitle('Remove from queue');
    fireEvent.click(removeButtons[0]);
    expect(onRemove).toHaveBeenCalledWith('story-1');
  });

  it('allows adding a story via manual form', async () => {
    const onAddStory = vi.fn().mockResolvedValue(undefined);
    render(
      <BacklogDrawer
        isOpen={true}
        onClose={vi.fn()}
        backlog={sampleBacklog}
        activeStoryId="story-1"
        isFacilitator={true}
        onSelectStory={vi.fn()}
        onAddStory={onAddStory}
        onReorder={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    const addBtn = screen.getByRole('button', { name: /Add Story/i });
    fireEvent.click(addBtn);

    const titleInput = screen.getByPlaceholderText(/Story Title/i);
    const descInput = screen.getByPlaceholderText(/Description/i);

    fireEvent.change(titleInput, { target: { value: 'New Feature Story' } });
    fireEvent.change(descInput, { target: { value: 'Feature details' } });

    const saveBtn = screen.getByRole('button', { name: /Save Story/i });
    await fireEvent.click(saveBtn);

    expect(onAddStory).toHaveBeenCalledWith('New Feature Story', 'Feature details');
  });
});
