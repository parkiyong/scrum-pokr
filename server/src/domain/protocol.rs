use crate::domain::models::{ConsensusSummary, Role, Story};
use crate::domain::reveal_gate::RoomSnapshotData;
use crate::domain::tracker::{ConnectionPreview, StorySlice, TrackerConfig, TrackerQuery};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum ClientCommand {
    JoinRoom {
        participant_id: String,
        nickname: String,
        avatar: String,
        #[serde(default)]
        role: Option<Role>,
    },
    SelectStory {
        story: Option<Story>,
    },
    SelectStoryById {
        story_id: String,
    },
    ConnectTracker {
        config: TrackerConfig,
    },
    DisconnectTracker,
    TestTrackerConnection {
        config: TrackerConfig,
    },
    FetchBacklog {
        #[serde(default)]
        query: TrackerQuery,
    },
    ImportBacklog {
        stories: Vec<Story>,
    },
    ImportMarkdown {
        raw_markdown: String,
    },
    SyncEstimateToTracker {
        story_id: String,
        points: u32,
        #[serde(default)]
        post_comment: bool,
    },
    PushStorySlices {
        parent_id: String,
        slices: Vec<StorySlice>,
    },
    ReorderBacklog {
        story_ids: Vec<String>,
    },
    RemoveStoryFromBacklog {
        story_id: String,
    },
    StartVoting,
    CastVote {
        value: String,
    },
    RetractVote,
    RevealCards,
    TriggerReVote,
    FinalizeStory {
        points: Option<String>,
    },
    UpdateRole {
        target_id: String,
        new_role: Role,
    },
    TransferFacilitator {
        target_id: String,
    },
    Ping,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(clippy::large_enum_variant)]
#[serde(tag = "type", content = "payload")]
pub enum ServerEvent {
    RoomSnapshot {
        state: RoomSnapshotData,
    },
    ParticipantJoined {
        participant_id: String,
        nickname: String,
        avatar: String,
        role: Role,
    },
    ParticipantLeft {
        participant_id: String,
    },
    VoteCast {
        participant_id: String,
    },
    VoteRetracted {
        participant_id: String,
    },
    CardsRevealed {
        votes: HashMap<String, String>,
        distribution: Option<ConsensusSummary>,
    },
    RoundReset {
        round_number: u32,
    },
    StoryFinalized {
        story_id: Option<String>,
        points: String,
    },
    TrackerConnected {
        provider: String,
    },
    TrackerDisconnected,
    TrackerConnectionTested {
        preview: ConnectionPreview,
    },
    BacklogUpdated {
        backlog: Vec<Story>,
    },
    EstimateSynced {
        story_id: String,
        external_id: String,
        points: u32,
        success: bool,
        message: Option<String>,
    },
    SlicesPushed {
        parent_id: String,
        created_stories: Vec<Story>,
    },
    TrackerError {
        message: String,
    },
    RoleUpdated {
        participant_id: String,
        role: Role,
    },
    FacilitatorChanged {
        facilitator_id: String,
    },
    Error {
        message: String,
    },
    Pong,
}
