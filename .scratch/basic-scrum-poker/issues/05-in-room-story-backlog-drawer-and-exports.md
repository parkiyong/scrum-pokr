# 05: In-Room Story Backlog Drawer & Export Utilities

**What to build:**
A self-contained backlog management drawer in `client/src/components/BacklogDrawer.tsx` allowing in-room creation, manual reordering, story activation, and exporting to Markdown and CSV (with formula injection mitigation).

**Blocked by:** 04 (Client UI Pruning & Focused Poker Arena)

**Status:** done

- [x] Implemented `BacklogDrawer.tsx` with manual Story creation form (Title, Description).
- [x] Implemented backlog list with active story highlighting, Estimate selection, move up/down reordering, and story removal.
- [x] Implemented Markdown summary table export (`# Sprint Estimation Summary`).
- [x] Implemented CSV download with formula injection mitigation (prefixing `=,+,-,@,\t,\r` with `'`).
- [x] Excised all tracker-specific sync/import buttons and error handling.
- [x] `client/src/__tests__/BacklogDrawer.test.tsx` passes with 100% assertions.
