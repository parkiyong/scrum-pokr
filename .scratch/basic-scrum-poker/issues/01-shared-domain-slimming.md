# Shared Domain Model & Reducer Slimming

Status: resolved
Type: research

## Question

What exact domain types, interfaces, schema validators, and reducer actions must be pruned or refactored in `shared/` (`shared/src/domain.ts`, `shared/src/room-reducer.ts`, `shared/src/reveal-gate.ts`, `shared/src/schemas.ts`) to completely eliminate all AI advisory structures (Story Doctor, SPIDR Slices, Invest Scorecard, Complexity Summary, Edge Cases, Reference Matcher) and external issue tracker sync fields, while preserving full support for:
1. Participant roles (`Facilitator`, `Estimator`, `Observer`)
2. Configurable estimation decks (Fibonacci, Modified Fibonacci, T-Shirt, Custom)
3. Server-enforced Reveal Gate & consensus computation
4. In-room manual story creation, backlog queue ordering, and finalization

## Answer

Resolved in [decisions/01-shared-domain-slimming.md](../decisions/01-shared-domain-slimming.md):
- Pruned `EstimationPhase` from 7 states down to 4 (`Idle`, `Voting`, `Revealed`, `Finalized`), excised all 8 AI advisory structures and tracker sync fields on `Story`.
- Added first-class `DeckConfig` with presets (`fibonacci`, `modified_fibonacci`, `tshirt`, `sequential`, `custom`).
- Streamlined `roomReducer` to 16 canonical actions covering presence, deck configuration, voting/reveal lifecycle, and manual story backlog management (`ADD_STORY`, `UPDATE_STORY`, `REORDER_BACKLOG`, `REMOVE_STORY`, `NEXT_STORY`).
- Maintained server-side Reveal Gate masking via `maskRoomStateForParticipant` and `computeConsensus`.
- Pruned tracker and AI schemas from `shared/src/schemas.ts`.
