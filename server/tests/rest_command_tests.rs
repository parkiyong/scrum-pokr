use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use serde_json::json;
use server::actor::registry::RoomRegistry;
use server::routes::create_router;
use tower::ServiceExt;

#[tokio::test]
async fn test_rest_join_and_voting_flow() {
    let registry = RoomRegistry::new();
    let app = create_router(registry);

    // 1. Join participant Alex (Facilitator)
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/rooms/SWB-10/participants")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "participant_id": "user-a",
                        "nickname": "Alex",
                        "avatar": "indigo",
                        "role": "Estimator"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // 2. Join participant Sarah (Estimator)
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/rooms/SWB-10/participants")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "participant_id": "user-b",
                        "nickname": "Sarah",
                        "avatar": "emerald",
                        "role": "Estimator"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // 3. Start voting
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/rooms/SWB-10/voting/start")
                .header("x-participant-id", "user-a")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // 4. Cast votes: User A votes 5, User B votes 8
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/rooms/SWB-10/voting/vote")
                .header("x-participant-id", "user-a")
                .header("content-type", "application/json")
                .body(Body::from(json!({ "value": "5" }).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/rooms/SWB-10/voting/vote")
                .header("x-participant-id", "user-b")
                .header("content-type", "application/json")
                .body(Body::from(json!({ "value": "8" }).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // 5. Query state as User B -> User A's vote MUST be masked (None)
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/rooms/SWB-10/state?participant_id=user-b")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let state: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let participants = state["participants"].as_array().unwrap();
    let user_a = participants
        .iter()
        .find(|p| p["id"] == "user-a")
        .unwrap();
    assert_eq!(user_a["voted"], true);
    assert!(user_a["vote"].is_null(), "Peer vote must be masked during voting phase");

    // 6. Reveal cards
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/rooms/SWB-10/voting/reveal")
                .header("x-participant-id", "user-a")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // 7. Query state again -> User A's vote is unmasked
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/rooms/SWB-10/state?participant_id=user-b")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let state: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let participants = state["participants"].as_array().unwrap();
    let user_a = participants
        .iter()
        .find(|p| p["id"] == "user-a")
        .unwrap();
    assert_eq!(user_a["vote"], "5");
}

#[tokio::test]
async fn test_rest_backlog_and_story_operations() {
    let registry = RoomRegistry::new();
    let app = create_router(registry);

    // 1. Join facilitator
    let _ = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/rooms/SWB-20/participants")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "participant_id": "fac-1",
                        "nickname": "Facilitator",
                        "avatar": "indigo"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    // 2. Ingest Markdown backlog
    let md = "# As a developer, I want REST\n- AC: Support POST /api/rooms";
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/rooms/SWB-20/backlog/markdown")
                .header("x-participant-id", "fac-1")
                .header("content-type", "application/json")
                .body(Body::from(json!({ "raw_markdown": md }).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // 3. Query room state
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/rooms/SWB-20/state?participant_id=fac-1")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let state: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(state["backlog"].as_array().unwrap().len(), 1);
}

#[tokio::test]
async fn test_rest_role_and_facilitator_transfer() {
    let registry = RoomRegistry::new();
    let app = create_router(registry);

    // Join p1 (becomes facilitator)
    let _ = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/rooms/SWB-30/participants")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "participant_id": "p1",
                        "nickname": "P1",
                        "avatar": "indigo"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    // Join p2
    let _ = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/rooms/SWB-30/participants")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "participant_id": "p2",
                        "nickname": "P2",
                        "avatar": "emerald"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    // Transfer facilitator from p1 to p2
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/rooms/SWB-30/facilitator")
                .header("x-participant-id", "p1")
                .header("content-type", "application/json")
                .body(Body::from(json!({ "target_id": "p2" }).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // Update p1 role to Observer
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PATCH")
                .uri("/api/rooms/SWB-30/participants/p1/role")
                .header("x-participant-id", "p2")
                .header("content-type", "application/json")
                .body(Body::from(json!({ "role": "Observer" }).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // Verify room state
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/rooms/SWB-30/state?participant_id=p2")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let state: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(state["facilitator_id"], "p2");
}
