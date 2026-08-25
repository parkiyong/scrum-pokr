import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DeckSelector } from '../components/DeckSelector';

describe('DeckSelector component', () => {
  it('renders all Fibonacci deck options and calls onSelectCard', () => {
    const handleSelect = vi.fn();
    render(<DeckSelector selectedCard="5" onSelectCard={handleSelect} />);

    const card5 = screen.getAllByRole('button', { name: /5/i })[0];
    expect(card5).toBeInTheDocument();

    const card8 = screen.getByRole('button', { name: '8' });
    expect(card8).toBeInTheDocument();
    fireEvent.click(card8);

    expect(handleSelect).toHaveBeenCalledWith('8');
  });

  it('renders custom deck cards when provided', () => {
    const handleSelect = vi.fn();
    render(
      <DeckSelector
        deck={{ type: 'tshirt', cards: ['XS', 'S', 'M', 'L', 'XL'] }}
        selectedCard="M"
        onSelectCard={handleSelect}
      />
    );

    expect(screen.getByRole('button', { name: 'XS' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'M' })).toBeInTheDocument();
  });
});
