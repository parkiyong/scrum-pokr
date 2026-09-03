export type Role = 'Estimator' | 'Observer';

export type EstimationPhase = 'Idle' | 'Voting' | 'Revealed' | 'Finalized';

export type DeckType = 'fibonacci' | 'modified_fibonacci' | 'tshirt' | 'sequential' | 'custom';

export interface DeckConfig {
  type: DeckType;
  cards: string[];
}

export const DEFAULT_DECKS: Record<DeckType, string[]> = {
  fibonacci: ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?'],
  modified_fibonacci: ['0', '0.5', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?'],
  tshirt: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?'],
  sequential: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '?'],
  custom: ['1', '2', '3', '5', '8', '?'],
};

export interface Participant {
  id: string;
  name: string;
  avatar: string;
  role: Role;
  connected: boolean;
  has_voted: boolean;
  vote: string | null;
}

export interface Story {
  id: string;
  title: string;
  description: string;
  acceptance_criteria: string[];
  points?: string | null;
}

export type ConsensusCategory =
  | 'Consensus'
  | 'HighOutlier'
  | 'LowOutlier'
  | 'BimodalSplit'
  | 'WideSpread';

export interface ConsensusSummary {
  category: ConsensusCategory;
  consensus_pct: number;
  agreement_count: number;
  total_votes: number;
  suggested_points?: string;
  min_vote?: string;
  max_vote?: string;
}

export interface RoomState {
  slug: string;
  short_code: string;
  revision?: number;
  phase: EstimationPhase;
  deck: DeckConfig;
  facilitator_id: string;
  participants: Participant[];
  current_story: Story | null;
  backlog: Story[];
  consensus: ConsensusSummary | null;
}
