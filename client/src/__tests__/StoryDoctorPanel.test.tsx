import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StoryDoctorPanel } from '../components/StoryDoctorPanel';
import { Story, StoryDoctorReport } from '../types/room';

const mockStory: Story = {
  id: 'story-1',
  title: 'Export story estimates to CSV',
  description: 'As a facilitator, I want to export finalized estimates to CSV so that I can document them.',
  acceptance_criteria: ['Clicking export downloads CSV', 'Sanitizes special characters'],
};

const mockReport: StoryDoctorReport = {
  story_id: 'story-1',
  scorecard: {
    overall_score: 85,
    summary: 'High quality story with minor recommendations.',
    issues: [],
    criteria: [
      {
        criterion: 'Independent',
        name: 'Independent',
        passed: true,
        score: 15,
        observation: 'No external blockers detected.',
      },
      {
        criterion: 'Negotiable',
        name: 'Negotiable',
        passed: true,
        score: 10,
        observation: 'Focuses on user outcome.',
      },
      {
        criterion: 'Valuable',
        name: 'Valuable',
        passed: true,
        score: 20,
        observation: 'Clear value statement.',
      },
      {
        criterion: 'Estimable',
        name: 'Estimable',
        passed: true,
        score: 20,
        observation: 'Concrete scope.',
      },
      {
        criterion: 'Small',
        name: 'Small',
        passed: true,
        score: 15,
        observation: 'Bounded scope.',
      },
      {
        criterion: 'Testable',
        name: 'Testable',
        passed: false,
        score: 0,
        observation: 'Consider adding more AC items.',
        recommendation: 'Add boundary test cases.',
      },
    ],
  },
  complexity: {
    data_models: 'In-memory state and client blob download.',
    dependencies_apis: 'Browser FileSaver API and clipboard.',
    blast_radius: 'Low regression risk.',
  },
  edge_cases: [
    {
      id: 'ec-1',
      category: 'ErrorFailure',
      category_name: 'Error & Failure States',
      title: 'Browser blocks automatic file download',
      description: 'Popup blocker prevents triggering file download.',
      checked: false,
    },
    {
      id: 'ec-2',
      category: 'EmptyBoundary',
      category_name: 'Empty & Boundary States',
      title: 'Empty round with 0 voted stories',
      description: 'Exporting empty CSV headers.',
      checked: false,
    },
  ],
};

describe('StoryDoctorPanel component', () => {
  it('renders idle state when no story is provided', () => {
    render(
      <StoryDoctorPanel
        story={null}
        report={null}
        phase="Idle"
        isFacilitator={true}
        onStartVoting={vi.fn()}
      />
    );

    expect(screen.getByText(/Story Doctor Idle/i)).toBeInTheDocument();
  });

  it('renders readiness score and criteria breakdown', () => {
    render(
      <StoryDoctorPanel
        story={mockStory}
        report={mockReport}
        phase="StoryDoctorReview"
        isFacilitator={true}
        onStartVoting={vi.fn()}
      />
    );

    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText(/Ready for Estimation/i)).toBeInTheDocument();
    expect(screen.getByText(/3-Axis Technical Complexity/i)).toBeInTheDocument();
    expect(screen.getByText(/Data Models & Schema/i)).toBeInTheDocument();

    // Toggle criteria breakdown
    const toggleBtn = screen.getByText(/INVEST Criteria Breakdown/i);
    expect(toggleBtn).toBeInTheDocument();
    fireEvent.click(toggleBtn);

    expect(screen.getByText('Independent')).toBeInTheDocument();
    expect(screen.getByText('Negotiable')).toBeInTheDocument();
    expect(screen.getByText('Valuable')).toBeInTheDocument();
  });

  it('allows clicking interactive edge-case checkboxes', () => {
    render(
      <StoryDoctorPanel
        story={mockStory}
        report={mockReport}
        phase="StoryDoctorReview"
        isFacilitator={true}
        onStartVoting={vi.fn()}
      />
    );

    expect(screen.getByText('Browser blocks automatic file download')).toBeInTheDocument();
    const checkbox = screen.getAllByRole('checkbox')[0];
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('allows facilitator to start voting round', () => {
    const handleStart = vi.fn();
    render(
      <StoryDoctorPanel
        story={mockStory}
        report={mockReport}
        phase="StoryDoctorReview"
        isFacilitator={true}
        onStartVoting={handleStart}
      />
    );

    const startBtn = screen.getByRole('button', { name: /Start Voting Round/i });
    expect(startBtn).toBeInTheDocument();
    fireEvent.click(startBtn);
    expect(handleStart).toHaveBeenCalled();
  });
});
