# 01: Monorepo Layout & Shared Types Contract

Type: research
Status: resolved
Blocked by: none

## Question

How should the monorepo workspace (npm workspaces vs. pnpm), shared type package (`shared/` or `@scrumpokr/types`), and Zod validation schemas be structured so that the Hono backend server and the Vite/React client share the Reveal Gate domain models, RPC endpoint definitions, and JSON schemas without build drift or circular dependencies?

## Background & Context

- Currently, Java Spring Boot and React duplicate domain types across `Models.java` and `types/room.ts`.
- In a full-stack TypeScript architecture, shared types (`RoomSnapshotData`, `Participant`, `Story`, `ConsensusSummary`, `InvestScorecard`) should have a single authoritative source of truth.
- Hono RPC (`hc<AppType>`) allows the React client to import the route definitions directly from the server.
- The investigation needs to determine:
  1. Root `package.json` workspace configuration (`workspaces: ["client", "server", "shared"]`).
  2. TypeScript path aliases (`tsconfig.json`) vs. workspace package links.
  3. Shared schema validation strategy (Zod vs. pure TypeScript interfaces).

## Answer

### 1. Monorepo Workspace & Package Topology

The repository will be structured as a native **npm workspace** (Node.js 20+ LTS native, requiring zero external monorepo tools):

```text
scrum-poke-ai/
├── package.json              # Root workspace ("workspaces": ["shared", "server", "client"])
├── tsconfig.base.json        # Shared compiler defaults (ES2022, bundler module resolution, strict)
├── shared/                   # @scrumpokr/shared (Authoritative domain models, Zod schemas, Reveal Gate logic)
│   ├── package.json          # name: "@scrumpokr/shared", "type": "module"
│   ├── tsconfig.json
│   └── src/
│       ├── domain.ts         # RoomState, Participant, Story, Role, ConsensusSummary, PointReference
│       ├── schemas.ts        # Zod validation schemas for requests/actions + z.infer types
│       ├── reveal-gate.ts    # Server Reveal Gate projection & masking functions
│       └── index.ts          # Public entry point
├── server/                   # @scrumpokr/server (Hono Node.js backend)
│   ├── package.json          # Dependencies: hono, @hono/node-server, @hono/zod-validator, @scrumpokr/shared
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts          # Exports `export type AppType = typeof routes;`
│       ├── routes/           # REST & SSE route handlers with zValidator
│       ├── room/             # In-memory RoomRegistry actor & state machine
│       ├── db/               # Drizzle ORM + pgvector client & migrations
│       └── ai/               # @google/genai SDK integration
└── client/                   # @scrumpokr/client (React 18 + Vite SPA)
    ├── package.json          # Dependencies: react, @scrumpokr/shared, hono (for `hono/client` RPC)
    ├── tsconfig.json
    └── src/
        ├── api.ts            # `export const api = hc<AppType>('/api');`
        ├── hooks/            # useRoomSocket with native SSE + typed RPC
        └── ...
```

### 2. End-to-End Type Sharing & Hono RPC Safety

1. **Direct Workspace Linking**: Both `server` and `client` declare `"@scrumpokr/shared": "*"` in their `dependencies`. During local development, Vite and `tsx` resolve TypeScript sources directly without requiring a separate pre-compilation build step.
2. **Type-Only Server Imports**: The client imports the Hono route contract via `import type { AppType } from '@scrumpokr/server'`. Because this is a `type` import, no server runtime code, database drivers, or server-side secrets are ever included in the client bundle.
3. **Zod Validation Single Source of Truth**:
   - Request and payload schemas are defined once in `shared/src/schemas.ts` using `zod`.
   - In Hono routes, `@hono/zod-validator` (`zValidator('json', joinSchema)`) validates incoming payloads with automatic type narrowing.
   - Client-side TypeScript types are automatically inferred via `z.infer<typeof schema>`.

### 3. Server-Enforced Reveal Gate in `shared`

The Reveal Gate projection invariant is implemented as a pure, deterministic function in `@scrumpokr/shared`:

```typescript
export function maskRoomStateForParticipant(state: RoomState, requestingParticipantId: string): RoomState {
  if (state.phase === 'Revealed' || state.phase === 'Finalized') {
    return state; // Full transparency after reveal
  }
  return {
    ...state,
    participants: state.participants.map(p => ({
      ...p,
      vote: p.id === requestingParticipantId ? p.vote : null, // Mask peers' votes during voting
      has_voted: p.vote !== null && p.vote !== undefined && p.vote !== '',
    }))
  };
}
```

This ensures identical unit test coverage can be executed in both server and client test suites to verify Reveal Gate adherence.

