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

export function useRoomSocket(slug: string): UseRoomSocketReturn {
  const [roomState, setRoomState] = useState<RoomSnapshotData | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [myProfile, setMyProfile] = useState<LocalSessionProfile | null>(() => getStoredProfile(slug));
  const [connectionPreview] = useState<ConnectionPreview | null>(null);
  const [trackerError, setTrackerError] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ storyId: string; success: boolean; message?: string } | null>(null);

  const participantIdRef = useRef<string>(myProfile?.participant_id || getOrCreateParticipantId());
  const eventSourceRef = useRef<EventSource | null>(null);

  const postAction = useCallback(async (endpoint: string, body: Record<string, unknown> = {}) => {
    try {
      await fetch(`/api/rooms/${slug}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant_id: participantIdRef.current, ...body }),
      });
    } catch (err) {
      console.error(`Failed REST action /api/rooms/${slug}/${endpoint}:`, err);
    }
  }, [slug]);

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
      await fetch(`/api/rooms/${slug}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_id: profile.participant_id,
          name: nickname,
          avatar: avatar || '',
          role: role || 'Estimator',
        }),
      });
    } catch (err) {
      console.error('Error joining room:', err);
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) return;

    const pid = participantIdRef.current;
    const sseUrl = `/api/rooms/${slug}/events?participantId=${encodeURIComponent(pid)}`;

    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      setStatus('connected');
      const stored = getStoredProfile(slug);
      if (stored) {
        joinRoom(stored.nickname, stored.avatar || '', stored.role);
      }
    };

function computeConsensusFromParticipants(participants: { vote?: string; role: string }[]): ConsensusSummary | null {
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

    es.addEventListener('room_state', (event) => {
      try {
        const state = JSON.parse(event.data);
        const computedPhase: RoomSnapshotData['phase'] =
          state.phase === 'REVEALED' ? 'Revealed' :
          state.phase === 'VOTING' ? 'Voting' :
          state.phase === 'FINALIZED' ? 'Finalized' : 'Idle';

        const mappedParticipants = (state.participants || []).map((p: any) => ({
          id: p.id,
          nickname: p.name,
          avatar: p.avatar || '',
          role: (p.role === 'FACILITATOR' || p.role === 'VOTER' || p.role === 'Estimator') ? 'Estimator' : 'Observer',
          connected: true,
          voted: p.has_voted,
          vote: p.vote,
        }));

        const mappedConsensus = (computedPhase === 'Revealed' || computedPhase === 'Finalized')
          ? computeConsensusFromParticipants(mappedParticipants)
          : null;

        const mappedState: RoomSnapshotData = {
          slug: state.slug,
          short_code: state.short_code || state.slug,
          phase: computedPhase,
          round_number: 1,
          active_tracker_provider: undefined,
          tracker_connected: false,
          consensus: mappedConsensus,
          participants: mappedParticipants,
          active_story: state.current_story ? {
            id: state.current_story.id,
            title: state.current_story.title,
            description: state.current_story.description,
            acceptance_criteria: state.current_story.acceptance_criteria || [],
            points: state.current_story.points || state.current_story.estimate,
          } : null,
          backlog: (state.backlog || []).map((s: any) => ({
            id: s.id,
            title: s.title,
            description: s.description,
            acceptance_criteria: s.acceptance_criteria || [],
            points: s.points || s.estimate,
          })),
          point_references: (state.point_references || []).map((pr: any) => ({
            points: Number(pr.points) || 1,
            title: pr.title,
            description: pr.description,
          })),
          story_doctor_report: state.story_doctor_report ? {
            story_id: state.current_story?.id || '',
            scorecard: {
              overall_score: state.story_doctor_report.invest_score || state.story_doctor_report.investScore || 85,
              criteria: [],
              summary: state.story_doctor_report.summary || '',
              issues: [],
            },
            complexity: {
              data_models: 'Low',
              dependencies_apis: 'None',
              blast_radius: 'Isolated',
            },
            edge_cases: (state.story_doctor_report.edge_cases || state.story_doctor_report.edgeCases || []).map((ec: any) => ({
              id: ec.id,
              category: 'NetworkTimeouts',
              category_name: 'Edge Case',
              title: ec.text,
              description: ec.text,
              checked: ec.checked,
            })),
          } : null,
          facilitator_id: state.facilitator_id || (state.participants || [])[0]?.id || '',
        };
        setRoomState(mappedState);
      } catch (err) {
        console.error('Failed to parse SSE room_state event:', err);
      }
    });

    es.onerror = () => {
      setStatus('error');
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [slug, joinRoom]);

  const startVoting = useCallback(() => {
    postAction('start-voting');
  }, [postAction]);

  const castVote = useCallback((value: string) => {
    postAction('vote', { vote: value });
  }, [postAction]);

  const retractVote = useCallback(() => {
    postAction('vote', { vote: null });
  }, [postAction]);

  const revealCards = useCallback(() => {
    postAction('reveal');
  }, [postAction]);

  const triggerReVote = useCallback(() => {
    postAction('reset');
  }, [postAction]);

  const finalizeStory = useCallback((points?: string) => {
    postAction('finalize', { estimate: points });
  }, [postAction]);

  const selectStory = useCallback((story: Story | null) => {
    postAction('story', { story });
  }, [postAction]);

  const selectStoryById = useCallback((storyId: string) => {
    const found = roomState?.backlog.find(s => s.id === storyId);
    if (found) {
      postAction('story', { story: found });
    }
  }, [postAction, roomState?.backlog]);

  const updatePointReferences = useCallback((references: PointReference[]) => {
    postAction('point-references', { references });
  }, [postAction]);

  const toggleEdgeCaseCheck = useCallback((edgeCaseId: string, checked: boolean) => {
    postAction('edge-case', { edge_case_id: edgeCaseId, checked });
  }, [postAction]);

  const connectTracker = useCallback((_config: TrackerConfig) => {}, []);
  const disconnectTracker = useCallback(() => {}, []);
  const testTrackerConnection = useCallback((_config: TrackerConfig) => {}, []);
  const fetchBacklog = useCallback((_query: TrackerQuery = {}) => {}, []);

  const importBacklog = useCallback((stories: Story[]) => {
    postAction('import-backlog', { stories });
  }, [postAction]);

  const importMarkdown = useCallback((rawMarkdown: string) => {
    const lines = rawMarkdown.split('\n').filter(l => l.trim().startsWith('#') || l.trim().startsWith('-'));
    const stories: Story[] = lines.map((l, idx) => ({
      id: `md-${idx + 1}`,
      title: l.replace(/^#+\s*|^-\s*/, '').trim(),
      description: '',
      acceptance_criteria: [],
    }));
    postAction('import-backlog', { stories });
  }, [postAction]);

  const syncEstimateToTracker = useCallback((_storyId: string, _points: number, _postComment: boolean = true) => {}, []);
  const pushStorySlices = useCallback((_parentId: string, _slices: StorySlice[]) => {}, []);

  const reorderBacklog = useCallback((storyIds: string[]) => {
    postAction('reorder-backlog', { story_ids: storyIds });
  }, [postAction]);

  const removeStoryFromBacklog = useCallback((storyId: string) => {
    postAction('remove-story', { story_id: storyId });
  }, [postAction]);

  const updateRole = useCallback((targetId: string, newRole: Role) => {
    postAction('role', { target_id: targetId, new_role: newRole });
  }, [postAction]);

  const transferFacilitator = useCallback((targetId: string) => {
    postAction('transfer-facilitator', { target_id: targetId });
  }, [postAction]);

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
