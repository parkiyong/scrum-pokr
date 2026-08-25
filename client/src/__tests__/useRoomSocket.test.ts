import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRoomSocket, computeConsensusFromParticipants } from '../hooks/useRoomSocket';
import { saveStoredProfile } from '../utils/session';

// Mock EventSource
class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  listeners: Record<string, ((event: { data: string }) => void)[]> = {};
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: { data: string }) => void) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: (event: { data: string }) => void) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter((l) => l !== listener);
    }
  }

  emit(type: string, data: any) {
    const payload = { data: typeof data === 'string' ? data : JSON.stringify(data) };
    if (type === 'open' && this.onopen) {
      this.onopen();
    } else if (type === 'error' && this.onerror) {
      this.onerror();
    } else if (this.listeners[type]) {
      this.listeners[type].forEach((fn) => fn(payload));
    }
  }

  close() {
    this.closed = true;
  }
}

describe('useRoomSocket Hook & Hono RPC Adapter', () => {
  const originalEventSource = globalThis.EventSource;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
    MockEventSource.instances = [];
    (globalThis as any).EventSource = MockEventSource;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
      text: async () => JSON.stringify({ success: true }),
    } as any);
  });

  afterEach(() => {
    (globalThis as any).EventSource = originalEventSource;
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('initializes SSE connection with participantId and sets status to connected on open', async () => {
    const { result } = renderHook(() => useRoomSocket('TEST-42'));

    expect(result.current.status).toBe('connecting');
    expect(MockEventSource.instances.length).toBe(1);
    const es = MockEventSource.instances[0];
    expect(es.url).toContain('/api/rooms/TEST-42/events?participantId=');

    act(() => {
      es.emit('open', {});
    });

    expect(result.current.status).toBe('connected');
  });

  it('automatically rejoins room upon SSE connect when stored session profile exists', async () => {
    saveStoredProfile('TEST-42', {
      participant_id: 'part-saved-1',
      nickname: 'Alex',
      avatar: 'indigo',
      role: 'Estimator',
    });

    renderHook(() => useRoomSocket('TEST-42'));
    const es = MockEventSource.instances[0];

    await act(async () => {
      es.emit('open', {});
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/rooms/TEST-42/join'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          participant_id: 'part-saved-1',
          name: 'Alex',
          avatar: 'indigo',
          role: 'Estimator',
        }),
      })
    );
  });

  it('updates roomState when room_state SSE event is received', async () => {
    const { result } = renderHook(() => useRoomSocket('TEST-42'));
    const es = MockEventSource.instances[0];

    const mockServerState = {
      slug: 'TEST-42',
      short_code: 'T-42',
      phase: 'Voting',
      deck: { type: 'fibonacci', cards: ['1', '2', '3', '5', '8', '?'] },
      facilitator_id: 'fac-1',
      participants: [
        { id: 'fac-1', name: 'Facilitator', avatar: 'indigo', role: 'Estimator', connected: true, has_voted: true, vote: null },
        { id: 'p2', name: 'Bob', avatar: 'emerald', role: 'Estimator', connected: true, has_voted: false, vote: null },
      ],
      current_story: {
        id: 'story-1',
        title: 'Implement Hono RPC',
        description: 'Refactor useRoomSocket',
        acceptance_criteria: ['Type safe', 'Zero regressions'],
      },
      backlog: [],
      consensus: null,
    };

    act(() => {
      es.emit('room_state', mockServerState);
    });

    expect(result.current.roomState).not.toBeNull();
    expect(result.current.roomState?.slug).toBe('TEST-42');
    expect(result.current.roomState?.phase).toBe('Voting');
    expect(result.current.roomState?.current_story?.title).toBe('Implement Hono RPC');
    expect(result.current.roomState?.participants.length).toBe(2);
    expect(result.current.roomState?.participants[0].has_voted).toBe(true);
    expect(result.current.roomState?.participants[0].vote).toBeNull(); // Masked by Reveal Gate
  });

  it('dispatches typed RPC actions correctly via Hono client', async () => {
    const { result } = renderHook(() => useRoomSocket('TEST-42'));
    const pid = result.current.currentParticipantId;

    await act(async () => {
      result.current.castVote('5');
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/rooms/TEST-42/vote'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ participant_id: pid, vote: '5' }),
      })
    );

    await act(async () => {
      result.current.retractVote();
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/rooms/TEST-42/vote'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ participant_id: pid, vote: null }),
      })
    );

    await act(async () => {
      result.current.startVoting();
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/rooms/TEST-42/start-voting'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ participant_id: pid }),
      })
    );

    await act(async () => {
      result.current.revealCards();
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/rooms/TEST-42/reveal'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ participant_id: pid }),
      })
    );

    await act(async () => {
      result.current.triggerReVote();
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/rooms/TEST-42/reset'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ participant_id: pid }),
      })
    );

    await act(async () => {
      result.current.finalizeStory('8');
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/rooms/TEST-42/finalize'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ participant_id: pid, estimate: '8' }),
      })
    );

    await act(async () => {
      result.current.setDeck({ type: 'tshirt', cards: ['XS', 'S', 'M', 'L'] });
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/rooms/TEST-42/deck'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          participant_id: pid,
          deck: { type: 'tshirt', cards: ['XS', 'S', 'M', 'L'] },
        }),
      })
    );
  });

  it('correctly calculates consensus metrics from participant votes', () => {
    // Unanimous
    const consensus1 = computeConsensusFromParticipants([
      { vote: '5', role: 'Estimator' },
      { vote: '5', role: 'Estimator' },
      { vote: '5', role: 'Estimator' },
    ]);
    expect(consensus1?.category).toBe('Consensus');
    expect(consensus1?.consensus_pct).toBe(100);
    expect(consensus1?.suggested_points).toBe('5');

    // Wide spread
    const consensus2 = computeConsensusFromParticipants([
      { vote: '1', role: 'Estimator' },
      { vote: '8', role: 'Estimator' },
      { vote: '13', role: 'Estimator' },
    ]);
    expect(consensus2?.category).toBe('WideSpread');
    expect(consensus2?.min_vote).toBe('1');
    expect(consensus2?.max_vote).toBe('13');

    // High outlier (>60% agreement)
    const consensus3 = computeConsensusFromParticipants([
      { vote: '5', role: 'Estimator' },
      { vote: '5', role: 'Estimator' },
      { vote: '8', role: 'Estimator' },
    ]);
    expect(consensus3?.category).toBe('HighOutlier');
    expect(consensus3?.consensus_pct).toBe(67);
  });
});
