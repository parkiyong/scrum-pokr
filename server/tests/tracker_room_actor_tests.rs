use server::actor::room_actor::{RoomActor, RoomCommand};
use server::domain::protocol::ClientCommand;
use server::domain::tracker::{ExternalStory, MockTrackerAdapter, StorySlice, TrackerQuery};
use std::sync::Arc;
use tokio::sync::mpsc;

#[tokio::test]
async fn test_facilitator_tracker_connect_and_backlog_flow() {
    let (tx, rx) = mpsc::channel(64);
    let (event_tx, _event_rx) = tokio::sync::broadcast::channel(64);

    let mock_adapter = Arc::new(MockTrackerAdapter::new());
    mock_adapter.add_story(ExternalStory {
        id: "lin-101".to_string(),
        key: "ENG-101".to_string(),
        title: "Auth Integration".to_string(),
        description: "Add GitHub & Linear OAuth\n\n### Acceptance Criteria\n- [ ] GitHub OAuth\n- [ ] Linear OAuth".to_string(),
        acceptance_criteria: vec!["GitHub OAuth".to_string(), "Linear OAuth".to_string()],
        url: Some("https://linear.app/team/ENG-101".to_string()),
        current_estimate: None,
        status: Some("In Progress".to_string()),
    });

    let actor = RoomActor::new(
        "swift-badger-42".to_string(),
        "SWB-42".to_string(),
        event_tx,
    )
    .with_tracker_adapter(Box::new((*mock_adapter).clone()));
    tokio::spawn(actor.run(rx));

    // 1. Facilitator joins
    let (join_tx, join_rx) = tokio::sync::oneshot::channel();
    tx.send(RoomCommand::ClientMsg {
        participant_id: "fac-1".to_string(),
        command: ClientCommand::JoinRoom {
            participant_id: "fac-1".to_string(),
            nickname: "Facilitator".to_string(),
            avatar: "indigo".to_string(),
            role: None,
        },
        reply: Some(join_tx),
    })
    .await
    .unwrap();
    let _ = join_rx.await.unwrap();

    // 2. Fetch Backlog from Tracker
    let (fetch_tx, fetch_rx) = tokio::sync::oneshot::channel();
    tx.send(RoomCommand::ClientMsg {
        participant_id: "fac-1".to_string(),
        command: ClientCommand::FetchBacklog {
            query: TrackerQuery::default(),
        },
        reply: Some(fetch_tx),
    })
    .await
    .unwrap();
    let _ = fetch_rx.await.unwrap();

    // 3. Query Snapshot to verify backlog is populated
    let (snap_tx, snap_rx) = tokio::sync::oneshot::channel();
    tx.send(RoomCommand::GetSnapshot {
        participant_id: "fac-1".to_string(),
        reply: snap_tx,
    })
    .await
    .unwrap();

    let snap = snap_rx.await.unwrap();
    assert_eq!(snap.active_tracker_provider, Some("Linear".to_string()));
    assert!(snap.tracker_connected);
    assert_eq!(snap.backlog.len(), 1);
    assert_eq!(snap.backlog[0].key, Some("ENG-101".to_string()));
    assert_eq!(snap.backlog[0].acceptance_criteria.len(), 2);

    // 4. Select story by ID / key for estimation
    let story_id = snap.backlog[0].id.clone();
    let (select_tx, select_rx) = tokio::sync::oneshot::channel();
    tx.send(RoomCommand::ClientMsg {
        participant_id: "fac-1".to_string(),
        command: ClientCommand::SelectStoryById {
            story_id: story_id.clone(),
        },
        reply: Some(select_tx),
    })
    .await
    .unwrap();
    let _ = select_rx.await.unwrap();

    // Verify active story is set
    let (snap_tx2, snap_rx2) = tokio::sync::oneshot::channel();
    tx.send(RoomCommand::GetSnapshot {
        participant_id: "fac-1".to_string(),
        reply: snap_tx2,
    })
    .await
    .unwrap();
    let snap2 = snap_rx2.await.unwrap();
    assert_eq!(
        snap2.active_story.as_ref().unwrap().key,
        Some("ENG-101".to_string())
    );

    // 5. Start voting, cast vote, reveal, finalize
    let (start_tx, start_rx) = tokio::sync::oneshot::channel();
    tx.send(RoomCommand::ClientMsg {
        participant_id: "fac-1".to_string(),
        command: ClientCommand::StartVoting,
        reply: Some(start_tx),
    })
    .await
    .unwrap();
    let _ = start_rx.await.unwrap();

    let (vote_tx, vote_rx) = tokio::sync::oneshot::channel();
    tx.send(RoomCommand::ClientMsg {
        participant_id: "fac-1".to_string(),
        command: ClientCommand::CastVote {
            value: "5".to_string(),
        },
        reply: Some(vote_tx),
    })
    .await
    .unwrap();
    let _ = vote_rx.await.unwrap();

    let (rev_tx, rev_rx) = tokio::sync::oneshot::channel();
    tx.send(RoomCommand::ClientMsg {
        participant_id: "fac-1".to_string(),
        command: ClientCommand::RevealCards,
        reply: Some(rev_tx),
    })
    .await
    .unwrap();
    let _ = rev_rx.await.unwrap();

    let (fin_tx, fin_rx) = tokio::sync::oneshot::channel();
    tx.send(RoomCommand::ClientMsg {
        participant_id: "fac-1".to_string(),
        command: ClientCommand::FinalizeStory {
            points: Some("5".to_string()),
        },
        reply: Some(fin_tx),
    })
    .await
    .unwrap();
    let _ = fin_rx.await.unwrap();

    // 6. Explicit 2-Way Sync to tracker
    let (sync_tx, sync_rx) = tokio::sync::oneshot::channel();
    tx.send(RoomCommand::ClientMsg {
        participant_id: "fac-1".to_string(),
        command: ClientCommand::SyncEstimateToTracker {
            story_id: story_id.clone(),
            points: 5,
            post_comment: true,
        },
        reply: Some(sync_tx),
    })
    .await
    .unwrap();
    let _ = sync_rx.await.unwrap();

    // Check that MockTrackerAdapter recorded the sync
    assert_eq!(mock_adapter.get_recorded_estimate("lin-101"), Some(5));
    let recorded_comments = mock_adapter.get_recorded_comments("lin-101");
    assert_eq!(recorded_comments.len(), 1);
    assert!(recorded_comments[0].contains("5 story points"));

    // 7. SPIDR Vertical Slicing: push slices to tracker
    let slices = vec![
        StorySlice {
            title: "Slice 1: GitHub OAuth".to_string(),
            description: "Subtask for GitHub".to_string(),
            acceptance_criteria: vec!["GitHub works".to_string()],
            estimated_points: Some(2),
        },
        StorySlice {
            title: "Slice 2: Linear OAuth".to_string(),
            description: "Subtask for Linear".to_string(),
            acceptance_criteria: vec!["Linear works".to_string()],
            estimated_points: Some(3),
        },
    ];

    let (slice_tx, slice_rx) = tokio::sync::oneshot::channel();
    tx.send(RoomCommand::ClientMsg {
        participant_id: "fac-1".to_string(),
        command: ClientCommand::PushStorySlices {
            parent_id: "lin-101".to_string(),
            slices,
        },
        reply: Some(slice_tx),
    })
    .await
    .unwrap();
    let _ = slice_rx.await.unwrap();

    // Verify backlog queue received child slices
    let (snap_tx3, snap_rx3) = tokio::sync::oneshot::channel();
    tx.send(RoomCommand::GetSnapshot {
        participant_id: "fac-1".to_string(),
        reply: snap_tx3,
    })
    .await
    .unwrap();
    let snap3 = snap_rx3.await.unwrap();
    assert_eq!(snap3.backlog.len(), 3); // Original + 2 slices
    assert_eq!(snap3.backlog[1].key, Some("ENG-101-S1".to_string()));
    assert_eq!(snap3.backlog[2].key, Some("ENG-101-S2".to_string()));
}

#[tokio::test]
async fn test_markdown_paste_ingestion_and_reordering() {
    let (tx, rx) = mpsc::channel(64);
    let (event_tx, _event_rx) = tokio::sync::broadcast::channel(64);
    let actor = RoomActor::new(
        "swift-badger-42".to_string(),
        "SWB-42".to_string(),
        event_tx,
    );
    tokio::spawn(actor.run(rx));

    // Facilitator joins
    let (join_tx, join_rx) = tokio::sync::oneshot::channel();
    tx.send(RoomCommand::ClientMsg {
        participant_id: "fac-1".to_string(),
        command: ClientCommand::JoinRoom {
            participant_id: "fac-1".to_string(),
            nickname: "Facilitator".to_string(),
            avatar: "indigo".to_string(),
            role: None,
        },
        reply: Some(join_tx),
    })
    .await
    .unwrap();
    let _ = join_rx.await.unwrap();

    // Import Markdown stories
    let raw_md = r#"# Story A: Database Migration
Migrate PostgreSQL schema.
- [ ] Add pgvector extension
- [ ] Run migration script

# Story B: Frontend Polishing
Improve responsive layout.
- [ ] Mobile card tray
"#;

    let (imp_tx, imp_rx) = tokio::sync::oneshot::channel();
    tx.send(RoomCommand::ClientMsg {
        participant_id: "fac-1".to_string(),
        command: ClientCommand::ImportMarkdown {
            raw_markdown: raw_md.to_string(),
        },
        reply: Some(imp_tx),
    })
    .await
    .unwrap();
    let _ = imp_rx.await.unwrap();

    let (snap_tx, snap_rx) = tokio::sync::oneshot::channel();
    tx.send(RoomCommand::GetSnapshot {
        participant_id: "fac-1".to_string(),
        reply: snap_tx,
    })
    .await
    .unwrap();
    let snap = snap_rx.await.unwrap();
    assert_eq!(snap.backlog.len(), 2);
    assert_eq!(snap.backlog[0].title, "Story A: Database Migration");
    assert_eq!(snap.backlog[1].title, "Story B: Frontend Polishing");

    // Reorder stories
    let id_a = snap.backlog[0].id.clone();
    let id_b = snap.backlog[1].id.clone();
    let (reorder_tx, reorder_rx) = tokio::sync::oneshot::channel();
    tx.send(RoomCommand::ClientMsg {
        participant_id: "fac-1".to_string(),
        command: ClientCommand::ReorderBacklog {
            story_ids: vec![id_b.clone(), id_a.clone()],
        },
        reply: Some(reorder_tx),
    })
    .await
    .unwrap();
    let _ = reorder_rx.await.unwrap();

    let (snap_tx2, snap_rx2) = tokio::sync::oneshot::channel();
    tx.send(RoomCommand::GetSnapshot {
        participant_id: "fac-1".to_string(),
        reply: snap_tx2,
    })
    .await
    .unwrap();
    let snap2 = snap_rx2.await.unwrap();
    assert_eq!(snap2.backlog[0].id, id_b);
    assert_eq!(snap2.backlog[1].id, id_a);

    // Remove a story
    let (rem_tx, rem_rx) = tokio::sync::oneshot::channel();
    tx.send(RoomCommand::ClientMsg {
        participant_id: "fac-1".to_string(),
        command: ClientCommand::RemoveStoryFromBacklog { story_id: id_a },
        reply: Some(rem_tx),
    })
    .await
    .unwrap();
    let _ = rem_rx.await.unwrap();

    let (snap_tx3, snap_rx3) = tokio::sync::oneshot::channel();
    tx.send(RoomCommand::GetSnapshot {
        participant_id: "fac-1".to_string(),
        reply: snap_tx3,
    })
    .await
    .unwrap();
    let snap3 = snap_rx3.await.unwrap();
    assert_eq!(snap3.backlog.len(), 1);
    assert_eq!(snap3.backlog[0].id, id_b);
}
