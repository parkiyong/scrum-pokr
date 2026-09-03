import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ConsensusCategory,
  ConsensusSummary,
  DeckConfig,
  LocalSessionProfile,
  Role,
  RoomState,
  Story,
} from '../types/room';
import { getOrCreateParticipantId, getStoredProfile, saveStoredProfile } from '../utils/session';
import { api } from '../api';

export interface UseRoomSocketReturn {
  roomState: RoomState | null;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  currentParticipantId: string;
  myProfile: LocalSessionProfile | null;
  isFacilitator: boolean;
  joinRoom: (name: string, avatar: string, role?: Role) => void;
  startVoting: () => void;
  castVote: (value: string) => void;
  retractVote: () => void;
  revealCards: () => void;
  triggerReVote: () => void;
  finalizeStory: (points?: string) => void;
  nextStory: () => void;
  setDeck: (deck: DeckConfig) => void;
  selectStory: (story: Story | null) => void;
  selectStoryById: (storyId: string) => void;
  addStory: (title: string, description?: string) => Promise<void>;
  updateStory: (storyId: string, updates: Partial<Omit<Story, 'id'>>) => Promise<void>;
  removeStory: (storyId: string) => void;
  reorderBacklog: (storyIds: string[]) => void;
  updateRole: (targetId: string, newRole: Role) => void;
  transferFacilitator: (targetId: string) => void;
}

/**
 * Calculates statistical consensus summary from participant votes.
 */
export function computeConsensusFromParticipants(
  participants: { vote?: string | null; role?: string }[]
): ConsensusSummary | null {
  const votes = participants
    .filter((p) => p.vote !== undefined && p.vote !== null && p.vote !== '' && p.vote !== '?')
    .map((p) => String(p.vote));

  if (votes.length === 0) return null;

  const counts: Record<string, number> = {};
  votes.forEach((v) => {
    counts[v] = (counts[v] || 0) + 1;
  });

  let mode = votes[0];
  let maxCount = 0;
  Object.entries(counts).forEach(([val, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mode = val;
    }
  });

  const consensusPct = Math.round((maxCount / votes.length) * 100);

  const numVotes = votes.map((v) => parseFloat(v)).filter((n) => !isNaN(n));
  let minVote: string | undefined;
  let maxVote: string | undefined;
  let spread: number | undefined;

  if (numVotes.length > 0) {
    const minN = Math.min(...numVotes);
    const maxN = Math.max(...numVotes);
    minVote = String(minN);
    maxVote = String(maxN);
    spread = maxN - minN;
  }

  let category: ConsensusCategory = 'Consensus';
  if (consensusPct === 100) {
    category = 'Consensus';
  } else if (spread !== undefined && spread > 5) {
    category = 'WideSpread';
  } else if (consensusPct >= 60) {
    const modeNum = parseFloat(mode);
    if (!isNaN(modeNum) && numVotes.length > 0) {
      const nonModeVotes = numVotes.filter((n) => n !== modeNum);
      const avgOutlier = nonModeVotes.length > 0 ? nonModeVotes.reduce((a, b) => a + b, 0) / nonModeVotes.length : modeNum;
      category = avgOutlier < modeNum ? 'LowOutlier' : 'HighOutlier';
    } else {
      category = 'Consensus';
    }
  } else {
    category = 'BimodalSplit';
  }

  return {
    category,
    suggested_points: mode,
    consensus_pct: consensusPct,
    agreement_count: maxCount,
    total_votes: votes.length,
    min_vote: minVote,
    max_vote: maxVote,
  };
}

export function shouldApplyRoomState(
  current: RoomState | null,
  incoming: RoomState,
  force = false,
): boolean {
  if (force || !current) return true;
  return (incoming.revision ?? 0) >= (current.revision ?? 0);
}

export function useRoomSocket(slug: string): UseRoomSocketReturn {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [myProfile, setMyProfile] = useState<LocalSessionProfile | null>(() => getStoredProfile(slug));

  const participantIdRef = useRef<string>(myProfile?.participant_id || getOrCreateParticipantId());
  const eventSourceRef = useRef<EventSource | null>(null);

  const applyRoomState = useCallback((incoming: RoomState, force = false) => {
    setRoomState((current) => (shouldApplyRoomState(current, incoming, force) ? incoming : current));
  }, []);

  const joinRoom = useCallback(async (nickname: string, avatar: string, role?: Role) => {
    const profile: LocalSessionProfile = {
      participant_id: participantIdRef.current,
      nickname,
      avatar,
      role,
    };
    saveStoredProfile(slug, profile);
    setMyProfile(profile);

    try {
      const res = await api.api.rooms[':code'].join.$post({
        param: { code: slug },
        json: {
          participant_id: profile.participant_id,
          name: nickname,
          avatar: avatar || '',
          role: role || 'Estimator',
        },
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.participant_id || data.participantId) {
          const assignedPid = data.participant_id || data.participantId;
          participantIdRef.current = assignedPid;
          profile.participant_id = assignedPid;
          saveStoredProfile(slug, profile);
        }
        if (data.state) {
          applyRoomState(data.state as RoomState, true);
        }
      }
    } catch (err) {
      console.error(`[RPC] Error joining room ${slug}:`, err);
    }
  }, [slug, applyRoomState]);

  useEffect(() => {
    if (!slug || !myProfile) return;

    const pollRoomState = async () => {
      const es = eventSourceRef.current;
      if (es && es.readyState === EventSource.OPEN) return;

      try {
        const res = await fetch(
          `/api/rooms/${encodeURIComponent(slug)}?participantId=${encodeURIComponent(participantIdRef.current)}`,
        );
        if (res.ok) {
          const state = (await res.json()) as RoomState;
          applyRoomState(state, false);
        }
      } catch {
        // Ignore transient polling failures when SSE is unavailable.
      }
    };

    const interval = setInterval(pollRoomState, 4000);
    return () => clearInterval(interval);
  }, [slug, myProfile, applyRoomState]);

  useEffect(() => {
    if (!slug) return;

    let isAborted = false;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let connectTimeout: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      if (isAborted) return;
      const pid = participantIdRef.current;
      const sseUrl = `/api/rooms/${encodeURIComponent(slug)}/events?participantId=${encodeURIComponent(pid)}`;

      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      connectTimeout = setTimeout(() => {
        if (isAborted) return;
        setStatus((current) => (current === 'connecting' ? 'connected' : current));
      }, 8000);

      es.onopen = () => {
        if (isAborted) return;
        if (connectTimeout) {
          clearTimeout(connectTimeout);
          connectTimeout = null;
        }
        setStatus('connected');
        const stored = getStoredProfile(slug);
        if (stored) {
          joinRoom(stored.nickname, stored.avatar || '', stored.role);
        }
      };

      es.addEventListener('room_state', (event) => {
        if (isAborted) return;
        try {
          const state: RoomState = JSON.parse(event.data);
          applyRoomState(state, false);
        } catch (err) {
          console.error('[SSE] Failed to parse room_state event:', err);
        }
      });

      es.addEventListener('ping', () => {
        // Keep-alive heartbeat acknowledgement
      });

      es.onerror = () => {
        if (isAborted) return;
        if (connectTimeout) {
          clearTimeout(connectTimeout);
          connectTimeout = null;
        }
        setStatus('error');
        es.close();
        if (!reconnectTimeout) {
          reconnectTimeout = setTimeout(() => {
            reconnectTimeout = null;
            connectSSE();
          }, 3000);
        }
      };
    };

    connectSSE();

    return () => {
      isAborted = true;
      if (connectTimeout) {
        clearTimeout(connectTimeout);
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [slug, joinRoom, applyRoomState]);

  const startVoting = useCallback(async () => {
    try {
      const res = await api.api.rooms[':code']['start-voting'].$post({
        param: { code: slug },
        json: { participant_id: participantIdRef.current },
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.state) applyRoomState(data.state as RoomState, true);
      } else {
        throw new Error(`Failed to start voting (status ${res.status})`);
      }
    } catch (err) {
      console.error('[RPC] Error starting voting:', err);
    }
  }, [slug, applyRoomState]);

  const castVote = useCallback(async (value: string) => {
    try {
      const res = await api.api.rooms[':code'].vote.$post({
        param: { code: slug },
        json: { participant_id: participantIdRef.current, vote: value },
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.state) applyRoomState(data.state as RoomState, true);
      } else {
        throw new Error(`Failed to cast vote (status ${res.status})`);
      }
    } catch (err) {
      console.error('[RPC] Error casting vote:', err);
    }
  }, [slug, applyRoomState]);

  const retractVote = useCallback(async () => {
    try {
      const res = await api.api.rooms[':code'].vote.$post({
        param: { code: slug },
        json: { participant_id: participantIdRef.current, vote: null },
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.state) applyRoomState(data.state as RoomState, true);
      } else {
        throw new Error(`Failed to retract vote (status ${res.status})`);
      }
    } catch (err) {
      console.error('[RPC] Error retracting vote:', err);
    }
  }, [slug, applyRoomState]);

  const revealCards = useCallback(async () => {
    try {
      const res = await api.api.rooms[':code'].reveal.$post({
        param: { code: slug },
        json: { participant_id: participantIdRef.current },
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.state) applyRoomState(data.state as RoomState, true);
      } else {
        throw new Error(`Failed to reveal cards (status ${res.status})`);
      }
    } catch (err) {
      console.error('[RPC] Error revealing cards:', err);
    }
  }, [slug, applyRoomState]);

  const triggerReVote = useCallback(async () => {
    try {
      const res = await api.api.rooms[':code'].reset.$post({
        param: { code: slug },
        json: { participant_id: participantIdRef.current },
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.state) applyRoomState(data.state as RoomState, true);
      } else {
        throw new Error(`Failed to reset round (status ${res.status})`);
      }
    } catch (err) {
      console.error('[RPC] Error triggering revote:', err);
    }
  }, [slug, applyRoomState]);

  const finalizeStory = useCallback(async (points?: string) => {
    try {
      const res = await api.api.rooms[':code'].finalize.$post({
        param: { code: slug },
        json: { participant_id: participantIdRef.current, estimate: points },
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.state) applyRoomState(data.state as RoomState, true);
      } else {
        throw new Error(`Failed to finalize story (status ${res.status})`);
      }
    } catch (err) {
      console.error('[RPC] Error finalizing story:', err);
    }
  }, [slug, applyRoomState]);

  const nextStory = useCallback(async () => {
    try {
      const res = await api.api.rooms[':code']['next-story'].$post({
        param: { code: slug },
        json: { participant_id: participantIdRef.current },
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.state) applyRoomState(data.state as RoomState, true);
      } else {
        throw new Error(`Failed to advance next story (status ${res.status})`);
      }
    } catch (err) {
      console.error('[RPC] Error advancing next story:', err);
    }
  }, [slug, applyRoomState]);

  const setDeck = useCallback(async (deck: DeckConfig) => {
    try {
      const res = await api.api.rooms[':code'].deck.$post({
        param: { code: slug },
        json: { participant_id: participantIdRef.current, deck },
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.state) applyRoomState(data.state as RoomState, true);
      } else {
        throw new Error(`Failed to configure deck (status ${res.status})`);
      }
    } catch (err) {
      console.error('[RPC] Error configuring deck:', err);
    }
  }, [slug, applyRoomState]);

  const selectStory = useCallback(async (story: Story | null) => {
    try {
      const res = await api.api.rooms[':code'].story.$post({
        param: { code: slug },
        json: { participant_id: participantIdRef.current, story },
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.state) applyRoomState(data.state as RoomState, true);
      } else {
        throw new Error(`Failed to select story (status ${res.status})`);
      }
    } catch (err) {
      console.error('[RPC] Error selecting story:', err);
    }
  }, [slug, applyRoomState]);

  const selectStoryById = useCallback((storyId: string) => {
    const found = roomState?.backlog.find((s) => s.id === storyId);
    if (found) {
      selectStory(found);
    }
  }, [selectStory, roomState?.backlog]);

  const addStory = useCallback(async (title: string, description: string = '') => {
    try {
      const res = await api.api.rooms[':code'].stories.$post({
        param: { code: slug },
        json: {
          participant_id: participantIdRef.current,
          story: {
            title,
            description,
            acceptance_criteria: [],
          },
        },
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.state) applyRoomState(data.state as RoomState, true);
      } else {
        throw new Error(`Failed to add story (status ${res.status})`);
      }
    } catch (err) {
      console.error('[RPC] Error adding story:', err);
    }
  }, [slug, applyRoomState]);

  const updateStory = useCallback(async (storyId: string, updates: Partial<Omit<Story, 'id'>>) => {
    try {
      const res = await api.api.rooms[':code'].stories[':storyId'].$put({
        param: { code: slug, storyId },
        json: {
          participant_id: participantIdRef.current,
          ...updates,
        },
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.state) applyRoomState(data.state as RoomState, true);
      } else {
        throw new Error(`Failed to update story (status ${res.status})`);
      }
    } catch (err) {
      console.error('[RPC] Error updating story:', err);
    }
  }, [slug, applyRoomState]);

  const removeStory = useCallback(async (storyId: string) => {
    try {
      const res = await api.api.rooms[':code'].stories[':storyId'].$delete({
        param: { code: slug, storyId },
        query: { participantId: participantIdRef.current },
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.state) applyRoomState(data.state as RoomState, true);
      } else {
        throw new Error(`Failed to remove story (status ${res.status})`);
      }
    } catch (err) {
      console.error('[RPC] Error removing story:', err);
    }
  }, [slug, applyRoomState]);

  const reorderBacklog = useCallback(async (storyIds: string[]) => {
    try {
      const res = await api.api.rooms[':code']['reorder-backlog'].$post({
        param: { code: slug },
        json: { participant_id: participantIdRef.current, story_ids: storyIds },
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.state) applyRoomState(data.state as RoomState, true);
      } else {
        throw new Error(`Failed to reorder backlog (status ${res.status})`);
      }
    } catch (err) {
      console.error('[RPC] Error reordering backlog:', err);
    }
  }, [slug, applyRoomState]);

  const updateRole = useCallback(async (targetId: string, newRole: Role) => {
    try {
      const res = await api.api.rooms[':code'].role.$post({
        param: { code: slug },
        json: { participant_id: participantIdRef.current, target_id: targetId, new_role: newRole },
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.state) applyRoomState(data.state as RoomState, true);
      } else {
        throw new Error(`Failed to update role (status ${res.status})`);
      }
    } catch (err) {
      console.error('[RPC] Error updating role:', err);
    }
  }, [slug, applyRoomState]);

  const transferFacilitator = useCallback(async (targetId: string) => {
    try {
      const res = await api.api.rooms[':code']['transfer-facilitator'].$post({
        param: { code: slug },
        json: { participant_id: participantIdRef.current, target_id: targetId },
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.state) applyRoomState(data.state as RoomState, true);
      } else {
        throw new Error(`Failed to transfer facilitator (status ${res.status})`);
      }
    } catch (err) {
      console.error('[RPC] Error transferring facilitator:', err);
    }
  }, [slug, applyRoomState]);

  const isFacilitator =
    roomState?.facilitator_id === participantIdRef.current ||
    (roomState !== null &&
      roomState.participants.length === 1 &&
      roomState.participants[0].id === participantIdRef.current);

  return {
    roomState,
    status,
    currentParticipantId: participantIdRef.current,
    myProfile,
    isFacilitator,
    joinRoom,
    startVoting,
    castVote,
    retractVote,
    revealCards,
    triggerReVote,
    finalizeStory,
    nextStory,
    setDeck,
    selectStory,
    selectStoryById,
    addStory,
    updateStory,
    removeStory,
    reorderBacklog,
    updateRole,
    transferFacilitator,
  };
}
