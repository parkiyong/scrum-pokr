import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ConnectionPreview,
  ConsensusCategory,
  ConsensusSummary,
  LocalSessionProfile,
  PointReference,
  Role,
  RoomSnapshotData,
  Story,
  StorySlice,
  TrackerConfig,
  TrackerQuery,
} from '../types/room';
import { getOrCreateParticipantId, getStoredProfile, saveStoredProfile } from '../utils/session';
import { api } from '../api';

export interface UseRoomSocketReturn {
  roomState: RoomSnapshotData | null;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  currentParticipantId: string;
  myProfile: LocalSessionProfile | null;
  isFacilitator: boolean;
  connectionPreview: ConnectionPreview | null;
  trackerError: string | null;
  syncFeedback: { storyId: string; success: boolean; message?: string } | null;
  joinRoom: (nickname: string, avatar: string, role?: Role) => void;
  startVoting: () => void;
  castVote: (value: string) => void;
  retractVote: () => void;
  revealCards: () => void;
  triggerReVote: () => void;
  finalizeStory: (points?: string) => void;
  selectStory: (story: Story | null) => void;
  selectStoryById: (storyId: string) => void;
  updatePointReferences: (references: PointReference[]) => void;
  toggleEdgeCaseCheck: (edgeCaseId: string, checked: boolean) => void;
  connectTracker: (config: TrackerConfig) => void;
  disconnectTracker: () => void;
  testTrackerConnection: (config: TrackerConfig) => void;
  fetchBacklog: (query?: TrackerQuery) => void;
  importBacklog: (stories: Story[]) => void;
  importMarkdown: (rawMarkdown: string) => void;
  syncEstimateToTracker: (storyId: string, points: number, postComment?: boolean) => void;
  pushStorySlices: (parentId: string, slices: StorySlice[]) => void;
  reorderBacklog: (storyIds: string[]) => void;
  removeStoryFromBacklog: (storyId: string) => void;
  updateRole: (targetId: string, newRole: Role) => void;
  transferFacilitator: (targetId: string) => void;
  clearTrackerFeedback: () => void;
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
    category = 'HighOutlier';
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

export function useRoomSocket(slug: string): UseRoomSocketReturn {
  const [roomState, setRoomState] = useState<RoomSnapshotData | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [myProfile, setMyProfile] = useState<LocalSessionProfile | null>(() => getStoredProfile(slug));
  const [connectionPreview, setConnectionPreview] = useState<ConnectionPreview | null>(null);
  const [trackerError, setTrackerError] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ storyId: string; success: boolean; message?: string } | null>(null);

  const participantIdRef = useRef<string>(myProfile?.participant_id || getOrCreateParticipantId());
  const eventSourceRef = useRef<EventSource | null>(null);

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
      await api.api.rooms[':code'].join.$post({
        param: { code: slug },
        json: {
          participant_id: profile.participant_id,
          name: nickname,
          avatar: avatar || '',
          role: role || 'Estimator',
        },
      });
    } catch (err) {
      console.error(`[RPC] Error joining room ${slug}:`, err);
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) return;

    const pid = participantIdRef.current;
    const sseUrl = `/api/rooms/${encodeURIComponent(slug)}/events?participantId=${encodeURIComponent(pid)}`;

    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      setStatus('connected');
      const stored = getStoredProfile(slug);
      if (stored) {
        joinRoom(stored.nickname, stored.avatar || '', stored.role);
      }
    };

    es.addEventListener('room_state', (event) => {
      try {
        const state = JSON.parse(event.data);
        const rawPhase = state.phase || 'Idle';
        const computedPhase: RoomSnapshotData['phase'] =
          rawPhase === 'REVEALED' || rawPhase === 'Revealed' ? 'Revealed' :
          rawPhase === 'VOTING' || rawPhase === 'Voting' ? 'Voting' :
          rawPhase === 'FINALIZED' || rawPhase === 'Finalized' ? 'Finalized' :
          rawPhase === 'DISCUSSING' || rawPhase === 'Discussing' ? 'Discussing' :
          rawPhase === 'SLICING' || rawPhase === 'Slicing' ? 'Slicing' :
          rawPhase === 'STORY_DOCTOR_REVIEW' || rawPhase === 'StoryDoctorReview' ? 'StoryDoctorReview' : 'Idle';

        const mappedParticipants = (state.participants || []).map((p: any) => ({
          id: p.id,
          nickname: p.name || p.nickname || '',
          avatar: p.avatar || '',
          role: (p.role === 'FACILITATOR' || p.role === 'VOTER' || p.role === 'Estimator') ? 'Estimator' : 'Observer',
          connected: p.connected !== undefined ? p.connected : true,
          voted: p.has_voted !== undefined ? p.has_voted : Boolean(p.voted || p.vote),
          vote: p.vote !== undefined ? p.vote : null,
        }));

        const mappedConsensus = (computedPhase === 'Revealed' || computedPhase === 'Finalized' || computedPhase === 'Discussing' || computedPhase === 'Slicing')
          ? computeConsensusFromParticipants(mappedParticipants)
          : null;

        const mappedState: RoomSnapshotData = {
          slug: state.slug || slug,
          short_code: state.short_code || state.shortCode || state.slug || slug,
          phase: computedPhase,
          round_number: state.round_number || state.roundNumber || 1,
          active_tracker_provider: state.active_tracker_provider || state.activeTrackerProvider,
          tracker_connected: Boolean(state.tracker_connected || state.trackerConnected),
          consensus: mappedConsensus,
          participants: mappedParticipants,
          active_story: state.current_story || state.active_story || state.activeStory ? {
            id: (state.current_story || state.active_story || state.activeStory).id,
            title: (state.current_story || state.active_story || state.activeStory).title,
            description: (state.current_story || state.active_story || state.activeStory).description || '',
            acceptance_criteria: (state.current_story || state.active_story || state.activeStory).acceptance_criteria || (state.current_story || state.active_story || state.activeStory).acceptanceCriteria || [],
            points: (state.current_story || state.active_story || state.activeStory).points || (state.current_story || state.active_story || state.activeStory).estimate,
            key: (state.current_story || state.active_story || state.activeStory).key,
            url: (state.current_story || state.active_story || state.activeStory).url,
            tracker_provider: (state.current_story || state.active_story || state.activeStory).tracker_provider || (state.current_story || state.active_story || state.activeStory).trackerProvider,
            external_id: (state.current_story || state.active_story || state.activeStory).external_id || (state.current_story || state.active_story || state.activeStory).externalId,
          } : null,
          backlog: (state.backlog || []).map((s: any) => ({
            id: s.id,
            title: s.title,
            description: s.description || '',
            acceptance_criteria: s.acceptance_criteria || s.acceptanceCriteria || [],
            points: s.points || s.estimate,
            key: s.key,
            url: s.url,
            tracker_provider: s.tracker_provider || s.trackerProvider,
            external_id: s.external_id || s.externalId,
          })),
          point_references: (state.point_references || state.pointReferences || []).map((pr: any) => ({
            points: Number(pr.points) || 1,
            title: pr.title,
            description: pr.description || '',
          })),
          story_doctor_report: (state.story_doctor_report || state.storyDoctorReport) ? {
            story_id: state.current_story?.id || state.active_story?.id || '',
            scorecard: {
              overall_score: (state.story_doctor_report || state.storyDoctorReport).invest_score || (state.story_doctor_report || state.storyDoctorReport).investScore || 85,
              criteria: (state.story_doctor_report || state.storyDoctorReport).criteria || [],
              summary: (state.story_doctor_report || state.storyDoctorReport).summary || '',
              issues: (state.story_doctor_report || state.storyDoctorReport).issues || [],
            },
            complexity: (state.story_doctor_report || state.storyDoctorReport).complexity || {
              data_models: 'Low',
              dependencies_apis: 'None',
              blast_radius: 'Isolated',
            },
            edge_cases: ((state.story_doctor_report || state.storyDoctorReport).edge_cases || (state.story_doctor_report || state.storyDoctorReport).edgeCases || []).map((ec: any) => ({
              id: ec.id,
              category: ec.category || 'NetworkTimeouts',
              category_name: ec.category_name || ec.categoryName || 'Edge Case',
              title: ec.title || ec.text || '',
              description: ec.description || ec.text || '',
              checked: Boolean(ec.checked),
            })),
          } : null,
          facilitator_id: state.facilitator_id || state.facilitatorId || (state.participants || [])[0]?.id || '',
        };
        setRoomState(mappedState);
      } catch (err) {
        console.error('[SSE] Failed to parse room_state event:', err);
      }
    });

    es.addEventListener('ping', () => {
      // Keep-alive heartbeat acknowledgement
    });

    es.onerror = () => {
      setStatus('error');
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [slug, joinRoom]);

  const startVoting = useCallback(async () => {
    try {
      await api.api.rooms[':code']['start-voting'].$post({
        param: { code: slug },
        json: { participant_id: participantIdRef.current },
      });
    } catch (err) {
      console.error('[RPC] Error starting voting:', err);
    }
  }, [slug]);

  const castVote = useCallback(async (value: string) => {
    try {
      await api.api.rooms[':code'].vote.$post({
        param: { code: slug },
        json: { participant_id: participantIdRef.current, vote: value },
      });
    } catch (err) {
      console.error('[RPC] Error casting vote:', err);
    }
  }, [slug]);

  const retractVote = useCallback(async () => {
    try {
      await api.api.rooms[':code'].vote.$post({
        param: { code: slug },
        json: { participant_id: participantIdRef.current, vote: null },
      });
    } catch (err) {
      console.error('[RPC] Error retracting vote:', err);
    }
  }, [slug]);

  const revealCards = useCallback(async () => {
    try {
      await api.api.rooms[':code'].reveal.$post({
        param: { code: slug },
        json: { participant_id: participantIdRef.current },
      });
    } catch (err) {
      console.error('[RPC] Error revealing cards:', err);
    }
  }, [slug]);

  const triggerReVote = useCallback(async () => {
    try {
      await api.api.rooms[':code'].reset.$post({
        param: { code: slug },
        json: { participant_id: participantIdRef.current },
      });
    } catch (err) {
      console.error('[RPC] Error triggering revote:', err);
    }
  }, [slug]);

  const finalizeStory = useCallback(async (points?: string) => {
    try {
      await api.api.rooms[':code'].finalize.$post({
        param: { code: slug },
        json: { participant_id: participantIdRef.current, estimate: points },
      });
    } catch (err) {
      console.error('[RPC] Error finalizing story:', err);
    }
  }, [slug]);

  const selectStory = useCallback(async (story: Story | null) => {
    try {
      await api.api.rooms[':code'].story.$post({
        param: { code: slug },
        json: { participant_id: participantIdRef.current, story },
      });
    } catch (err) {
      console.error('[RPC] Error selecting story:', err);
    }
  }, [slug]);

  const selectStoryById = useCallback((storyId: string) => {
    const found = roomState?.backlog.find((s) => s.id === storyId);
    if (found) {
      selectStory(found);
    }
  }, [selectStory, roomState?.backlog]);

  const updatePointReferences = useCallback(async (references: PointReference[]) => {
    try {
      await api.api.rooms[':code']['point-references'].$post({
        param: { code: slug },
        json: { participant_id: participantIdRef.current, references },
      });
    } catch (err) {
      console.error('[RPC] Error updating point references:', err);
    }
  }, [slug]);

  const toggleEdgeCaseCheck = useCallback(async (edgeCaseId: string, checked: boolean) => {
    try {
      await api.api.rooms[':code']['edge-case'].$post({
        param: { code: slug },
        json: { participant_id: participantIdRef.current, edge_case_id: edgeCaseId, checked },
      });
    } catch (err) {
      console.error('[RPC] Error toggling edge case check:', err);
    }
  }, [slug]);

  const connectTracker = useCallback(async (config: TrackerConfig) => {
    try {
      await api.api.rooms[':code']['connect-tracker'].$post({
        param: { code: slug },
        json: { participant_id: participantIdRef.current, config },
      });
    } catch (err) {
      console.error('[RPC] Error connecting tracker:', err);
      setTrackerError(err instanceof Error ? err.message : 'Tracker connection failed');
    }
  }, [slug]);

  const disconnectTracker = useCallback(async () => {
    try {
      await api.api.rooms[':code']['disconnect-tracker'].$post({
        param: { code: slug },
        json: { participant_id: participantIdRef.current },
      });
    } catch (err) {
      console.error('[RPC] Error disconnecting tracker:', err);
    }
  }, [slug]);

  const testTrackerConnection = useCallback(async (config: TrackerConfig) => {
    try {
      const res = await api.api.rooms[':code']['test-tracker'].$post({
        param: { code: slug },
        json: { participant_id: participantIdRef.current, config },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.preview) {
          setConnectionPreview(data.preview);
        }
      }
    } catch (err) {
      console.error('[RPC] Error testing tracker connection:', err);
      setTrackerError(err instanceof Error ? err.message : 'Tracker test failed');
    }
  }, [slug]);

  const fetchBacklog = useCallback(async (query: TrackerQuery = {}) => {
    try {
      await api.api.rooms[':code']['fetch-backlog'].$post({
        param: { code: slug },
        json: { participant_id: participantIdRef.current, query },
      });
    } catch (err) {
      console.error('[RPC] Error fetching backlog:', err);
    }
  }, [slug]);

  const importBacklog = useCallback(async (stories: Story[]) => {
    try {
      await api.api.rooms[':code']['import-backlog'].$post({
        param: { code: slug },
        json: { participant_id: participantIdRef.current, stories },
      });
    } catch (err) {
      console.error('[RPC] Error importing backlog:', err);
    }
  }, [slug]);

  const importMarkdown = useCallback((rawMarkdown: string) => {
    const lines = rawMarkdown.split('\n').filter((l) => l.trim().startsWith('#') || l.trim().startsWith('-'));
    const stories: Story[] = lines.map((l, idx) => ({
      id: `md-${idx + 1}`,
      title: l.replace(/^#+\s*|^-\s*/, '').trim(),
      description: '',
      acceptance_criteria: [],
    }));
    importBacklog(stories);
  }, [importBacklog]);

  const syncEstimateToTracker = useCallback(async (storyId: string, points: number, postComment: boolean = true) => {
    try {
      const res = await api.api.rooms[':code']['sync-estimate'].$post({
        param: { code: slug },
        json: {
          participant_id: participantIdRef.current,
          story_id: storyId,
          points,
          post_comment: postComment,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setSyncFeedback({
          storyId,
          success: data.success,
          message: data.message || `Story estimate ${points} synced successfully!`,
        });
      } else {
        setSyncFeedback({
          storyId,
          success: false,
          message: 'Failed to sync estimate to tracker.',
        });
      }
    } catch (err) {
      console.error('[RPC] Error syncing estimate to tracker:', err);
      setSyncFeedback({
        storyId,
        success: false,
        message: err instanceof Error ? err.message : 'Sync failed',
      });
    }
  }, [slug]);

  const pushStorySlices = useCallback(async (parentId: string, slices: StorySlice[]) => {
    try {
      await api.api.rooms[':code']['push-slices'].$post({
        param: { code: slug },
        json: {
          participant_id: participantIdRef.current,
          parent_id: parentId,
          slices,
        },
      });
    } catch (err) {
      console.error('[RPC] Error pushing story slices:', err);
    }
  }, [slug]);

  const reorderBacklog = useCallback(async (storyIds: string[]) => {
    try {
      await api.api.rooms[':code']['reorder-backlog'].$post({
        param: { code: slug },
        json: { participant_id: participantIdRef.current, story_ids: storyIds },
      });
    } catch (err) {
      console.error('[RPC] Error reordering backlog:', err);
    }
  }, [slug]);

  const removeStoryFromBacklog = useCallback(async (storyId: string) => {
    try {
      await api.api.rooms[':code']['remove-story'].$post({
        param: { code: slug },
        json: { participant_id: participantIdRef.current, story_id: storyId },
      });
    } catch (err) {
      console.error('[RPC] Error removing story from backlog:', err);
    }
  }, [slug]);

  const updateRole = useCallback(async (targetId: string, newRole: Role) => {
    try {
      await api.api.rooms[':code'].role.$post({
        param: { code: slug },
        json: { participant_id: participantIdRef.current, target_id: targetId, new_role: newRole },
      });
    } catch (err) {
      console.error('[RPC] Error updating role:', err);
    }
  }, [slug]);

  const transferFacilitator = useCallback(async (targetId: string) => {
    try {
      await api.api.rooms[':code']['transfer-facilitator'].$post({
        param: { code: slug },
        json: { participant_id: participantIdRef.current, target_id: targetId },
      });
    } catch (err) {
      console.error('[RPC] Error transferring facilitator:', err);
    }
  }, [slug]);

  const clearTrackerFeedback = useCallback(() => {
    setTrackerError(null);
    setSyncFeedback(null);
  }, []);

  const isFacilitator = roomState?.facilitator_id === participantIdRef.current;

  return {
    roomState,
    status,
    currentParticipantId: participantIdRef.current,
    myProfile,
    isFacilitator,
    connectionPreview,
    trackerError,
    syncFeedback,
    joinRoom,
    startVoting,
    castVote,
    retractVote,
    revealCards,
    triggerReVote,
    finalizeStory,
    selectStory,
    selectStoryById,
    updatePointReferences,
    toggleEdgeCaseCheck,
    connectTracker,
    disconnectTracker,
    testTrackerConnection,
    fetchBacklog,
    importBacklog,
    importMarkdown,
    syncEstimateToTracker,
    pushStorySlices,
    reorderBacklog,
    removeStoryFromBacklog,
    updateRole,
    transferFacilitator,
    clearTrackerFeedback,
  };
}
