use futures::{SinkExt, StreamExt};
use server::actor::registry::RoomRegistry;
use server::domain::protocol::{ClientCommand, ServerEvent};
use server::routes::create_router;
use std::net::SocketAddr;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;

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
async fn test_websocket_join_vote_and_reveal_flow() {
    let registry = RoomRegistry::new();
    let app = create_router(registry);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("Failed to bind random test port");
    let addr: SocketAddr = listener.local_addr().unwrap();

    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });

    let ws_url = format!("ws://127.0.0.1:{}/ws/rooms/SWB-42", addr.port());

    // 1. Client A (Facilitator) connects
    let (mut ws_a, _) = connect_async(&ws_url)
        .await
        .expect("Failed to connect ws_a");

    let join_cmd_a = ClientCommand::JoinRoom {
        participant_id: "user-a".to_string(),
        nickname: "Alex".to_string(),
        avatar: "indigo".to_string(),
        role: None,
    };
    ws_a.send(Message::Text(
        serde_json::to_string(&join_cmd_a).unwrap().into(),
    ))
    .await
    .unwrap();

    // 2. Client B (Estimator) connects
    let (mut ws_b, _) = connect_async(&ws_url)
        .await
        .expect("Failed to connect ws_b");

    let join_cmd_b = ClientCommand::JoinRoom {
        participant_id: "user-b".to_string(),
        nickname: "Sarah".to_string(),
        avatar: "emerald".to_string(),
        role: None,
    };
    ws_b.send(Message::Text(
        serde_json::to_string(&join_cmd_b).unwrap().into(),
    ))
    .await
    .unwrap();

    // 3. Client A starts voting
    let start_voting_cmd = ClientCommand::StartVoting;
    ws_a.send(Message::Text(
        serde_json::to_string(&start_voting_cmd).unwrap().into(),
    ))
    .await
    .unwrap();

    // 4. Client A votes 5, Client B votes 8
    let vote_a = ClientCommand::CastVote {
        value: "5".to_string(),
    };
    ws_a.send(Message::Text(
        serde_json::to_string(&vote_a).unwrap().into(),
    ))
    .await
    .unwrap();

    let vote_b = ClientCommand::CastVote {
        value: "8".to_string(),
    };
    ws_b.send(Message::Text(
        serde_json::to_string(&vote_b).unwrap().into(),
    ))
    .await
    .unwrap();

    // 5. Read incoming messages on Client B to ensure Reveal Gate masks Client A's vote value
    let mut got_masked_snapshot = false;
    for _ in 0..10 {
        if let Some(Ok(Message::Text(text))) = ws_b.next().await {
            if let Ok(ServerEvent::RoomSnapshot { state }) =
                serde_json::from_str::<ServerEvent>(&text)
            {
                if state.phase == server::domain::models::EstimationPhase::Voting {
                    let p_a = state.participants.iter().find(|p| p.id == "user-a");
                    if let Some(p) = p_a {
                        if p.voted {
                            assert_eq!(p.vote, None, "Peer vote must be masked under reveal gate!");
                            got_masked_snapshot = true;
                            break;
                        }
                    }
                }
            }
        }
    }
    assert!(
        got_masked_snapshot,
        "Should have received snapshot verifying Reveal Gate masking"
    );

    // 6. Client A reveals cards
    let reveal_cmd = ClientCommand::RevealCards;
    ws_a.send(Message::Text(
        serde_json::to_string(&reveal_cmd).unwrap().into(),
    ))
    .await
    .unwrap();

    // 7. Verify Client B receives unmasked reveal
    let mut got_revealed_snapshot = false;
    for _ in 0..10 {
        if let Some(Ok(Message::Text(text))) = ws_b.next().await {
            if let Ok(ServerEvent::RoomSnapshot { state }) =
                serde_json::from_str::<ServerEvent>(&text)
            {
                if state.phase == server::domain::models::EstimationPhase::Revealed {
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
    assert!(
        got_revealed_snapshot,
        "Should have received unmasked snapshot upon reveal"
    );
}
