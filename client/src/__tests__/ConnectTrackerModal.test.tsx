import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConnectTrackerModal } from '../components/ConnectTrackerModal';

describe('ConnectTrackerModal', () => {
  it('renders tabs and switches between providers', () => {
    render(
      <ConnectTrackerModal
        isOpen={true}
        slug="test-room-42"
        isFacilitator={true}
        connectionPreview={null}
        trackerError={null}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
        onTestConnection={vi.fn()}
        onFetchBacklog={vi.fn()}
        onImportMarkdown={vi.fn()}
        onImportBacklog={vi.fn()}
        onClose={vi.fn()}
        onClearFeedback={vi.fn()}
      />
    );

    expect(screen.getByText('Backlog Ingestion & Tracker Sync')).toBeDefined();
    expect(screen.getByPlaceholderText('lin_api_...')).toBeDefined();

    // Switch to GitHub tab
    fireEvent.click(screen.getByText(/GitHub/i));
    expect(screen.getByPlaceholderText('ghp_...')).toBeDefined();

    // Switch to Jira tab
    fireEvent.click(screen.getByText(/Jira/i));
    expect(screen.getByPlaceholderText('my-company')).toBeDefined();

    // Switch to Markdown tab
    fireEvent.click(screen.getByText(/Markdown/i));
    expect(screen.getByPlaceholderText(/# Story 1/i)).toBeDefined();
  });

  it('triggers test connection when Linear API key is entered', () => {
    const onTestConnection = vi.fn();
    render(
      <ConnectTrackerModal
        isOpen={true}
        slug="test-room-42"
        isFacilitator={true}
        connectionPreview={null}
        trackerError={null}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
        onTestConnection={onTestConnection}
        onFetchBacklog={vi.fn()}
        onImportMarkdown={vi.fn()}
        onImportBacklog={vi.fn()}
        onClose={vi.fn()}
        onClearFeedback={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('lin_api_...');
    fireEvent.change(input, { target: { value: 'lin_api_test_key_123' } });

    const testBtn = screen.getByRole('button', { name: /Test Connection/i });
    fireEvent.click(testBtn);

    expect(onTestConnection).toHaveBeenCalledWith({
      provider: 'Linear',
      config: { api_key: 'lin_api_test_key_123' },
    });
  });

  it('imports markdown stories when pasted', () => {
    const onImportMarkdown = vi.fn();
    const onClose = vi.fn();
    render(
      <ConnectTrackerModal
        isOpen={true}
        slug="test-room-42"
        isFacilitator={true}
        connectionPreview={null}
        trackerError={null}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
        onTestConnection={vi.fn()}
        onFetchBacklog={vi.fn()}
        onImportMarkdown={onImportMarkdown}
        onImportBacklog={vi.fn()}
        onClose={onClose}
        onClearFeedback={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText(/Markdown/i));
    const textarea = screen.getByPlaceholderText(/# Story 1/i);
    fireEvent.change(textarea, { target: { value: '# Story A\n- [ ] AC1' } });

    const importBtn = screen.getByRole('button', { name: /Import Stories/i });
    fireEvent.click(importBtn);

    expect(onImportMarkdown).toHaveBeenCalledWith('# Story A\n- [ ] AC1');
    expect(onClose).toHaveBeenCalled();
  });
});
