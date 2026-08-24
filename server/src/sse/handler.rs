use crate::actor::registry::RoomRegistry;
use crate::actor::room_actor::RoomCommand;
use crate::domain::protocol::ServerEvent;
use axum::extract::{Path, Query, State};
use axum::response::sse::{Event, KeepAlive, Sse};
use futures::Stream;
use serde::Deserialize;
use std::convert::Infallible;
use std::time::Duration;
use tokio::sync::mpsc;
use tracing::debug;

#[derive(Debug, Deserialize)]
pub struct SseParams {
    pub participant_id: Option<String>,
}

struct DisconnectGuard {
    participant_id: Option<String>,
    room_tx: mpsc::Sender<RoomCommand>,
}

impl Drop for DisconnectGuard {
    fn drop(&mut self) {
        if let Some(ref pid) = self.participant_id {
            debug!("SSE connection dropped for participant {}", pid);
            let tx = self.room_tx.clone();
            let pid = pid.clone();
            tokio::spawn(async move {
                let _ = tx
                    .send(RoomCommand::Disconnect {
                        participant_id: pid,
                    })
                    .await;
            });
        }
    }
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
        let _guard = DisconnectGuard {
            participant_id: pid.clone(),
            room_tx: room_tx.clone(),
        };

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
    };

    Sse::new(stream).keep_alive(
        KeepAlive::new()
            .interval(Duration::from_secs(15))
            .text("keep-alive-ping"),
    )
}
