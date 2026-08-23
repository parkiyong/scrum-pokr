# 03: Pre-Vote Story Doctor & Point Reference Library

**What to build:** The pre-vote quality gate in the left column. When a facilitator activates a story, the room enters the `StoryDoctorReview` phase. The Story Doctor evaluates the story against INVEST criteria, renders an interactive readiness gauge, generates a 3-axis complexity summary (Data/Schema, External APIs, Blast Radius), and provides an interactive 4-category edge-case checklist (Auth/Permissions, Network/Timeouts, Concurrency, Empty/Boundary States). Simultaneously, a collapsible Point Reference Library sidebar provides customizable baseline benchmark stories across standard Fibonacci points (1, 2, 3, 5, 8, 13) to anchor the team's shared mental model before voting opens.

**Blocked by:** 02 (Backlog Ingestion, Story Queue & Clipboard Export)

**Status:** closed

## Acceptance criteria

- [x] Selecting a story transitions the room to `StoryDoctorReview` state and displays the pre-vote quality panel in the left column.
- [x] Story Doctor heuristic/LLM pipeline calculates an INVEST scorecard score (0–100%) and highlights missing acceptance criteria or ambiguous phrasing.
- [x] Displays a 3-axis complexity summary outlining technical risks across Data/Schema changes, External API interactions, and Blast Radius.
- [x] Generates 4 categorized edge-case check items with interactive checkboxes that estimators can click during discussion.
- [x] Facilitator can proceed to `StartVoting` at any time without hard blocking, preserving facilitator flow.
- [x] Collapsible Point Reference Library sidebar renders baseline story examples for points 1, 2, 3, 5, 8, and 13.
- [x] Facilitator can edit or add reference cards locally during the session to match team-specific conventions.
- [x] Automated tests verify Story Doctor prompt generation, INVEST scoring heuristics, and state transition to `Voting`.
