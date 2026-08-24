use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use serde_json::json;
use server::actor::registry::RoomRegistry;
use server::domain::protocol::ServerEvent;
use server::routes::create_router;
use tower::ServiceExt;

#[tokio::test]
async fn test_sse_stream_drop_triggers_disconnect_and_facilitator_failover() {
    let registry = RoomRegistry::new();
    let app = create_router(registry);

    // 1. Join Facilitator (p1)
    let _ = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/rooms/SWB-50/participants")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "participant_id": "p1",
                        "nickname": "Facilitator",
                        "avatar": "indigo"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    // 2. Join Estimator (p2)
    let _ = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/rooms/SWB-50/participants")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "participant_id": "p2",
                        "nickname": "Estimator",
                        "avatar": "emerald"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    // 3. Connect p1 and p2 to SSE streams
    let p1_sse = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/rooms/SWB-50/events?participant_id=p1")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let mut p1_body = p1_sse.into_body();
    let _ = p1_body.frame().await.unwrap().unwrap().into_data().unwrap();

    let p2_sse = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/rooms/SWB-50/events?participant_id=p2")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // Consume initial snapshot for p2
    let mut p2_body = p2_sse.into_body();
    let _ = p2_body.frame().await.unwrap().unwrap().into_data().unwrap();

    // 4. Drop p1's SSE response body (simulating socket close / tab close)
    drop(p1_body);

    // Give tokio runtime a brief moment to process the drop guard
    tokio::time::sleep(std::time::Duration::from_millis(50)).await;

    // 5. Read SSE events on p2 -> should receive FacilitatorChanged promoting p2!
    let mut got_failover = false;
    for _ in 0..10 {
        if let Ok(Some(Ok(frame))) =
            tokio::time::timeout(std::time::Duration::from_millis(500), p2_body.frame()).await
        {
            if let Ok(data) = frame.into_data() {
                let text = String::from_utf8_lossy(&data);
                for line in text.lines() {
                    if let Some(json_str) = line.strip_prefix("data:") {
                        if let Ok(ServerEvent::FacilitatorChanged { facilitator_id }) =
                            serde_json::from_str::<ServerEvent>(json_str.trim())
                        {
                            if facilitator_id == "p2" {
                                got_failover = true;
                                break;
                            }
                        }
                    }
                }
                if got_failover {
                    break;
                }
            }
        }
    }

    assert!(
        got_failover,
        "p2 should have received FacilitatorChanged promotion after p1 stream dropped"
    );
}

#[tokio::test]
async fn test_explicit_leave_endpoint() {
    let registry = RoomRegistry::new();
    let app = create_router(registry);

    // Join p1
    let _ = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/rooms/SWB-60/participants")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "participant_id": "p1",
                        "nickname": "Alice",
                        "avatar": "indigo"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    // Explicit leave
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/rooms/SWB-60/leave")
                .header("x-participant-id", "p1")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);

    // Check state -> p1 is marked connected: false
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/rooms/SWB-60/state?participant_id=p1")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let body = res.into_body().collect().await.unwrap().to_bytes();
    let state: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let p1 = state["participants"]
        .as_array()
        .unwrap()
        .iter()
        .find(|p| p["id"] == "p1")
        .unwrap();
    assert_eq!(p1["connected"], false);
}
