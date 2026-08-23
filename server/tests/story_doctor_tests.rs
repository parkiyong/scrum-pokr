use server::actor::room_actor::{RoomActor, RoomCommand};
use server::domain::models::{EstimationPhase, PointReference, Story};
use server::domain::protocol::ClientCommand;
use server::domain::story_doctor::{
    generate_story_doctor_prompt, generate_story_doctor_report, EdgeCaseCategoryType,
    InvestCriterion,
};
use tokio::sync::mpsc;

#[test]
fn test_invest_scorecard_calculation_perfect_story() {
    let story = Story::new(
        "s-1",
        "Export story estimates to CSV and markdown clipboard",
        "As a facilitator, I want to export finalized estimation results to CSV or clipboard so that our team can paste them into sprint planning notes.",
        vec![
            "Clicking 'Copy Markdown' copies a formatted table to clipboard".to_string(),
            "Clicking 'Export CSV' downloads a sanitized RFC-4180 CSV file".to_string(),
            "Formulas starting with =, +, -, @ are prepended with single quotes".to_string(),
        ],
    );

    let report = generate_story_doctor_report(&story);
    assert_eq!(report.story_id, "s-1");
    assert_eq!(report.scorecard.overall_score, 100);
    assert!(report.scorecard.issues.is_empty());
    assert_eq!(report.scorecard.criteria.len(), 6);

    // All criteria should pass
    for criterion in &report.scorecard.criteria {
        assert!(
            criterion.passed,
            "Criterion {:?} should pass",
            criterion.criterion
        );
    }
}

#[test]
fn test_invest_scorecard_calculation_flawed_story() {
    let story = Story::new(
        "s-2",
        "Build everything fast",
        "Blocked by auth team. We need to build the search engine, payment gateway, user profiles etc. Make it fast and simple, TBD details later.",
        vec![], // Missing acceptance criteria
    );

    let report = generate_story_doctor_report(&story);
    assert!(
        report.scorecard.overall_score < 50,
        "Score should be < 50% for severely flawed story, got {}",
        report.scorecard.overall_score
    );

    // Verify specific failing criteria
    let testable = report
        .scorecard
        .criteria
        .iter()
        .find(|c| c.criterion == InvestCriterion::Testable)
        .unwrap();
    assert!(!testable.passed);

    let independent = report
        .scorecard
        .criteria
        .iter()
        .find(|c| c.criterion == InvestCriterion::Independent)
        .unwrap();
    assert!(!independent.passed);

    let estimable = report
        .scorecard
        .criteria
        .iter()
        .find(|c| c.criterion == InvestCriterion::Estimable)
        .unwrap();
    assert!(!estimable.passed);

    let small = report
        .scorecard
        .criteria
        .iter()
        .find(|c| c.criterion == InvestCriterion::Small)
        .unwrap();
    assert!(!small.passed);

    // Verify issues list contains clear feedback
    assert!(!report.scorecard.issues.is_empty());
    assert!(report
        .scorecard
        .issues
        .iter()
        .any(|i| i.to_lowercase().contains("acceptance criteria")));
}

#[test]
fn test_3_axis_complexity_summary_generation() {
    let story = Story::new(
        "s-3",
        "Zero-Downtime Session Migration to PostgreSQL",
        "Migrate active user sessions from in-memory cache to PostgreSQL with background database migration, WebSocket token validation, and Stripe webhook synchronization.",
        vec![
            "Postgres session table created with composite index".to_string(),
            "Webhook signature verified with secret".to_string(),
            "Zero downtime during rolling deployment".to_string(),
        ],
    );

    let report = generate_story_doctor_report(&story);

    assert!(!report.complexity.data_models.is_empty());
    assert!(!report.complexity.dependencies_apis.is_empty());
    assert!(!report.complexity.blast_radius.is_empty());

    // Should detect schema / db keywords
    let data_summary = report.complexity.data_models.to_lowercase();
    assert!(
        data_summary.contains("schema")
            || data_summary.contains("database")
            || data_summary.contains("table")
            || data_summary.contains("postgres")
            || data_summary.contains("persistence")
            || data_summary.contains("cache")
    );

    // Should detect external API / webhook keywords
    let api_summary = report.complexity.dependencies_apis.to_lowercase();
    assert!(
        api_summary.contains("webhook")
            || api_summary.contains("api")
            || api_summary.contains("websocket")
            || api_summary.contains("external")
            || api_summary.contains("stripe")
    );

    // Should detect blast radius / downtime keywords
    let blast_summary = report.complexity.blast_radius.to_lowercase();
    assert!(
        blast_summary.contains("downtime")
            || blast_summary.contains("deployment")
            || blast_summary.contains("concurrency")
            || blast_summary.contains("user")
            || blast_summary.contains("session")
    );
}

#[test]
fn test_4_category_edge_case_generation() {
    let story = Story::new(
        "s-4",
        "Real-time Card Flip and Multi-User Estimation",
        "Allow team estimators to cast votes and flip cards simultaneously in real-time.",
        vec!["Estimators cast votes privately".to_string()],
    );

    let report = generate_story_doctor_report(&story);
    assert_eq!(report.edge_cases.len(), 4);

    let categories: Vec<EdgeCaseCategoryType> =
        report.edge_cases.iter().map(|ec| ec.category).collect();
    assert!(categories.contains(&EdgeCaseCategoryType::ErrorFailure));
    assert!(categories.contains(&EdgeCaseCategoryType::EmptyBoundary));
    assert!(categories.contains(&EdgeCaseCategoryType::ConcurrencyRaces));
    assert!(categories.contains(&EdgeCaseCategoryType::PermissionsAccess));

    for ec in &report.edge_cases {
        assert!(!ec.title.is_empty());
        assert!(!ec.description.is_empty());
        assert!(!ec.checked);
    }
}

#[test]
fn test_story_doctor_prompt_generation() {
    let story = Story::new(
        "s-5",
        "Linear Sync Adapter",
        "Sync story point estimates to Linear GraphQL API.",
        vec!["Mutates estimate field".to_string()],
    );

    let prompt = generate_story_doctor_prompt(&story);
    assert!(prompt.contains("Linear Sync Adapter"));
    assert!(prompt.contains("Sync story point estimates to Linear GraphQL API."));
    assert!(prompt.contains("INVEST Quality Audit"));
    assert!(prompt.contains("3-Axis Technical Complexity"));
    assert!(prompt.contains("4-Category Edge Cases"));
}

#[test]
fn test_point_reference_library_defaults() {
    let defaults = PointReference::default_library();
    assert_eq!(defaults.len(), 6);

    let points: Vec<u32> = defaults.iter().map(|r| r.points).collect();
    assert_eq!(points, vec![1, 2, 3, 5, 8, 13]);

    let one_pt = defaults.iter().find(|r| r.points == 1).unwrap();
    assert!(one_pt.description.to_lowercase().contains("copy") || one_pt.description.to_lowercase().contains("styling"));

    let thirteen_pt = defaults.iter().find(|r| r.points == 13).unwrap();
    assert!(thirteen_pt.description.to_lowercase().contains("migration") || thirteen_pt.description.to_lowercase().contains("zero-downtime"));
}

#[tokio::test]
async fn test_room_actor_story_doctor_review_state_transitions() {
    let (tx, rx) = mpsc::channel(32);
    let (event_tx, _event_rx) = tokio::sync::broadcast::channel(32);
    let actor = RoomActor::new(
        "swift-badger-42".to_string(),
        "SWB-42".to_string(),
        event_tx,
    );
    tokio::spawn(actor.run(rx));

    // 1. Facilitator joins
    let (reply_tx, reply_rx) = tokio::sync::oneshot::channel();
    tx.send(RoomCommand::ClientMsg {
        participant_id: "fac-1".to_string(),
        command: ClientCommand::JoinRoom {
            participant_id: "fac-1".to_string(),
            nickname: "Alex".to_string(),
            avatar: "indigo".to_string(),
            role: None,
        },
        reply: Some(reply_tx),
    })
    .await
    .unwrap();
    let _ = reply_rx.await.unwrap();

    // 2. Select story -> state transitions to StoryDoctorReview
    let test_story = Story::new(
        "story-101",
        "Zero-Downtime Session Migration",
        "Migrate active sessions from cache to postgres so that users stay logged in.",
        vec!["Sessions persist".to_string()],
    );

    tx.send(RoomCommand::ClientMsg {
        participant_id: "fac-1".to_string(),
        command: ClientCommand::SelectStory {
            story: Some(test_story.clone()),
        },
        reply: None,
    })
    .await
    .unwrap();

    // Verify snapshot phase is StoryDoctorReview and has StoryDoctor report & Point References
    let (snap_tx, snap_rx) = tokio::sync::oneshot::channel();
    tx.send(RoomCommand::GetSnapshot {
        participant_id: "fac-1".to_string(),
        reply: snap_tx,
    })
    .await
    .unwrap();

    let snap = snap_rx.await.unwrap();
    assert_eq!(snap.phase, EstimationPhase::StoryDoctorReview);
    assert!(snap.active_story.is_some());
    assert!(snap.story_doctor_report.is_some());
    let report = snap.story_doctor_report.unwrap();
    assert_eq!(report.story_id, "story-101");
    assert_eq!(snap.point_references.len(), 6);

    // 3. Facilitator customizes Point Reference Library
    let mut custom_refs = snap.point_references.clone();
    custom_refs[0].description = "Quick copy update in landing page footer".to_string();

    tx.send(RoomCommand::ClientMsg {
        participant_id: "fac-1".to_string(),
        command: ClientCommand::UpdatePointReferences {
            references: custom_refs.clone(),
        },
        reply: None,
    })
    .await
    .unwrap();

    // Check snapshot reflects updated Point Reference
    let (snap_tx2, snap_rx2) = tokio::sync::oneshot::channel();
    tx.send(RoomCommand::GetSnapshot {
        participant_id: "fac-1".to_string(),
        reply: snap_tx2,
    })
    .await
    .unwrap();

    let snap2 = snap_rx2.await.unwrap();
    assert_eq!(
        snap2.point_references[0].description,
        "Quick copy update in landing page footer"
    );

    // 4. Facilitator clicks StartVoting -> transitions to Voting without blocking
    tx.send(RoomCommand::ClientMsg {
        participant_id: "fac-1".to_string(),
        command: ClientCommand::StartVoting,
        reply: None,
    })
    .await
    .unwrap();

    let (snap_tx3, snap_rx3) = tokio::sync::oneshot::channel();
    tx.send(RoomCommand::GetSnapshot {
        participant_id: "fac-1".to_string(),
        reply: snap_tx3,
    })
    .await
    .unwrap();

    let snap3 = snap_rx3.await.unwrap();
    assert_eq!(snap3.phase, EstimationPhase::Voting);
}
