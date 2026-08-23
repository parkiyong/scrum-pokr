import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ClientCommand,
  ConnectionPreview,
  LocalSessionProfile,
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

  const wsRef = useRef<WebSocket | null>(null);
  const participantIdRef = useRef<string>(myProfile?.participant_id || getOrCreateParticipantId());

  const sendCommand = useCallback((cmd: ClientCommand) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(cmd));
    }
  }, []);

  const joinRoom = useCallback((nickname: string, avatar: string, role?: Role) => {
    const profile: LocalSessionProfile = {
      participant_id: participantIdRef.current,
      nickname,
      avatar,
      role,
    };
    saveStoredProfile(slug, profile);
    setMyProfile(profile);

    sendCommand({
      type: 'JoinRoom',
      payload: {
        participant_id: profile.participant_id,
        nickname: profile.nickname,
        avatar: profile.avatar,
        role: profile.role,
      },
    });
  }, [slug, sendCommand]);

  useEffect(() => {
    if (!slug) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/rooms/${slug}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      // Auto rejoin if profile is cached
      const stored = getStoredProfile(slug);
      if (stored) {
        sendCommand({
          type: 'JoinRoom',
          payload: {
            participant_id: stored.participant_id,
            nickname: stored.nickname,
            avatar: stored.avatar,
            role: stored.role,
          },
        });
      }
    };

    ws.onmessage = (event) => {
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
                p.id === msg.payload.participant_id ? { ...p, voted: false, vote: undefined } : p
              ),
            };
          });
        } else if (msg.type === 'BacklogUpdated') {
          setRoomState((prev) => (prev ? { ...prev, backlog: msg.payload.backlog } : prev));
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
        console.error('Failed to parse server message:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      setStatus('error');
    };

    ws.onclose = () => {
      setStatus('disconnected');
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [slug, sendCommand]);

  const startVoting = useCallback(() => {
    sendCommand({ type: 'StartVoting' });
  }, [sendCommand]);

  const castVote = useCallback((value: string) => {
    sendCommand({ type: 'CastVote', payload: { value } });
  }, [sendCommand]);

  const retractVote = useCallback(() => {
    sendCommand({ type: 'RetractVote' });
  }, [sendCommand]);

  const revealCards = useCallback(() => {
    sendCommand({ type: 'RevealCards' });
  }, [sendCommand]);

  const triggerReVote = useCallback(() => {
    sendCommand({ type: 'TriggerReVote' });
  }, [sendCommand]);

  const finalizeStory = useCallback((points?: string) => {
    sendCommand({ type: 'FinalizeStory', payload: { points } });
  }, [sendCommand]);

  const selectStory = useCallback((story: Story | null) => {
    sendCommand({ type: 'SelectStory', payload: { story } });
  }, [sendCommand]);

  const selectStoryById = useCallback((storyId: string) => {
    sendCommand({ type: 'SelectStoryById', payload: { story_id: storyId } });
  }, [sendCommand]);

  const connectTracker = useCallback((config: TrackerConfig) => {
    sendCommand({ type: 'ConnectTracker', payload: { config } });
  }, [sendCommand]);

  const disconnectTracker = useCallback(() => {
    sendCommand({ type: 'DisconnectTracker' });
  }, [sendCommand]);

  const testTrackerConnection = useCallback((config: TrackerConfig) => {
    sendCommand({ type: 'TestTrackerConnection', payload: { config } });
  }, [sendCommand]);

  const fetchBacklog = useCallback((query: TrackerQuery = {}) => {
    sendCommand({ type: 'FetchBacklog', payload: { query } });
  }, [sendCommand]);

  const importBacklog = useCallback((stories: Story[]) => {
    sendCommand({ type: 'ImportBacklog', payload: { stories } });
  }, [sendCommand]);

  const importMarkdown = useCallback((rawMarkdown: string) => {
    sendCommand({ type: 'ImportMarkdown', payload: { raw_markdown: rawMarkdown } });
  }, [sendCommand]);

  const syncEstimateToTracker = useCallback((storyId: string, points: number, postComment: boolean = true) => {
    sendCommand({
      type: 'SyncEstimateToTracker',
      payload: { story_id: storyId, points, post_comment: postComment },
    });
  }, [sendCommand]);

  const pushStorySlices = useCallback((parentId: string, slices: StorySlice[]) => {
    sendCommand({
      type: 'PushStorySlices',
      payload: { parent_id: parentId, slices },
    });
  }, [sendCommand]);

  const reorderBacklog = useCallback((storyIds: string[]) => {
    sendCommand({ type: 'ReorderBacklog', payload: { story_ids: storyIds } });
  }, [sendCommand]);

  const removeStoryFromBacklog = useCallback((storyId: string) => {
    sendCommand({ type: 'RemoveStoryFromBacklog', payload: { story_id: storyId } });
  }, [sendCommand]);

  const updateRole = useCallback((targetId: string, newRole: Role) => {
    sendCommand({ type: 'UpdateRole', payload: { target_id: targetId, new_role: newRole } });
  }, [sendCommand]);

  const transferFacilitator = useCallback((targetId: string) => {
    sendCommand({ type: 'TransferFacilitator', payload: { target_id: targetId } });
  }, [sendCommand]);

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

