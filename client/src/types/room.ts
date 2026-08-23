export type Role = 'Estimator' | 'Observer';

export type EstimationPhase =
  | 'Idle'
  | 'StoryDoctorReview'
  | 'Voting'
  | 'Revealed'
  | 'Discussing'
  | 'Slicing'
  | 'Finalized';

export type TrackerProvider = 'Linear' | 'GitHub' | 'Jira';

export interface Story {
  id: string;
  title: string;
  description: string;
  acceptance_criteria: string[];
  key?: string;
  url?: string;
  tracker_provider?: string;
  external_id?: string;
  points?: string;
  status?: string;
}

export interface StorySlice {
  title: string;
  description: string;
  acceptance_criteria: string[];
  estimated_points?: number;
}

export type TrackerConfig =
  | {
      provider: 'Linear';
      config: {
        api_key: string;
        endpoint?: string;
      };
    }
  | {
      provider: 'GitHub';
      config: {
        personal_access_token: string;
        owner: string;
        repo: string;
        endpoint?: string;
      };
    }
  | {
      provider: 'Jira';
      config: {
        domain: string;
        email: string;
        api_token: string;
        project_key: string;
        endpoint?: string;
        points_field?: string;
      };
    };

export interface TrackerQuery {
  team_id?: string;
  cycle_id?: string;
  project_id?: string;
  sprint_id?: string;
  milestone?: string;
  labels?: string[];
  jql?: string;
}

export interface TrackerEntity {
  id: string;
  name: string;
  extra?: string;
}

export interface ConnectionPreview {
  provider: TrackerProvider;
  authenticated: boolean;
  user_name?: string;
  teams: TrackerEntity[];
  cycles: TrackerEntity[];
  projects: TrackerEntity[];
  sprints: TrackerEntity[];
  milestones: TrackerEntity[];
}

export interface Participant {
  id: string;
  nickname: string;
  avatar: string;
  role: Role;
  connected: boolean;
  voted: boolean;
  vote?: string;
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

export interface RoomSnapshotData {
  slug: string;
  short_code: string;
  phase: EstimationPhase;
  round_number: number;
  active_story: Story | null;
  backlog: Story[];
  active_tracker_provider?: string;
  tracker_connected: boolean;
  participants: Participant[];
  facilitator_id: string;
  consensus: ConsensusSummary | null;
}

export type ClientCommand =
  | {
      type: 'JoinRoom';
      payload: {
        participant_id: string;
        nickname: string;
        avatar: string;
        role?: Role;
      };
    }
  | { type: 'SelectStory'; payload: { story: Story | null } }
  | { type: 'SelectStoryById'; payload: { story_id: string } }
  | { type: 'ConnectTracker'; payload: { config: TrackerConfig } }
  | { type: 'DisconnectTracker' }
  | { type: 'TestTrackerConnection'; payload: { config: TrackerConfig } }
  | { type: 'FetchBacklog'; payload: { query: TrackerQuery } }
  | { type: 'ImportBacklog'; payload: { stories: Story[] } }
  | { type: 'ImportMarkdown'; payload: { raw_markdown: string } }
  | {
      type: 'SyncEstimateToTracker';
      payload: { story_id: string; points: number; post_comment?: boolean };
    }
  | {
      type: 'PushStorySlices';
      payload: { parent_id: string; slices: StorySlice[] };
    }
  | { type: 'ReorderBacklog'; payload: { story_ids: string[] } }
  | { type: 'RemoveStoryFromBacklog'; payload: { story_id: string } }
  | { type: 'StartVoting' }
  | { type: 'CastVote'; payload: { value: string } }
  | { type: 'RetractVote' }
  | { type: 'RevealCards' }
  | { type: 'TriggerReVote' }
  | { type: 'FinalizeStory'; payload: { points?: string } }
  | { type: 'UpdateRole'; payload: { target_id: string; new_role: Role } }
  | { type: 'TransferFacilitator'; payload: { target_id: string } }
  | { type: 'Ping' };

export type ServerEvent =
  | { type: 'RoomSnapshot'; payload: { state: RoomSnapshotData } }
  | {
      type: 'ParticipantJoined';
      payload: {
        participant_id: string;
        nickname: string;
        avatar: string;
        role: Role;
      };
    }
  | { type: 'ParticipantLeft'; payload: { participant_id: string } }
  | { type: 'VoteCast'; payload: { participant_id: string } }
  | { type: 'VoteRetracted'; payload: { participant_id: string } }
  | {
      type: 'CardsRevealed';
      payload: {
        votes: Record<string, string>;
        distribution: ConsensusSummary | null;
      };
    }
  | { type: 'RoundReset'; payload: { round_number: number } }
  | { type: 'StoryFinalized'; payload: { story_id?: string; points: string } }
  | { type: 'TrackerConnected'; payload: { provider: string } }
  | { type: 'TrackerDisconnected' }
  | {
      type: 'TrackerConnectionTested';
      payload: { preview: ConnectionPreview };
    }
  | { type: 'BacklogUpdated'; payload: { backlog: Story[] } }
  | {
      type: 'EstimateSynced';
      payload: {
        story_id: string;
        external_id: string;
        points: number;
        success: boolean;
        message?: string;
      };
    }
  | {
      type: 'SlicesPushed';
      payload: { parent_id: string; created_stories: Story[] };
    }
  | { type: 'TrackerError'; payload: { message: string } }
  | { type: 'RoleUpdated'; payload: { participant_id: string; role: Role } }
  | { type: 'FacilitatorChanged'; payload: { facilitator_id: string } }
  | { type: 'Error'; payload: { message: string } }
  | { type: 'Pong' };

export interface LocalSessionProfile {
  participant_id: string;
  nickname: string;
  avatar: string;
  role?: Role;
}

