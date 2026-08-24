# 04: In-Memory Room State Machine & Lifecycle Semantics

Type: grilling
Status: resolved
Blocked by: 01, 02

## Question

What are the exact room lifecycle policies (TTL for inactive rooms, participant reconnect grace periods, room eviction), and how should the in-memory Room state transitions (`Idle` -> `Voting` -> `Revealed` -> `Finalized`) be modeled in TypeScript (Event-Driven State Reducer vs. Domain Entity Class)?

## Background & Context

- Node.js event-loop executes state mutations synchronously, eliminating the Java `ReentrantLock` concurrency overhead.
- We need to align on:
  1. Room Inactivity Cleanup: Automatic eviction of rooms where no participant has pinged or interacted for e.g. 2 hours.
  2. Participant Reconnection: How long a disconnected estimator remains in the participant list before being marked offline or pruned.
  3. State Machine Pattern: Pure reducer functions `(state, action) => nextState` vs. stateful `RoomHandle` class methods.

## Answer

### 1. Room Lifecycle & Inactivity Eviction (TTL)

- **Inactivity TTL**: **4 hours** of zero activity (no active SSE streams and no REST commands received).
- **Background Sweeper**: A lightweight periodic timer in Hono server (`setInterval` every 10 minutes) checks `lastActiveAt`. If `Date.now() - room.lastActiveAt > 4 * 60 * 60 * 1000`, the room is evicted and its subscribers closed.
- **Activity Touchpoints**: Every incoming REST action (join, vote, reveal, story select) and SSE connection resets `room.lastActiveAt = Date.now()`.

### 2. Participant Connection & Disconnection State Machine

- **Instant Disconnect Indicator**: When a participant's last active SSE connection closes, their `connected` property transitions to `false`, and an updated `room_state` is immediately broadcasted (displaying an offline badge on their avatar in the UI).
- **Session Preservation**: Disconnected participants remain in the room roster and retain their cast votes. When reconnecting via their cached `localStorage` UUID, `connected` flips back to `true` with zero loss of state.
- **Facilitator Disconnect & Failover**:
  - If the `Facilitator` disconnects, a 5-minute failover timer starts.
  - If the facilitator reconnects within 5 minutes, the timer cancels.
  - If the 5 minutes elapse without reconnect, facilitator authority is automatically transferred to the next oldest connected `Estimator`.

### 3. Reducer + Actor Architecture

State transitions are modeled using a **Pure State Reducer in `@scrumpokr/shared`**, managed by an in-memory **`Room` actor in `@scrumpokr/server`**:

```typescript
// shared/src/room-reducer.ts
export type RoomAction =
  | { type: 'JOIN'; payload: { participant: Participant } }
  | { type: 'START_VOTING' }
  | { type: 'CAST_VOTE'; payload: { participantId: string; vote: string } }
  | { type: 'RETRACT_VOTE'; payload: { participantId: string } }
  | { type: 'REVEAL_CARDS' }
  | { type: 'RESET_ROUND' }
  | { type: 'FINALIZE_STORY'; payload: { estimate?: string } }
  | { type: 'SELECT_STORY'; payload: { story: Story } }
  | { type: 'SET_CONNECTED'; payload: { participantId: string; connected: boolean } }
  | { type: 'PROMOTE_FACILITATOR'; payload: { targetId: string } };

export function roomReducer(state: RoomState, action: RoomAction): RoomState {
  switch (action.type) {
    case 'START_VOTING':
      return { ...state, phase: 'Voting' };
    case 'CAST_VOTE': {
      const { participantId, vote } = action.payload;
      const updated = state.participants.map(p =>
        p.id === participantId ? { ...p, vote, has_voted: true } : p
      );
      const allVoted = updated.filter(p => p.role === 'Estimator').every(p => p.has_voted);
      return {
        ...state,
        participants: updated,
        phase: state.phase === 'Idle' ? 'Voting' : state.phase,
      };
    }
    case 'REVEAL_CARDS':
      return {
        ...state,
        phase: 'Revealed',
        consensus: computeConsensus(state.participants),
      };
    case 'RESET_ROUND':
      return {
        ...state,
        phase: 'Idle',
        consensus: null,
        participants: state.participants.map(p => ({ ...p, vote: null, has_voted: false })),
      };
    case 'FINALIZE_STORY':
      return {
        ...state,
        phase: 'Finalized',
        active_story: state.active_story
          ? { ...state.active_story, points: action.payload.estimate }
          : null,
      };
    default:
      return state;
  }
}
```

```typescript
// server/src/room/room-actor.ts
export class RoomActor {
  private state: RoomState;
  public lastActiveAt: number = Date.now();
  private facilitatorTimer: NodeJS.Timeout | null = null;

  public dispatch(action: RoomAction): void {
    this.lastActiveAt = Date.now();
    this.state = roomReducer(this.state, action);
    this.broadcast();
  }
}
```

