# Scrum Pokr — User Guide

> A real-time, zero-auth Planning Poker estimation platform designed for agile teams, featuring a high-performance **Full-Stack TypeScript** architecture powered by **Hono (`@hono/node-server`)**, **Server-Sent Events (SSE) + REST**, **React 18 + Tailwind CSS** frontend, and a **server-enforced reveal gate** that eliminates anchoring bias.

📖 [User Guide](USER_GUIDE.md) · 🛠️ [Developer Guide](DEVELOPER_GUIDE.md) · 🤝 [Contributing](CONTRIBUTING.md) · 🛡️ [Security](SECURITY.md)

---

## Table of Contents

1. [Key Capabilities](#1-key-capabilities)
2. [Quick Start & Accessing Rooms](#2-quick-start--accessing-rooms)
3. [Room Identifiers & Addressing](#3-room-identifiers--addressing)
4. [Participant Roles & Permissions](#4-participant-roles--permissions)
5. [The 4-Step Estimation Flow](#5-the-4-step-estimation-flow)
6. [In-Room Backlog Management & Export](#6-in-room-backlog-management--export)
7. [Custom Deck Configurations](#7-custom-deck-configurations)
8. [Session Recovery & Multi-Device Testing](#8-session-recovery--multi-device-testing)
9. [Frequently Asked Questions & Troubleshooting](#9-frequently-asked-questions--troubleshooting)

---

## 1. Key Capabilities

* **⚡ Zero-Auth Simplicity**: No account creation, passwords, or OAuth credentials required. Facilitators and team members join in seconds using memorable 6-character room codes (e.g. `SWB-42`, `ZBE-55`).
* **🛡️ Server-Enforced Reveal Gate**: Peer votes are strictly masked at the protocol level during voting (`has_voted: bool`). Actual card numbers cannot be inspected or leaked over the network until the Facilitator triggers card reveal.
* **🃏 3D Card Flip Arena**: Central felt poker table with 3D card flipping animations for vote reveals, consensus highlights, and outlier spread detection.
* **📋 In-Room Backlog Drawer**: Create and queue multiple user stories with acceptance criteria, switch active stories on the fly, reorder items, and export finalized estimates to Markdown or CSV.
* **🎴 Flexible Deck Presets & Custom Scales**: Choose standard Fibonacci, Modified Fibonacci, T-Shirt Sizes, Powers of 2, or configure custom card values.
* **👑 Non-Voting Facilitator Support**: Scrum Masters and Product Managers can create and lead rooms with full control without being forced into an estimating role or skewing team quorum.
* **🔄 Seamless Session Recovery & Failover**: Reconnecting participants automatically reclaim their seat and voting state on page refresh via cached `localStorage` UUIDs. If the Facilitator disconnects, authority safely transfers to the next senior Estimator.

---

## 2. Quick Start & Accessing Rooms

### Joining an Existing Room
1. Open the invitation link shared by your facilitator (e.g., `http://localhost:3000/r/SWB-42` or `http://localhost:5173/r/SWB-42`).
2. Alternatively, navigate to the home lobby, enter the 6-character code (e.g., `SWB-42`), and click **Enter Room**.
3. Choose your nickname, avatar color, and starting role (**Estimator** or **Observer**).

### Creating a New Room
1. Visit the home lobby.
2. Click **⚡ Create Room Instantly** to auto-generate a fresh room with a unique 6-character code.
3. *(Optional)* Expand **+ Custom room code override** to define a custom vanity code (e.g., `SPRINT-42`).

---

## 3. Room Identifiers & Addressing

Every estimation room is identified by an uppercase 6-character code formatted as `AAA-99` (e.g., `SWB-42`, `FOX-19`, `ZBE-55`):
* **Direct URL**: `http://localhost:3000/r/SWB-42`
* **Case-Insensitive Routing**: Typing `swb-42`, `SWB-42`, or `Swb-42` will resolve to the exact same room.
* **1-Click Share**: Facilitators can click **🔗 Share (SWB-42)** in the top navigation bar to copy the direct URL to the clipboard.

---

## 4. Participant Roles & Permissions

| Role | Permissions & Table Behavior |
| :--- | :--- |
| **👑 Facilitator** | Controls estimation state transitions: starts voting, reveals cards, triggers re-votes, and finalizes estimates. Can edit stories, reorder the backlog, and change deck configs. If the Facilitator disconnects, authority automatically promotes to the next connected Estimator. |
| **✋ Estimator** | Selects cards from the active deck dock, counts toward voting quorum, and participates in consensus calculations. |
| **👁️ Observer** | Non-voting guest or stakeholder. The card selector deck is hidden, the table card displays `Observer`, and the user is excluded from quorum calculations. |

> [!NOTE]
> A Facilitator can participate as either an **Estimator** (voting Facilitator) or an **Observer** (non-voting Facilitator).

### Switching Roles or Nicknames
Click your user badge in the top-right corner at any time during a live session to update your nickname, avatar color, or toggle between **Estimator** and **Observer**.

---

## 5. The 4-Step Estimation Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────────────────┐
│ 1. Setup     │ ──► │ 2. Private   │ ──► │ 3. Reveal    │ ──► │ 4. Finalize /       │
│    (Idle)    │     │    Voting    │     │    (3D Flip) │     │    Re-Vote Round    │
└──────────────┘     └──────────────┘     └──────────────┘     └─────────────────────┘
```

1. **Start Voting**:
   The Facilitator clicks **▶ Start Voting**. The room transitions to `Voting`, and the central table hub displays live progress as estimators cast their votes.
2. **Casting Votes**:
   Estimators click a card in the bottom dock.
   * Your chosen card is highlighted.
   * Peers only see a checkmark (**✓ Voted**) with the number concealed.
   * Clicking an already-selected card retracts your vote.
3. **Reveal Cards**:
   The Facilitator clicks **👁 Reveal Cards**.
   * All cards flip face-up simultaneously with 3D animations.
   * The center hub calculates agreement metrics (e.g., `✓ Consensus (100%)` or `⚡ Outlier Spread: 5 ↔ 13 pts`).
4. **Re-Vote or Finalize**:
   * If discussion uncovers new edge cases, the Facilitator clicks **↺ Re-Vote Round** to reset cards face-down and increment the round.
   * Once consensus is reached, the Facilitator clicks **✓ Finalize Estimate**.

---

## 6. In-Room Backlog Management & Export

Facilitators and team members can organize a queue of stories directly within the session:

### Backlog Drawer
1. Click **📋 Backlog** in the top navigation bar to slide open the backlog drawer.
2. View the current active story and queued backlog items with point badges.
3. Add new stories directly by providing a title, description, and acceptance criteria.
4. Click **Set as Active Story** on any backlog item to switch the current estimation target.
5. Reorder queued items using the up/down controls.

### 1-Click Export (Markdown & CSV)
When estimation is complete:
1. Open the Backlog Drawer.
2. Click **Export Markdown** or **Export CSV** to copy or download finalized estimates for easy pasting into Jira, Linear, GitHub Issues, or spreadsheets.

---

## 7. Custom Deck Configurations

Facilitators can customize estimation scales to match team conventions:
1. Click the **Deck Scale** dropdown in the Facilitator control bar or bottom dock.
2. Choose from preset scales:
   * **Fibonacci**: `[0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ?]`
   * **Modified Fibonacci**: `[0, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100, ?]`
   * **T-Shirt Sizes**: `[XS, S, M, L, XL, XXL, ?]`
   * **Powers of 2**: `[1, 2, 4, 8, 16, 32, 64, ?]`
3. Choose **Custom...** to enter comma-separated card values (e.g., `1, 2, 3, 5, 8, Coffee`).

---

## 8. Session Recovery & Multi-Device Testing

* **Persistent Identity**: When you join a room, your participant ID (UUIDv4), nickname, and avatar color are saved in browser `localStorage`.
* **Seamless Reconnect**: If your connection drops or you refresh the page, the application automatically restores your seat and existing vote without resetting the room.

> [!TIP]
> **Testing Multiple Users on a Single Machine:**
> Browser tabs in the same profile share `localStorage`. To simulate multiple distinct users on one computer:
> 1. **User 1**: Open standard browser window (`http://localhost:3000/r/SWB-42` or `http://localhost:5173/r/SWB-42`).
> 2. **User 2**: Open an **Incognito / Private Window** (`Ctrl+Shift+N` or `Cmd+Shift+N`).
> 3. **User 3**: Open a different browser (e.g., Firefox, Edge, Safari) or use your mobile phone on the local network.

---

## 9. Frequently Asked Questions & Troubleshooting

### Why can't I see other people's votes while voting?
This is by design! The platform enforces a **Server Reveal Gate**. Vote values are physically withheld by the server until the facilitator triggers the card reveal, eliminating anchoring bias and groupthink.

### What happens if the Facilitator accidentally closes their tab?
Authority automatically promotes to the next senior Estimator in the connected roster. If the original Facilitator reconnects, authority can easily be handed back via the participant roster.

### How do I change my vote before cards are revealed?
Simply click any other card in the bottom deck to change your selection, or click your current card to retract your vote.
