---
type: Architecture Component
title: React Arena Client
description: React 18 frontend architecture featuring 3D flip card animations, felt poker table arena, and real-time state hooks.
tags:
  - react
  - typescript
  - tailwindcss
  - websocket
  - ui
resource: file:///client/src/App.tsx
generated:
  by: antigravity/2.0
  at: "2026-08-22T02:40:00Z"
status: stable
sources:
  - id: client-app
    resource: /client/src/App.tsx
    title: Client App Entrypoint
  - id: hook-socket
    resource: /client/src/hooks/useRoomSocket.ts
    title: useRoomSocket Hook
---

# React Arena Client

The frontend client is built with React 18, TypeScript, Tailwind CSS, and Vite. It renders a clean, focused poker table arena optimized for low latency and zero cognitive friction.

## Component Hierarchy

```
App.tsx
├── LobbyView.tsx (Home / Room creation / Code entry)
└── RoomView.tsx (Live Planning Poker Arena)
    ├── Header.tsx (Room code, 1-click share, user profile switch)
    ├── FacilitatorBar.tsx (State transition actions & tracker drawer trigger)
    ├── BacklogDrawer.tsx (Interactive backlog item drawer & 2-way sync state)
    ├── ConnectTrackerModal.tsx (Credentials & token modal for Linear, GitHub, Jira)
    ├── SPIDRSliceModal.tsx (AI story slicing modal using SPIDR breakdown)
    ├── PokerTableArena.tsx (Felt table, center status hub, surround seats)
    │   └── PokerCard.tsx (3D flip card with CSS perspective transform)
    ├── DeckSelector.tsx (Docked Fibonacci card picker: 0, 1, 2, 3, 5, 8, 13, 21, ?)
    └── JoinModal.tsx (Zero-auth nickname & avatar onboarding)
```

## Visual System & EXP Light Mode Theme

The client UI is styled using **EXP Light Mode** principles:
* High-contrast neutral background surfaces (`bg-slate-50`, `bg-white`) paired with refined indigo and emerald status accents.
* Tailwind token mappings for card flip states, elevation drop-shadows, and responsive flex/grid viewports.

## Real-Time Synchronization Hook (`useRoomSocket`)

The custom hook [`useRoomSocket`](/client/src/hooks/useRoomSocket.ts) encapsulates the entire WebSocket lifecycle:

* **Automatic Reconnect**: Automatically re-establishes dropped connections.
* **Session Persistence**: Reads and writes cached participant profiles in `localStorage` under `scrum_poker:room:<slug>`.
* **State Projections**: Keeps local React state synchronized with incoming `RoomSnapshot`, `VoteCast`, `CardsRevealed`, and `RoundReset` events.
