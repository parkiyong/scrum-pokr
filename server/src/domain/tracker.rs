use crate::domain::markdown_parser::extract_acceptance_criteria;
use async_trait::async_trait;
use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
use base64::Engine as _;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TrackerProvider {
    Linear,
    GitHub,
    Jira,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(tag = "provider", content = "config")]
pub enum TrackerConfig {
    Linear {
        api_key: String,
        endpoint: Option<String>,
    },
    GitHub {
        personal_access_token: String,
        owner: String,
        repo: String,
        endpoint: Option<String>,
    },
    Jira {
        domain: String,
        email: String,
        api_token: String,
        project_key: String,
        endpoint: Option<String>,
        points_field: Option<String>,
    },
}

impl std::fmt::Debug for TrackerConfig {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TrackerConfig::Linear { endpoint, .. } => f
                .debug_struct("Linear")
                .field("api_key", &"[REDACTED]")
                .field("endpoint", endpoint)
                .finish(),
            TrackerConfig::GitHub {
                owner,
                repo,
                endpoint,
                ..
            } => f
                .debug_struct("GitHub")
                .field("personal_access_token", &"[REDACTED]")
                .field("owner", owner)
                .field("repo", repo)
                .field("endpoint", endpoint)
                .finish(),
            TrackerConfig::Jira {
                domain,
                email,
                project_key,
                endpoint,
                points_field,
                ..
            } => f
                .debug_struct("Jira")
                .field("domain", domain)
                .field("email", email)
                .field("api_token", &"[REDACTED]")
                .field("project_key", project_key)
                .field("endpoint", endpoint)
                .field("points_field", points_field)
                .finish(),
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TrackerQuery {
    pub team_id: Option<String>,
    pub cycle_id: Option<String>,
    pub project_id: Option<String>,
    pub sprint_id: Option<String>,
    pub milestone: Option<String>,
    #[serde(default)]
    pub labels: Vec<String>,
    pub jql: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ExternalStory {
    pub id: String,
    pub key: String,
    pub title: String,
    pub description: String,
    pub acceptance_criteria: Vec<String>,
    pub url: Option<String>,
    pub current_estimate: Option<u32>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct StorySlice {
    pub title: String,
    pub description: String,
    pub acceptance_criteria: Vec<String>,
    pub estimated_points: Option<u32>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TrackerEntity {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extra: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ConnectionPreview {
    pub provider: TrackerProvider,
    pub authenticated: bool,
    pub user_name: Option<String>,
    pub teams: Vec<TrackerEntity>,
    pub cycles: Vec<TrackerEntity>,
    pub projects: Vec<TrackerEntity>,
    pub sprints: Vec<TrackerEntity>,
    pub milestones: Vec<TrackerEntity>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", content = "message")]
pub enum TrackerError {
    AuthError(String),
    NetworkError(String),
    NotFound(String),
    RateLimited(String),
    ProviderError(String),
}

impl std::fmt::Display for TrackerError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TrackerError::AuthError(msg) => write!(f, "Auth error: {}", msg),
            TrackerError::NetworkError(msg) => write!(f, "Network error: {}", msg),
            TrackerError::NotFound(msg) => write!(f, "Not found: {}", msg),
            TrackerError::RateLimited(msg) => write!(f, "Rate limited: {}", msg),
            TrackerError::ProviderError(msg) => write!(f, "Provider error: {}", msg),
        }
    }
}

impl std::error::Error for TrackerError {}

pub fn check_tracker_status(
    status: reqwest::StatusCode,
    provider: &str,
    resource: &str,
) -> Result<(), TrackerError> {
    if status == reqwest::StatusCode::UNAUTHORIZED || status == reqwest::StatusCode::FORBIDDEN {
        return Err(TrackerError::AuthError(format!(
            "{} credentials are invalid or unauthorized for {}",
            provider, resource
        )));
    }
    if status == reqwest::StatusCode::NOT_FOUND {
        return Err(TrackerError::NotFound(format!(
            "{} resource '{}' not found",
            provider, resource
        )));
    }
    if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
        return Err(TrackerError::RateLimited(format!(
            "{} rate limit exceeded",
            provider
        )));
    }
    if !status.is_success() {
        return Err(TrackerError::ProviderError(format!(
            "{} error status: {}",
            provider, status
        )));
    }
    Ok(())
}

#[async_trait]
pub trait IssueTrackerAdapter: Send + Sync {
    fn provider_name(&self) -> &'static str;
    async fn test_connection(&self) -> Result<ConnectionPreview, TrackerError>;
    async fn fetch_backlog(&self, query: &TrackerQuery)
        -> Result<Vec<ExternalStory>, TrackerError>;
    async fn sync_estimate(&self, external_id: &str, points: u32) -> Result<(), TrackerError>;
    async fn post_summary_comment(
        &self,
        external_id: &str,
        comment: &str,
    ) -> Result<(), TrackerError>;
    async fn push_slices(
        &self,
        parent_id: &str,
        slices: &[StorySlice],
    ) -> Result<Vec<ExternalStory>, TrackerError>;
}

// -----------------------------------------------------------------------------
// Factory Helper
// -----------------------------------------------------------------------------

pub fn create_adapter(config: TrackerConfig) -> Box<dyn IssueTrackerAdapter> {
    match config {
        TrackerConfig::Linear { api_key, endpoint } => {
            Box::new(LinearAdapter::new(api_key, endpoint))
        }
        TrackerConfig::GitHub {
            personal_access_token,
            owner,
            repo,
            endpoint,
        } => Box::new(GitHubAdapter::new(
            personal_access_token,
            owner,
            repo,
            endpoint,
        )),
        TrackerConfig::Jira {
            domain,
            email,
            api_token,
            project_key,
            endpoint,
            points_field,
        } => Box::new(JiraAdapter::new(
            domain,
            email,
            api_token,
            project_key,
            endpoint,
            points_field,
        )),
    }
}

// -----------------------------------------------------------------------------
// Mock Adapter for Contract & Error Testing
// -----------------------------------------------------------------------------

#[derive(Debug, Default, Clone)]
struct MockState {
    stories: Vec<ExternalStory>,
    estimates: HashMap<String, u32>,
    comments: HashMap<String, Vec<String>>,
    simulate_auth_failure: bool,
    simulate_rate_limit: bool,
}

#[derive(Clone, Default)]
pub struct MockTrackerAdapter {
    state: Arc<Mutex<MockState>>,
}

impl MockTrackerAdapter {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn add_story(&self, story: ExternalStory) {
        let mut state = self.state.lock().unwrap();
        state.stories.push(story);
    }

    pub fn set_simulate_auth_failure(&self, fail: bool) {
        let mut state = self.state.lock().unwrap();
        state.simulate_auth_failure = fail;
    }

    pub fn set_simulate_rate_limit(&self, rate_limited: bool) {
        let mut state = self.state.lock().unwrap();
        state.simulate_rate_limit = rate_limited;
    }

    pub fn get_recorded_estimate(&self, id: &str) -> Option<u32> {
        let state = self.state.lock().unwrap();
        state.estimates.get(id).cloned()
    }

    pub fn get_recorded_comments(&self, id: &str) -> Vec<String> {
        let state = self.state.lock().unwrap();
        state.comments.get(id).cloned().unwrap_or_default()
    }
}

#[async_trait]
impl IssueTrackerAdapter for MockTrackerAdapter {
    fn provider_name(&self) -> &'static str {
        "Linear"
    }

    async fn test_connection(&self) -> Result<ConnectionPreview, TrackerError> {
        let state = self.state.lock().unwrap();
        if state.simulate_auth_failure {
            return Err(TrackerError::AuthError("Invalid token".to_string()));
        }
        if state.simulate_rate_limit {
            return Err(TrackerError::RateLimited("Rate limit exceeded".to_string()));
        }

        Ok(ConnectionPreview {
            provider: TrackerProvider::Linear,
            authenticated: true,
            user_name: Some("Mock User".to_string()),
            teams: vec![TrackerEntity {
                id: "team-1".to_string(),
                name: "Core Team".to_string(),
                extra: Some("CORE".to_string()),
            }],
            cycles: vec![TrackerEntity {
                id: "cycle-10".to_string(),
                name: "Sprint 10".to_string(),
                extra: Some("10".to_string()),
            }],
            projects: vec![TrackerEntity {
                id: "proj-1".to_string(),
                name: "Scrum Poker AI".to_string(),
                extra: None,
            }],
            sprints: vec![],
            milestones: vec![],
        })
    }

    async fn fetch_backlog(
        &self,
        _query: &TrackerQuery,
    ) -> Result<Vec<ExternalStory>, TrackerError> {
        let state = self.state.lock().unwrap();
        if state.simulate_auth_failure {
            return Err(TrackerError::AuthError("Invalid token".to_string()));
        }
        if state.simulate_rate_limit {
            return Err(TrackerError::RateLimited("Rate limit exceeded".to_string()));
        }
        Ok(state.stories.clone())
    }

    async fn sync_estimate(&self, external_id: &str, points: u32) -> Result<(), TrackerError> {
        let mut state = self.state.lock().unwrap();
        if state.simulate_rate_limit {
            return Err(TrackerError::RateLimited("Rate limit exceeded".to_string()));
        }
        state.estimates.insert(external_id.to_string(), points);
        Ok(())
    }

    async fn post_summary_comment(
        &self,
        external_id: &str,
        comment: &str,
    ) -> Result<(), TrackerError> {
        let mut state = self.state.lock().unwrap();
        state
            .comments
            .entry(external_id.to_string())
            .or_default()
            .push(comment.to_string());
        Ok(())
    }

    async fn push_slices(
        &self,
        parent_id: &str,
        slices: &[StorySlice],
    ) -> Result<Vec<ExternalStory>, TrackerError> {
        let mut state = self.state.lock().unwrap();
        let parent_key = state
            .stories
            .iter()
            .find(|s| s.id == parent_id || s.key == parent_id)
            .map(|s| s.key.clone())
            .unwrap_or_else(|| parent_id.to_string());

        let mut created = Vec::new();
        for (i, slice) in slices.iter().enumerate() {
            let child = ExternalStory {
                id: format!("{}-s{}", parent_id, i + 1),
                key: format!("{}-S{}", parent_key, i + 1),
                title: slice.title.clone(),
                description: slice.description.clone(),
                acceptance_criteria: slice.acceptance_criteria.clone(),
                url: Some(format!(
                    "https://tracker.app/issue/{}-S{}",
                    parent_key,
                    i + 1
                )),
                current_estimate: slice.estimated_points,
                status: Some("Todo".to_string()),
            };
            state.stories.push(child.clone());
            created.push(child);
        }

        Ok(created)
    }
}

// -----------------------------------------------------------------------------
// Linear Adapter (Live GraphQL Client)
// -----------------------------------------------------------------------------

pub struct LinearAdapter {
    api_key: String,
    endpoint: String,
    http_client: reqwest::Client,
}

impl LinearAdapter {
    pub fn new(api_key: String, endpoint: Option<String>) -> Self {
        Self {
            api_key,
            endpoint: endpoint.unwrap_or_else(|| "https://api.linear.app/graphql".to_string()),
            http_client: reqwest::Client::new(),
        }
    }
}

#[async_trait]
impl IssueTrackerAdapter for LinearAdapter {
    fn provider_name(&self) -> &'static str {
        "Linear"
    }

    async fn test_connection(&self) -> Result<ConnectionPreview, TrackerError> {
        let query = r#"
            query TestConnection {
                viewer {
                    name
                }
                teams {
                    nodes {
                        id
                        name
                        key
                    }
                }
                projects {
                    nodes {
                        id
                        name
                    }
                }
            }
        "#;

        let payload = serde_json::json!({
            "query": query
        });

        let res = self
            .http_client
            .post(&self.endpoint)
            .header("Authorization", &self.api_key)
            .json(&payload)
            .send()
            .await
            .map_err(|e| TrackerError::NetworkError(e.to_string()))?;

        check_tracker_status(res.status(), "Linear", "API connection")?;

        let json: serde_json::Value = res
            .json()
            .await
            .map_err(|e| TrackerError::ProviderError(e.to_string()))?;

        if let Some(errors) = json.get("errors") {
            return Err(TrackerError::ProviderError(errors.to_string()));
        }

        let data = json.get("data").ok_or_else(|| {
            TrackerError::ProviderError("Empty data in Linear response".to_string())
        })?;
        let user_name = data
            .get("viewer")
            .and_then(|v| v.get("name"))
            .and_then(|n| n.as_str())
            .map(|s| s.to_string());

        let teams = data
            .get("teams")
            .and_then(|t| t.get("nodes"))
            .and_then(|n| n.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|item| {
                        let id = item.get("id")?.as_str()?.to_string();
                        let name = item.get("name")?.as_str()?.to_string();
                        let key = item
                            .get("key")
                            .and_then(|k| k.as_str())
                            .map(|s| s.to_string());
                        Some(TrackerEntity {
                            id,
                            name,
                            extra: key,
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();

        let projects = data
            .get("projects")
            .and_then(|p| p.get("nodes"))
            .and_then(|n| n.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|item| {
                        let id = item.get("id")?.as_str()?.to_string();
                        let name = item.get("name")?.as_str()?.to_string();
                        Some(TrackerEntity {
                            id,
                            name,
                            extra: None,
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();

        Ok(ConnectionPreview {
            provider: TrackerProvider::Linear,
            authenticated: true,
            user_name,
            teams,
            cycles: vec![],
            projects,
            sprints: vec![],
            milestones: vec![],
        })
    }

    async fn fetch_backlog(
        &self,
        query: &TrackerQuery,
    ) -> Result<Vec<ExternalStory>, TrackerError> {
        let gql_query = r#"
            query FetchIssues($filter: IssueFilter) {
                issues(filter: $filter, first: 50) {
                    nodes {
                        id
                        identifier
                        title
                        description
                        estimate
                        url
                        state {
                            name
                        }
                    }
                }
            }
        "#;

        let mut filter = serde_json::Map::new();
        if let Some(ref team_id) = query.team_id {
            filter.insert(
                "team".to_string(),
                serde_json::json!({ "id": { "eq": team_id } }),
            );
        }
        if let Some(ref cycle_id) = query.cycle_id {
            filter.insert(
                "cycle".to_string(),
                serde_json::json!({ "id": { "eq": cycle_id } }),
            );
        }
        if let Some(ref project_id) = query.project_id {
            filter.insert(
                "project".to_string(),
                serde_json::json!({ "id": { "eq": project_id } }),
            );
        }

        let payload = serde_json::json!({
            "query": gql_query,
            "variables": {
                "filter": filter
            }
        });

        let res = self
            .http_client
            .post(&self.endpoint)
            .header("Authorization", &self.api_key)
            .json(&payload)
            .send()
            .await
            .map_err(|e| TrackerError::NetworkError(e.to_string()))?;

        let json: serde_json::Value = res
            .json()
            .await
            .map_err(|e| TrackerError::ProviderError(e.to_string()))?;

        if let Some(errors) = json.get("errors") {
            return Err(TrackerError::ProviderError(errors.to_string()));
        }

        let nodes = json
            .get("data")
            .and_then(|d| d.get("issues"))
            .and_then(|i| i.get("nodes"))
            .and_then(|n| n.as_array())
            .cloned()
            .unwrap_or_default();

        let mut stories = Vec::new();
        for node in nodes {
            let id = node
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string();
            let key = node
                .get("identifier")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string();
            let title = node
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string();
            let description = node
                .get("description")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string();
            let ac = extract_acceptance_criteria(&description);
            let url = node
                .get("url")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let current_estimate = node
                .get("estimate")
                .and_then(|v| v.as_u64())
                .map(|n| n as u32);
            let status = node
                .get("state")
                .and_then(|s| s.get("name"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            stories.push(ExternalStory {
                id,
                key,
                title,
                description,
                acceptance_criteria: ac,
                url,
                current_estimate,
                status,
            });
        }

        Ok(stories)
    }

    async fn sync_estimate(&self, external_id: &str, points: u32) -> Result<(), TrackerError> {
        let mutation = r#"
            mutation UpdateIssueEstimate($id: String!, $estimate: Float) {
                issueUpdate(id: $id, input: { estimate: $estimate }) {
                    success
                }
            }
        "#;

        let payload = serde_json::json!({
            "query": mutation,
            "variables": {
                "id": external_id,
                "estimate": points
            }
        });

        let res = self
            .http_client
            .post(&self.endpoint)
            .header("Authorization", &self.api_key)
            .json(&payload)
            .send()
            .await
            .map_err(|e| TrackerError::NetworkError(e.to_string()))?;

        if !res.status().is_success() {
            return Err(TrackerError::ProviderError(format!(
                "Linear error status: {}",
                res.status()
            )));
        }

        let json: serde_json::Value = res
            .json()
            .await
            .map_err(|e| TrackerError::ProviderError(e.to_string()))?;

        if let Some(errors) = json.get("errors").and_then(|e| e.as_array()) {
            if !errors.is_empty() {
                let msg = errors[0]
                    .get("message")
                    .and_then(|m| m.as_str())
                    .unwrap_or("Linear GraphQL error");
                return Err(TrackerError::ProviderError(msg.to_string()));
            }
        }

        Ok(())
    }

    async fn post_summary_comment(
        &self,
        external_id: &str,
        comment: &str,
    ) -> Result<(), TrackerError> {
        let mutation = r#"
            mutation CreateComment($issueId: String!, $body: String!) {
                commentCreate(input: { issueId: $issueId, body: $body }) {
                    success
                }
            }
        "#;

        let payload = serde_json::json!({
            "query": mutation,
            "variables": {
                "issueId": external_id,
                "body": comment
            }
        });

        let res = self
            .http_client
            .post(&self.endpoint)
            .header("Authorization", &self.api_key)
            .json(&payload)
            .send()
            .await
            .map_err(|e| TrackerError::NetworkError(e.to_string()))?;

        if !res.status().is_success() {
            return Err(TrackerError::ProviderError(format!(
                "Linear error status: {}",
                res.status()
            )));
        }

        let json: serde_json::Value = res
            .json()
            .await
            .map_err(|e| TrackerError::ProviderError(e.to_string()))?;

        if let Some(errors) = json.get("errors").and_then(|e| e.as_array()) {
            if !errors.is_empty() {
                let msg = errors[0]
                    .get("message")
                    .and_then(|m| m.as_str())
                    .unwrap_or("Linear GraphQL error");
                return Err(TrackerError::ProviderError(msg.to_string()));
            }
        }

        Ok(())
    }

    async fn push_slices(
        &self,
        parent_id: &str,
        slices: &[StorySlice],
    ) -> Result<Vec<ExternalStory>, TrackerError> {
        let mut created = Vec::new();
        for (_i, slice) in slices.iter().enumerate() {
            let mutation = r#"
                mutation CreateSubIssue($parentId: String!, $title: String!, $description: String, $estimate: Float) {
                    issueCreate(input: { parentId: $parentId, title: $title, description: $description, estimate: $estimate }) {
                        success
                        issue {
                            id
                            identifier
                            url
                        }
                    }
                }
            "#;

            let payload = serde_json::json!({
                "query": mutation,
                "variables": {
                    "parentId": parent_id,
                    "title": slice.title,
                    "description": slice.description,
                    "estimate": slice.estimated_points
                }
            });

            let res = self
                .http_client
                .post(&self.endpoint)
                .header("Authorization", &self.api_key)
                .json(&payload)
                .send()
                .await
                .map_err(|e| TrackerError::NetworkError(e.to_string()))?;

            if !res.status().is_success() {
                return Err(TrackerError::ProviderError(format!(
                    "Linear error status: {}",
                    res.status()
                )));
            }

            let json: serde_json::Value = res
                .json()
                .await
                .map_err(|e| TrackerError::ProviderError(e.to_string()))?;

            if let Some(errors) = json.get("errors").and_then(|e| e.as_array()) {
                if !errors.is_empty() {
                    let msg = errors[0]
                        .get("message")
                        .and_then(|m| m.as_str())
                        .unwrap_or("Linear GraphQL error");
                    return Err(TrackerError::ProviderError(msg.to_string()));
                }
            }

            let issue_node = json
                .get("data")
                .and_then(|d| d.get("issueCreate"))
                .and_then(|ic| ic.get("issue"));

            let (id, key, url) = if let Some(n) = issue_node {
                (
                    n.get("id")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    n.get("identifier")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    n.get("url").and_then(|v| v.as_str()).map(|s| s.to_string()),
                )
            } else {
                return Err(TrackerError::ProviderError(
                    "Linear issueCreate returned no issue data".to_string(),
                ));
            };

            created.push(ExternalStory {
                id,
                key,
                title: slice.title.clone(),
                description: slice.description.clone(),
                acceptance_criteria: slice.acceptance_criteria.clone(),
                url,
                current_estimate: slice.estimated_points,
                status: Some("Todo".to_string()),
            });
        }
        Ok(created)
    }
}

// -----------------------------------------------------------------------------
// GitHub Issues Adapter (REST/GraphQL Client)
// -----------------------------------------------------------------------------

pub struct GitHubAdapter {
    pat: String,
    owner: String,
    repo: String,
    base_url: String,
    http_client: reqwest::Client,
}

impl GitHubAdapter {
    pub fn new(pat: String, owner: String, repo: String, endpoint: Option<String>) -> Self {
        Self {
            pat,
            owner,
            repo,
            base_url: endpoint.unwrap_or_else(|| "https://api.github.com".to_string()),
            http_client: reqwest::Client::new(),
        }
    }
}

#[async_trait]
impl IssueTrackerAdapter for GitHubAdapter {
    fn provider_name(&self) -> &'static str {
        "GitHub"
    }

    async fn test_connection(&self) -> Result<ConnectionPreview, TrackerError> {
        let url = format!("{}/repos/{}/{}", self.base_url, self.owner, self.repo);
        let res = self
            .http_client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.pat))
            .header("User-Agent", "ScrumPokrAI")
            .send()
            .await
            .map_err(|e| TrackerError::NetworkError(e.to_string()))?;

        check_tracker_status(
            res.status(),
            "GitHub",
            &format!("{}/{}", self.owner, self.repo),
        )?;

        let milestones_url = format!(
            "{}/repos/{}/{}/milestones",
            self.base_url, self.owner, self.repo
        );
        let milestones_res = self
            .http_client
            .get(&milestones_url)
            .header("Authorization", format!("Bearer {}", self.pat))
            .header("User-Agent", "ScrumPokrAI")
            .send()
            .await;

        let milestones = if let Ok(m_res) = milestones_res {
            m_res
                .json::<Vec<serde_json::Value>>()
                .await
                .map(|arr| {
                    arr.into_iter()
                        .filter_map(|m| {
                            let id = m.get("number")?.as_i64()?.to_string();
                            let name = m.get("title")?.as_str()?.to_string();
                            Some(TrackerEntity {
                                id,
                                name,
                                extra: None,
                            })
                        })
                        .collect()
                })
                .unwrap_or_default()
        } else {
            vec![]
        };

        Ok(ConnectionPreview {
            provider: TrackerProvider::GitHub,
            authenticated: true,
            user_name: Some(self.owner.clone()),
            teams: vec![],
            cycles: vec![],
            projects: vec![],
            sprints: vec![],
            milestones,
        })
    }

    async fn fetch_backlog(
        &self,
        query: &TrackerQuery,
    ) -> Result<Vec<ExternalStory>, TrackerError> {
        let mut url = format!(
            "{}/repos/{}/{}/issues?state=open",
            self.base_url, self.owner, self.repo
        );
        if let Some(ref m) = query.milestone {
            url.push_str(&format!("&milestone={}", urlencoding::encode(m)));
        }

        let res = self
            .http_client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.pat))
            .header("User-Agent", "ScrumPokrAI")
            .send()
            .await
            .map_err(|e| TrackerError::NetworkError(e.to_string()))?;

        check_tracker_status(
            res.status(),
            "GitHub",
            &format!("{}/{}", self.owner, self.repo),
        )?;

        let issues: Vec<serde_json::Value> = res
            .json()
            .await
            .map_err(|e| TrackerError::ProviderError(e.to_string()))?;
        let mut stories = Vec::new();

        for issue in issues {
            if issue.get("pull_request").is_some() {
                continue; // Skip PRs
            }
            let number = issue.get("number").and_then(|n| n.as_i64()).unwrap_or(0);
            let id = issue
                .get("id")
                .and_then(|n| n.as_i64())
                .map(|n| n.to_string())
                .unwrap_or_else(|| number.to_string());
            let title = issue
                .get("title")
                .and_then(|t| t.as_str())
                .unwrap_or("")
                .to_string();
            let body = issue
                .get("body")
                .and_then(|b| b.as_str())
                .unwrap_or("")
                .to_string();
            let html_url = issue
                .get("html_url")
                .and_then(|u| u.as_str())
                .map(|s| s.to_string());
            let ac = extract_acceptance_criteria(&body);

            let mut current_points = None;
            if let Some(labels) = issue.get("labels").and_then(|l| l.as_array()) {
                for label in labels {
                    if let Some(name) = label.get("name").and_then(|n| n.as_str()) {
                        if let Some(pts_str) = name.strip_prefix("points:") {
                            if let Ok(pts) = pts_str.trim().parse::<u32>() {
                                current_points = Some(pts);
                            }
                        }
                    }
                }
            }

            stories.push(ExternalStory {
                id,
                key: format!("#{}", number),
                title,
                description: body,
                acceptance_criteria: ac,
                url: html_url,
                current_estimate: current_points,
                status: Some("Open".to_string()),
            });
        }

        Ok(stories)
    }

    async fn sync_estimate(&self, external_id: &str, points: u32) -> Result<(), TrackerError> {
        let issue_num = external_id.trim_start_matches('#');
        let label_url = format!(
            "{}/repos/{}/{}/issues/{}/labels",
            self.base_url, self.owner, self.repo, issue_num
        );

        let payload = serde_json::json!({
            "labels": [format!("points:{}", points)]
        });

        let res = self
            .http_client
            .post(&label_url)
            .header("Authorization", format!("Bearer {}", self.pat))
            .header("User-Agent", "ScrumPokrAI")
            .json(&payload)
            .send()
            .await
            .map_err(|e| TrackerError::NetworkError(e.to_string()))?;

        check_tracker_status(res.status(), "GitHub", &format!("issue #{}", issue_num))?;

        Ok(())
    }

    async fn post_summary_comment(
        &self,
        external_id: &str,
        comment: &str,
    ) -> Result<(), TrackerError> {
        let issue_num = external_id.trim_start_matches('#');
        let comment_url = format!(
            "{}/repos/{}/{}/issues/{}/comments",
            self.base_url, self.owner, self.repo, issue_num
        );

        let payload = serde_json::json!({
            "body": comment
        });

        let res = self
            .http_client
            .post(&comment_url)
            .header("Authorization", format!("Bearer {}", self.pat))
            .header("User-Agent", "ScrumPokrAI")
            .json(&payload)
            .send()
            .await
            .map_err(|e| TrackerError::NetworkError(e.to_string()))?;

        check_tracker_status(res.status(), "GitHub", &format!("issue #{}", issue_num))?;

        Ok(())
    }

    async fn push_slices(
        &self,
        parent_id: &str,
        slices: &[StorySlice],
    ) -> Result<Vec<ExternalStory>, TrackerError> {
        let parent_ref = if parent_id.starts_with('#') {
            parent_id.to_string()
        } else {
            format!("#{}", parent_id)
        };
        let mut created = Vec::new();

        for slice in slices {
            let url = format!(
                "{}/repos/{}/{}/issues",
                self.base_url, self.owner, self.repo
            );
            let body = format!(
                "Parent: {}\n\n{}\n\n### Acceptance Criteria\n{}",
                parent_ref,
                slice.description,
                slice
                    .acceptance_criteria
                    .iter()
                    .map(|ac| format!("- [ ] {}", ac))
                    .collect::<Vec<_>>()
                    .join("\n")
            );

            let mut labels = vec!["sub-task".to_string()];
            if let Some(pts) = slice.estimated_points {
                labels.push(format!("points: {}", pts));
            }

            let payload = serde_json::json!({
                "title": slice.title,
                "body": body,
                "labels": labels
            });

            let res = self
                .http_client
                .post(&url)
                .header("Authorization", format!("Bearer {}", self.pat))
                .header("User-Agent", "ScrumPokrAI")
                .json(&payload)
                .send()
                .await
                .map_err(|e| TrackerError::NetworkError(e.to_string()))?;

            check_tracker_status(res.status(), "GitHub", parent_id)?;

            let json: serde_json::Value = res.json().await.unwrap_or_default();
            let number = json.get("number").and_then(|n| n.as_i64()).unwrap_or(0);
            let id = json
                .get("id")
                .and_then(|n| n.as_i64())
                .map(|n| n.to_string())
                .unwrap_or_else(|| number.to_string());
            let html_url = json
                .get("html_url")
                .and_then(|u| u.as_str())
                .map(|s| s.to_string());

            created.push(ExternalStory {
                id,
                key: format!("#{}", number),
                title: slice.title.clone(),
                description: slice.description.clone(),
                acceptance_criteria: slice.acceptance_criteria.clone(),
                url: html_url,
                current_estimate: slice.estimated_points,
                status: Some("Open".to_string()),
            });
        }

        Ok(created)
    }
}

// -----------------------------------------------------------------------------
// Jira Cloud Adapter (REST API v3 Client)
// -----------------------------------------------------------------------------

pub struct JiraAdapter {
    domain: String,
    email: String,
    api_token: String,
    project_key: String,
    base_url: String,
    points_field: String,
    http_client: reqwest::Client,
}

impl JiraAdapter {
    pub fn new(
        domain: String,
        email: String,
        api_token: String,
        project_key: String,
        endpoint: Option<String>,
        points_field: Option<String>,
    ) -> Self {
        let base_url =
            endpoint.unwrap_or_else(|| format!("https://{}.atlassian.net/rest/api/3", domain));
        let points_field = points_field.unwrap_or_else(|| "customfield_10016".to_string());
        Self {
            domain,
            email,
            api_token,
            project_key,
            base_url,
            points_field,
            http_client: reqwest::Client::new(),
        }
    }

    fn auth_header(&self) -> String {
        let creds = format!("{}:{}", self.email, self.api_token);
        format!("Basic {}", BASE64_STANDARD.encode(creds.as_bytes()))
    }

    fn adf_to_text(node: &serde_json::Value) -> String {
        match node {
            serde_json::Value::String(s) => s.clone(),
            serde_json::Value::Object(map) => {
                if map.get("type").and_then(|t| t.as_str()) == Some("text") {
                    return map
                        .get("text")
                        .and_then(|t| t.as_str())
                        .unwrap_or_default()
                        .to_string();
                }
                let inner = map
                    .get("content")
                    .map(Self::adf_to_text)
                    .unwrap_or_default();
                match map.get("type").and_then(|t| t.as_str()) {
                    Some("paragraph") | Some("listItem") | Some("heading") => {
                        format!("{}\n", inner)
                    }
                    _ => inner,
                }
            }
            serde_json::Value::Array(items) => items
                .iter()
                .map(Self::adf_to_text)
                .collect::<Vec<_>>()
                .join(""),
            _ => String::new(),
        }
    }
}

#[async_trait]
impl IssueTrackerAdapter for JiraAdapter {
    fn provider_name(&self) -> &'static str {
        "Jira"
    }

    async fn test_connection(&self) -> Result<ConnectionPreview, TrackerError> {
        let url = format!("{}/myself", self.base_url);
        let res = self
            .http_client
            .get(&url)
            .header("Authorization", self.auth_header())
            .send()
            .await
            .map_err(|e| TrackerError::NetworkError(e.to_string()))?;

        check_tracker_status(res.status(), "Jira", &self.project_key)?;

        let user_json: serde_json::Value = res.json().await.unwrap_or_default();
        let display_name = user_json
            .get("displayName")
            .and_then(|n| n.as_str())
            .map(|s| s.to_string());

        Ok(ConnectionPreview {
            provider: TrackerProvider::Jira,
            authenticated: true,
            user_name: display_name,
            teams: vec![],
            cycles: vec![],
            projects: vec![TrackerEntity {
                id: self.project_key.clone(),
                name: self.project_key.clone(),
                extra: None,
            }],
            sprints: vec![],
            milestones: vec![],
        })
    }

    async fn fetch_backlog(
        &self,
        query: &TrackerQuery,
    ) -> Result<Vec<ExternalStory>, TrackerError> {
        let jql = query.jql.clone().unwrap_or_else(|| {
            format!(
                "project = \"{}\" AND statusCategory != Done ORDER BY created DESC",
                self.project_key
            )
        });

        let search_endpoint =
            if self.base_url.ends_with("/search") || self.base_url.ends_with("/search/jql") {
                self.base_url.clone()
            } else {
                format!("{}/search/jql", self.base_url)
            };

        let payload = serde_json::json!({
            "jql": jql,
            "fields": ["summary", "description", "status", &self.points_field],
            "maxResults": 50
        });

        let res = self
            .http_client
            .post(&search_endpoint)
            .header("Authorization", self.auth_header())
            .json(&payload)
            .send()
            .await
            .map_err(|e| TrackerError::NetworkError(e.to_string()))?;

        check_tracker_status(res.status(), "Jira", &self.project_key)?;

        let json: serde_json::Value = res
            .json()
            .await
            .map_err(|e| TrackerError::ProviderError(e.to_string()))?;

        let issues = json
            .get("issues")
            .and_then(|i| i.as_array())
            .cloned()
            .unwrap_or_default();

        let mut stories = Vec::new();
        for issue in issues {
            let id = issue
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let key = issue
                .get("key")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let fields = issue.get("fields");
            let title = fields
                .and_then(|f| f.get("summary"))
                .and_then(|s| s.as_str())
                .unwrap_or("")
                .to_string();
            let description = fields
                .and_then(|f| f.get("description"))
                .map(Self::adf_to_text)
                .unwrap_or_default();
            let acceptance_criteria = extract_acceptance_criteria(&description);
            let status = fields
                .and_then(|f| f.get("status"))
                .and_then(|s| s.get("name"))
                .and_then(|n| n.as_str())
                .map(|s| s.to_string());
            let current_estimate = fields
                .and_then(|f| f.get(&self.points_field))
                .and_then(|p| p.as_f64())
                .map(|n| n as u32);
            let url = Some(format!(
                "https://{}.atlassian.net/browse/{}",
                self.domain, key
            ));

            stories.push(ExternalStory {
                id,
                key,
                title,
                description,
                acceptance_criteria,
                url,
                current_estimate,
                status,
            });
        }

        Ok(stories)
    }

    async fn sync_estimate(&self, external_id: &str, points: u32) -> Result<(), TrackerError> {
        let url = format!("{}/issue/{}", self.base_url, external_id);
        let payload = serde_json::json!({
            "fields": {
                &self.points_field: points
            }
        });

        let res = self
            .http_client
            .put(&url)
            .header("Authorization", self.auth_header())
            .json(&payload)
            .send()
            .await
            .map_err(|e| TrackerError::NetworkError(e.to_string()))?;

        check_tracker_status(res.status(), "Jira", external_id)?;

        Ok(())
    }

    async fn post_summary_comment(
        &self,
        external_id: &str,
        comment: &str,
    ) -> Result<(), TrackerError> {
        let url = format!("{}/issue/{}/comment", self.base_url, external_id);
        let payload = serde_json::json!({
            "body": {
                "type": "doc",
                "version": 1,
                "content": [
                    {
                        "type": "paragraph",
                        "content": [
                            {
                                "type": "text",
                                "text": comment
                            }
                        ]
                    }
                ]
            }
        });

        let res = self
            .http_client
            .post(&url)
            .header("Authorization", self.auth_header())
            .json(&payload)
            .send()
            .await
            .map_err(|e| TrackerError::NetworkError(e.to_string()))?;

        check_tracker_status(res.status(), "Jira", external_id)?;

        Ok(())
    }

    async fn push_slices(
        &self,
        parent_id: &str,
        slices: &[StorySlice],
    ) -> Result<Vec<ExternalStory>, TrackerError> {
        let mut created = Vec::new();
        for slice in slices {
            let url = format!("{}/issue", self.base_url);
            let mut fields = serde_json::json!({
                "project": { "key": self.project_key },
                "parent": { "id": parent_id },
                "summary": slice.title,
                "issuetype": { "name": "Sub-task" }
            });

            if let Some(pts) = slice.estimated_points {
                fields
                    .as_object_mut()
                    .unwrap()
                    .insert(self.points_field.clone(), serde_json::json!(pts));
            }

            let payload = serde_json::json!({ "fields": fields });
            let res = self
                .http_client
                .post(&url)
                .header("Authorization", self.auth_header())
                .json(&payload)
                .send()
                .await
                .map_err(|e| TrackerError::NetworkError(e.to_string()))?;

            check_tracker_status(res.status(), "Jira", parent_id)?;

            let json: serde_json::Value = res.json().await.unwrap_or_default();
            let id = json
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let key = json
                .get("key")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let url = Some(format!(
                "https://{}.atlassian.net/browse/{}",
                self.domain, key
            ));

            created.push(ExternalStory {
                id,
                key,
                title: slice.title.clone(),
                description: slice.description.clone(),
                acceptance_criteria: slice.acceptance_criteria.clone(),
                url,
                current_estimate: slice.estimated_points,
                status: Some("To Do".to_string()),
            });
        }
        Ok(created)
    }
}
