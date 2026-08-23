import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PointReferenceLibrary } from '../components/PointReferenceLibrary';
import { PointReference } from '../types/room';

const mockReferences: PointReference[] = [
  {
    points: 1,
    title: '1 Point',
    description: 'Minor copy tweak in landing page footer.',
  },
  {
    points: 2,
    title: '2 Points',
    description: 'New form field with validation.',
  },
  {
    points: 3,
    title: '3 Points',
    description: 'Standard CRUD endpoint and table view.',
  },
  {
    points: 5,
    title: '5 Points',
    description: 'Stripe webhook receiver and retry worker.',
  },
  {
    points: 8,
    title: '8 Points',
    description: 'OAuth2 SSO login with token refresh.',
  },
  {
    points: 13,
    title: '13 Points',
    description: 'Zero-downtime database sharding migration.',
  },
];

describe('PointReferenceLibrary component', () => {
  it('renders benchmark cards across standard points', () => {
    render(
      <PointReferenceLibrary
        references={mockReferences}
        isFacilitator={false}
        onUpdateReferences={vi.fn()}
      />
    );

    expect(screen.getByText(/Point Reference Library/i)).toBeInTheDocument();
    expect(screen.getByText('Minor copy tweak in landing page footer.')).toBeInTheDocument();
    expect(screen.getByText('Zero-downtime database sharding migration.')).toBeInTheDocument();
  });

  it('allows collapsing and expanding sidebar', () => {
    render(
      <PointReferenceLibrary
        references={mockReferences}
        isFacilitator={false}
        onUpdateReferences={vi.fn()}
      />
    );

    const toggle = screen.getByText(/Point Reference Library/i);
    expect(screen.getByText('Minor copy tweak in landing page footer.')).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(toggle);
    expect(screen.queryByText('Minor copy tweak in landing page footer.')).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(toggle);
    expect(screen.getByText('Minor copy tweak in landing page footer.')).toBeInTheDocument();
  });

  it('allows facilitator to customize benchmark cards', () => {
    const handleUpdate = vi.fn();
    render(
      <PointReferenceLibrary
        references={mockReferences}
        isFacilitator={true}
        onUpdateReferences={handleUpdate}
      />
    );

    const editBtn = screen.getByText(/Customize/i);
    expect(editBtn).toBeInTheDocument();
    fireEvent.click(editBtn);

    expect(screen.getByText(/Customize Point Reference Library/i)).toBeInTheDocument();

    // Change first card description
    const descInput = screen.getByDisplayValue('Minor copy tweak in landing page footer.');
    fireEvent.change(descInput, { target: { value: 'Updated custom copy change' } });

    // Save
    const saveBtn = screen.getByRole('button', { name: /Save Reference Library/i });
    fireEvent.click(saveBtn);

    expect(handleUpdate).toHaveBeenCalled();
    const updatedArg = handleUpdate.mock.calls[0][0];
    expect(updatedArg[0].description).toBe('Updated custom copy change');
  });
});
