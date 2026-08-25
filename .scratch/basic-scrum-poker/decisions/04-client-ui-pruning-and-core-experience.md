# Client UI Pruning & Core Poker Experience

Type: prototype
Status: resolved
Blocked by: 03

## Question

Which React components in `client/src/components/` must be deleted (e.g. `ConnectTrackerModal.tsx`, `StoryDoctorPanel.tsx`, `SPIDRSliceModal.tsx`, and AI divergence triggers), and how should the remaining components (`PokerTableArena.tsx`, `BacklogDrawer.tsx`, `DeckSelector.tsx`, `FacilitatorBar.tsx`) and hooks (`useRoomSocket.ts`) be streamlined into a focused, distraction-free poker estimation interface?

## Answer

### 1. Excised Components & Bloat (To Delete)

The following UI components and modal files are permanently deleted:
- ❌ `client/src/components/StoryDoctorPanel.tsx` (AI INVEST scorecard, complexity summary, and edge case checklist).
- ❌ `client/src/components/ConnectTrackerModal.tsx` (Linear/GitHub/Jira OAuth, API key input, and 2-way sync previews).
- ❌ `client/src/components/SPIDRSliceModal.tsx` (AI vertical story decomposition modal).
- ❌ `client/src/components/PointReferenceLibrary.tsx` (AI reference benchmark library drawer).
- ❌ Obsolete unit tests: `ConnectTrackerModal.test.tsx`, `StoryDoctorPanel.test.tsx`, `PointReferenceLibrary.test.tsx`.

---

### 2. Streamlined UI Architecture & Layout

The previous 3-column layout (which crowded the poker table between Story Doctor and Reference Library sidebars) is replaced with a clean, centered, responsive layout:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  🃏 Scrum Pokr    [ SWB-42 ]                    [ 🔗 Share ]  [ 🟢 Alice (Facilitator) ]│  Header
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ 🏷️ ACTIVE STORY  [ STORY-1 ]  Add SSE Keep-Alive Heartbeats                      │  │  Story Banner
│  │ Description: Send periodic ping comments every 15s to keep connections alive.    │  │  & Quick Actions
│  │ [ ➕ Add Story ]  [ 📋 Backlog (3) ]  [ ⚙️ Deck: Fibonacci ]                      │  │  (Backlog / Deck)
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │  FACILITATOR CONTROLS:  [ 🚀 Start Voting ]   (or [ 👁️ Reveal Cards ])           │  │  Facilitator Bar
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                                  │  │
│  │                         [ Bob (Estimator) - 🟢 ]                                 │  │
│  │                                                                                  │  │
│  │   [ Charlie ]                                                [ Dave ]            │  │
│  │                                                                                  │  │
│  │                     ┌──────────────────────────────┐                             │  │  PokerTableArena
│  │                     │      ROUND 1 • VOTING        │                             │  │  (Stadium Table
│  │                     │         3 of 4 Voted         │                             │  │   & Dynamic Seats)
│  │                     └──────────────────────────────┘                             │  │
│  │                                                                                  │  │
│  │                                                                                  │  │
│  │                         [ Alice (You) - 🂠 ]                                      │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │  PICK CARD:  [ 0 ]  [ 1 ]  [ 2 ]  [ 3 ]  [ 5 ]  [ 8 ]  [ 13 ]  [ 21 ]  [ ? ]     │  │  DeckSelector
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 3. Component Specification & Prototype Interfaces

#### A. `RoomView.tsx` (Root Poker Room Container)
- **Role**: Coordinates real-time state, renders header, active story card, facilitator action bar, table arena, and docked card deck.
- **State**:
  - `isBacklogOpen: boolean` (toggles `BacklogDrawer`)
  - `isDeckModalOpen: boolean` (toggles `DeckConfigModal` for Facilitator)
  - `isJoinModalOpen: boolean` (profile editing / initial join)
  - `isAddStoryModalOpen: boolean` (manual story creation)
- **Responsive Behavior**: Table arena dynamically scales; on mobile, deck selector wraps cleanly and backlog drawer slides out as an overlay.

#### B. `PokerTableArena.tsx` (Virtual Table & Reveal Gate Visualization)
- **Phases**: Handles exactly 4 phases: `'Idle' | 'Voting' | 'Revealed' | 'Finalized'`.
- **Center Hub**:
  - `Idle`: Displays "Waiting for Facilitator to start voting...".
  - `Voting`: Displays live pulse indicator and `X of Y Voted` tally without revealing any card values.
  - `Revealed`: Displays `ConsensusSummary` badge (`✓ Consensus` or `⚡ BimodalSplit` / `WideSpread`), suggested points mode, agreement %, and min ↔ max spread.
  - `Finalized`: Displays agreed points with locked badge.
- **Perimeter Seats**:
  - Positions current user at bottom center (`index 0`).
  - Renders `PokerCard` with card back in `Voting` phase (when `has_voted` is true) and card face with value upon `Revealed`.

#### C. `DeckSelector.tsx` (Dynamic Interactive Card Deck)
- **Props**:
  ```typescript
  interface DeckSelectorProps {
    deck: DeckConfig;
    selectedCard?: string | null;
    onSelectCard: (val: string) => void;
    disabled?: boolean;
  }
  ```
- **Behavior**: Renders cards dynamically according to room's active `deck.cards` (`['0', '1', '2', '3', '5', '8', '13', '21', '?']` or T-shirt `['XS', 'S', 'M', 'L', 'XL', 'XXL', '?']`). Clicking the active card retracts the vote.

#### D. `DeckConfigModal.tsx` (New Deck Configuration Modal)
- **Role**: Allows Facilitator to switch estimation scales or define a custom sequence:
  - Preset choices: **Fibonacci** (`0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ?`), **Modified Fibonacci** (`0, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100, ?`), **T-Shirt** (`XS, S, M, L, XL, XXL, ?`), **Sequential** (`1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ?`), **Custom** (comma-separated text input).

#### E. `BacklogDrawer.tsx` (In-Room Manual Story Queue)
- **Features**:
  - In-place story addition (`+ Add Story` button opening modal or inline form with Title, Description, Acceptance Criteria).
  - Story selection (`Estimate` button to set as `current_story`).
  - Facilitator story reordering (up/down arrow buttons dispatching `REORDER_BACKLOG`).
  - Story deletion (`Remove` button).
  - Quick export: **Copy Markdown Summary** to clipboard, **Download CSV**.

#### F. `FacilitatorBar.tsx` (Role-Gated Estimation Controls)
- **Controls**:
  - `Idle`: `[ 🚀 Start Voting ]`
  - `Voting`: `[ 👁️ Reveal Cards ]`
  - `Revealed`: `[ ↺ Re-Vote Round ]` and `[ ✓ Finalize Estimate ]`
  - `Finalized`: `[ ⏭️ Next Story ]` and `[ 🚀 Start Voting ]`
  - Deck Settings: `[ ⚙️ Configure Deck ]`

---

### 4. Lean Client Hook Contract (`client/src/hooks/useRoomSocket.ts`)

```typescript
export interface UseRoomSocketReturn {
  roomState: RoomState | null;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  currentParticipantId: string;
  myProfile: LocalSessionProfile | null;
  isFacilitator: boolean;
  
  // Presence & Role Actions
  joinRoom: (nickname: string, avatar: string, role?: Role) => Promise<void>;
  updateRole: (targetId: string, newRole: Role) => Promise<void>;
  transferFacilitator: (targetId: string) => Promise<void>;
  
  // Estimation Round Actions
  startVoting: () => Promise<void>;
  castVote: (value: string) => Promise<void>;
  retractVote: () => Promise<void>;
  revealCards: () => Promise<void>;
  triggerReVote: () => Promise<void>;
  finalizeStory: (points?: string) => Promise<void>;
  
  // Deck & Story Management Actions
  setDeck: (deck: DeckConfig) => Promise<void>;
  selectStory: (story: Story | null) => Promise<void>;
  addStory: (title: string, description?: string, acceptanceCriteria?: string[]) => Promise<void>;
  updateStory: (storyId: string, updates: Partial<Story>) => Promise<void>;
  removeStory: (storyId: string) => Promise<void>;
  reorderBacklog: (storyIds: string[]) => Promise<void>;
  nextStory: () => Promise<void>;
}
```

---

### 5. Summary of UI Pruning Benefits

1. **Reduced Bundle Size & Complexity**: Deletion of 4 complex AI/tracker modals eliminates ~1,500 lines of dead code and removes heavy third-party dependencies.
2. **Distraction-Free Estimation**: Users focus 100% on the active story, voting cards, and consensus results without overwhelming sidebars.
3. **True Mobile Responsiveness**: A clean single-column arena provides an optimal experience on mobile phones and tablets.
