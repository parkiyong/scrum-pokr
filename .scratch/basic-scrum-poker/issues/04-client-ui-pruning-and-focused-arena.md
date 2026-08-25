# 04: Client UI Pruning & Focused Poker Arena

**What to build:**
A focused, distraction-free poker estimation interface in `client/` by deleting 4 obsolete AI/tracker modal components and refactoring `RoomView.tsx` into a responsive single-column layout centered on `PokerTableArena.tsx` with dynamic perimeter seating, 4 clean phases, and a dynamic `DeckSelector.tsx` with `DeckConfigModal.tsx` for Facilitator scale switching.

**Blocked by:** 03 (Real-Time SSE Stream Endpoint & Reveal Gate Broadcast)

**Status:** ready-for-agent

- [ ] Deleted obsolete components: `StoryDoctorPanel.tsx`, `ConnectTrackerModal.tsx`, `SPIDRSliceModal.tsx`, `PointReferenceLibrary.tsx`.
- [ ] Deleted obsolete test files in `client/src/__tests__/`: `StoryDoctorPanel.test.tsx`, `ConnectTrackerModal.test.tsx`, `PointReferenceLibrary.test.tsx`.
- [ ] Refactored `client/src/views/RoomView.tsx` to a single-column layout removing sidebars, tracker state, and AI modal triggers.
- [ ] Refactored `client/src/components/PokerTableArena.tsx` to handle 4 clean phases (`Idle`, `Voting`, `Revealed`, `Finalized`), center consensus hub, and card face/back rendering.
- [ ] Refactored `client/src/components/DeckSelector.tsx` to accept dynamic `deck: DeckConfig` props and allow vote retraction.
- [ ] Created `client/src/components/DeckConfigModal.tsx` allowing Facilitator to switch presets (`fibonacci`, `modified_fibonacci`, `tshirt`, `sequential`, `custom`).
- [ ] Updated `client/src/components/FacilitatorBar.tsx` with clean phase-gated controls (`Start Voting`, `Reveal Cards`, `Re-Vote`, `Finalize Estimate`, `Next Story`, `Configure Deck`).
- [ ] Component unit tests (`PokerTableArena.test.tsx`, `DeckSelector.test.tsx`, `FacilitatorBar.test.tsx`) pass.
