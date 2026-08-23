---
type: Architectural Decision Record
title: "ADR-006: Unified AI Advisory Adapter & Asynchronous LLM Pipeline"
description: Architectural specification for the unified AI advisory adapter trait, zero-auth Facilitator BYO API key credential handling, OpenAI-compatible wire format, and instant-heuristic + async LLM execution pipeline.
status: stable
tags:
  - decision
  - adr
  - rust
  - ai
  - llm
  - story-doctor
  - divergence-analysis
  - spidr-slicing
generated:
  by: antigravity/2.0
  at: "2026-08-23T19:30:00Z"
sources:
  - id: story-doctor-invest
    resource: /server/src/domain/story_doctor.rs
    title: "Story Doctor Domain Heuristics and Quality Gate"
---

# ADR-006: Unified AI Advisory Adapter & Asynchronous LLM Pipeline

## Context

Scrum Pokr AI includes three distinct AI advisory capabilities across the room estimation lifecycle:
1. **Story Doctor (Pre-Vote Quality Gate)**: Audits user stories against INVEST criteria, detects 4-category edge cases (Network & Timeouts, Empty & Boundary, Concurrency & Race Conditions, Permissions & Access), and calculates 3-axis technical complexity.
2. **Divergence Analyzer (Post-Reveal Synthesis)**: Synthesizes vote spreads and outlier rationales to formulate targeted discussion prompts.
3. **Vertical Slicer (Decomposition Phase)**: Suggests SPIDR-based vertical story slices when estimates diverge or stories exceed sizing thresholds.

Synchronous live poker sessions demand sub-millisecond UI transitions; team estimators cannot be blocked waiting on external multi-second LLM API calls. Furthermore, Scrum Pokr AI strictly adheres to a **zero-auth model** without centralized user billing, persistent database accounts, or stored API secrets.

## Decision

1. **Unified Trait (`AiAdvisoryAdapter`)**:
   We define a generic asynchronous Rust trait in the backend (`server::domain::ai`) abstracting all LLM-driven advisory operations:
   ```rust
   #[async_trait]
   pub trait AiAdvisoryAdapter: Send + Sync {
       async fn analyze_story_quality(&self, story: &Story) -> Result<StoryDoctorReport, AdvisoryError>;
       async fn synthesize_divergence(&self, story: &Story, votes: &[ParticipantVote], consensus: &ConsensusSummary) -> Result<DivergenceAnalysis, AdvisoryError>;
       async fn suggest_spidr_slices(&self, story: &Story) -> Result<Vec<StorySlice>, AdvisoryError>;
   }
   ```

2. **Standardized Wire Protocol (OpenAI-Compatible Chat Completions)**:
   - All external model communication standardizes on the standard `/v1/chat/completions` JSON HTTP format with structured JSON responses (`response_format: { type: "json_object" }`).
   - This single lightweight HTTP client uniformly supports OpenAI (GPT-4o / GPT-4o-mini), OpenRouter, Groq, DeepSeek, local Ollama endpoints (`http://localhost:11434/v1`), vLLM, and LiteLLM without multi-SDK client dependencies.

3. **Zero-Auth Ephemeral BYO Key**:
   - The Facilitator provides their API key, endpoint base URL (defaulting to `https://api.openai.com/v1`), and model identifier in an interactive "Connect AI Advisory" settings modal.
   - Credentials are held exclusively in Facilitator browser `sessionStorage` and in Tokio `RoomActor` RAM. Credentials are never written to disk/database and are strictly excluded from WebSocket broadcasts to Estimators and Observers.

4. **Instant Heuristic Baseline + Asynchronous LLM Enhancement**:
   - **Instant Baseline**: When a story is selected, the deterministic keyword heuristic generates in $<1\text{ms}$, immediately transitioning the room into `StoryDoctorReview` with a complete `StoryDoctorReport`.
   - **Async LLM Enhancement**: If an AI adapter is connected, the `RoomActor` spawns a background Tokio task with a strict 5-second timeout.
   - **Non-Blocking State Update**: When the LLM JSON response arrives, the actor updates `RoomState.story_doctor_report` and broadcasts an `Event::StoryDoctorReportUpdated` payload to all room participants.
   - **Graceful Fallback**: If the LLM call times out, encounters a rate limit (HTTP 429), or receives invalid JSON, the system silently retains the deterministic heuristic report without disrupting the room flow.

## Consequences

* **Positive**:
  * **Zero UI Lag**: Estimators immediately see INVEST criteria and edge-case checklists without waiting on external networks.
  * **100% Offline & Free Resilience**: The platform remains fully functional without any API key or external network connection via deterministic heuristics.
  * **Provider Neutrality**: Supports any local or cloud LLM exposing an OpenAI-compatible endpoint.
  * **Zero-Auth Privacy**: Team stories and credentials are never stored remotely on centralized Scrum Pokr servers.
* **Negative**:
  * LLM-enhanced recommendations require the Facilitator to provide an API key or run a local Ollama instance.
  * Facilitator BYO credentials must be re-entered if the room session is fully terminated.

## Sources & Invariants

* **Invariant 1**: A valid `StoryDoctorReport` must always exist immediately upon story selection, guaranteed by the deterministic heuristic engine.
* **Invariant 2**: AI Advisory suggestions for Divergence Analysis and Reference Matching must strictly respect the **Reveal Gate** ([`ADR-002`](ADR-002-server-enforced-reveal-gate.md)) and remain hidden until cards are turned.
* **Invariant 3**: AI provider API keys are treated as transient secrets and must never be persisted in PostgreSQL or exposed over WebSockets.
