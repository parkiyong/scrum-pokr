use server::domain::models::{EstimationPhase, Participant, Role, RoomState, Story};
use server::domain::reveal_gate::{project_room_state, RoomStateProjection};
use std::collections::HashMap;

#[test]
fn test_reveal_gate_masks_votes_during_voting_phase() {
    let mut participants = HashMap::new();
    participants.insert(
        "p1".to_string(),
        Participant {
            id: "p1".to_string(),
            nickname: "Alex".to_string(),
            avatar: "indigo".to_string(),
            role: Role::Estimator,
            connected: true,
            voted: true,
            vote: Some("5".to_string()),
        },
    );
    participants.insert(
        "p2".to_string(),
        Participant {
            id: "p2".to_string(),
            nickname: "Sarah".to_string(),
            avatar: "emerald".to_string(),
            role: Role::Estimator,
            connected: true,
            voted: true,
            vote: Some("13".to_string()),
        },
    );
    participants.insert(
        "p3".to_string(),
        Participant {
            id: "p3".to_string(),
            nickname: "Marcus".to_string(),
            avatar: "slate".to_string(),
            role: Role::Observer,
            connected: true,
            voted: false,
            vote: None,
        },
    );

    let mut room_state = RoomState::new("swift-badger-42".to_string(), "SWB-42".to_string());
    room_state.phase = EstimationPhase::Voting;
    room_state.round_number = 1;
    room_state.active_story = Some(Story::new(
        "story-1",
        "Zero-Auth Reconnection",
        "Test description",
        vec!["AC 1".to_string()],
    ));
    room_state.participants = participants;
    room_state.facilitator_id = "p1".to_string();

    let projection_for_p1 = project_room_state(&room_state, Some("p1"));
    match projection_for_p1 {
        RoomStateProjection::Voting(v) => {
            assert_eq!(v.phase, EstimationPhase::Voting);
            let p1_proj = v.participants.iter().find(|p| p.id == "p1").unwrap();
            assert!(p1_proj.voted);
            assert_eq!(p1_proj.vote, Some("5".to_string())); // Self vote visible

            let p2_proj = v.participants.iter().find(|p| p.id == "p2").unwrap();
            assert!(p2_proj.voted);
            assert_eq!(p2_proj.vote, None); // Peer vote is masked!

            let p3_proj = v.participants.iter().find(|p| p.id == "p3").unwrap();
            assert!(!p3_proj.voted);
            assert_eq!(p3_proj.vote, None);
        }
        _ => panic!("Expected Voting projection during Voting phase"),
    }
}

#[test]
fn test_reveal_gate_exposes_all_votes_during_revealed_phase() {
    let mut participants = HashMap::new();
    participants.insert(
        "p1".to_string(),
        Participant {
            id: "p1".to_string(),
            nickname: "Alex".to_string(),
            avatar: "indigo".to_string(),
            role: Role::Estimator,
            connected: true,
            voted: true,
            vote: Some("5".to_string()),
        },
    );
    participants.insert(
        "p2".to_string(),
        Participant {
            id: "p2".to_string(),
            nickname: "Sarah".to_string(),
            avatar: "emerald".to_string(),
            role: Role::Estimator,
            connected: true,
            voted: true,
            vote: Some("5".to_string()),
        },
    );

    let mut room_state = RoomState::new("swift-badger-42".to_string(), "SWB-42".to_string());
    room_state.phase = EstimationPhase::Revealed;
    room_state.round_number = 1;
    room_state.active_story = None;
    room_state.participants = participants;
    room_state.facilitator_id = "p1".to_string();

    let projection = project_room_state(&room_state, Some("p1"));
    match projection {
        RoomStateProjection::Revealed(r) => {
            assert_eq!(r.phase, EstimationPhase::Revealed);
            let p1_proj = r.participants.iter().find(|p| p.id == "p1").unwrap();
            assert_eq!(p1_proj.vote, Some("5".to_string()));
            let p2_proj = r.participants.iter().find(|p| p.id == "p2").unwrap();
            assert_eq!(p2_proj.vote, Some("5".to_string()));
            assert!(r.consensus.is_some());
        }
        _ => panic!("Expected Revealed projection during Revealed phase"),
    }
}

#[test]
fn test_reveal_gate_masks_active_story_points_until_revealed() {
    let mut story = Story::new(
        "story-10",
        "Legacy Feature",
        "Description",
        vec!["AC".to_string()],
    );
    story.points = Some("8".to_string()); // Story already has points in backlog

    let mut room_state = RoomState::new("swift-badger-42".to_string(), "SWB-42".to_string());
    room_state.active_story = Some(story);

    // 1. StoryDoctorReview phase -> points MUST be redacted
    room_state.phase = EstimationPhase::StoryDoctorReview;
    let proj_review = project_room_state(&room_state, None);
    assert_eq!(
        proj_review.inner().active_story.as_ref().unwrap().points,
        None
    );

    // 2. Voting phase -> points MUST be redacted
    room_state.phase = EstimationPhase::Voting;
    let proj_voting = project_room_state(&room_state, None);
    assert_eq!(
        proj_voting.inner().active_story.as_ref().unwrap().points,
        None
    );

    // 3. Revealed phase -> points CAN be shown
    room_state.phase = EstimationPhase::Revealed;
    let proj_revealed = project_room_state(&room_state, None);
    assert_eq!(
        proj_revealed.inner().active_story.as_ref().unwrap().points,
        Some("8".to_string())
    );
}
