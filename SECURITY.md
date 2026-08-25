# Security Policy

## Supported Versions

| Version | Supported          |
| :---    | :---               |
| 0.1.x   | :white_check_mark: |
| < 0.1.0 | :x:                |

---

## Reporting a Vulnerability

We take the security and privacy of Scrum Pokr seriously. If you discover a security vulnerability, please report it responsibly rather than opening a public issue.

### Reporting Process
1. Email your findings to **security@scrum-poker.app** (or submit a private security advisory via GitHub Security Advisories).
2. Include detailed steps to reproduce the issue, proof-of-concept payload, and the affected components.
3. We will acknowledge receipt within **48 hours** and provide regular status updates during remediation.
4. Please allow up to **30 days** for a coordinated fix before publicly disclosing the vulnerability.

---

## Security Model & Core Invariants

### 1. Server-Enforced Reveal Gate (Anti-Anchoring Protection)
The primary security and fairness invariant of Scrum Pokr is the **Server Reveal Gate**:
* While a room is in the `Voting` phase, submitted votes must **never** traverse the network to peers.
* The server projects state through `maskRoomStateForParticipant` from `@scrumpokr/shared` and serializes peer estimates solely as `has_voted: bool`.
* Any flaw that exposes unmasked votes prior to the `Revealed` state is treated as a **High Priority Security Defect**.

### 2. Zero-Auth Session Model
* Room participants are identified by ephemeral UUIDv4 tokens stored in browser `localStorage`.
* Reconnection tokens are scoped to the room slug and origin.
* Room codes (`AAA-99`) use a collision-resistant entropy pool to prevent accidental room collisions.

### 3. REST & SSE Input Validation
* Inbound REST requests and action commands are strictly validated using Zod schemas with `@hono/zod-validator`. Malformed payloads, invalid role assignments, or unauthorized facilitator operations are rejected with standard HTTP error codes before state mutation.
