# 01: Shared Domain Slimming & Reducer Invariants

**What to build:**
A trimmed, lean shared domain layer in `shared/` (`@scrumpokr/shared`) that strips all AI advisory structures and external tracker sync types, introducing first-class `DeckConfig` presets, a 16-action pure reducer across 4 core estimation phases (`Idle`, `Voting`, `Revealed`, `Finalized`), server-side Reveal Gate privacy masking, and updated Zod request schemas.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Excised AI types (`StoryDoctorReport`, `InvestScorecard`, `InvestCriterionResult`, `ComplexitySummary`, `EdgeCaseCategory`, `EdgeCaseItem`, `StorySlice`, `PointReference`) and issue tracker fields (`key`, `url`, `tracker_provider`, `external_id`, `status`) from `shared/src/domain.ts`.
- [ ] Pruned `EstimationPhase` to 4 states: `'Idle' | 'Voting' | 'Revealed' | 'Finalized'`.
- [ ] Added `DeckType` (`'fibonacci' | 'modified_fibonacci' | 'tshirt' | 'sequential' | 'custom'`), `DeckConfig` interface, and `DEFAULT_DECKS` mapping in `domain.ts`.
- [ ] Refactored `shared/src/room-reducer.ts` to implement the 16 canonical actions (`JOIN`, `SET_CONNECTED`, `UPDATE_ROLE`, `TRANSFER_FACILITATOR`, `SET_DECK`, `START_VOTING`, `CAST_VOTE`, `REVEAL_CARDS`, `RESET_ROUND`, `FINALIZE_STORY`, `SET_STORY`, `ADD_STORY`, `UPDATE_STORY`, `REMOVE_STORY`, `REORDER_BACKLOG`, `NEXT_STORY`).
- [ ] Refactored `shared/src/reveal-gate.ts` to implement dynamic deck mode/spread calculations in `computeConsensus` and participant-specific vote masking in `maskRoomStateForParticipant`.
- [ ] Updated Zod request/response schemas in `shared/src/schemas.ts` removing tracker/AI schemas.
- [ ] All tests in `shared/src/__tests__/` (`room-reducer.test.ts`, `reveal-gate.test.ts`) pass cleanly via `npm run test -w shared`.
