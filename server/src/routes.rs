use crate::actor::registry::RoomRegistry;
use crate::actor::room_actor::RoomCommand;
use crate::domain::models::{Participant, PointReference, Role, Story};
use crate::domain::protocol::ClientCommand;
use crate::domain::reveal_gate::RoomSnapshotData;
use crate::domain::slug::validate_slug;
use crate::domain::tracker::{StorySlice, TrackerConfig, TrackerQuery};
use crate::sse::handler::sse_room_handler;
use axum::extract::{Path, Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::routing::{delete, get, patch, post, put};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
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

#[derive(Deserialize)]
pub struct RoomStateQuery {
    pub participant_id: Option<String>,
}

#[derive(Deserialize)]
pub struct JoinParticipantRequest {
    pub participant_id: String,
    #[serde(default)]
    pub nickname: String,
    #[serde(default)]
    pub avatar: String,
    #[serde(default)]
    pub role: Option<Role>,
}

#[derive(Deserialize)]
pub struct UpdateRoleRequest {
    pub role: Role,
}

#[derive(Deserialize)]
pub struct TransferFacilitatorRequest {
    pub target_id: String,
}

#[derive(Deserialize)]
pub struct CastVoteRequest {
    pub value: String,
}

#[derive(Deserialize)]
pub struct FinalizeStoryRequest {
    #[serde(default)]
    pub points: Option<String>,
}

#[derive(Deserialize)]
pub struct SelectStoryRequest {
    #[serde(default)]
    pub story_id: Option<String>,
    #[serde(default)]
    pub story: Option<Story>,
}

#[derive(Deserialize)]
pub struct UpdatePointReferencesRequest {
    pub references: Vec<PointReference>,
}

#[derive(Deserialize)]
pub struct ToggleEdgeCaseRequest {
    pub checked: bool,
}

#[derive(Deserialize)]
pub struct ImportBacklogRequest {
    pub stories: Vec<Story>,
}

#[derive(Deserialize)]
pub struct ImportMarkdownRequest {
    pub raw_markdown: String,
}

#[derive(Deserialize)]
pub struct ReorderBacklogRequest {
    pub story_ids: Vec<String>,
}

#[derive(Deserialize)]
pub struct ConnectTrackerRequest {
    pub config: TrackerConfig,
}

#[derive(Deserialize)]
pub struct FetchBacklogRequest {
    #[serde(default)]
    pub query: Option<TrackerQuery>,
}

#[derive(Deserialize)]
pub struct SyncEstimateRequest {
    pub story_id: String,
    pub points: u32,
    #[serde(default)]
    pub post_comment: Option<bool>,
}

#[derive(Deserialize)]
pub struct PushSlicesRequest {
    pub parent_id: String,
    pub slices: Vec<StorySlice>,
}

#[derive(Serialize)]
pub struct GenericActionResponse {
    pub success: bool,
}

fn get_participant_id(headers: &HeaderMap) -> String {
    headers
        .get("x-participant-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "anonymous".to_string())
}

async fn dispatch_command(
    registry: &RoomRegistry,
    slug: &str,
    participant_id: String,
    command: ClientCommand,
) -> Result<Participant, StatusCode> {
    let handle = registry.get_or_create(slug).await;
    let (tx, rx) = tokio::sync::oneshot::channel();
    if handle
        .tx
        .send(RoomCommand::ClientMsg {
            participant_id,
            command,
            reply: Some(tx),
        })
        .await
        .is_err()
    {
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }
    match rx.await {
        Ok(Ok(p)) => Ok(p),
        Ok(Err(_)) => Err(StatusCode::BAD_REQUEST),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
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

pub async fn get_room_state(
    Path(slug): Path<String>,
    Query(params): Query<RoomStateQuery>,
    State(registry): State<RoomRegistry>,
) -> Result<Json<RoomSnapshotData>, StatusCode> {
    let handle = registry.get_or_create(&slug).await;
    let (tx, rx) = tokio::sync::oneshot::channel();
    let pid = params
        .participant_id
        .unwrap_or_else(|| "anonymous".to_string());
    if handle
        .tx
        .send(RoomCommand::GetSnapshot {
            participant_id: pid,
            reply: tx,
        })
        .await
        .is_err()
    {
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }
    match rx.await {
        Ok(snapshot) => Ok(Json(snapshot)),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

pub async fn join_participant(
    Path(slug): Path<String>,
    State(registry): State<RoomRegistry>,
    Json(req): Json<JoinParticipantRequest>,
) -> Result<Json<Participant>, StatusCode> {
    let pid = req.participant_id.clone();
    let cmd = ClientCommand::JoinRoom {
        participant_id: req.participant_id,
        nickname: req.nickname,
        avatar: req.avatar,
        role: req.role,
    };
    let participant = dispatch_command(&registry, &slug, pid, cmd).await?;
    Ok(Json(participant))
}

pub async fn update_participant_role(
    Path((slug, target_id)): Path<(String, String)>,
    headers: HeaderMap,
    State(registry): State<RoomRegistry>,
    Json(req): Json<UpdateRoleRequest>,
) -> Result<Json<Participant>, StatusCode> {
    let sender_id = get_participant_id(&headers);
    let cmd = ClientCommand::UpdateRole {
        target_id,
        new_role: req.role,
    };
    let participant = dispatch_command(&registry, &slug, sender_id, cmd).await?;
    Ok(Json(participant))
}

pub async fn transfer_facilitator(
    Path(slug): Path<String>,
    headers: HeaderMap,
    State(registry): State<RoomRegistry>,
    Json(req): Json<TransferFacilitatorRequest>,
) -> Result<Json<Participant>, StatusCode> {
    let sender_id = get_participant_id(&headers);
    let cmd = ClientCommand::TransferFacilitator {
        target_id: req.target_id,
    };
    let participant = dispatch_command(&registry, &slug, sender_id, cmd).await?;
    Ok(Json(participant))
}

pub async fn start_voting(
    Path(slug): Path<String>,
    headers: HeaderMap,
    State(registry): State<RoomRegistry>,
) -> Result<Json<GenericActionResponse>, StatusCode> {
    let sender_id = get_participant_id(&headers);
    dispatch_command(&registry, &slug, sender_id, ClientCommand::StartVoting).await?;
    Ok(Json(GenericActionResponse { success: true }))
}

pub async fn cast_vote(
    Path(slug): Path<String>,
    headers: HeaderMap,
    State(registry): State<RoomRegistry>,
    Json(req): Json<CastVoteRequest>,
) -> Result<Json<Participant>, StatusCode> {
    let sender_id = get_participant_id(&headers);
    let cmd = ClientCommand::CastVote { value: req.value };
    let participant = dispatch_command(&registry, &slug, sender_id, cmd).await?;
    Ok(Json(participant))
}

pub async fn retract_vote(
    Path(slug): Path<String>,
    headers: HeaderMap,
    State(registry): State<RoomRegistry>,
) -> Result<Json<Participant>, StatusCode> {
    let sender_id = get_participant_id(&headers);
    let participant =
        dispatch_command(&registry, &slug, sender_id, ClientCommand::RetractVote).await?;
    Ok(Json(participant))
}

pub async fn reveal_cards(
    Path(slug): Path<String>,
    headers: HeaderMap,
    State(registry): State<RoomRegistry>,
) -> Result<Json<GenericActionResponse>, StatusCode> {
    let sender_id = get_participant_id(&headers);
    dispatch_command(&registry, &slug, sender_id, ClientCommand::RevealCards).await?;
    Ok(Json(GenericActionResponse { success: true }))
}

pub async fn trigger_revote(
    Path(slug): Path<String>,
    headers: HeaderMap,
    State(registry): State<RoomRegistry>,
) -> Result<Json<GenericActionResponse>, StatusCode> {
    let sender_id = get_participant_id(&headers);
    dispatch_command(&registry, &slug, sender_id, ClientCommand::TriggerReVote).await?;
    Ok(Json(GenericActionResponse { success: true }))
}

pub async fn finalize_story(
    Path(slug): Path<String>,
    headers: HeaderMap,
    State(registry): State<RoomRegistry>,
    Json(req): Json<FinalizeStoryRequest>,
) -> Result<Json<GenericActionResponse>, StatusCode> {
    let sender_id = get_participant_id(&headers);
    dispatch_command(
        &registry,
        &slug,
        sender_id,
        ClientCommand::FinalizeStory { points: req.points },
    )
    .await?;
    Ok(Json(GenericActionResponse { success: true }))
}

pub async fn set_active_story(
    Path(slug): Path<String>,
    headers: HeaderMap,
    State(registry): State<RoomRegistry>,
    Json(req): Json<SelectStoryRequest>,
) -> Result<Json<GenericActionResponse>, StatusCode> {
    let sender_id = get_participant_id(&headers);
    if let Some(story_id) = req.story_id {
        dispatch_command(
            &registry,
            &slug,
            sender_id,
            ClientCommand::SelectStoryById { story_id },
        )
        .await?;
    } else {
        dispatch_command(
            &registry,
            &slug,
            sender_id,
            ClientCommand::SelectStory { story: req.story },
        )
        .await?;
    }
    Ok(Json(GenericActionResponse { success: true }))
}

pub async fn update_point_references(
    Path(slug): Path<String>,
    headers: HeaderMap,
    State(registry): State<RoomRegistry>,
    Json(req): Json<UpdatePointReferencesRequest>,
) -> Result<Json<GenericActionResponse>, StatusCode> {
    let sender_id = get_participant_id(&headers);
    dispatch_command(
        &registry,
        &slug,
        sender_id,
        ClientCommand::UpdatePointReferences {
            references: req.references,
        },
    )
    .await?;
    Ok(Json(GenericActionResponse { success: true }))
}

pub async fn toggle_edge_case(
    Path((slug, edge_case_id)): Path<(String, String)>,
    headers: HeaderMap,
    State(registry): State<RoomRegistry>,
    Json(req): Json<ToggleEdgeCaseRequest>,
) -> Result<Json<GenericActionResponse>, StatusCode> {
    let sender_id = get_participant_id(&headers);
    dispatch_command(
        &registry,
        &slug,
        sender_id,
        ClientCommand::ToggleEdgeCaseCheck {
            edge_case_id,
            checked: req.checked,
        },
    )
    .await?;
    Ok(Json(GenericActionResponse { success: true }))
}

pub async fn import_backlog(
    Path(slug): Path<String>,
    headers: HeaderMap,
    State(registry): State<RoomRegistry>,
    Json(req): Json<ImportBacklogRequest>,
) -> Result<Json<GenericActionResponse>, StatusCode> {
    let sender_id = get_participant_id(&headers);
    dispatch_command(
        &registry,
        &slug,
        sender_id,
        ClientCommand::ImportBacklog {
            stories: req.stories,
        },
    )
    .await?;
    Ok(Json(GenericActionResponse { success: true }))
}

pub async fn import_markdown(
    Path(slug): Path<String>,
    headers: HeaderMap,
    State(registry): State<RoomRegistry>,
    Json(req): Json<ImportMarkdownRequest>,
) -> Result<Json<GenericActionResponse>, StatusCode> {
    let sender_id = get_participant_id(&headers);
    dispatch_command(
        &registry,
        &slug,
        sender_id,
        ClientCommand::ImportMarkdown {
            raw_markdown: req.raw_markdown,
        },
    )
    .await?;
    Ok(Json(GenericActionResponse { success: true }))
}

pub async fn reorder_backlog(
    Path(slug): Path<String>,
    headers: HeaderMap,
    State(registry): State<RoomRegistry>,
    Json(req): Json<ReorderBacklogRequest>,
) -> Result<Json<GenericActionResponse>, StatusCode> {
    let sender_id = get_participant_id(&headers);
    dispatch_command(
        &registry,
        &slug,
        sender_id,
        ClientCommand::ReorderBacklog {
            story_ids: req.story_ids,
        },
    )
    .await?;
    Ok(Json(GenericActionResponse { success: true }))
}

pub async fn remove_story_from_backlog(
    Path((slug, story_id)): Path<(String, String)>,
    headers: HeaderMap,
    State(registry): State<RoomRegistry>,
) -> Result<Json<GenericActionResponse>, StatusCode> {
    let sender_id = get_participant_id(&headers);
    dispatch_command(
        &registry,
        &slug,
        sender_id,
        ClientCommand::RemoveStoryFromBacklog { story_id },
    )
    .await?;
    Ok(Json(GenericActionResponse { success: true }))
}

pub async fn connect_tracker(
    Path(slug): Path<String>,
    headers: HeaderMap,
    State(registry): State<RoomRegistry>,
    Json(req): Json<ConnectTrackerRequest>,
) -> Result<Json<GenericActionResponse>, StatusCode> {
    let sender_id = get_participant_id(&headers);
    dispatch_command(
        &registry,
        &slug,
        sender_id,
        ClientCommand::ConnectTracker { config: req.config },
    )
    .await?;
    Ok(Json(GenericActionResponse { success: true }))
}

pub async fn disconnect_tracker(
    Path(slug): Path<String>,
    headers: HeaderMap,
    State(registry): State<RoomRegistry>,
) -> Result<Json<GenericActionResponse>, StatusCode> {
    let sender_id = get_participant_id(&headers);
    dispatch_command(
        &registry,
        &slug,
        sender_id,
        ClientCommand::DisconnectTracker,
    )
    .await?;
    Ok(Json(GenericActionResponse { success: true }))
}

pub async fn test_tracker(
    Path(slug): Path<String>,
    headers: HeaderMap,
    State(registry): State<RoomRegistry>,
    Json(req): Json<ConnectTrackerRequest>,
) -> Result<Json<GenericActionResponse>, StatusCode> {
    let sender_id = get_participant_id(&headers);
    dispatch_command(
        &registry,
        &slug,
        sender_id,
        ClientCommand::TestTrackerConnection { config: req.config },
    )
    .await?;
    Ok(Json(GenericActionResponse { success: true }))
}

pub async fn fetch_backlog(
    Path(slug): Path<String>,
    headers: HeaderMap,
    State(registry): State<RoomRegistry>,
    Json(req): Json<FetchBacklogRequest>,
) -> Result<Json<GenericActionResponse>, StatusCode> {
    let sender_id = get_participant_id(&headers);
    dispatch_command(
        &registry,
        &slug,
        sender_id,
        ClientCommand::FetchBacklog {
            query: req.query.unwrap_or_default(),
        },
    )
    .await?;
    Ok(Json(GenericActionResponse { success: true }))
}

pub async fn sync_estimate(
    Path(slug): Path<String>,
    headers: HeaderMap,
    State(registry): State<RoomRegistry>,
    Json(req): Json<SyncEstimateRequest>,
) -> Result<Json<GenericActionResponse>, StatusCode> {
    let sender_id = get_participant_id(&headers);
    dispatch_command(
        &registry,
        &slug,
        sender_id,
        ClientCommand::SyncEstimateToTracker {
            story_id: req.story_id,
            points: req.points,
            post_comment: req.post_comment.unwrap_or(true),
        },
    )
    .await?;
    Ok(Json(GenericActionResponse { success: true }))
}

pub async fn push_story_slices(
    Path(slug): Path<String>,
    headers: HeaderMap,
    State(registry): State<RoomRegistry>,
    Json(req): Json<PushSlicesRequest>,
) -> Result<Json<GenericActionResponse>, StatusCode> {
    let sender_id = get_participant_id(&headers);
    dispatch_command(
        &registry,
        &slug,
        sender_id,
        ClientCommand::PushStorySlices {
            parent_id: req.parent_id,
            slices: req.slices,
        },
    )
    .await?;
    Ok(Json(GenericActionResponse { success: true }))
}

pub async fn leave_room(
    Path(slug): Path<String>,
    headers: HeaderMap,
    State(registry): State<RoomRegistry>,
) -> Result<Json<GenericActionResponse>, StatusCode> {
    let sender_id = get_participant_id(&headers);
    let handle = registry.get_or_create(&slug).await;
    if handle
        .tx
        .send(RoomCommand::Disconnect {
            participant_id: sender_id,
        })
        .await
        .is_err()
    {
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }
    Ok(Json(GenericActionResponse { success: true }))
}

pub fn create_router(registry: RoomRegistry) -> Router {
    let mut router = Router::new()
        .route("/api/health", get(health_check))
        .route("/api/rooms", post(create_room))
        .route("/api/rooms/:slug/validate", get(validate_room))
        .route("/api/rooms/:slug/state", get(get_room_state))
        .route("/api/rooms/:slug/events", get(sse_room_handler))
        .route("/api/rooms/:slug/participants", post(join_participant))
        .route(
            "/api/rooms/:slug/participants/:id/role",
            patch(update_participant_role),
        )
        .route("/api/rooms/:slug/facilitator", post(transfer_facilitator))
        .route("/api/rooms/:slug/leave", post(leave_room))
        .route("/api/rooms/:slug/voting/start", post(start_voting))
        .route("/api/rooms/:slug/voting/vote", post(cast_vote))
        .route("/api/rooms/:slug/voting/retract", post(retract_vote))
        .route("/api/rooms/:slug/voting/reveal", post(reveal_cards))
        .route("/api/rooms/:slug/voting/revote", post(trigger_revote))
        .route("/api/rooms/:slug/voting/finalize", post(finalize_story))
        .route("/api/rooms/:slug/active-story", post(set_active_story))
        .route(
            "/api/rooms/:slug/point-references",
            put(update_point_references),
        )
        .route(
            "/api/rooms/:slug/edge-cases/:id",
            patch(toggle_edge_case),
        )
        .route("/api/rooms/:slug/backlog/import", post(import_backlog))
        .route("/api/rooms/:slug/backlog/markdown", post(import_markdown))
        .route("/api/rooms/:slug/backlog/order", put(reorder_backlog))
        .route(
            "/api/rooms/:slug/backlog/:id",
            delete(remove_story_from_backlog),
        )
        .route("/api/rooms/:slug/tracker/connect", post(connect_tracker))
        .route(
            "/api/rooms/:slug/tracker/disconnect",
            post(disconnect_tracker),
        )
        .route("/api/rooms/:slug/tracker/test", post(test_tracker))
        .route("/api/rooms/:slug/tracker/fetch", post(fetch_backlog))
        .route("/api/rooms/:slug/tracker/sync", post(sync_estimate))
        .route("/api/rooms/:slug/tracker/slices", post(push_story_slices))
        .with_state(registry);

    let client_dist = PathBuf::from("client/dist");
    if client_dist.exists() {
        let serve_dir =
            ServeDir::new(&client_dist).fallback(ServeFile::new(client_dist.join("index.html")));
        router = router.fallback_service(serve_dir);
    }

    router
}
