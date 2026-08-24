export type Role = 'Estimator' | 'Observer';

export type EstimationPhase =
  | 'Idle'
  | 'StoryDoctorReview'
  | 'Voting'
  | 'Revealed'
  | 'Discussing'
  | 'Slicing'
  | 'Finalized';

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
  key?: string;
  url?: string;
  tracker_provider?: string;
  external_id?: string;
  status?: string;
}

export interface StorySlice {
  title: string;
  description: string;
  acceptance_criteria: string[];
  spidr_pattern?: 'Spike' | 'Path' | 'Interface' | 'Data' | 'Rule';
  suggested_points?: string;
}

export interface PointReference {
  points: string | number;
  title: string;
  description: string;
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

export interface InvestCriterionResult {
  criterion: 'Independent' | 'Negotiable' | 'Valuable' | 'Estimable' | 'Small' | 'Testable';
  name: string;
  passed: boolean;
  score: number;
  observation: string;
  recommendation?: string;
}

export interface InvestScorecard {
  overall_score: number;
  criteria: InvestCriterionResult[];
  summary: string;
  issues: string[];
}

export interface ComplexitySummary {
  data_models: string;
  dependencies_apis: string;
  blast_radius: string;
}

export type EdgeCaseCategory =
  | 'NetworkTimeouts'
  | 'EmptyBoundary'
  | 'ConcurrencyRaces'
  | 'PermissionsAccess';

export interface EdgeCaseItem {
  id: string;
  category: EdgeCaseCategory;
  category_name?: string;
  title: string;
  description: string;
  checked: boolean;
}

export interface StoryDoctorReport {
  invest_score: number;
  summary: string;
  complexity?: ComplexitySummary;
  edge_cases: EdgeCaseItem[];
}

export interface RoomState {
  slug: string;
  short_code: string;
  phase: EstimationPhase;
  participants: Participant[];
  current_story: Story | null;
  backlog: Story[];
  point_references: PointReference[];
  story_doctor_report: StoryDoctorReport | null;
  facilitator_id: string;
  consensus: ConsensusSummary | null;
}
