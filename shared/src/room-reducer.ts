import type {
  DeckConfig,
  Participant,
  Role,
  RoomState,
  Story,
} from './domain';
import { computeConsensus } from './reveal-gate';

export type RoomAction =
  | { type: 'JOIN'; payload: { participant: Participant } }
  | { type: 'SET_CONNECTED'; payload: { participantId: string; connected: boolean } }
  | { type: 'UPDATE_ROLE'; payload: { targetId: string; newRole: Role } }
  | { type: 'TRANSFER_FACILITATOR'; payload: { targetId: string } }
  | { type: 'SET_DECK'; payload: { deck: DeckConfig } }
  | { type: 'START_VOTING' }
  | { type: 'CAST_VOTE'; payload: { participantId: string; vote: string | null } }
  | { type: 'REVEAL_CARDS' }
  | { type: 'RESET_ROUND' }
  | { type: 'FINALIZE_STORY'; payload: { estimate?: string | null } }
  | { type: 'SET_STORY'; payload: { story: Story | null } }
  | { type: 'ADD_STORY'; payload: { story: Story } }
  | { type: 'UPDATE_STORY'; payload: { storyId: string; updates: Partial<Omit<Story, 'id'>> } }
  | { type: 'REMOVE_STORY'; payload: { storyId: string } }
  | { type: 'REORDER_BACKLOG'; payload: { storyIds: string[] } }
  | { type: 'NEXT_STORY' };

export function roomReducer(state: RoomState, action: RoomAction): RoomState {
  switch (action.type) {
    case 'JOIN': {
      const { participant } = action.payload;
      const existsIndex = state.participants.findIndex((p) => p.id === participant.id);
      let updatedParticipants: Participant[];

      if (existsIndex >= 0) {
        updatedParticipants = state.participants.map((p, idx) =>
          idx === existsIndex
            ? { ...p, name: participant.name, avatar: participant.avatar, role: participant.role || p.role, connected: true }
            : p
        );
      } else {
        updatedParticipants = [...state.participants, { ...participant, connected: true }];
      }

      const facilitatorId = state.facilitator_id || participant.id;

      return {
        ...state,
        facilitator_id: facilitatorId,
        participants: updatedParticipants,
      };
    }

    case 'SET_CONNECTED': {
      return {
        ...state,
        participants: state.participants.map((p) =>
          p.id === action.payload.participantId
            ? { ...p, connected: action.payload.connected }
            : p
        ),
      };
    }

    case 'UPDATE_ROLE': {
      return {
        ...state,
        participants: state.participants.map((p) =>
          p.id === action.payload.targetId ? { ...p, role: action.payload.newRole } : p
        ),
      };
    }

    case 'TRANSFER_FACILITATOR': {
      return {
        ...state,
        facilitator_id: action.payload.targetId,
      };
    }

    case 'SET_DECK': {
      return {
        ...state,
        deck: action.payload.deck,
      };
    }

    case 'START_VOTING': {
      const shouldResetVotes = state.phase === 'Revealed' || state.phase === 'Finalized';
      return {
        ...state,
        phase: 'Voting',
        consensus: null,
        participants: shouldResetVotes
          ? state.participants.map((p) => ({ ...p, vote: null, has_voted: false }))
          : state.participants,
      };
    }

    case 'CAST_VOTE': {
      // Invariant: Cards are locked once voting phase has concluded
      if (state.phase !== 'Voting' && state.phase !== 'Idle') {
        return state;
      }

      const { participantId, vote } = action.payload;
      const hasVoted = vote !== null && vote !== undefined && vote !== '';
      const updatedParticipants = state.participants.map((p) =>
        p.id === participantId
          ? {
              ...p,
              vote,
              has_voted: hasVoted,
            }
          : p
      );

      const nextPhase = state.phase === 'Idle' && hasVoted ? 'Voting' : state.phase;

      return {
        ...state,
        phase: nextPhase,
        participants: updatedParticipants,
      };
    }

    case 'REVEAL_CARDS': {
      return {
        ...state,
        phase: 'Revealed',
        consensus: computeConsensus(state.participants),
      };
    }

    case 'RESET_ROUND': {
      return {
        ...state,
        phase: 'Idle',
        consensus: null,
        participants: state.participants.map((p) => ({
          ...p,
          vote: null,
          has_voted: false,
        })),
      };
    }

    case 'FINALIZE_STORY': {
      const estimate = action.payload.estimate || state.consensus?.suggested_points || null;
      const updatedStory = state.current_story
        ? { ...state.current_story, points: estimate }
        : null;

      return {
        ...state,
        phase: 'Finalized',
        current_story: updatedStory,
      };
    }

    case 'SET_STORY': {
      return {
        ...state,
        current_story: action.payload.story,
        phase: 'Idle',
        consensus: null,
        participants: state.participants.map((p) => ({
          ...p,
          vote: null,
          has_voted: false,
        })),
      };
    }

    case 'ADD_STORY': {
      const newStory = action.payload.story;
      const hasNoStories = !state.current_story && state.backlog.length === 0;

      if (hasNoStories) {
        return {
          ...state,
          current_story: newStory,
        };
      }

      return {
        ...state,
        backlog: [...state.backlog, newStory],
      };
    }

    case 'UPDATE_STORY': {
      const { storyId, updates } = action.payload;

      let updatedCurrentStory = state.current_story;
      if (state.current_story && state.current_story.id === storyId) {
        updatedCurrentStory = { ...state.current_story, ...updates };
      }

      const updatedBacklog = state.backlog.map((s) =>
        s.id === storyId ? { ...s, ...updates } : s
      );

      return {
        ...state,
        current_story: updatedCurrentStory,
        backlog: updatedBacklog,
      };
    }

    case 'REMOVE_STORY': {
      return {
        ...state,
        backlog: state.backlog.filter((s) => s.id !== action.payload.storyId),
      };
    }

    case 'REORDER_BACKLOG': {
      const incomingIds = action.payload.storyIds;
      if (
        !incomingIds ||
        incomingIds.length !== state.backlog.length ||
        new Set(incomingIds).size !== state.backlog.length
      ) {
        return state;
      }
      const idMap = new Map(state.backlog.map((s) => [s.id, s]));
      const allFound = incomingIds.every((id) => idMap.has(id));
      if (!allFound) {
        return state;
      }

      const newBacklog = incomingIds.map((id) => idMap.get(id)!);
      return {
        ...state,
        backlog: newBacklog,
      };
    }

    case 'NEXT_STORY': {
      let nextStory: Story | null = null;
      let updatedBacklog = state.backlog;

      if (state.backlog.length > 0) {
        nextStory = state.backlog[0];
        updatedBacklog = state.backlog.slice(1);
      }

      return {
        ...state,
        phase: 'Idle',
        current_story: nextStory,
        backlog: updatedBacklog,
        consensus: null,
        participants: state.participants.map((p) => ({
          ...p,
          vote: null,
          has_voted: false,
        })),
      };
    }

    default:
      return state;
  }
}
