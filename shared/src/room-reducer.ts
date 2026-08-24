import type {
  Participant,
  PointReference,
  Role,
  RoomState,
  Story,
  StoryDoctorReport,
} from './domain';
import { computeConsensus } from './reveal-gate';

export type RoomAction =
  | { type: 'JOIN'; payload: { participant: Participant } }
  | { type: 'START_VOTING' }
  | { type: 'CAST_VOTE'; payload: { participantId: string; vote: string | null } }
  | { type: 'REVEAL_CARDS' }
  | { type: 'RESET_ROUND' }
  | { type: 'FINALIZE_STORY'; payload: { estimate?: string | null } }
  | { type: 'SET_STORY'; payload: { story: Story | null } }
  | { type: 'NEXT_STORY' }
  | { type: 'IMPORT_BACKLOG'; payload: { stories: Story[] } }
  | { type: 'UPDATE_POINT_REFERENCES'; payload: { references: PointReference[] } }
  | { type: 'TOGGLE_EDGE_CASE'; payload: { edgeCaseId: string; checked: boolean } }
  | { type: 'SET_STORY_DOCTOR_REPORT'; payload: { report: StoryDoctorReport | null } }
  | { type: 'UPDATE_ROLE'; payload: { targetId: string; newRole: Role } }
  | { type: 'TRANSFER_FACILITATOR'; payload: { targetId: string } }
  | { type: 'REORDER_BACKLOG'; payload: { storyIds: string[] } }
  | { type: 'REMOVE_STORY'; payload: { storyId: string } }
  | { type: 'SET_CONNECTED'; payload: { participantId: string; connected: boolean } };

export function roomReducer(state: RoomState, action: RoomAction): RoomState {
  switch (action.type) {
    case 'JOIN': {
      const { participant } = action.payload;
      const existsIndex = state.participants.findIndex((p) => p.id === participant.id);
      let updatedParticipants: Participant[];

      if (existsIndex >= 0) {
        updatedParticipants = state.participants.map((p, idx) =>
          idx === existsIndex
            ? { ...p, name: participant.name, avatar: participant.avatar, connected: true }
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
      const estimate = action.payload.estimate;
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
        story_doctor_report: null,
        participants: state.participants.map((p) => ({
          ...p,
          vote: null,
          has_voted: false,
        })),
      };
    }

    case 'IMPORT_BACKLOG': {
      const stories = action.payload.stories || [];
      const hasExistingStory = Boolean(state.current_story);
      const currentStory = state.current_story || (stories.length > 0 ? stories[0] : null);
      const backlog = hasExistingStory ? stories : stories.slice(1);

      return {
        ...state,
        backlog,
        current_story: currentStory,
      };
    }

    case 'UPDATE_POINT_REFERENCES': {
      return {
        ...state,
        point_references: action.payload.references || [],
      };
    }

    case 'TOGGLE_EDGE_CASE': {
      if (!state.story_doctor_report) return state;

      const updatedEdgeCases = state.story_doctor_report.edge_cases.map((ec) =>
        ec.id === action.payload.edgeCaseId ? { ...ec, checked: action.payload.checked } : ec
      );

      return {
        ...state,
        story_doctor_report: {
          ...state.story_doctor_report,
          edge_cases: updatedEdgeCases,
        },
      };
    }

    case 'SET_STORY_DOCTOR_REPORT': {
      return {
        ...state,
        story_doctor_report: action.payload.report,
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

    case 'REMOVE_STORY': {
      return {
        ...state,
        backlog: state.backlog.filter((s) => s.id !== action.payload.storyId),
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

    default:
      return state;
  }
}
