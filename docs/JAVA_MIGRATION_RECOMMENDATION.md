# ☕ Java Migration Architecture & Stack Recommendation
## Scrum Pokr AI — Backend Stack Modernization Strategy (SSE + REST Edition)

---

## Executive Summary

This document presents a comprehensive, production-grade architectural proposal for migrating the **Scrum Pokr AI** backend from **Rust (Tokio / Axum)** to **Java**, re-imagined to use **Server-Sent Events (SSE)** + **REST HTTP Endpoints** instead of WebSockets.

### Why Server-Sent Events (SSE) + REST over WebSockets?
Corporate proxy environments, enterprise firewalls, and Next-Generation Application Firewalls (NGFWs) frequently block, inspect, or abruptly terminate persistent WebSocket (`ws://` / `wss://`) connections due to stateful connection timeouts or strict protocol inspection.

Transitioning to **SSE (`text/event-stream`)** for real-time downstream updates from the server, paired with standard **REST/HTTP POST** requests for client actions (joining, voting, revealing, resetting):
1. **Bypasses Strict Corporate Firewalls**: Operates transparently over standard HTTP/1.1 and HTTP/2 (ports 80 / 443) as standard chunked HTTP responses.
2. **Built-in Auto-Reconnect & Event Framing**: Browsers natively auto-reconnect SSE streams (`EventSource`) with backoff and tracking headers (`Last-Event-ID`).
3. **Stateless Command Processing**: Client interactions are standard REST endpoints, allowing independent authentication, rate-limiting, and standard APM observability.
4. **Ideal Fit for Java 25 Virtual Threads**: Virtual Threads make handling thousands of concurrent, long-lived SSE HTTP streaming connections virtually overhead-free.

---

## 🏆 Recommended Technology Stack

We recommend two distinct architectural options tailored to team priorities: **Option 1 (Spring Boot 4.1+ with Java 25 Virtual Threads)** as the primary recommendation for maximum developer productivity, and **Option 2 (Quarkus 3.x + Mutiny SSE)** for maximum resource efficiency.

### Stack Option 1: Enterprise Standard (Recommended)
**Spring Boot 4.1+ with Java 25 (Virtual Threads)**

| Component | Java Library / Framework | Purpose / Notes |
| :--- | :--- | :--- |
| **Runtime & Language** | **Java 25 LTS** | Virtual Threads (`Thread.ofVirtual()`), Records, Pattern Matching, Sealed Interfaces. |
| **Core Framework** | **Spring Boot 4.1+** | Web layer, dependency injection, REST controllers, auto-configuration. |
| **SSE Real-Time Engine** | **Spring MVC `SseEmitter`** (or Spring WebFlux `Flux<ServerSentEvent>`) | Manages non-blocking long-lived HTTP SSE streams. Works seamlessly through corporate proxies. |
| **JSON & Protocol** | **Jackson 2.17+** | High-performance JSON serialization with custom masking serializers for Reveal Gate. |
| **Database & Vector Search** | **Spring Data JPA + Spring AI `PgVectorStore`** / **Flyway** | Postgres persistence & 1536-dim IVFFlat nearest-neighbor vector search. |
| **AI Advisory Engine** | **Spring AI 1.0+** | Native abstraction for ChatCompletion, Prompt Templates, and RAG embeddings. |
| **Issue Tracker Integration** | **Spring `WebClient` / JDK `HttpClient`** | Async client for Linear GraphQL, GitHub REST, and Jira REST APIs. |
| **Testing** | **JUnit 5, AssertJ, Testcontainers** | Integration testing with real Postgres + pgvector containers via Testcontainers. |

---

### Stack Option 2: Cloud-Native & Reactive
**Quarkus 3.x with Mutiny SSE & GraalVM Native Image**

| Component | Java Library / Framework |
| :--- | :--- |
| **Framework** | **Quarkus 3.12+** |
| **Reactive SSE Engine** | **RESTEasy Reactive `Multi<OutboundSseEvent>`** |
| **AI Engine** | **LangChain4j Quarkus Extension** |
| **Compilation** | **GraalVM Native Image** (produces standalone native binaries ~50MB RAM) |

---

## 🏗️ Re-Imagined System Architecture (SSE + REST)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                           React Web Client (SPA)                                         │
│                                                                                                          │
│    ┌───────────────────────────────────┐               ┌──────────────────────────────────────────┐      │
│    │  Command Client (REST / HTTP POST)│               │ Event Listener (SSE / EventSource W3C)   │      │
│    └─────────────────┬─────────────────┘               └────────────────────▲─────────────────────┘      │
└──────────────────────┼──────────────────────────────────────────────────────┼────────────────────────────┘
                       │ HTTP POST /api/rooms/{code}/vote                     │ HTTP GET /api/rooms/{code}/events
                       │ HTTP POST /api/rooms/{code}/reveal                   │ (text/event-stream)
                       ▼                                                      │
┌─────────────────────────────────────────────────────────────────────────────┼────────────────────────────┐
│                                    Java 25 / Spring Boot 4 Backend          │                            │
│                                                                             │                            │
│  ┌───────────────────────────────────┐                            ┌─────────┴────────────────────────┐   │
│  │    REST Controller Layer          │                            │     SSE Stream Emitter Registry  │   │
│  │  - POST /api/rooms                │                            │  - Room code event dispatchers   │   │
│  │  - POST /api/rooms/{code}/join    │                            │  - Heartbeat / Keep-Alive timer  │   │
│  │  - POST /api/rooms/{code}/vote    │                            │  - Last-Event-ID catchup replay  │   │
│  └─────────────────┬─────────────────┘                            └─────────▲────────────────────────┘   │
│                    │                                                        │                            │
│                    ▼                                                        │                            │
│  ┌──────────────────────────────────────────────────────────────────────────┴────────────────────────┐   │
│  │                                 Room State Manager & Event Bus                                    │   │
│  │  ┌──────────────────────────────┐              ┌──────────────────────────────────────────────┐   │   │
│  │  │ Room State Machine           │              │ Server Reveal Gate Filter                    │   │   │
│  │  │ (Virtual Threads / Locks)    │ ───────────► │ (State Masking per Requesting Participant)  │   │   │
│  │  └──────────────────────────────┘              └──────────────────────────────────────────────┘   │   │
│  └─────────────────┬────────────────────────────────────────────────────────┬────────────────────────┘   │
└────────────────────┼────────────────────────────────────────────────────────┼────────────────────────────┘
                     │                                                        │
                     │ Optional Multi-Node Scale-Out                          │ Vector Search & Persistence
                     ▼                                                        ▼
┌───────────────────────────────────────────┐             ┌────────────────────────────────────────────────┐
│         Redis Pub/Sub (Optional)          │             │         PostgreSQL + pgvector Database         │
│ - Broadcaster across SSE cluster nodes    │             │ - Historical Stories & Vector Index            │
└───────────────────────────────────────────┘             └────────────────────────────────────────────────┘
```

---

## 🔁 Communication Protocol: SSE + REST Spec

Instead of bidirectional JSON-RPC frames over a single WebSocket, the architecture splits downstream notifications and upstream commands cleanly.

### 1. Downstream: Real-Time SSE Stream (`GET /api/rooms/{code}/events`)
Clients establish a single, read-only SSE stream.

* **HTTP Method & Headers**:
  `GET /api/rooms/SWB-42/events?participant_id=p-123`
  `Accept: text/event-stream`
* **Server Heartbeat**:
  To keep corporate proxies from killing idle connections, the server sends a periodic `: heartbeat\n\n` comment every 15 seconds.
* **Server Events (Payload Format)**:
  ```http
  event: room_state
  id: 1042
  data: {"slug":"SWB-42","phase":"VOTING","participants":[{"id":"p-123","name":"Alice","has_voted":true,"vote":null}]}

  event: story_updated
  id: 1043
  data: {"id":"s-1","title":"Migrate to Java","estimate":null}
  ```

### 2. Upstream: REST Command Endpoints
Clients execute actions via standard HTTP POST endpoints with JSON bodies.

| Endpoint | Method | Request Body | Description |
| :--- | :--- | :--- | :--- |
| `/api/rooms` | `POST` | `{}` | Creates a new room and returns slug/shortCode. |
| `/api/rooms/{code}/join` | `POST` | `{"name":"Alice","role":"VOTER"}` | Joins a room, returns session participant token. |
| `/api/rooms/{code}/vote` | `POST` | `{"participant_id":"p-123","vote":"5"}` | Casts a vote; triggers broadcast of masked `room_state` via SSE. |
| `/api/rooms/{code}/reveal` | `POST` | `{"participant_id":"p-123"}` | Reveals votes; broadcasts unmasked `room_state` via SSE. |
| `/api/rooms/{code}/reset` | `POST` | `{"participant_id":"p-123"}` | Resets voting for the current story. |

---

## 🛠️ Java Implementation Details (Spring Boot 4 + Virtual Threads)

### 1. SSE Stream Controller with Virtual Threads
```java
@RestController
@RequestMapping("/api/rooms")
public class RoomSseController {

    private final RoomRegistryService roomRegistry;

    @GetMapping(path = "/{code}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamEvents(
        @PathVariable String code,
        @RequestParam String participantId
    ) {
        // Emitter timeout: set to 0 or negative for indefinite corporate stream duration
        SseEmitter emitter = new SseEmitter(-1L);

        RoomHandle room = roomRegistry.getOrCreate(code);
        room.subscribe(participantId, emitter);

        emitter.onCompletion(() -> room.unsubscribe(participantId, emitter));
        emitter.onTimeout(() -> room.unsubscribe(participantId, emitter));
        emitter.onError(ex -> room.unsubscribe(participantId, emitter));

        return emitter;
    }
}
```

### 2. Protocol Security: Server Reveal Gate in SSE Broadcasts
When broadcasting state updates to all connected SSE clients in a room, the server passes each client's `SseEmitter` a uniquely masked view:

```java
public class RoomHandle {
    private final Map<String, List<SseEmitter>> participantEmitters = new ConcurrentHashMap<>();
    private final RoomDomainModel stateMachine;

    public void broadcastState() {
        RoomState currentState = stateMachine.getState();

        participantEmitters.forEach((participantId, emitters) -> {
            RoomState maskedState = currentState.toMaskedState(participantId);

            for (SseEmitter emitter : emitters) {
                try {
                    emitter.send(SseEmitter.event()
                        .name("room_state")
                        .data(maskedState));
                } catch (IOException e) {
                    // Handle client disconnect gracefully
                }
            }
        });
    }
}
```

---

## 🛡️ Corporate Enterprise Proxy Considerations

1. **HTTP/2 Support**:
   By serving over **HTTP/2** (via NGINX/Envoy or Spring Boot embedded Tomcat/Netty with ALPN), browser connection limits per domain (6 sockets in HTTP/1.1) are eliminated since all SSE streams multiplex over a single TCP connection.
2. **Buffering Disabled (`X-Accel-Buffering: no`)**:
   Reverse proxies like NGINX must disable response buffering for SSE endpoints so that event chunks are flushed instantly to clients.
3. **Keep-Alive Heartbeats**:
   Periodic `: heartbeat` frames every 15s ensure cloud load balancers (AWS ALB, Azure App Gateway, Cloudflare) do not close idle connections after default 60s timeouts.

---

## 🚀 Migration Roadmap (SSE + REST)

1. **Phase 1: REST API & SSE Controller Infrastructure**
   - Implement Spring Boot REST controllers for room actions and `/events` SSE streaming endpoint.
2. **Phase 2: Room State Engine & Masked SSE Fan-Out**
   - Implement thread-safe `RoomDomainModel`, Reveal Gate masking, and `SseEmitter` event dispatcher.
3. **Phase 3: Database & Vector Search Migration**
   - Configure Spring Data JPA, Flyway migrations for Postgres + `pgvector`, and Spring AI embeddings repository.
4. **Phase 4: Issue Tracker & AI Advisory Integration**
   - Implement Spring `WebClient` integrations for Linear, GitHub, Jira, and OpenAI story doctor prompts.
5. **Phase 5: React Client SSE Adapter & E2E Verification**
   - Update client `useRoomSocket` hook to use W3C `EventSource` + `fetch()` REST calls and verify zero-regression functionality through corporate proxy simulation.
