use crate::domain::markdown_parser::parse_markdown_backlog;
use crate::domain::models::{EstimationPhase, Participant, Role, RoomState, Story};
use crate::domain::protocol::{ClientCommand, ServerEvent};
use crate::domain::reveal_gate::{project_room_state, RoomSnapshotData};
use crate::domain::story_doctor::generate_story_doctor_report;
use crate::domain::tracker::{create_adapter, IssueTrackerAdapter};
use std::collections::HashMap;
use tokio::sync::{broadcast, mpsc, oneshot};
use tracing::info;
use uuid::Uuid;

#[derive(Debug)]
#[allow(clippy::large_enum_variant)]
pub enum RoomCommand {
    ClientMsg {
        participant_id: String,
        command: ClientCommand,
        reply: Option<oneshot::Sender<Result<Participant, String>>>,
    },
    Disconnect {
        participant_id: String,
    },
    GetSnapshot {
        participant_id: String,
        reply: oneshot::Sender<RoomSnapshotData>,
    },
}

pub struct RoomActor {
    pub state: RoomState,
    pub event_tx: broadcast::Sender<ServerEvent>,
    pub tracker_adapter: Option<Box<dyn IssueTrackerAdapter>>,
}

impl RoomActor {
    pub fn new(slug: String, short_code: String, event_tx: broadcast::Sender<ServerEvent>) -> Self {
        Self {
            state: RoomState::new(slug, short_code),
            event_tx,
            tracker_adapter: None,
        }
    }

    pub fn with_tracker_adapter(mut self, adapter: Box<dyn IssueTrackerAdapter>) -> Self {
        self.state.active_tracker_provider = Some(adapter.provider_name().to_string());
        self.tracker_adapter = Some(adapter);
        self
    }

    pub async fn run(mut self, mut rx: mpsc::Receiver<RoomCommand>) {
        while let Some(cmd) = rx.recv().await {
            match cmd {
                RoomCommand::ClientMsg {
                    participant_id,
                    command,
                    reply,
                } => {
                    let res = self.handle_client_command(&participant_id, command).await;
                    if let Some(r) = reply {
                        let _ = r.send(res);
                    }
                }
                RoomCommand::Disconnect { participant_id } => {
                    self.handle_disconnect(&participant_id);
                }
                RoomCommand::GetSnapshot {
                    participant_id,
                    reply,
                } => {
                    let proj = project_room_state(&self.state, Some(&participant_id));
                    let _ = reply.send(proj.inner().clone());
                }
            }
        }
    }

    async fn handle_client_command(
        &mut self,
        sender_id: &str,
        command: ClientCommand,
    ) -> Result<Participant, String> {
        match command {
            ClientCommand::JoinRoom {
                participant_id,
                nickname,
                avatar,
                role,
            } => {
                let is_first =
                    self.state.participants.is_empty() || self.state.facilitator_id.is_empty();
                if is_first {
                    self.state.facilitator_id = participant_id.clone();
                }
                let assigned_role = role.unwrap_or(Role::Estimator);

                let p = if let Some(existing) = self.state.participants.get_mut(&participant_id) {
                    existing.connected = true;
                    if let Some(r) = role {
                        existing.role = r;
                    }
                    if !nickname.trim().is_empty() {
                        existing.nickname = nickname.clone();
                    }
                    if !avatar.trim().is_empty() {
                        existing.avatar = avatar.clone();
                    }
                    existing.clone()
                } else {
                    let new_p = Participant {
                        id: participant_id.clone(),
                        nickname: if nickname.trim().is_empty() {
                            format!(
                                "Estimator-{}",
                                &participant_id[..participant_id.len().min(4)]
                            )
                        } else {
                            nickname.clone()
                        },
                        avatar: if avatar.trim().is_empty() {
                            "indigo".to_string()
                        } else {
                            avatar.clone()
                        },
                        role: assigned_role,
                        connected: true,
                        voted: false,
                        vote: None,
                    };
                    self.state
                        .participants
                        .insert(participant_id.clone(), new_p.clone());
                    new_p
                };

                let _ = self.event_tx.send(ServerEvent::ParticipantJoined {
                    participant_id: p.id.clone(),
                    nickname: p.nickname.clone(),
                    avatar: p.avatar.clone(),
                    role: p.role,
                });

                self.broadcast_snapshot();
                Ok(p)
            }

            ClientCommand::SelectStory { story } => {
                if !self.is_facilitator(sender_id) {
                    return self.get_participant(sender_id);
                }
                self.reset_votes();
                if let Some(s) = story {
                    self.state.phase = EstimationPhase::StoryDoctorReview;
                    self.state.story_doctor_report = Some(generate_story_doctor_report(&s));
                    self.state.active_story = Some(s);
                } else {
                    self.state.phase = EstimationPhase::Idle;
                    self.state.story_doctor_report = None;
                    self.state.active_story = None;
                }
                self.broadcast_snapshot();
                self.get_participant(sender_id)
            }

            ClientCommand::SelectStoryById { story_id } => {
                if !self.is_facilitator(sender_id) {
                    return self.get_participant(sender_id);
                }
                if let Some(story) = self
                    .state
                    .backlog
                    .iter()
                    .find(|s| s.id == story_id || s.key.as_deref() == Some(&story_id))
                    .cloned()
                {
                    self.reset_votes();
                    self.state.phase = EstimationPhase::StoryDoctorReview;
                    self.state.story_doctor_report = Some(generate_story_doctor_report(&story));
                    self.state.active_story = Some(story);
                    self.broadcast_snapshot();
                }
                self.get_participant(sender_id)
            }

            ClientCommand::UpdatePointReferences { references } => {
                if !self.is_facilitator(sender_id) {
                    return self.get_participant(sender_id);
                }
                self.state.point_references = references.clone();
                let _ = self
                    .event_tx
                    .send(ServerEvent::PointReferencesUpdated { references });
                self.broadcast_snapshot();
                self.get_participant(sender_id)
            }

            ClientCommand::ToggleEdgeCaseCheck {
                edge_case_id,
                checked,
            } => {
                if let Some(ref mut report) = self.state.story_doctor_report {
                    if let Some(ec) = report.edge_cases.iter_mut().find(|e| e.id == edge_case_id) {
                        ec.checked = checked;
                        let _ = self.event_tx.send(ServerEvent::EdgeCaseToggled {
                            edge_case_id: edge_case_id.clone(),
                            checked,
                        });
                        self.broadcast_snapshot();
                    }
                }
                self.get_participant(sender_id)
            }

            ClientCommand::ConnectTracker { config } => {
                if !self.is_facilitator(sender_id) {
                    let _ = self.event_tx.send(ServerEvent::TrackerError {
                        message: "Only the Facilitator can manage tracker connections".to_string(),
                    });
                    return self.get_participant(sender_id);
                }
                let adapter = create_adapter(config);
                match tokio::time::timeout(
                    std::time::Duration::from_secs(10),
                    adapter.test_connection(),
                )
                .await
                {
                    Ok(Ok(preview)) => {
                        let prov_name = adapter.provider_name().to_string();
                        self.state.active_tracker_provider = Some(prov_name.clone());
                        self.tracker_adapter = Some(adapter);
                        let _ = self.event_tx.send(ServerEvent::TrackerConnected {
                            provider: prov_name,
                        });
                        let _ = self
                            .event_tx
                            .send(ServerEvent::TrackerConnectionTested { preview });
                        self.broadcast_snapshot();
                    }
                    Ok(Err(err)) => {
                        let _ = self.event_tx.send(ServerEvent::TrackerError {
                            message: err.to_string(),
                        });
                    }
                    Err(_) => {
                        let _ = self.event_tx.send(ServerEvent::TrackerError {
                            message: "Tracker test connection timed out".to_string(),
                        });
                    }
                }
                self.get_participant(sender_id)
            }

            ClientCommand::DisconnectTracker => {
                if !self.is_facilitator(sender_id) {
                    return self.get_participant(sender_id);
                }
                self.tracker_adapter = None;
                self.state.active_tracker_provider = None;
                let _ = self.event_tx.send(ServerEvent::TrackerDisconnected);
                self.broadcast_snapshot();
                self.get_participant(sender_id)
            }

            ClientCommand::TestTrackerConnection { config } => {
                if !self.is_facilitator(sender_id) {
                    let _ = self.event_tx.send(ServerEvent::TrackerError {
                        message: "Only the Facilitator can test tracker connections".to_string(),
                    });
                    return self.get_participant(sender_id);
                }
                let adapter = create_adapter(config);
                match tokio::time::timeout(
                    std::time::Duration::from_secs(10),
                    adapter.test_connection(),
                )
                .await
                {
                    Ok(Ok(preview)) => {
                        let _ = self
                            .event_tx
                            .send(ServerEvent::TrackerConnectionTested { preview });
                    }
                    Ok(Err(err)) => {
                        let _ = self.event_tx.send(ServerEvent::TrackerError {
                            message: err.to_string(),
                        });
                    }
                    Err(_) => {
                        let _ = self.event_tx.send(ServerEvent::TrackerError {
                            message: "Tracker test connection timed out".to_string(),
                        });
                    }
                }
                self.get_participant(sender_id)
            }

            ClientCommand::FetchBacklog { query } => {
                if !self.is_facilitator(sender_id) {
                    let _ = self.event_tx.send(ServerEvent::TrackerError {
                        message: "Only the Facilitator can fetch tracker backlogs".to_string(),
                    });
                    return self.get_participant(sender_id);
                }
                if let Some(ref adapter) = self.tracker_adapter {
                    match tokio::time::timeout(
                        std::time::Duration::from_secs(10),
                        adapter.fetch_backlog(&query),
                    )
                    .await
                    {
                        Ok(Ok(ext_stories)) => {
                            let prov_name = adapter.provider_name().to_string();
                            for ext in ext_stories {
                                if !self.state.backlog.iter().any(|s| {
                                    s.external_id.as_deref() == Some(&ext.id)
                                        || (s.key.as_deref() == Some(&ext.key)
                                            && !ext.key.is_empty())
                                }) {
                                    self.state.backlog.push(Story {
                                        id: format!("story-{}", Uuid::new_v4()),
                                        title: ext.title,
                                        description: ext.description,
                                        acceptance_criteria: ext.acceptance_criteria,
                                        key: Some(ext.key),
                                        url: ext.url,
                                        tracker_provider: Some(prov_name.clone()),
                                        external_id: Some(ext.id),
                                        points: ext.current_estimate.map(|pts| pts.to_string()),
                                        status: ext.status.or(Some("Ready".to_string())),
                                    });
                                }
                            }
                            let _ = self.event_tx.send(ServerEvent::BacklogUpdated {
                                backlog: self.state.backlog.clone(),
                            });
                            self.broadcast_snapshot();
                        }
                        Ok(Err(err)) => {
                            let _ = self.event_tx.send(ServerEvent::TrackerError {
                                message: err.to_string(),
                            });
                        }
                        Err(_) => {
                            let _ = self.event_tx.send(ServerEvent::TrackerError {
                                message: "Fetch backlog timed out".to_string(),
                            });
                        }
                    }
                } else {
                    let _ = self.event_tx.send(ServerEvent::TrackerError {
                        message: "No active issue tracker connected".to_string(),
                    });
                }
                self.get_participant(sender_id)
            }

            ClientCommand::ImportBacklog { stories } => {
                if !self.is_facilitator(sender_id) {
                    return self.get_participant(sender_id);
                }
                self.state.backlog.extend(stories);
                let _ = self.event_tx.send(ServerEvent::BacklogUpdated {
                    backlog: self.state.backlog.clone(),
                });
                self.broadcast_snapshot();
                self.get_participant(sender_id)
            }

            ClientCommand::ImportMarkdown { raw_markdown } => {
                if !self.is_facilitator(sender_id) {
                    return self.get_participant(sender_id);
                }
                let parsed = parse_markdown_backlog(&raw_markdown);
                self.state.backlog.extend(parsed);
                let _ = self.event_tx.send(ServerEvent::BacklogUpdated {
                    backlog: self.state.backlog.clone(),
                });
                self.broadcast_snapshot();
                self.get_participant(sender_id)
            }

            ClientCommand::SyncEstimateToTracker {
                story_id,
                points,
                post_comment,
            } => {
                if !self.is_facilitator(sender_id) {
                    let _ = self.event_tx.send(ServerEvent::TrackerError {
                        message: "Only the Facilitator can sync estimates to tracker".to_string(),
                    });
                    return self.get_participant(sender_id);
                }
                let mut target_ext_id = None;
                let mut target_story_id = story_id.clone();

                for story in &mut self.state.backlog {
                    if story.id == story_id || story.key.as_deref() == Some(&story_id) {
                        story.points = Some(points.to_string());
                        story.status = Some("Estimated".to_string());
                        target_ext_id = story.external_id.clone().or_else(|| story.key.clone());
                        target_story_id = story.id.clone();
                    }
                }

                if let Some(ref mut active) = self.state.active_story {
                    if active.id == story_id || active.key.as_deref() == Some(&story_id) {
                        active.points = Some(points.to_string());
                        active.status = Some("Estimated".to_string());
                        if target_ext_id.is_none() {
                            target_ext_id =
                                active.external_id.clone().or_else(|| active.key.clone());
                        }
                        target_story_id = active.id.clone();
                    }
                }

                if let (Some(ref adapter), Some(ext_id)) =
                    (&self.tracker_adapter, target_ext_id.as_deref())
                {
                    let sync_res = tokio::time::timeout(
                        std::time::Duration::from_secs(10),
                        adapter.sync_estimate(ext_id, points),
                    )
                    .await;

                    match sync_res {
                        Ok(Ok(())) => {
                            if post_comment {
                                let comment =
                                    format!("⚡ Scrum Poker Consensus: {} story points.", points);
                                let _ = adapter.post_summary_comment(ext_id, &comment).await;
                            }

                            let _ = self.event_tx.send(ServerEvent::EstimateSynced {
                                story_id: target_story_id.clone(),
                                external_id: ext_id.to_string(),
                                points,
                                success: true,
                                message: None,
                            });
                        }
                        Ok(Err(err)) => {
                            let _ = self.event_tx.send(ServerEvent::EstimateSynced {
                                story_id: target_story_id.clone(),
                                external_id: ext_id.to_string(),
                                points,
                                success: false,
                                message: Some(err.to_string()),
                            });
                        }
                        Err(_) => {
                            let _ = self.event_tx.send(ServerEvent::EstimateSynced {
                                story_id: target_story_id.clone(),
                                external_id: ext_id.to_string(),
                                points,
                                success: false,
                                message: Some("Sync estimate request timed out".to_string()),
                            });
                        }
                    }
                } else {
                    let _ = self.event_tx.send(ServerEvent::EstimateSynced {
                        story_id: target_story_id.clone(),
                        external_id: target_ext_id.unwrap_or_default(),
                        points,
                        success: true,
                        message: Some("Updated in local room backlog".to_string()),
                    });
                }

                let _ = self.event_tx.send(ServerEvent::BacklogUpdated {
                    backlog: self.state.backlog.clone(),
                });
                self.broadcast_snapshot();
                self.get_participant(sender_id)
            }

            ClientCommand::PushStorySlices { parent_id, slices } => {
                if !self.is_facilitator(sender_id) {
                    let _ = self.event_tx.send(ServerEvent::TrackerError {
                        message: "Only the Facilitator can push story slices".to_string(),
                    });
                    return self.get_participant(sender_id);
                }
                let mut created_stories = Vec::new();
                if let Some(ref adapter) = self.tracker_adapter {
                    match tokio::time::timeout(
                        std::time::Duration::from_secs(10),
                        adapter.push_slices(&parent_id, &slices),
                    )
                    .await
                    {
                        Ok(Ok(ext_slices)) => {
                            let prov_name = adapter.provider_name().to_string();
                            for ext in ext_slices {
                                let s = Story {
                                    id: format!("story-{}", Uuid::new_v4()),
                                    title: ext.title,
                                    description: ext.description,
                                    acceptance_criteria: ext.acceptance_criteria,
                                    key: Some(ext.key),
                                    url: ext.url,
                                    tracker_provider: Some(prov_name.clone()),
                                    external_id: Some(ext.id),
                                    points: ext.current_estimate.map(|p| p.to_string()),
                                    status: Some("Ready".to_string()),
                                };
                                self.state.backlog.push(s.clone());
                                created_stories.push(s);
                            }
                        }
                        Ok(Err(err)) => {
                            let _ = self.event_tx.send(ServerEvent::TrackerError {
                                message: err.to_string(),
                            });
                        }
                        Err(_) => {
                            let _ = self.event_tx.send(ServerEvent::TrackerError {
                                message: "Push slices timed out".to_string(),
                            });
                        }
                    }
                } else {
                    for (i, slice) in slices.iter().enumerate() {
                        let s = Story {
                            id: format!("story-{}", Uuid::new_v4()),
                            title: slice.title.clone(),
                            description: slice.description.clone(),
                            acceptance_criteria: slice.acceptance_criteria.clone(),
                            key: Some(format!("{}-S{}", parent_id, i + 1)),
                            url: None,
                            tracker_provider: None,
                            external_id: None,
                            points: slice.estimated_points.map(|p| p.to_string()),
                            status: Some("Ready".to_string()),
                        };
                        self.state.backlog.push(s.clone());
                        created_stories.push(s);
                    }
                }

                let _ = self.event_tx.send(ServerEvent::SlicesPushed {
                    parent_id: parent_id.clone(),
                    created_stories: created_stories.clone(),
                });
                let _ = self.event_tx.send(ServerEvent::BacklogUpdated {
                    backlog: self.state.backlog.clone(),
                });
                self.broadcast_snapshot();
                self.get_participant(sender_id)
            }

            ClientCommand::ReorderBacklog { story_ids } => {
                if !self.is_facilitator(sender_id) {
                    return self.get_participant(sender_id);
                }
                let mut seen = std::collections::HashSet::new();
                let mut reordered = Vec::new();
                for id in &story_ids {
                    if seen.insert(id) {
                        if let Some(pos) = self.state.backlog.iter().position(|s| &s.id == id) {
                            reordered.push(self.state.backlog.remove(pos));
                        }
                    }
                }
                // Append remaining items that weren't specified
                reordered.append(&mut self.state.backlog);
                self.state.backlog = reordered;

                let _ = self.event_tx.send(ServerEvent::BacklogUpdated {
                    backlog: self.state.backlog.clone(),
                });
                self.broadcast_snapshot();
                self.get_participant(sender_id)
            }

            ClientCommand::RemoveStoryFromBacklog { story_id } => {
                if !self.is_facilitator(sender_id) {
                    return self.get_participant(sender_id);
                }
                self.state
                    .backlog
                    .retain(|s| s.id != story_id && s.key.as_deref() != Some(&story_id));
                if let Some(ref active) = self.state.active_story {
                    if active.id == story_id || active.key.as_deref() == Some(&story_id) {
                        self.state.active_story = None;
                    }
                }
                let _ = self.event_tx.send(ServerEvent::BacklogUpdated {
                    backlog: self.state.backlog.clone(),
                });
                self.broadcast_snapshot();
                self.get_participant(sender_id)
            }

            ClientCommand::StartVoting => {
                if !self.is_facilitator(sender_id) {
                    return self.get_participant(sender_id);
                }
                self.reset_votes();
                self.state.phase = EstimationPhase::Voting;
                self.broadcast_snapshot();
                self.get_participant(sender_id)
            }

            ClientCommand::CastVote { value } => {
                let p_clone = if let Some(p) = self.state.participants.get_mut(sender_id) {
                    if p.role == Role::Observer {
                        return Err("Observers cannot cast votes".to_string());
                    }
                    p.voted = true;
                    p.vote = Some(value);
                    Some(p.clone())
                } else {
                    None
                };

                if let Some(p) = p_clone {
                    let _ = self.event_tx.send(ServerEvent::VoteCast {
                        participant_id: sender_id.to_string(),
                    });
                    self.broadcast_snapshot();
                    Ok(p)
                } else {
                    Err("Participant not found".to_string())
                }
            }

            ClientCommand::RetractVote => {
                let p_clone = if let Some(p) = self.state.participants.get_mut(sender_id) {
                    p.voted = false;
                    p.vote = None;
                    Some(p.clone())
                } else {
                    None
                };

                if let Some(p) = p_clone {
                    let _ = self.event_tx.send(ServerEvent::VoteRetracted {
                        participant_id: sender_id.to_string(),
                    });
                    self.broadcast_snapshot();
                    Ok(p)
                } else {
                    Err("Participant not found".to_string())
                }
            }

            ClientCommand::RevealCards => {
                if !self.is_facilitator(sender_id) {
                    return self.get_participant(sender_id);
                }
                self.state.phase = EstimationPhase::Revealed;
                let votes: HashMap<String, String> = self
                    .state
                    .participants
                    .iter()
                    .filter_map(|(id, p)| p.vote.as_ref().map(|v| (id.clone(), v.clone())))
                    .collect();

                let distribution = self.state.compute_consensus();

                let _ = self.event_tx.send(ServerEvent::CardsRevealed {
                    votes,
                    distribution,
                });

                self.broadcast_snapshot();
                self.get_participant(sender_id)
            }

            ClientCommand::TriggerReVote => {
                if !self.is_facilitator(sender_id) {
                    return self.get_participant(sender_id);
                }
                self.state.round_number += 1;
                self.reset_votes();
                self.state.phase = EstimationPhase::Voting;

                let _ = self.event_tx.send(ServerEvent::RoundReset {
                    round_number: self.state.round_number,
                });

                self.broadcast_snapshot();
                self.get_participant(sender_id)
            }

            ClientCommand::FinalizeStory { points } => {
                if !self.is_facilitator(sender_id) {
                    return self.get_participant(sender_id);
                }
                self.state.phase = EstimationPhase::Finalized;
                let pts = points.unwrap_or_else(|| {
                    self.state
                        .compute_consensus()
                        .and_then(|c| c.suggested_points)
                        .unwrap_or_else(|| "5".to_string())
                });

                let story_id = self.state.active_story.as_ref().map(|s| s.id.clone());

                let _ = self.event_tx.send(ServerEvent::StoryFinalized {
                    story_id,
                    points: pts,
                });

                self.broadcast_snapshot();
                self.get_participant(sender_id)
            }

            ClientCommand::UpdateRole {
                target_id,
                new_role,
            } => {
                if !self.is_facilitator(sender_id) && sender_id != target_id {
                    return Err("Only the Facilitator can update participant roles".to_string());
                }
                if let Some(target) = self.state.participants.get_mut(&target_id) {
                    target.role = new_role;
                    if new_role == Role::Observer {
                        target.voted = false;
                        target.vote = None;
                    }
                    let _ = self.event_tx.send(ServerEvent::RoleUpdated {
                        participant_id: target_id.clone(),
                        role: new_role,
                    });
                    self.broadcast_snapshot();
                    self.get_participant(sender_id)
                } else {
                    Err("Target participant not found".to_string())
                }
            }

            ClientCommand::TransferFacilitator { target_id } => {
                if !self.is_facilitator(sender_id) {
                    return Err(
                        "Only the Facilitator can transfer facilitator privileges".to_string()
                    );
                }
                if self.state.participants.contains_key(&target_id) {
                    self.state.facilitator_id = target_id.clone();
                    let _ = self.event_tx.send(ServerEvent::FacilitatorChanged {
                        facilitator_id: target_id,
                    });
                    self.broadcast_snapshot();
                    self.get_participant(sender_id)
                } else {
                    Err("Target participant not found".to_string())
                }
            }

            ClientCommand::Ping => {
                let _ = self.event_tx.send(ServerEvent::Pong);
                self.get_participant(sender_id)
            }
        }
    }

    fn handle_disconnect(&mut self, participant_id: &str) {
        if let Some(p) = self.state.participants.get_mut(participant_id) {
            p.connected = false;
            let _ = self.event_tx.send(ServerEvent::ParticipantLeft {
                participant_id: participant_id.to_string(),
            });

            // Facilitator failover promotion if facilitator drops
            if self.state.facilitator_id == participant_id {
                let next_facilitator = self
                    .state
                    .participants
                    .values()
                    .find(|other| other.connected && other.id != participant_id)
                    .map(|other| other.id.clone());

                if let Some(new_id) = next_facilitator {
                    info!("Promoting participant {} to Facilitator", new_id);
                    self.state.facilitator_id = new_id.clone();
                    let _ = self.event_tx.send(ServerEvent::FacilitatorChanged {
                        facilitator_id: new_id,
                    });
                }
            }

            self.broadcast_snapshot();
        }
    }

    fn reset_votes(&mut self) {
        for p in self.state.participants.values_mut() {
            p.voted = false;
            p.vote = None;
        }
    }

    fn broadcast_snapshot(&self) {
        let proj = project_room_state(&self.state, None);
        let _ = self.event_tx.send(ServerEvent::RoomSnapshot {
            state: proj.inner().clone(),
        });
    }

    fn is_facilitator(&self, sender_id: &str) -> bool {
        self.state.facilitator_id == sender_id
    }

    fn get_participant(&self, participant_id: &str) -> Result<Participant, String> {
        self.state
            .participants
            .get(participant_id)
            .cloned()
            .ok_or_else(|| "Participant not found".to_string())
    }
}
