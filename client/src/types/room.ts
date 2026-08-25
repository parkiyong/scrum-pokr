import type {
  ConsensusCategory,
  ConsensusSummary,
  DeckConfig,
  DeckType,
  EstimationPhase,
  Participant,
  Role,
  RoomState,
  Story,
} from '@scrumpokr/shared';

export { DEFAULT_DECKS } from '@scrumpokr/shared';

export type {
  ConsensusCategory,
  ConsensusSummary,
  DeckConfig,
  DeckType,
  EstimationPhase,
  Participant,
  Role,
  RoomState,
  Story,
};

export interface LocalSessionProfile {
  participant_id: string;
  nickname: string;
  avatar: string;
  role?: Role;
}
