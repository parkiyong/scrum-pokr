Title: React Client Hook Migration to EventSource and REST
Status: open
Type: task
Blocked by: 01, 02

## Question

How should we refactor `client/src/hooks/useRoomSocket.ts` to use `EventSource` for inbound server events and standard `fetch()` for all room commands while preserving the exact `UseRoomSocketReturn` interface and zero breakage across React components?
