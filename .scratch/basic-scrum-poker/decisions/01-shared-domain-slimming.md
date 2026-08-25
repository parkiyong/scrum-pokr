# Shared Domain Model & Reducer Slimming

Type: research
Status: resolved
Blocked by:

## Question

What exact domain types, interfaces, schema validators, and reducer actions must be pruned or refactored in `shared/` (`shared/src/domain.ts`, `shared/src/room-reducer.ts`, `shared/src/reveal-gate.ts`, `shared/src/schemas.ts`) to completely eliminate all AI advisory structures (Story Doctor, SPIDR Slices, Invest Scorecard, Complexity Summary, Edge Cases, Reference Matcher) and external issue tracker sync fields, while preserving full support for:
1. Participant roles (`Facilitator`, `Estimator`, `Observer`)
2. Configurable estimation decks (Fibonacci, Modified Fibonacci, T-Shirt, Custom)
3. Server-enforced Reveal Gate & consensus computation
4. In-room manual story creation, backlog queue ordering, and finalization

## Answer

### 1. Excised AI & Tracker bloat

The following interfaces, types, and schemas are strictly removed from `shared/`:
- **AI Structures**: `StoryDoctorReport`, `InvestCriterionResult`, `InvestScorecard`, `ComplexitySummary`, `EdgeCaseCategory`, `EdgeCaseItem`, `StorySlice` (SPIDR slicer), and `PointReference` (AI benchmark library).
- **Issue Tracker Fields**: On `Story`, remove `key`, `url`, `tracker_provider`, `external_id`, and `status`.
- **Tracker Schemas**: Remove `trackerConfigSchema`, `connectTrackerSchema`, `testTrackerSchema`, `fetchBacklogSchema`, `syncEstimateSchema`, and `pushSlicesSchema`.
- **Phases**: Prune `EstimationPhase` from 7 states down to 4: `'Idle' | 'Voting' | 'Revealed' | 'Finalized'`. (Removed: `'StoryDoctorReview'`, `'Discussing'`, `'Slicing'`).

### 2. Standardized Deck Configuration

A first-class `DeckConfig` model is introduced to support configurable deck presets:
```typescript
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
```

### 3. Lean Domain Models (`shared/src/domain.ts`)

```typescript
export type Role = 'Estimator' | 'Observer';

export type EstimationPhase = 'Idle' | 'Voting' | 'Revealed' | 'Finalized';

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
  phase: EstimationPhase;
  deck: DeckConfig;
  facilitator_id: string;
  participants: Participant[];
  current_story: Story | null;
  backlog: Story[];
  consensus: ConsensusSummary | null;
}
```

### 4. Lean Reducer Actions (`shared/src/room-reducer.ts`)

The room reducer handles 16 canonical actions covering the entire poker lifecycle:
1. **Roster & Presence**:
   - `JOIN`: Adds new participant or reconnects existing participant, promoting first joiner to Facilitator.
   - `SET_CONNECTED`: Toggles participant connectivity on SSE disconnect/reconnect.
   - `UPDATE_ROLE`: Switches participant between `Estimator` and `Observer`.
   - `TRANSFER_FACILITATOR`: Explicitly delegates facilitator privileges.
2. **Room Settings**:
   - `SET_DECK`: Updates the room's active card scale (`deck: DeckConfig`).
3. **Estimation Flow**:
   - `START_VOTING`: Sets phase to `'Voting'`, resets votes if coming from `'Revealed'` or `'Finalized'`.
   - `CAST_VOTE`: Records vote and sets `has_voted: true` only if phase is `'Idle'` or `'Voting'`.
   - `REVEAL_CARDS`: Sets phase to `'Revealed'`, computes consensus across cast votes.
   - `RESET_ROUND`: Sets phase to `'Idle'`, clears all participant votes and consensus.
   - `FINALIZE_STORY`: Sets phase to `'Finalized'`, assigns final agreed points to `current_story.points`.
4. **Story & Backlog Management**:
   - `SET_STORY`: Sets `current_story` and resets the voting round.
   - `ADD_STORY`: Appends a new story to `backlog` (or sets as `current_story` if backlog and current are empty).
   - `UPDATE_STORY`: Edits `title`, `description`, or `acceptance_criteria` of a story in `current_story` or `backlog`.
   - `REMOVE_STORY`: Removes a story from `backlog` by ID.
   - `REORDER_BACKLOG`: Reorders `backlog` using a validated permutation array of story IDs.
   - `NEXT_STORY`: Shifts head of `backlog` into `current_story`, resets round to `'Idle'`, clears votes.

### 5. Reveal Gate Invariant (`shared/src/reveal-gate.ts`)

- `computeConsensus(participants: Participant[])`:
  Calculates mode (most common vote), agreement percentage, and outlier spread across all cast votes (ignoring `'?'` and unvoted participants). Works identically for numeric and T-shirt scales.
- `maskRoomStateForParticipant(state: RoomState, requestingParticipantId: string)`:
  - When `phase === 'Revealed' || phase === 'Finalized'`: Returns full `RoomState` including all votes and consensus.
  - When `phase === 'Idle' || phase === 'Voting'`: Masks all other participants' votes to `null` while preserving `has_voted: boolean` and the requester's own `vote`. Forces `consensus: null`.

### 6. Refactored Validation Schemas (`shared/src/schemas.ts`)

Zod schemas are trimmed to match only the basic poker API requests:
- `roleSchema`: `z.enum(['Estimator', 'Observer'])`
- `deckTypeSchema`: `z.enum(['fibonacci', 'modified_fibonacci', 'tshirt', 'sequential', 'custom'])`
- `deckConfigSchema`: `z.object({ type: deckTypeSchema, cards: z.array(z.string()).min(1) })`
- `storySchema`: `z.object({ id: z.string(), title: z.string().min(1), description: z.string().default(''), acceptance_criteria: z.array(z.string()).default([]), points: z.string().nullable().optional() })`
- `joinRequestSchema`, `voteRequestSchema`, `setDeckSchema`, `finalizeRequestSchema`, `addStorySchema`, `updateStorySchema`, `reorderBacklogSchema`, `removeStorySchema`, `updateRoleSchema`, `transferFacilitatorSchema`.
