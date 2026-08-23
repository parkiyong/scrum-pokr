use crate::actor::registry::RoomRegistry;
use crate::domain::slug::validate_slug;
use crate::ws::handler::ws_room_handler;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::Serialize;
use std::path::PathBuf;
use tower_http::services::{ServeDir, ServeFile};

#[derive(Serialize)]
pub struct CreateRoomResponse {
    pub slug: String,
    pub short_code: String,
}

#[derive(Serialize)]
pub struct ValidateRoomResponse {
    pub valid: bool,
    pub slug: String,
    pub short_code: String,
}

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub service: &'static str,
}

pub async fn create_room(State(registry): State<RoomRegistry>) -> Json<CreateRoomResponse> {
    let handle = registry.create_room().await;
    Json(CreateRoomResponse {
        slug: handle.slug,
        short_code: handle.short_code,
    })
}

pub async fn validate_room(
    Path(slug_or_code): Path<String>,
    State(registry): State<RoomRegistry>,
) -> Result<Json<ValidateRoomResponse>, StatusCode> {
    if let Some(handle) = registry.find(&slug_or_code).await {
        Ok(Json(ValidateRoomResponse {
            valid: true,
            slug: handle.slug,
            short_code: handle.short_code,
        }))
    } else if validate_slug(&slug_or_code) {
        let handle = registry.get_or_create(&slug_or_code).await;
        Ok(Json(ValidateRoomResponse {
            valid: true,
            slug: handle.slug,
            short_code: handle.short_code,
        }))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

pub async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        service: "scrum-pokr-ai-server",
    })
}

pub fn create_router(registry: RoomRegistry) -> Router {
    let mut router = Router::new()
        .route("/api/health", get(health_check))
        .route("/api/rooms", post(create_room))
        .route("/api/rooms/:slug/validate", get(validate_room))
        .route("/ws/rooms/:slug", get(ws_room_handler))
        .with_state(registry);

    let client_dist = PathBuf::from("client/dist");
    if client_dist.exists() {
        let serve_dir =
            ServeDir::new(&client_dist).fallback(ServeFile::new(client_dist.join("index.html")));
        router = router.fallback_service(serve_dir);
    }

    router
}
