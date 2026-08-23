# Scrum Pokr AI

A real-time, zero-auth, standalone Scrum Poker estimation platform with a Rust backend and an advisory AI layer for backlog refinement, divergence analysis, and team calibration.

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
An ephemeral or persistent real-time session space identified by a unique slug or code where team members gather to estimate stories without account login.
_Avoid_: Game, lobby, meeting, channel

**Story**:
An individual backlog work item synced from an external issue tracker (Linear, Jira, GitHub) or created for estimation during a session.
_Avoid_: Task, issue, work item, ticket

**Deck**:
The configured scale of estimate values (e.g. Fibonacci: 1, 2, 3, 5, 8, 13, 21, ?) used by estimators in a room.
_Avoid_: Scale, card set, point list

**Reveal Gate**:
A server-enforced state barrier preventing the display of submitted votes, AI suggestions, or divergence analyses until all votes are cast or the facilitator triggers a reveal.
_Avoid_: Flip lock, reveal event, privacy barrier

### AI Capabilities (Advisory Layer)

**Story Doctor**:
A pre-vote quality analysis tool that audits story descriptions against INVEST criteria, generates potential edge cases, and summarizes technical complexity.
_Avoid_: Ticket analyzer, INVEST auditor, pre-checker

**Reference Matcher**:
An embedding-based similarity engine that retrieves historically resolved stories from past sessions with their agreed point values, staying locked behind the Reveal Gate until cards are flipped.
_Avoid_: AI baseline, similarity search, point predictor

**Divergence Analyzer**:
A post-reveal analytical prompt engine that identifies spread patterns among votes and synthesizes likely axes of disagreement to guide team discussion.
_Avoid_: Outlier detector, spread analyzer, debate prompt

**Vertical Slicer**:
An advisory decomposition tool using the SPIDR method to suggest 2–4 smaller, independently estimable story slices when consensus is high or split.
_Avoid_: Task splitter, story sub-divider, slicer

**Point Reference Library**:
A team-configured reference table linking concrete benchmark stories to point values, accessible in the room sidebar to ground calibration.
_Avoid_: Cheat sheet, reference examples, calibration guide

**Team Estimation Profile**:
Aggregate team-level velocity, consistency, and category estimation trends tracked strictly at the team level without individual scoring surfaces.
_Avoid_: Leaderboard, developer metrics, performance tracker

**Calibration Model**:
A rolling longitudinal model that learns the team's historical estimation accuracy against delivery outcomes to refine reference matching over time.
_Avoid_: ML model, weight adjuster, calibration curve
