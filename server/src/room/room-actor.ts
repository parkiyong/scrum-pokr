import {
  maskRoomStateForParticipant,
  roomReducer,
} from '@scrumpokr/shared';
import type {
  Participant,
  PointReference,
  Role,
  RoomAction,
  RoomState,
  StoryDoctorReport,
} from '@scrumpokr/shared';

type Subscriber = (maskedState: RoomState) => Promise<void> | void;

const DEFAULT_POINT_REFERENCES: PointReference[] = [
  { points: '1', title: 'T-Shirt S / Micro task', description: 'Simple, low risk change' },
  { points: '3', title: 'Medium Story', description: 'Clear requirements, moderate effort' },
  { points: '5', title: 'Large Story', description: 'Requires decomposition or spike' },
];

const DEFAULT_STORY_DOCTOR_REPORT: StoryDoctorReport = {
  invest_score: 85,
  summary: 'Good story structure with clear persona and outcome.',
  complexity: {
    data_models: 'Low - Isolated table update',
    dependencies_apis: 'None',
    blast_radius: 'Isolated UI and service boundary',
  },
  edge_cases: [
    { id: 'ec-1', category: 'NetworkTimeouts', title: 'Network Disconnect', description: 'Check network disconnects during voting', checked: false },
    { id: 'ec-2', category: 'EmptyBoundary', title: 'Empty Payload', description: 'Verify empty vote payload handling', checked: false },
  ],
};

export class RoomActor {
  private state: RoomState;
  private subscribers: Map<string, Set<Subscriber>> = new Map();
  public lastActiveAt: number = Date.now();
  private facilitatorFailoverTimer: NodeJS.Timeout | null = null;

  constructor(public readonly slug: string, public readonly shortCode: string) {
    this.state = {
      slug,
      short_code: shortCode,
      phase: 'Idle',
      participants: [],
      current_story: {
        id: 'story-1',
        title: 'Sample User Story',
        description: 'As a user, I want to estimate user stories collaboratively so that our team aligns on effort.',
        acceptance_criteria: ['Cards reveal simultaneously on facilitator trigger', 'Consensus is calculated automatically'],
        points: null,
      },
      backlog: [],
      point_references: [...DEFAULT_POINT_REFERENCES],
      story_doctor_report: DEFAULT_STORY_DOCTOR_REPORT,
      facilitator_id: '',
      consensus: null,
    };
  }

  public getState(): RoomState {
    return this.state;
  }

  public getMaskedState(participantId: string): RoomState {
    return maskRoomStateForParticipant(this.state, participantId);
  }

  public dispatch(action: RoomAction): void {
    this.lastActiveAt = Date.now();
    this.state = roomReducer(this.state, action);
    this.broadcast();
  }

  public join(
    requestedId: string | undefined,
    name: string,
    avatar: string,
    role?: Role
  ): Participant {
    this.lastActiveAt = Date.now();
    const pid = requestedId && requestedId.trim() !== ''
      ? requestedId
      : `p-${Math.random().toString(36).substring(2, 10)}`;

    const isFirst = this.state.participants.length === 0 || !this.state.facilitator_id;
    const assignedRole: Role = role || 'Estimator';

    const participant: Participant = {
      id: pid,
      name,
      avatar: avatar || '',
      role: assignedRole,
      connected: true,
      has_voted: false,
      vote: null,
    };

    if (isFirst) {
      this.state.facilitator_id = pid;
    }

    this.dispatch({ type: 'JOIN', payload: { participant } });

    // Cancel facilitator failover if facilitator rejoined
    if (this.state.facilitator_id === pid && this.facilitatorFailoverTimer) {
      clearTimeout(this.facilitatorFailoverTimer);
      this.facilitatorFailoverTimer = null;
    }

    return this.state.participants.find((p) => p.id === pid) || participant;
  }

  public subscribe(participantId: string, callback: Subscriber): () => void {
    if (!this.subscribers.has(participantId)) {
      this.subscribers.set(participantId, new Set());
    }
    this.subscribers.get(participantId)!.add(callback);

    return () => {
      const set = this.subscribers.get(participantId);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.subscribers.delete(participantId);
        }
      }
    };
  }

  public handleParticipantDisconnect(participantId: string): void {
    const participantSubs = this.subscribers.get(participantId);
    if (!participantSubs || participantSubs.size === 0) {
      this.dispatch({
        type: 'SET_CONNECTED',
        payload: { participantId, connected: false },
      });

      // Handle Facilitator Failover
      if (this.state.facilitator_id === participantId && !this.facilitatorFailoverTimer) {
        this.facilitatorFailoverTimer = setTimeout(() => {
          this.promoteNextOldestEstimator();
        }, 5 * 60 * 1000); // 5 minutes
      }
    }
  }

  public hasSubscribers(): boolean {
    for (const set of this.subscribers.values()) {
      if (set.size > 0) return true;
    }
    return false;
  }

  public closeAllSubscribers(): void {
    this.subscribers.clear();
  }

  private promoteNextOldestEstimator(): void {
    const connectedEstimators = this.state.participants.filter(
      (p) => p.connected && p.role === 'Estimator' && p.id !== this.state.facilitator_id
    );

    if (connectedEstimators.length > 0) {
      const nextFacilitator = connectedEstimators[0];
      this.dispatch({
        type: 'TRANSFER_FACILITATOR',
        payload: { targetId: nextFacilitator.id },
      });
    }
    this.facilitatorFailoverTimer = null;
  }

  public broadcast(): void {
    const raw = this.state;
    this.subscribers.forEach((callbacks, pid) => {
      const masked = maskRoomStateForParticipant(raw, pid);
      callbacks.forEach((cb) => {
        try {
          cb(masked);
        } catch {
          // Ignored, subscriber will be pruned on abort
        }
      });
    });
  }
}
