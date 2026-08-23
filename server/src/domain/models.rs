use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Role {
    Estimator,
    Observer,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EstimationPhase {
    Idle,
    StoryDoctorReview,
    Voting,
    Revealed,
    Discussing,
    Slicing,
    Finalized,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Story {
    pub id: String,
    pub title: String,
    pub description: String,
    pub acceptance_criteria: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub key: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tracker_provider: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub external_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub points: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
}

impl Story {
    pub fn new(
        id: impl Into<String>,
        title: impl Into<String>,
        description: impl Into<String>,
        acceptance_criteria: Vec<String>,
    ) -> Self {
        Self {
            id: id.into(),
            title: title.into(),
            description: description.into(),
            acceptance_criteria,
            key: None,
            url: None,
            tracker_provider: None,
            external_id: None,
            points: None,
            status: Some("Ready".to_string()),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Participant {
    pub id: String,
    pub nickname: String,
    pub avatar: String,
    pub role: Role,
    pub connected: bool,
    pub voted: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vote: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ConsensusCategory {
    Consensus,
    HighOutlier,
    LowOutlier,
    BimodalSplit,
    WideSpread,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ConsensusSummary {
    pub category: ConsensusCategory,
    pub consensus_pct: f64,
    pub agreement_count: usize,
    pub total_votes: usize,
    pub suggested_points: Option<String>,
    pub min_vote: Option<String>,
    pub max_vote: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoomState {
    pub slug: String,
    pub short_code: String,
    pub phase: EstimationPhase,
    pub round_number: u32,
    pub active_story: Option<Story>,
    pub backlog: Vec<Story>,
    pub active_tracker_provider: Option<String>,
    pub participants: HashMap<String, Participant>,
    pub facilitator_id: String,
}

impl RoomState {
    pub fn new(slug: String, short_code: String) -> Self {
        Self {
            slug,
            short_code,
            phase: EstimationPhase::Idle,
            round_number: 1,
            active_story: None,
            backlog: Vec::new(),
            active_tracker_provider: None,
            participants: HashMap::new(),
            facilitator_id: String::new(),
        }
    }

    pub fn compute_consensus(&self) -> Option<ConsensusSummary> {
        let valid_votes: Vec<&String> = self
            .participants
            .values()
            .filter(|p| p.role == Role::Estimator && p.voted)
            .filter_map(|p| p.vote.as_ref())
            .filter(|v| *v != "?")
            .collect();

        if valid_votes.is_empty() {
            return None;
        }

        let total_votes = valid_votes.len();
        let mut counts: HashMap<&String, usize> = HashMap::new();
        for v in &valid_votes {
            *counts.entry(*v).or_insert(0) += 1;
        }

        let mut sorted_counts: Vec<(&String, usize)> = counts.into_iter().collect();
        sorted_counts.sort_by_key(|a| std::cmp::Reverse(a.1));

        let (top_vote, top_count) = sorted_counts[0];
        let consensus_pct = (top_count as f64 / total_votes as f64) * 100.0;

        let mut numeric_votes: Vec<f64> = valid_votes
            .iter()
            .filter_map(|v| v.parse::<f64>().ok())
            .collect();
        numeric_votes.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

        let (category, min_vote, max_vote) = if numeric_votes.is_empty() {
            (ConsensusCategory::Consensus, None, None)
        } else {
            let min = numeric_votes[0];
            let max = numeric_votes[numeric_votes.len() - 1];
            let cat = if consensus_pct >= 75.0 {
                ConsensusCategory::Consensus
            } else if sorted_counts.len() >= 2
                && sorted_counts[0].1 == sorted_counts[1].1
                && sorted_counts[0].1 >= 2
            {
                ConsensusCategory::BimodalSplit
            } else if max / (min.max(1.0)) >= 4.0 {
                ConsensusCategory::WideSpread
            } else if max > min * 2.0 {
                ConsensusCategory::HighOutlier
            } else {
                ConsensusCategory::LowOutlier
            };
            (cat, Some(min.to_string()), Some(max.to_string()))
        };

        Some(ConsensusSummary {
            category,
            consensus_pct,
            agreement_count: top_count,
            total_votes,
            suggested_points: Some(top_vote.to_string()),
            min_vote,
            max_vote,
        })
    }
}
