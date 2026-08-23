use crate::actor::registry::{RoomHandle, RoomRegistry};
use crate::actor::room_actor::RoomCommand;
use crate::domain::protocol::{ClientCommand, ServerEvent};
use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::{Path, State};
use axum::response::IntoResponse;
use futures::{SinkExt, StreamExt};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::{debug, warn};

pub async fn ws_room_handler(
    ws: WebSocketUpgrade,
    Path(slug): Path<String>,
    State(registry): State<RoomRegistry>,
) -> impl IntoResponse {
    let handle = registry.get_or_create(&slug).await;
    ws.on_upgrade(move |socket| handle_socket(socket, handle))
}

async fn handle_socket(socket: WebSocket, room: RoomHandle) {
    let (ws_tx, mut ws_rx) = socket.split();
    let ws_tx = Arc::new(Mutex::new(ws_tx));

    let participant_id: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));
    let is_connected = Arc::new(AtomicBool::new(true));

    let mut event_rx = room.event_tx.subscribe();
    let room_tx = room.tx.clone();

    // Broadcast forwarder task
    let ws_tx_clone = ws_tx.clone();
    let p_id_clone = participant_id.clone();
    let room_tx_clone = room_tx.clone();
    let is_connected_clone = is_connected.clone();

    let send_task = tokio::spawn(async move {
        while let Ok(event) = event_rx.recv().await {
            if !is_connected_clone.load(Ordering::Relaxed) {
                break;
            }

            // Reveal Gate handling for RoomSnapshot:
            // Fetch personalized projection for this participant
            let msg_to_send = match event {
                ServerEvent::RoomSnapshot { .. } => {
                    let maybe_pid = p_id_clone.lock().await.clone();
                    if let Some(ref pid) = maybe_pid {
                        let (snap_tx, snap_rx) = tokio::sync::oneshot::channel();
                        if room_tx_clone
                            .send(RoomCommand::GetSnapshot {
                                participant_id: pid.clone(),
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
                    } else {
                        event
                    }
                }
                other => other,
            };

            if let Ok(json_str) = serde_json::to_string(&msg_to_send) {
                let mut tx = ws_tx_clone.lock().await;
                if tx.send(Message::Text(json_str.clone())).await.is_err() {
                    break;
                }
            }
        }
    });

    // Receive task
    while let Some(result) = ws_rx.next().await {
        match result {
            Ok(Message::Text(text)) => {
                match serde_json::from_str::<ClientCommand>(&text) {
                    Ok(command) => {
                        let mut current_pid = participant_id.lock().await;
                        let sender_id = match &command {
                            ClientCommand::JoinRoom {
                                participant_id: pid,
                                ..
                            } => {
                                *current_pid = Some(pid.clone());
                                pid.clone()
                            }
                            _ => current_pid
                                .clone()
                                .unwrap_or_else(|| "anonymous".to_string()),
                        };
                        drop(current_pid);

                        let (reply_tx, reply_rx) = tokio::sync::oneshot::channel();
                        let send_res = room_tx
                            .send(RoomCommand::ClientMsg {
                                participant_id: sender_id.clone(),
                                command,
                                reply: Some(reply_tx),
                            })
                            .await;

                        if send_res.is_err() {
                            warn!("Room actor channel closed");
                            break;
                        }

                        // Also push initial snapshot to the new joiner
                        if let Ok(Ok(_participant)) = reply_rx.await {
                            let (snap_tx, snap_rx) = tokio::sync::oneshot::channel();
                            if room_tx
                                .send(RoomCommand::GetSnapshot {
                                    participant_id: sender_id,
                                    reply: snap_tx,
                                })
                                .await
                                .is_ok()
                            {
                                if let Ok(snap) = snap_rx.await {
                                    let snap_event = ServerEvent::RoomSnapshot { state: snap };
                                    if let Ok(json) = serde_json::to_string(&snap_event) {
                                        let mut tx = ws_tx.lock().await;
                                        let _ = tx.send(Message::Text(json)).await;
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => {
                        let err_event = ServerEvent::Error {
                            message: format!("Invalid command JSON: {}", e),
                        };
                        if let Ok(json) = serde_json::to_string(&err_event) {
                            let mut tx = ws_tx.lock().await;
                            let _ = tx.send(Message::Text(json)).await;
                        }
                    }
                }
            }
            Ok(Message::Close(_)) => break,
            Ok(Message::Ping(_)) => {
                let mut tx = ws_tx.lock().await;
                let _ = tx.send(Message::Pong(vec![])).await;
            }
            Err(e) => {
                debug!("WebSocket read error: {}", e);
                break;
            }
            _ => {}
        }
    }

    is_connected.store(false, Ordering::Relaxed);
    send_task.abort();

    // Notify room actor of disconnect
    let final_pid = participant_id.lock().await.clone();
    if let Some(pid) = final_pid {
        let _ = room_tx
            .send(RoomCommand::Disconnect {
                participant_id: pid,
            })
            .await;
    }
}
