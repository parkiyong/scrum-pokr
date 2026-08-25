# 04: Client UI Pruning & Focused Poker Arena

**What to build:**
A focused, distraction-free Planning Poker interface: deleting 4 obsolete AI/tracker modal components and their test suites, refactoring `RoomView.tsx` into a responsive single-column layout centered on `PokerTableArena.tsx`, and making `DeckSelector.tsx` dynamic.

**Blocked by:** 03 (Real-Time SSE Stream Endpoint & Reveal Gate Broadcast)

**Status:** done

- [x] Deleted obsolete components: `StoryDoctorPanel.tsx`, `ConnectTrackerModal.tsx`, `SPIDRSliceModal.tsx`, `PointReferenceLibrary.tsx`.
- [x] Deleted obsolete test files: `StoryDoctorPanel.test.tsx`, `ConnectTrackerModal.test.tsx`, `PointReferenceLibrary.test.tsx`.
- [x] Refactored `client/src/views/RoomView.tsx` to a single-column layout removing sidebars, tracker state, and AI modal triggers.
- [x] Refactored `client/src/components/PokerTableArena.tsx` around 4 phases (`Idle`, `Voting`, `Revealed`, `Finalized`), center consensus hub, and card face/back rendering.
- [x] Refactored `client/src/components/DeckSelector.tsx` to accept dynamic `deck: DeckConfig` props and allow vote retraction.
- [x] Added `DeckConfigModal.tsx` allowing Facilitator to switch presets (`fibonacci`, `modified_fibonacci`, `tshirt`, `sequential`, `custom`).
- [x] Updated `FacilitatorBar.tsx` with clean phase-gated controls (`Start Voting`, `Reveal Cards`, `Re-Vote`, `Finalize Estimate`, `Next Story`, `Configure Deck`).
- [x] Updated `Header.tsx` and `LobbyView.tsx` branding.
