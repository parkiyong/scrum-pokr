# Scrum Poker AI — Product & System Specification

A real-time, zero-auth, standalone Scrum Poker estimation platform with a high-performance Rust backend (Axum + Tokio), PostgreSQL vector embeddings (`pgvector`), and an advisory AI intelligence layer.

---

## 1. Executive Summary & Design Principles

* **Seamless Issue Tracker Integration**: Direct 2-way system integration with Linear, GitHub Issues, and Jira via a unified `IssueTrackerAdapter` trait. Ingests sprint/cycle backlogs automatically and writes consensus estimates back upon finalization without manual copy-paste.
* **Zero-Auth Simplicity & Ephemeral Security**: Facilitators and estimators join in seconds via room URLs (`scrum.app/r/swift-badger-42`) or 6-character short codes (`SWB-42`) without registration or accounts. Issue tracker credentials (API tokens) remain strictly in Tokio room memory and are never persisted to disk.
* **Server-Enforced Reveal Gate**: AI predictions, baseline recommendations, and peer votes are strictly withheld at the protocol level during voting, eliminating anchoring bias and groupthink.
* **Advisory AI Guardrails**: AI never votes, never ranks developers, and never scores individual accuracy. It assists humans with pre-vote quality checks (Story Doctor), neutral divergence analysis, and vertical slicing (SPIDR).

---

## 2. System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React Web Client (SPA)                          │
│   ┌──────────────────────┬──────────────────────┬───────────────────┐  │
│   │  Left: Story Doctor  │ Center: Poker Arena  │ Right: AI Advisory│  │
│   │  & INVEST Scorecard  │ & 3D Card Flipping   │ & Reference Deck  │  │
│   └──────────────────────┴──────────────────────┴───────────────────┘  │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │ WebSocket (JSON RPC)
┌───────────────────────────────────▼────────────────────────────────────┐
│                       Rust Backend (Tokio / Axum)                      │
│  ┌─────────────────────────┐ ┌──────────────────────────────────────┐  │
│  │   In-Memory Room Actors │ │    AI Advisory Engine                │  │
│  │   - 7-Phase State Mach. │ │    - Story Doctor (INVEST + Edge)    │  │
│  │   - Reveal Gate Filter  │ │    - Divergence Analyzer (Spread)    │  │
│  │   - Socket Reconnection │ │    - SPIDR Vertical Slicer           │  │
│  └────────────┬────────────┘ └──────────────────┬───────────────────┘  │
└───────────────┼─────────────────────────────────┼──────────────────────┘
                │ Async Persistence               │ Nearest-Neighbor Vector Lookups
┌───────────────▼─────────────────────────────────▼──────────────────────┐
│                    PostgreSQL + pgvector Database                      │
│   - historical_stories (1536-dim IVFFlat index, team_namespace)        │
│   - team_estimation_profiles (velocity bands, calibration weights)     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Zero-Auth Room Lifecycle & In-Memory Actor Model

### 3.1 Room Identifiers & Addressing
* **Slugs & Codes**: Auto-generates memorable slugs (e.g. `swift-badger-42`) paired with an uppercase 6-character mobile join code (e.g. `SWB-42`), with optional custom slug overrides.
* **Facilitator Ownership & Promotion**:
  * The socket that creates the room is assigned initial Facilitator authority.
  * If the Facilitator drops, authority automatically promotes to the next senior Estimator in the connected roster (or can be explicitly transferred).

### 3.2 Ephemeral Session Identity & Seamless Reconnects
* **Participant UUID**: On joining, the browser caches a `participant_id` (UUIDv4), nickname, avatar color, and role (`Estimator` | `Observer`) in `localStorage` under `scrum_poker:room:<slug>`.
* **Handshake Recovery**: Reconnecting clients pass `(room_slug, participant_id)` in the initial WebSocket frame to reclaim their seat and restore existing unrevealed/revealed votes without UI friction.
* **In-Memory Architecture**: Active room state lives entirely in Tokio actor memory, delivering sub-millisecond real-time responses with zero database contention during live sessions.

---

## 4. Real-Time WebSocket Protocol & State Machine

### 4.1 7-Phase Estimation State Machine

```
[Idle]
   │
   ▼ (Facilitator selects story)
[StoryDoctorReview] ──► (INVEST audit & edge cases displayed)
   │
   ▼ (Facilitator triggers StartVoting)
[Voting] ─────────────► (Private voting; AI baseline computed silently)
   │
   ▼ (Facilitator triggers RevealCards)
[Revealed] ───────────► (Cards flip; AI baseline & Reference Matcher unlocked)
   │
   ├──► (Consensus reached) ─────────► [Finalized] ──► [Idle]
   │                                      ▲
   ├──► (Outlier spread)                  │
   │       ▼                              │
   │    [Discussing] ─► (Re-Vote) ─► [Voting]
   │       │
   │       ▼ (Points ≥ 8 or split)
   │    [Slicing] ────► (Enqueue SPIDR child slices)
```

### 4.2 Server-Enforced Reveal Gate
* **State-Dependent Serializer Projections**:
  * In `Voting` state, the server serializes room state via `RoomStatePublicVoting`, projecting participant votes strictly as `has_voted: bool` and omitting `ai_baseline` and `reference_matches`.
  * Only when the state transitions to `Revealed` does `RoomStatePublicRevealed` construct and broadcast the unmasked card values and AI insights.

### 4.3 WebSocket Message Contracts (Tagged JSON)

#### Client Commands (`ClientCommand`)
```json
{ "type": "JoinRoom", "payload": { "participant_id": "uuid", "nickname": "Alex", "avatar": "indigo", "role": "Estimator" } }
{ "type": "SelectStory", "payload": { "story_id": "uuid" } }
{ "type": "StartVoting" }
{ "type": "CastVote", "payload": { "value": "5" } }
{ "type": "RetractVote" }
{ "type": "RevealCards" }
{ "type": "TriggerReVote" }
{ "type": "TriggerSlice" }
{ "type": "ApplySlices", "payload": { "slices": [ { "title": "Slice 1", "description": "...", "acceptance_criteria": [] } ] } }
{ "type": "FinalizeStory", "payload": { "points": "5" } }
{ "type": "SkipStory" }
{ "type": "UpdateRole", "payload": { "target_id": "uuid", "new_role": "Observer" } }
{ "type": "Ping" }
```

#### Server Events (`ServerEvent`)
```json
{ "type": "RoomSnapshot", "payload": { "state": { "phase": "Voting", "story": { ... }, "participants": [ ... ] } } }
{ "type": "VoteCast", "payload": { "participant_id": "uuid" } }
{ "type": "CardsRevealed", "payload": { "votes": { "uuid-1": "5", "uuid-2": "13" }, "distribution": { "category": "HighOutlier", "consensus_pct": 75 }, "ai_baseline": { "points": 5, "confidence": 0.88 }, "reference_matches": [ ... ] } }
{ "type": "DivergenceHypothesisGenerated", "payload": { "hypothesis": "Spread between 3 and 13 suggests uncertainty around schema migration vs in-memory caching.", "outlier_prompt": "Elena, what risks are you seeing?" } }
{ "type": "VerticalSlicesProposed", "payload": { "slices": [ ... ] } }
{ "type": "RoundReset", "payload": { "round_number": 2, "previous_round": { ... } } }
{ "type": "StoryFinalized", "payload": { "story_id": "uuid", "points": "5", "telemetry": { ... } } }
```

---

## 5. AI Advisory Intelligence Specifications

### 5.1 Story Doctor (Pre-Vote Quality Gate)
* **INVEST Audit**: Evaluates Independent, Negotiable, Valuable, Estimable, Small, Testable criteria; outputs a 0–100% readiness score with an advisory, non-blocking `[Review Issues]` / `[Vote Anyway]` banner.
* **3-Axis Complexity Summary**:
  * 💾 **Data Models**: Database mutations, schema changes, state persistence.
  * 🔌 **Dependencies & APIs**: Background queues, external APIs, third-party libraries.
  * 💥 **Blast Radius**: User flow regressions, backward compatibility, performance risks.
* **4-Category Edge Cases**: Generates actionable interactive checkboxes for *Error/Failure*, *Empty/Boundary*, *Concurrency & Races*, and *Permissions/Access*.

### 5.2 Reference Matcher & `pgvector` Architecture
* **Composite Embedding**: Vectorizes `"{title}\n{description}\nAcceptance Criteria:\n{ac_items}"` (1536 dimensions).
* **AI Baseline Recommendation**: Cosine similarity query (`≥0.70`) within `team_namespace`. AI baseline is calculated as the similarity-weighted average of historical points, snapped to the nearest Fibonacci card (1, 2, 3, 5, 8, 13, 21).
* **Cold Start Auto-Seeding**: New team namespaces automatically seed the 6 Point Reference Library benchmark stories.

### 5.3 Divergence Analyzer & SPIDR Vertical Slicer
* **Deterministic Classifier**: Categorizes vote spreads into `Consensus`, `HighOutlier`, `LowOutlier`, `BimodalSplit`, or `WideSpread`.
* **Neutral Axis Synthesis**: LLM produces 1–2 neutral sentences naming the technical divergence axis without picking a winner or prescribing estimates.
* **SPIDR Vertical Slicer**: Decomposes 8+ point stories into 2–4 child slices with titles, descriptions, and acceptance criteria; one-click queue insertion.

### 5.4 Point Reference Library
* Collapsible sidebar displaying benchmark stories for 1, 2, 3, 5, 8, and 13 points, editable by the Facilitator.

### 5.5 Team Estimation Profile & Calibration Model
* **Strict Privacy Guarantee**: Tracks only team-level metrics in `team_estimation_profiles` (Velocity Band, First-Round Consensus %, Slicing Rate %, Category Bias Index). No individual scoring.
* **Decaying Rolling Calibration**: Exponential decay over the last 50 finalized stories to dynamically adapt Fibonacci suggestions to the team's sizing culture.

---

## 6. PostgreSQL Database Schema

```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Historical story benchmark corpus for AI Reference Matcher
CREATE TABLE historical_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_namespace VARCHAR(64) NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    acceptance_criteria JSONB NOT NULL DEFAULT '[]',
    final_points INTEGER NOT NULL,
    consensus_percentage NUMERIC(5,2),
    divergence_note TEXT,
    embedding vector(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_historical_stories_embedding 
ON historical_stories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_historical_stories_namespace 
ON historical_stories(team_namespace);

-- Team-level estimation telemetry & longitudinal calibration curve
CREATE TABLE team_estimation_profiles (
    team_namespace VARCHAR(64) PRIMARY KEY,
    total_stories_estimated INTEGER NOT NULL DEFAULT 0,
    total_points_estimated INTEGER NOT NULL DEFAULT 0,
    round_one_consensus_rate NUMERIC(5,2) DEFAULT 0.0,
    avg_rounds_per_story NUMERIC(3,2) DEFAULT 1.0,
    slicing_rate NUMERIC(5,2) DEFAULT 0.0,
    velocity_band_avg NUMERIC(5,1) DEFAULT 0.0,
    velocity_band_stddev NUMERIC(5,1) DEFAULT 0.0,
    category_metrics JSONB NOT NULL DEFAULT '{}',
    calibration_curve JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 6.1 Local Database Environment & Docker
The PostgreSQL instance with the `pgvector` extension is provisioned locally via `docker-compose.yml` (`pgvector/pgvector:pg16`):
```bash
docker compose up -d db
```
The database connection string defaults to `DATABASE_URL=postgres://postgres:postgres@localhost:5432/scrum_poker`.

---

## 7. Frontend UX & Wireframe Specifications

### 7.1 Hybrid 3-Column Command Center + Poker Arena
* **Left Column (Story & Quality Gate)**: Story description, INVEST audit scorecard (readiness gauge), Acceptance Criteria badges, and 4-category interactive edge-case checklist.
* **Center Column (Planning Poker Arena)**: Central felt poker table, surrounding participant avatar cards with 3D flip reveal animations, outlier spotlight banner, and docked bottom Fibonacci card deck.
* **Right Column (AI Advisory & Benchmarks)**: Divergence Analyzer hypothesis box with re-vote and slice triggers, Reference Matcher historical cards, and collapsible Point Reference Library.
* **Responsive Breakpoints**:
  * *Desktop (≥1024px)*: Full 3-column command center.
  * *Tablet (768–1023px)*: 2-column view with collapsible side drawers.
  * *Mobile (<768px)*: Single-column stacked view with swipeable tabs and bottom sheet card picker.
* **Interactive Runnable Prototype**: Preserved at [`prototypes/room-ui-prototype.html`](../../prototypes/room-ui-prototype.html).

---

## 8. Unified Issue Tracker Integration & 2-Way Sync Protocol

### 8.1 Unified `IssueTrackerAdapter` Trait
The Rust backend defines a unified asynchronous adapter trait implemented for Linear, GitHub Issues, and Jira Cloud:

```rust
#[async_trait]
pub trait IssueTrackerAdapter: Send + Sync {
    /// Fetch backlog stories matching team, cycle, milestone, or sprint query
    async fn fetch_backlog(&self, query: &TrackerQuery) -> Result<Vec<ExternalStory>, TrackerError>;

    /// Write back finalized story point estimates directly to the issue
    async fn sync_estimate(&self, external_id: &str, points: u32) -> Result<(), TrackerError>;

    /// Post discussion and divergence summary comments
    async fn post_summary_comment(&self, external_id: &str, comment: &str) -> Result<(), TrackerError>;

    /// Push SPIDR vertical child slices as linked sub-issues/tasks
    async fn push_slices(&self, parent_id: &str, slices: &[StorySlice]) -> Result<Vec<ExternalStory>, TrackerError>;
}
```

### 8.2 Provider Integrations
1. **Linear (`LinearAdapter`)**:
   - Uses Linear GraphQL API (`https://api.linear.app/graphql`).
   - Queries issues by Team, Cycle, or Project with title, description, acceptance criteria, and estimate.
   - 2-way estimate writeback via `issueUpdate(id: $id, input: { estimate: $points })`.
   - Child slices pushed via `issueCreate(input: { parentId: $parentId, ... })`.
2. **GitHub Issues (`GitHubAdapter`)**:
   - Uses GitHub REST/GraphQL API (`/repos/{owner}/{repo}/issues`).
   - Queries issues filtered by Milestone, Labels, or Projects v2.
   - 2-way estimate writeback via labels (`points: <N>`) or Projects v2 numeric field.
   - Child slices pushed as linked sub-issues referencing parent (`Parent: #<id>`).
3. **Jira Cloud (`JiraAdapter`)**:
   - Uses Jira Cloud REST API v3 (`https://{domain}.atlassian.net/rest/api/3/`).
   - Queries active sprints and boards using JQL.
   - 2-way estimate writeback updates the configured Story Points field (`customfield_10016`).
   - Child slices pushed as sub-tasks under the parent story.

### 8.3 Zero-Auth Ephemeral Credential Security
* **Session-Only Tokens**: Facilitators input API keys/PATs in the "Connect Tracker" modal.
* **In-Memory Confinement**: Tokens reside strictly in Tokio actor session memory (and Facilitator's browser `sessionStorage`) and are never written to disk or the database.
* **No Peer Leakage**: Tokens are never serialized or sent to Estimators/Observers over WebSockets.

---

## 9. Phased Implementation Roadmap

1. **Phase 1: Tokio Room Actor & WebSocket Engine**
   - In-memory room actor with 7-phase state machine and serializer reveal gate filter.
   - Zero-auth join URL/code resolution and `localStorage` participant reconnects.
2. **Phase 2: Unified Issue Tracker Integration & 2-Way Backlog Sync**
   - `IssueTrackerAdapter` trait in Rust with Linear, GitHub Issues, and Jira Cloud connectors.
   - "Connect Tracker" Facilitator modal, backlog sprint/cycle fetch, and automated estimate writeback on finalization.
3. **Phase 3: Pre-Vote Story Doctor & Point Reference Library**
   - INVEST audit heuristics, 3-axis complexity summary, 4-category edge-case generator.
   - Collapsible Point Reference Library sidebar with in-room customization.
4. **Phase 4: PostgreSQL pgvector & Reference Matcher**
   - Database schema setup, 1536-dim vector indexing, cold start seeding.
   - Cosine similarity query and similarity-weighted Fibonacci baseline calculator.
5. **Phase 5: Divergence Analyzer & SPIDR Vertical Slicer**
   - 5-category vote classifier, neutral axis synthesis prompt, supportive outlier spotlight.
   - SPIDR slice modal with 1-click push to external issue tracker sub-issues.
6. **Phase 6: Team Estimation Profile & Longitudinal Calibration**
   - Team telemetry rollup, velocity band calculation, and rolling 50-story calibration curve.

