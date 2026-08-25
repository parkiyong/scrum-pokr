# 05: In-Room Story Backlog Drawer & Export Utilities

**What to build:**
A standalone in-room manual backlog management drawer (`BacklogDrawer.tsx`) that allows participants and facilitators to create, edit, remove, and select stories for estimation, reorder the queue with strict validation, and export backlog summaries via 1-click Markdown copy and CSV download.

**Blocked by:** 04 (Client UI Pruning & Focused Poker Arena)

**Status:** ready-for-agent

- [ ] Transformed `client/src/components/BacklogDrawer.tsx` into an in-room manual story manager removing tracker provider badges and connect modal triggers.
- [ ] Added in-place story creation form/modal with Title, Description, and Acceptance Criteria.
- [ ] Implemented story selection (`Estimate` button) to set the active `current_story`.
- [ ] Implemented Facilitator queue reordering (up/down arrow buttons dispatching `REORDER_BACKLOG`).
- [ ] Implemented story removal (`Remove` button dispatching `REMOVE_STORY`).
- [ ] Added 1-click **Copy Markdown Summary** to clipboard and **Download CSV** export with cell sanitization.
- [ ] `client/src/__tests__/BacklogDrawer.test.tsx` passes with story CRUD and export verification.
