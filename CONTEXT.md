# Scrum Pokr AI

A real-time, zero-auth, standalone Scrum Poker estimation platform featuring a Full-Stack TypeScript architecture (Hono + React) and a pure in-memory state engine.

## Language

### Roles & Participants

**Facilitator**:
The participant who creates and orchestrates the estimation room, controls card reveals, manages story queues, and finalizes consensus points.
_Avoid_: Admin, host, moderator, room manager

**Estimator**:
A team member who participates in private voting, explains outlier reasoning, and collaborates on story point consensus.
_Avoid_: Voter, player, developer, participant

**Observer**:
A guest or stakeholder who has view-only access to the room and can inspect discussion without voting privileges.
_Avoid_: Spectator, watcher, guest

### Room & Estimation Domain

**Room**:
An ephemeral real-time session space identified by a unique slug and 6-character code (`AAA-99`) where team members gather to estimate stories without account login.
_Avoid_: Game, lobby, meeting, channel

**Story**:
An individual work item with an ID, title, optional description, acceptance criteria list, and points estimate.
_Avoid_: Task, ticket, issue item

**Deck**:
The configured scale of estimate card values (e.g. Fibonacci, Modified Fibonacci, T-Shirt Sizes, Powers of 2, or custom scale) used by estimators in a room.
_Avoid_: Scale, card set, point list

**Reveal Gate**:
A server-enforced state barrier preventing the display of submitted peer votes until the facilitator triggers a reveal. During voting, peer votes are masked as boolean flags (`has_voted: bool`).
_Avoid_: Flip lock, reveal event, privacy barrier

**Backlog**:
The in-room ordered queue of upcoming user stories that can be activated for estimation or exported to Markdown / CSV.
_Avoid_: Ticket queue, issue list, backlog column
