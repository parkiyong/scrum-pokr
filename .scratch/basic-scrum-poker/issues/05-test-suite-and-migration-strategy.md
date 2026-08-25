# Test Suite & Migration Strategy

Status: open
Type: task
Blocked by: 02, 04

## Question

What is the end-to-end testing and verification plan across `shared/`, `server/`, and `client/` to validate:
1. Pure in-memory room lifecycle without Docker or PostgreSQL running
2. Zero-auth reconnects and participant presence handling
3. Server-enforced Reveal Gate privacy invariant (votes remain concealed from non-facilitator payloads until reveal)
4. Manual story backlog reordering and multi-round estimation flow?
