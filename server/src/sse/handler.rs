use crate::actor::registry::RoomRegistry;
use crate::actor::room_actor::RoomCommand;
use crate::domain::protocol::ServerEvent;
use axum::extract::{Path, Query, State};
use axum::response::sse::{Event, KeepAlive, Sse};
use futures::Stream;
use serde::Deserialize;
use std::convert::Infallible;
use std::time::Duration;
use tracing::debug;

#[derive(Debug, Deserialize)]
pub struct SseParams {
    pub participant_id: Option<String>,
}

pub async fn sse_room_handler(
    Path(slug): Path<String>,
    Query(params): Query<SseParams>,
    State(registry): State<RoomRegistry>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let handle = registry.get_or_create(&slug).await;
    let mut event_rx = handle.event_tx.subscribe();
    let room_tx = handle.tx.clone();
    let pid = params.participant_id;

    let stream = async_stream::stream! {
        let target_pid = pid.clone().unwrap_or_else(|| "anonymous".to_string());

        // 1. Send initial room snapshot with Reveal Gate projection
        let (snap_tx, snap_rx) = tokio::sync::oneshot::channel();
        if room_tx
            .send(RoomCommand::GetSnapshot {
                participant_id: target_pid.clone(),
                reply: snap_tx,
            })
            .await
            .is_ok()
        {
            if let Ok(snap) = snap_rx.await {
                let snap_event = ServerEvent::RoomSnapshot { state: snap };
                if let Ok(json_str) = serde_json::to_string(&snap_event) {
                    yield Ok(Event::default().event("RoomSnapshot").data(json_str));
                }
            }
        }

        // 2. Stream subsequent broadcast events with personalized reveal gate handling
        while let Ok(event) = event_rx.recv().await {
            let msg_to_send = match event {
                ServerEvent::RoomSnapshot { .. } => {
                    let (snap_tx, snap_rx) = tokio::sync::oneshot::channel();
                    if room_tx
                        .send(RoomCommand::GetSnapshot {
                            participant_id: target_pid.clone(),
                            reply: snap_tx,
                        })
                        .await
                        .is_ok()
                    {
                        if let Ok(snap) = snap_rx.await {
                            ServerEvent::RoomSnapshot { state: snap }
                        } else {
                            event
                        }
                    } else {
                        event
                    }
                }
                other => other,
            };

            let event_name = msg_to_send.event_type();
            if let Ok(json_str) = serde_json::to_string(&msg_to_send) {
                yield Ok(Event::default().event(event_name).data(json_str));
            }
        }

        // 3. Disconnect cleanup on SSE stream drop
        if let Some(ref p) = pid {
            debug!("SSE stream closed for participant {}", p);
            let _ = room_tx
                .send(RoomCommand::Disconnect {
                    participant_id: p.clone(),
                })
                .await;
        }
    };

    Sse::new(stream).keep_alive(
        KeepAlive::new()
            .interval(Duration::from_secs(15))
            .text("keep-alive-ping"),
    )
}
