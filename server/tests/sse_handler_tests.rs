use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use server::actor::registry::RoomRegistry;
use server::actor::room_actor::RoomCommand;
use server::domain::models::EstimationPhase;
use server::domain::protocol::{ClientCommand, ServerEvent};
use server::routes::create_router;
use tower::ServiceExt;

#[tokio::test]
async fn test_sse_endpoint_returns_event_stream_and_initial_snapshot() {
    let registry = RoomRegistry::new();
    let app = create_router(registry);

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/rooms/SWB-42/events?participant_id=user-1")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default();
    assert!(
        content_type.starts_with("text/event-stream"),
        "Content-Type should be text/event-stream, got: {}",
        content_type
    );

    let mut body = response.into_body();
    let first_chunk = body.frame().await.unwrap().unwrap().into_data().unwrap();
    let text = String::from_utf8(first_chunk.to_vec()).unwrap();

    assert!(
        text.contains("data:"),
        "Stream chunk should contain SSE data field: {}",
        text
    );
    assert!(
        text.contains("RoomSnapshot"),
        "Initial event should be RoomSnapshot: {}",
        text
    );
}

#[tokio::test]
async fn test_sse_broadcast_enforces_reveal_gate_masking() {
    let registry = RoomRegistry::new();
    let handle = registry.get_or_create("SWB-99").await;
    let room_tx = handle.tx.clone();

    let app = create_router(registry);

    // Client B connects to SSE
    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/rooms/SWB-99/events?participant_id=user-b")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let mut body = response.into_body();

    // Consume initial snapshot
    let _ = body.frame().await.unwrap().unwrap().into_data().unwrap();

    // 1. Client A joins
    let _ = room_tx
        .send(RoomCommand::ClientMsg {
            participant_id: "user-a".to_string(),
            command: ClientCommand::JoinRoom {
                participant_id: "user-a".to_string(),
                nickname: "Alex".to_string(),
                avatar: "indigo".to_string(),
                role: None,
            },
            reply: None,
        })
        .await;

    // 2. Client B joins
    let _ = room_tx
        .send(RoomCommand::ClientMsg {
            participant_id: "user-b".to_string(),
            command: ClientCommand::JoinRoom {
                participant_id: "user-b".to_string(),
                nickname: "Sarah".to_string(),
                avatar: "emerald".to_string(),
                role: None,
            },
            reply: None,
        })
        .await;

    // 3. Client A starts voting
    let _ = room_tx
        .send(RoomCommand::ClientMsg {
            participant_id: "user-a".to_string(),
            command: ClientCommand::StartVoting,
            reply: None,
        })
        .await;

    // 4. Client A casts vote 5
    let _ = room_tx
        .send(RoomCommand::ClientMsg {
            participant_id: "user-a".to_string(),
            command: ClientCommand::CastVote {
                value: "5".to_string(),
            },
            reply: None,
        })
        .await;

    // Read SSE frames on Client B until we find the Voting snapshot
    let mut got_masked_snapshot = false;
    for _ in 0..15 {
        if let Ok(Some(Ok(frame))) =
            tokio::time::timeout(std::time::Duration::from_millis(500), body.frame()).await
        {
            if let Ok(data) = frame.into_data() {
                let text = String::from_utf8_lossy(&data);
                for line in text.lines() {
                    if let Some(json_str) = line.strip_prefix("data:") {
                        if let Ok(ServerEvent::RoomSnapshot { state }) =
                            serde_json::from_str::<ServerEvent>(json_str.trim())
                        {
                            if state.phase == EstimationPhase::Voting {
                                if let Some(p_a) = state.participants.iter().find(|p| p.id == "user-a") {
                                    if p_a.voted {
                                        assert_eq!(p_a.vote, None, "Peer vote must be masked over SSE!");
                                        got_masked_snapshot = true;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
                if got_masked_snapshot {
                    break;
                }
            }
        }
    }

    assert!(
        got_masked_snapshot,
        "Client B should have received masked snapshot over SSE"
    );

    // 5. Client A reveals cards
    let _ = room_tx
        .send(RoomCommand::ClientMsg {
            participant_id: "user-a".to_string(),
            command: ClientCommand::RevealCards,
            reply: None,
        })
        .await;

    // Read SSE frames until we find the Revealed snapshot
    let mut got_revealed_snapshot = false;
    for _ in 0..15 {
        if let Ok(Some(Ok(frame))) =
            tokio::time::timeout(std::time::Duration::from_millis(500), body.frame()).await
        {
            if let Ok(data) = frame.into_data() {
                let text = String::from_utf8_lossy(&data);
                for line in text.lines() {
                    if let Some(json_str) = line.strip_prefix("data:") {
                        if let Ok(ServerEvent::RoomSnapshot { state }) =
                            serde_json::from_str::<ServerEvent>(json_str.trim())
                        {
                            if state.phase == EstimationPhase::Revealed {
                                if let Some(p_a) = state.participants.iter().find(|p| p.id == "user-a") {
                                    assert_eq!(p_a.vote, Some("5".to_string()));
                                    got_revealed_snapshot = true;
                                    break;
                                }
                            }
                        }
                    }
                }
                if got_revealed_snapshot {
                    break;
                }
            }
        }
    }

    assert!(
        got_revealed_snapshot,
        "Client B should have received unmasked snapshot upon reveal over SSE"
    );
}
