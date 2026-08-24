Title: React Client Hook Migration to EventSource and REST
Status: resolved
Type: task
Blocked by: 01, 02

## Question

How should we refactor `client/src/hooks/useRoomSocket.ts` to use `EventSource` for inbound server events and standard `fetch()` for all room commands while preserving the exact `UseRoomSocketReturn` interface and zero breakage across React components?

## Answer

- Refactored [`client/src/hooks/useRoomSocket.ts`](file:///home/widi/GitHub/scrum-poke-ai/client/src/hooks/useRoomSocket.ts) to establish an `EventSource` connection to `/api/rooms/${slug}/events?participant_id=${pid}`.
- Replaced WebSocket raw frame sends with asynchronous `fetch()` requests to the REST command endpoints with the `X-Participant-ID` header.
- Maintained exact `UseRoomSocketReturn` interface and state shape, ensuring zero UI breakage across all React components.
- Verified with full test suite passing (`npm test`) and successful production build (`tsc && vite build`).
