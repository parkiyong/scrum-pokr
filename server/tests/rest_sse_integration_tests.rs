use reqwest::Client;
use serde_json::json;
use server::actor::registry::RoomRegistry;
use server::domain::models::EstimationPhase;
use server::domain::protocol::ServerEvent;
use server::routes::create_router;
use std::net::SocketAddr;

#[tokio::test]
async fn test_api_create_room_returns_6_char_code() {
    let registry = RoomRegistry::new();
    let handle = registry.create_room().await;

    assert_eq!(handle.slug.len(), 6);
    assert_eq!(handle.slug, handle.short_code);
    assert!(handle.slug.contains('-'));
    let parts: Vec<&str> = handle.slug.split('-').collect();
    assert_eq!(parts.len(), 2);
    assert_eq!(parts[0].len(), 3);
    assert_eq!(parts[1].len(), 2);
    assert!(parts[0].chars().all(|c| c.is_ascii_uppercase()));
    assert!(parts[1].chars().all(|c| c.is_ascii_digit()));
}

#[tokio::test]
async fn test_rest_and_sse_full_collaborative_voting_flow() {
    let registry = RoomRegistry::new();
    let app = create_router(registry);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("Failed to bind random test port");
    let addr: SocketAddr = listener.local_addr().unwrap();

    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });

    let client = Client::new();
    let base_url = format!("http://127.0.0.1:{}", addr.port());

    // 1. Client A (Facilitator) joins via REST
    let res_a = client
        .post(format!("{}/api/rooms/SWB-42/participants", base_url))
        .json(&json!({
            "participant_id": "user-a",
            "nickname": "Alex",
            "avatar": "indigo",
            "role": "Estimator"
        }))
        .send()
        .await
        .unwrap();
    assert!(res_a.status().is_success());

    // 2. Client B (Estimator) joins via REST
    let res_b = client
        .post(format!("{}/api/rooms/SWB-42/participants", base_url))
        .json(&json!({
            "participant_id": "user-b",
            "nickname": "Sarah",
            "avatar": "emerald",
            "role": "Estimator"
        }))
        .send()
        .await
        .unwrap();
    assert!(res_b.status().is_success());

    // 3. Client B connects to SSE stream
    let mut sse_res = client
        .get(format!(
            "{}/api/rooms/SWB-42/events?participant_id=user-b",
            base_url
        ))
        .send()
        .await
        .unwrap();
    assert!(sse_res.status().is_success());

    // 4. Client A starts voting
    let start_res = client
        .post(format!("{}/api/rooms/SWB-42/voting/start", base_url))
        .header("x-participant-id", "user-a")
        .send()
        .await
        .unwrap();
    assert!(start_res.status().is_success());

    // 5. Client A votes 5, Client B votes 8
    let vote_a_res = client
        .post(format!("{}/api/rooms/SWB-42/voting/vote", base_url))
        .header("x-participant-id", "user-a")
        .json(&json!({ "value": "5" }))
        .send()
        .await
        .unwrap();
    assert!(vote_a_res.status().is_success());

    let vote_b_res = client
        .post(format!("{}/api/rooms/SWB-42/voting/vote", base_url))
        .header("x-participant-id", "user-b")
        .json(&json!({ "value": "8" }))
        .send()
        .await
        .unwrap();
    assert!(vote_b_res.status().is_success());

    // 6. Read SSE stream on Client B to ensure Reveal Gate masks Client A's vote value
    let mut got_masked_snapshot = false;
    for _ in 0..15 {
        if let Ok(Ok(Some(bytes))) =
            tokio::time::timeout(std::time::Duration::from_millis(500), sse_res.chunk()).await
        {
            let text = String::from_utf8_lossy(&bytes);
            for line in text.lines() {
                if let Some(json_str) = line.strip_prefix("data:") {
                    if let Ok(ServerEvent::RoomSnapshot { state }) =
                        serde_json::from_str::<ServerEvent>(json_str.trim())
                    {
                        if state.phase == EstimationPhase::Voting {
                            if let Some(p_a) = state.participants.iter().find(|p| p.id == "user-a") {
                                if p_a.voted {
                                    assert_eq!(
                                        p_a.vote, None,
                                        "Peer vote must be masked under reveal gate!"
                                    );
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
    assert!(
        got_masked_snapshot,
        "Should have received snapshot verifying Reveal Gate masking over SSE"
    );

    // 7. Client A reveals cards
    let reveal_res = client
        .post(format!("{}/api/rooms/SWB-42/voting/reveal", base_url))
        .header("x-participant-id", "user-a")
        .send()
        .await
        .unwrap();
    assert!(reveal_res.status().is_success());

    // 8. Verify Client B receives unmasked reveal
    let mut got_revealed_snapshot = false;
    for _ in 0..15 {
        if let Ok(Ok(Some(bytes))) =
            tokio::time::timeout(std::time::Duration::from_millis(500), sse_res.chunk()).await
        {
            let text = String::from_utf8_lossy(&bytes);
            for line in text.lines() {
                if let Some(json_str) = line.strip_prefix("data:") {
                    if let Ok(ServerEvent::RoomSnapshot { state }) =
                        serde_json::from_str::<ServerEvent>(json_str.trim())
                    {
                        if state.phase == EstimationPhase::Revealed {
                            let p_a = state
                                .participants
                                .iter()
                                .find(|p| p.id == "user-a")
                                .unwrap();
                            let p_b = state
                                .participants
                                .iter()
                                .find(|p| p.id == "user-b")
                                .unwrap();
                            assert_eq!(p_a.vote, Some("5".to_string()));
                            assert_eq!(p_b.vote, Some("8".to_string()));
                            assert!(state.consensus.is_some());
                            got_revealed_snapshot = true;
                            break;
                        }
                    }
                }
            }
            if got_revealed_snapshot {
                break;
            }
        }
    }
    assert!(
        got_revealed_snapshot,
        "Should have received unmasked snapshot upon reveal over SSE"
    );
}
