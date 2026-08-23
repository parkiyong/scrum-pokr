use crate::domain::models::{ConsensusSummary, EstimationPhase, Role, RoomState, Story};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ParticipantProjection {
    pub id: String,
    pub nickname: String,
    pub avatar: String,
    pub role: Role,
    pub connected: bool,
    pub voted: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vote: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoomSnapshotData {
    pub slug: String,
    pub short_code: String,
    pub phase: EstimationPhase,
    pub round_number: u32,
    pub active_story: Option<Story>,
    pub backlog: Vec<Story>,
    pub active_tracker_provider: Option<String>,
    pub tracker_connected: bool,
    pub participants: Vec<ParticipantProjection>,
    pub facilitator_id: String,
    pub consensus: Option<ConsensusSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum RoomStateProjection {
    Idle(RoomSnapshotData),
    StoryDoctorReview(RoomSnapshotData),
    Voting(RoomSnapshotData),
    Revealed(RoomSnapshotData),
    Discussing(RoomSnapshotData),
    Slicing(RoomSnapshotData),
    Finalized(RoomSnapshotData),
}

impl RoomStateProjection {
    pub fn inner(&self) -> &RoomSnapshotData {
        match self {
            RoomStateProjection::Idle(d)
            | RoomStateProjection::StoryDoctorReview(d)
            | RoomStateProjection::Voting(d)
            | RoomStateProjection::Revealed(d)
            | RoomStateProjection::Discussing(d)
            | RoomStateProjection::Slicing(d)
            | RoomStateProjection::Finalized(d) => d,
        }
    }
}

pub fn project_room_state(state: &RoomState, viewer_id: Option<&str>) -> RoomStateProjection {
    let consensus = match state.phase {
        EstimationPhase::Revealed
        | EstimationPhase::Discussing
        | EstimationPhase::Slicing
        | EstimationPhase::Finalized => state.compute_consensus(),
        _ => None,
    };

    let mut participants: Vec<ParticipantProjection> = state
        .participants
        .values()
        .map(|p| {
            let is_viewer = viewer_id.map(|vid| vid == p.id).unwrap_or(false);
            let show_vote = match state.phase {
                EstimationPhase::Revealed
                | EstimationPhase::Discussing
                | EstimationPhase::Slicing
                | EstimationPhase::Finalized => true,
                _ => is_viewer,
            };

            ParticipantProjection {
                id: p.id.clone(),
                nickname: p.nickname.clone(),
                avatar: p.avatar.clone(),
                role: p.role,
                connected: p.connected,
                voted: p.voted,
                vote: if show_vote { p.vote.clone() } else { None },
            }
        })
        .collect();

    participants.sort_by_key(|a| a.nickname.to_lowercase());

    let tracker_connected = state.active_tracker_provider.is_some();

    let data = RoomSnapshotData {
        slug: state.slug.clone(),
        short_code: state.short_code.clone(),
        phase: state.phase,
        round_number: state.round_number,
        active_story: state.active_story.clone(),
        backlog: state.backlog.clone(),
        active_tracker_provider: state.active_tracker_provider.clone(),
        tracker_connected,
        participants,
        facilitator_id: state.facilitator_id.clone(),
        consensus,
    };

    match state.phase {
        EstimationPhase::Idle => RoomStateProjection::Idle(data),
        EstimationPhase::StoryDoctorReview => RoomStateProjection::StoryDoctorReview(data),
        EstimationPhase::Voting => RoomStateProjection::Voting(data),
        EstimationPhase::Revealed => RoomStateProjection::Revealed(data),
        EstimationPhase::Discussing => RoomStateProjection::Discussing(data),
        EstimationPhase::Slicing => RoomStateProjection::Slicing(data),
        EstimationPhase::Finalized => RoomStateProjection::Finalized(data),
    }
}
