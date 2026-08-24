import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ConnectionPreview,
  LocalSessionProfile,
  PointReference,
  Role,
  RoomSnapshotData,
  ServerEvent,
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
  const [connectionPreview, setConnectionPreview] = useState<ConnectionPreview | null>(null);
  const [trackerError, setTrackerError] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ storyId: string; success: boolean; message?: string } | null>(null);

  const participantIdRef = useRef<string>(myProfile?.participant_id || getOrCreateParticipantId());
  const esRef = useRef<EventSource | null>(null);

  const sendAction = useCallback(
    async (
      path: string,
      body?: unknown,
      method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST'
    ) => {
      try {
        const res = await fetch(`/api/rooms/${slug}${path}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-Participant-ID': participantIdRef.current,
          },
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) {
          console.warn(`Action ${path} returned status ${res.status}`);
        }
      } catch (err) {
        console.error(`Action ${path} failed:`, err);
      }
    },
    [slug]
  );

  const joinRoom = useCallback(
    (nickname: string, avatar: string, role?: Role) => {
      const profile: LocalSessionProfile = {
        participant_id: participantIdRef.current,
        nickname,
        avatar,
        role,
      };
      saveStoredProfile(slug, profile);
      setMyProfile(profile);

      sendAction('/participants', {
        participant_id: profile.participant_id,
        nickname: profile.nickname,
        avatar: profile.avatar,
        role: profile.role,
      });
    },
    [slug, sendAction]
  );

  useEffect(() => {
    if (!slug) return;

    const eventSourceUrl = `/api/rooms/${slug}/events?participant_id=${encodeURIComponent(
      participantIdRef.current
    )}`;
    const es = new EventSource(eventSourceUrl);
    esRef.current = es;

    es.onopen = () => {
      setStatus('connected');
      // Auto rejoin if profile is cached
      const stored = getStoredProfile(slug);
      if (stored) {
        sendAction('/participants', {
          participant_id: stored.participant_id,
          nickname: stored.nickname,
          avatar: stored.avatar,
          role: stored.role,
        });
      }
    };

    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ServerEvent;
        if (msg.type === 'RoomSnapshot') {
          setRoomState(msg.payload.state);
        } else if (msg.type === 'VoteCast') {
          setRoomState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              participants: prev.participants.map((p) =>
                p.id === msg.payload.participant_id ? { ...p, voted: true } : p
              ),
            };
          });
        } else if (msg.type === 'VoteRetracted') {
          setRoomState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              participants: prev.participants.map((p) =>
                p.id === msg.payload.participant_id
                  ? { ...p, voted: false, vote: undefined }
                  : p
              ),
            };
          });
        } else if (msg.type === 'BacklogUpdated') {
          setRoomState((prev) =>
            prev ? { ...prev, backlog: msg.payload.backlog } : prev
          );
        } else if (msg.type === 'PointReferencesUpdated') {
          setRoomState((prev) =>
            prev ? { ...prev, point_references: msg.payload.references } : prev
          );
        } else if (msg.type === 'EdgeCaseToggled') {
          setRoomState((prev) => {
            if (!prev || !prev.story_doctor_report) return prev;
            return {
              ...prev,
              story_doctor_report: {
                ...prev.story_doctor_report,
                edge_cases: prev.story_doctor_report.edge_cases.map((ec) =>
                  ec.id === msg.payload.edge_case_id
                    ? { ...ec, checked: msg.payload.checked }
                    : ec
                ),
              },
            };
          });
        } else if (msg.type === 'StoryDoctorReportUpdated') {
          setRoomState((prev) =>
            prev ? { ...prev, story_doctor_report: msg.payload.report } : prev
          );
        } else if (msg.type === 'TrackerConnectionTested') {
          setConnectionPreview(msg.payload.preview);
          setTrackerError(null);
        } else if (msg.type === 'TrackerConnected') {
          setTrackerError(null);
        } else if (msg.type === 'TrackerDisconnected') {
          setConnectionPreview(null);
        } else if (msg.type === 'TrackerError') {
          setTrackerError(msg.payload.message);
        } else if (msg.type === 'EstimateSynced') {
          setSyncFeedback({
            storyId: msg.payload.story_id,
            success: msg.payload.success,
            message: msg.payload.message,
          });
        }
      } catch (err) {
        console.error('Failed to parse SSE event message:', err);
      }
    };

    es.onerror = (err) => {
      console.warn('SSE connection state change / error:', err);
      if (es.readyState === EventSource.CLOSED) {
        setStatus('disconnected');
      } else {
        setStatus('error');
      }
    };

    return () => {
      es.close();
      esRef.current = null;
      // Trigger disconnect cleanup
      fetch(`/api/rooms/${slug}/leave`, {
        method: 'POST',
        headers: {
          'X-Participant-ID': participantIdRef.current,
        },
      }).catch(() => {});
    };
  }, [slug, sendAction]);

  const startVoting = useCallback(() => {
    sendAction('/voting/start');
  }, [sendAction]);

  const castVote = useCallback(
    (value: string) => {
      sendAction('/voting/vote', { value });
    },
    [sendAction]
  );

  const retractVote = useCallback(() => {
    sendAction('/voting/retract');
  }, [sendAction]);

  const revealCards = useCallback(() => {
    sendAction('/voting/reveal');
  }, [sendAction]);

  const triggerReVote = useCallback(() => {
    sendAction('/voting/revote');
  }, [sendAction]);

  const finalizeStory = useCallback(
    (points?: string) => {
      sendAction('/voting/finalize', { points });
    },
    [sendAction]
  );

  const selectStory = useCallback(
    (story: Story | null) => {
      sendAction('/active-story', { story });
    },
    [sendAction]
  );

  const selectStoryById = useCallback(
    (storyId: string) => {
      sendAction('/active-story', { story_id: storyId });
    },
    [sendAction]
  );

  const updatePointReferences = useCallback(
    (references: PointReference[]) => {
      sendAction('/point-references', { references }, 'PUT');
    },
    [sendAction]
  );

  const toggleEdgeCaseCheck = useCallback(
    (edgeCaseId: string, checked: boolean) => {
      sendAction(
        `/edge-cases/${encodeURIComponent(edgeCaseId)}`,
        { checked },
        'PATCH'
      );
    },
    [sendAction]
  );

  const connectTracker = useCallback(
    (config: TrackerConfig) => {
      sendAction('/tracker/connect', { config });
    },
    [sendAction]
  );

  const disconnectTracker = useCallback(() => {
    sendAction('/tracker/disconnect');
  }, [sendAction]);

  const testTrackerConnection = useCallback(
    (config: TrackerConfig) => {
      sendAction('/tracker/test', { config });
    },
    [sendAction]
  );

  const fetchBacklog = useCallback(
    (query: TrackerQuery = {}) => {
      sendAction('/tracker/fetch', { query });
    },
    [sendAction]
  );

  const importBacklog = useCallback(
    (stories: Story[]) => {
      sendAction('/backlog/import', { stories });
    },
    [sendAction]
  );

  const importMarkdown = useCallback(
    (rawMarkdown: string) => {
      sendAction('/backlog/markdown', { raw_markdown: rawMarkdown });
    },
    [sendAction]
  );

  const syncEstimateToTracker = useCallback(
    (storyId: string, points: number, postComment: boolean = true) => {
      sendAction('/tracker/sync', {
        story_id: storyId,
        points,
        post_comment: postComment,
      });
    },
    [sendAction]
  );

  const pushStorySlices = useCallback(
    (parentId: string, slices: StorySlice[]) => {
      sendAction('/tracker/slices', {
        parent_id: parentId,
        slices,
      });
    },
    [sendAction]
  );

  const reorderBacklog = useCallback(
    (storyIds: string[]) => {
      sendAction('/backlog/order', { story_ids: storyIds }, 'PUT');
    },
    [sendAction]
  );

  const removeStoryFromBacklog = useCallback(
    (storyId: string) => {
      sendAction(`/backlog/${encodeURIComponent(storyId)}`, undefined, 'DELETE');
    },
    [sendAction]
  );

  const updateRole = useCallback(
    (targetId: string, newRole: Role) => {
      sendAction(
        `/participants/${encodeURIComponent(targetId)}/role`,
        { role: newRole },
        'PATCH'
      );
    },
    [sendAction]
  );

  const transferFacilitator = useCallback(
    (targetId: string) => {
      sendAction('/facilitator', { target_id: targetId });
    },
    [sendAction]
  );

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
