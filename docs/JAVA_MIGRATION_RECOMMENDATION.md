# ☕ Java Migration Architecture & Stack Recommendation
## Scrum Pokr AI — Backend Stack Modernization Strategy

---

## Executive Summary

This document presents a comprehensive, production-grade architectural proposal for migrating the **Scrum Pokr AI** backend from **Rust (Tokio / Axum)** to **Java**.

When re-imagining the backend architecture in the Java ecosystem, the primary design objectives are:
1. **Preserving Real-Time Performance & Low Latency**: Seamless sub-millisecond WebSocket fan-out and real-time state broadcasts.
2. **Protocol-Level Security Invariants**: Strict server-enforced vote masking (**Server Reveal Gate**) before data serialization.
3. **Modern Java 21 Features**: Leveraging Virtual Threads (Project Loom), Sealed Interfaces, Pattern Matching, and Records for concise, type-safe code.
4. **First-Class AI & Vector DB Integration**: Out-of-the-box integration with OpenAI models and PostgreSQL `pgvector`.
5. **Horizontal Scalability**: Evolving from single-node in-memory actor instances to a cluster-ready, horizontally scalable WebSocket architecture using Distributed Pub/Sub.

---

## 🏆 Recommended Technology Stack

We recommend two distinct architectural options tailored to team priorities: **Option 1 (Spring Boot 3.3+ with Java 21 Virtual Threads)** as the primary recommendation for maximum developer productivity and enterprise ecosystem integration, and **Option 2 (Quarkus 3.x + GraalVM Native)** for maximum resource efficiency and Rust-like binary footprints.

### Stack Option 1: Enterprise Standard (Recommended)
**Spring Boot 3.3+ with Java 21 (Virtual Threads)**

| Component | Java Library / Framework | Rust Equivalent | Purpose / Notes |
| :--- | :--- | :--- | :--- |
| **Runtime & Language** | **Java 21 LTS** | Rust 1.80+ | Virtual Threads (`Thread.ofVirtual()`), Records, Pattern Matching, Sealed Interfaces. |
| **Core Framework** | **Spring Boot 3.3+** | Axum / Tower | Web layer, dependency injection, lifecycle management, auto-configuration. |
| **WebSocket Engine** | **Spring WebFlux WebSockets** (or Spring MVC + Netty/Tomcat WS) | `axum::extract::ws` | High-concurrency binary/text frame handling with non-blocking backpressure support. |
| **JSON & Protocol** | **Jackson 2.17+** (with Record support) | `serde` / `serde_json` | High-performance JSON serialization with custom masking serializers for Reveal Gate. |
| **Database & Vector Search** | **Spring Data JPA + Spring AI `PgVectorStore`** / **Flyway** | `sqlx` / `tokio-postgres` | Postgres persistence & 1536-dim IVFFlat nearest-neighbor vector search. |
| **AI Advisory Engine** | **Spring AI 1.0+** | Custom `reqwest` + OpenAI client | Native abstraction for ChatCompletion, Prompt Templates, and RAG embeddings. |
| **Issue Tracker Integration** | **Spring `WebClient` / JDK `HttpClient`** | `reqwest` | Async client for Linear GraphQL, GitHub REST, and Jira REST APIs. |
| **Testing** | **JUnit 5, AssertJ, Testcontainers, Mockito** | `cargo test`, `tokio-test` | Integration testing with real Postgres + pgvector containers via Testcontainers. |

---

### Stack Option 2: Cloud-Native & Low Footprint
**Quarkus 3.x with GraalVM Native Image**

| Component | Java Library / Framework |
| :--- | :--- |
| **Framework** | **Quarkus 3.12+** |
| **Reactive Engine** | **SmallRye Mutiny / Vert.x WebSockets** |
| **AI Engine** | **LangChain4j Quarkus Extension** |
| **Compilation** | **GraalVM Native Image** (produces standalone, instantaneous-boot native binaries ~50MB RAM) |

---

## 🏗️ Re-Imagined System Architecture

```
                                  ┌──────────────────────────────────────────────┐
                                  │           React Client (WebSockets)          │
                                  └──────────────────────┬───────────────────────┘
                                                         │ WSS / JSON-RPC
                                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     Java 21 / Spring Boot 3 Backend                                     │
│                                                                                                         │
│  ┌─────────────────────────────────┐   ┌──────────────────────────────────┐   ┌──────────────────────┐  │
│  │   WebSocket Connection Handler  │   │     Spring AI Advisory Engine    │   │  Tracker Integration │  │
│  │   - Virtual Thread per Socket   │   │   - Story Doctor (INVEST + Edge) │   │  - Linear GraphQL    │  │
│  │   - Client Session Lifecycle    │   │   - SPIDR Vertical Slicer        │   │  - GitHub & Jira REST│  │
│  └────────────────┬────────────────┘   └──────────────────┬───────────────┘   └──────────┬───────────┘  │
│                   │                                       │                              │              │
│                   ▼                                       │                              │              │
│  ┌─────────────────────────────────┐                      │                              │              │
│  │      Room State Management      │                      │                              │              │
│  │  ┌───────────────────────────┐  │                      │                              │              │
│  │  │ Room State Machine        │  │                      │                              │              │
│  │  │ (Virtual Thread / Lock)   │  │                      │                              │              │
│  │  └─────────────┬─────────────┘  │                      │                              │              │
│  │                │                │                      │                              │              │
│  │  ┌─────────────▼─────────────┐  │                      │                              │              │
│  │  │ Server Reveal Gate Filter │  │                      │                              │              │
│  │  │ (State Masking per Peer)  │  │                      │                              │              │
│  │  └───────────────────────────┘  │                      │                              │              │
│  └────────────────┬────────────────┘                      │                              │              │
└───────────────────┼───────────────────────────────────────┼──────────────────────────────┼──────────────┘
                    │                                       │                              │
                    │ Optional Scale-Out                    │                              │
                    ▼                                       ▼                              ▼
┌───────────────────────────────────────┐   ┌─────────────────────────────────────────────────────────────┐
│          Redis Pub/Sub (Optional)     │   │               PostgreSQL + pgvector Database                │
│ - Multi-Node WebSocket Event Fan-Out  │   │ - Historical Stories & 1536-dim IVFFlat Vector Index        │
│ - Global Room State Synchronization   │   │ - Team Estimation Profiles & Calibration Weights            │
└───────────────────────────────────────┘   └─────────────────────────────────────────────────────────────┘
```

---

## 🧠 Room Concurrency Model Comparison: Rust vs. Java

In Rust, the room engine uses Tokio `mpsc` actors with `broadcast` channels. In Java, we can model this with cleaner, highly maintainable patterns using Java 21 Virtual Threads or an Actor framework.

### Comparison Matrix

| Aspect | Rust (Current) | Java Option A: Virtual Thread + Concurrent State | Java Option B: Apache Pekko / Akka Actors |
| :--- | :--- | :--- | :--- |
| **Concurrency Control** | Tokio Task + `mpsc` receiver loop | Virtual Thread per Room with `ReentrantLock` / `StampedLock` | Actor per Room with Message Queue |
| **Event Broadcast** | `tokio::sync::broadcast` | `java.util.concurrent.CopyOnWriteArrayList` / Flow API or Redis Pub/Sub | Pekko EventStream / Distributed PubSub |
| **Complexity** | Medium (channel lifecycle, select loops) | Low (Idiomatic Object-Oriented Java code) | Medium-High (Actor lifecycle, supervision) |
| **Horizontal Scalability** | Single-node in-memory | Easily clusterable via Spring Redis PubSub | Clusterable via Pekko Cluster |

### Recommendation for Room State Management
We recommend **Option A (Virtual Threads + Thread-Safe Room Manager)** for the Java implementation. Because Virtual Threads in Java 21 are extremely lightweight (millions can run concurrently), each Room can safely maintain its state with fine-grained synchronization without thread exhaustion or lock contention blocking OS threads.

---

## 🛡️ Protocol Security: Server Reveal Gate in Java

The core invariant of Scrum Pokr AI is that **votes are never sent to clients until the Reveal phase**, preventing browser DevTools inspection.

In Java, this is implemented cleanly using **Java 21 Records** and projection methods:

```java
public record RoomState(
    String slug,
    String shortCode,
    Phase phase,
    List<ParticipantState> participants,
    Story currentStory
) {
    public RoomState toMaskedState(String requestingParticipantId) {
        boolean isRevealed = this.phase == Phase.REVEALED;

        List<ParticipantState> maskedParticipants = participants.stream()
            .map(p -> p.toMasked(isRevealed, p.id().equals(requestingParticipantId)))
            .toList();

        return new RoomState(
            slug,
            shortCode,
            phase,
            maskedParticipants,
            currentStory
        );
    }
}
```

---

## 🔄 Feature Parity & Module Mapping

| Rust Architecture Component | Proposed Java Implementation |
| :--- | :--- |
| `server/src/domain/slug.rs` | `RoomCodeGenerator.java` using SecureRandom & 6-character Crockford Base32 formatting |
| `server/src/actor/room_actor.rs` | `RoomDomainModel.java` managing 7-phase state transitions |
| `server/src/actor/registry.rs` | `RoomRegistryService.java` with ConcurrentHashMap backing |
| `server/src/ws/` | `ScrumPokerWebSocketHandler.java` mapping JSON-RPC protocol commands |
| `server/src/domain/tracker/` | `LinearTrackerAdapter.java`, `GitHubTrackerAdapter.java`, `JiraTrackerAdapter.java` via Spring WebClient |
| `server/src/domain/ai/` | `StoryDoctorService.java` using Spring AI ChatClient with structured JSON outputs |

---

## 🚀 Migration Roadmap

1. **Phase 1: Core Domain & Room State Engine**
   - Implement Java 21 domain Records, `Phase` state machine, and unit tests.
2. **Phase 2: WebSocket Server & Reveal Gate Filter**
   - Implement WebSocket endpoints, JSON-RPC frame serialization/deserialization, and payload masking.
3. **Phase 3: Database & Vector Search Migration**
   - Configure Spring Data JPA, Flyway migrations for Postgres + `pgvector`, and Spring AI embeddings repository.
4. **Phase 4: Tracker Adapters & AI Advisory Service**
   - Re-implement Linear, GitHub, and Jira integration clients and OpenAI prompt pipelines.
5. **Phase 5: End-to-End Verification & Load Testing**
   - Execute frontend integration testing with the new Java backend and verify zero-regression protocol compliance.
