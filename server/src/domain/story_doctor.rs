use crate::domain::models::Story;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum InvestCriterion {
    Independent,
    Negotiable,
    Valuable,
    Estimable,
    Small,
    Testable,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct InvestCriterionResult {
    pub criterion: InvestCriterion,
    pub name: String,
    pub passed: bool,
    pub score: u32,
    pub observation: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recommendation: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct InvestScorecard {
    pub overall_score: u32,
    pub criteria: Vec<InvestCriterionResult>,
    pub summary: String,
    pub issues: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ComplexitySummary {
    pub data_models: String,
    pub dependencies_apis: String,
    pub blast_radius: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EdgeCaseCategoryType {
    ErrorFailure,
    EmptyBoundary,
    ConcurrencyRaces,
    PermissionsAccess,
}

impl EdgeCaseCategoryType {
    pub fn display_name(&self) -> &'static str {
        match self {
            EdgeCaseCategoryType::ErrorFailure => "Error & Failure States",
            EdgeCaseCategoryType::EmptyBoundary => "Empty & Boundary States",
            EdgeCaseCategoryType::ConcurrencyRaces => "Concurrency & Race Conditions",
            EdgeCaseCategoryType::PermissionsAccess => "Permissions & Access",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EdgeCaseItem {
    pub id: String,
    pub category: EdgeCaseCategoryType,
    pub category_name: String,
    pub title: String,
    pub description: String,
    pub checked: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct StoryDoctorReport {
    pub story_id: String,
    pub scorecard: InvestScorecard,
    pub complexity: ComplexitySummary,
    pub edge_cases: Vec<EdgeCaseItem>,
}

pub fn generate_story_doctor_report(story: &Story) -> StoryDoctorReport {
    let scorecard = evaluate_invest_scorecard(story);
    let complexity = analyze_3axis_complexity(story);
    let edge_cases = generate_4category_edge_cases(story);

    StoryDoctorReport {
        story_id: story.id.clone(),
        scorecard,
        complexity,
        edge_cases,
    }
}

pub fn evaluate_invest_scorecard(story: &Story) -> InvestScorecard {
    let mut criteria = Vec::with_capacity(6);
    let mut issues = Vec::new();
    let mut total_score = 0;

    // 1. Independent (Weight: 15)
    let dep_keywords = [
        "blocked by",
        "depends on",
        "dependency",
        "dependencies",
        "waiting on",
        "waiting for",
        "external team",
        "requires auth team",
        "requires backend team",
        "requires devops team",
        "prerequisite",
        "after this is completed",
        "needs completion of",
    ];

    let found_deps = story.find_matching_keywords(&dep_keywords);

    let independent_passed = found_deps.is_empty();
    let independent_score = if independent_passed { 15 } else { 0 };
    total_score += independent_score;

    let independent_obs = if independent_passed {
        "No external blockers or tight cross-team dependencies detected.".to_string()
    } else {
        let issue = format!(
            "External blocker or team dependency detected ('{}'). Story may not be independently estimable.",
            found_deps.join(", ")
        );
        issues.push(issue.clone());
        issue
    };

    criteria.push(InvestCriterionResult {
        criterion: InvestCriterion::Independent,
        name: "Independent".to_string(),
        passed: independent_passed,
        score: independent_score,
        observation: independent_obs,
        recommendation: if independent_passed {
            None
        } else {
            Some("Decouple external dependencies or agree on interface contracts before voting.".to_string())
        },
    });

    // 2. Negotiable (Weight: 10)
    let rigid_keywords = [
        "must hardcode",
        "must only modify file",
        "hardcoded",
        "do not change anything else",
        "exact sql query:",
        "specifically line",
    ];
    let found_rigid = story.find_matching_keywords(&rigid_keywords);

    let negotiable_passed = found_rigid.is_empty();
    let negotiable_score = if negotiable_passed { 10 } else { 0 };
    total_score += negotiable_score;

    let negotiable_obs = if negotiable_passed {
        "Focuses on user/system outcomes while preserving implementation flexibility for the team.".to_string()
    } else {
        let issue = format!(
            "Contains rigid implementation mandates ('{}') rather than negotiable outcomes.",
            found_rigid.join(", ")
        );
        issues.push(issue.clone());
        issue
    };

    criteria.push(InvestCriterionResult {
        criterion: InvestCriterion::Negotiable,
        name: "Negotiable".to_string(),
        passed: negotiable_passed,
        score: negotiable_score,
        observation: negotiable_obs,
        recommendation: if negotiable_passed {
            None
        } else {
            Some("Frame as user problems and acceptance criteria, leaving architecture details open to discussion.".to_string())
        },
    });

    // 3. Valuable (Weight: 20)
    let value_keywords = [
        "so that",
        "in order to",
        "as a",
        "benefit:",
        "value:",
        "allows users to",
        "enables users to",
        "enables team to",
        "so we can",
        "goal:",
        "to allow",
        "to help",
        "to improve",
        "to ensure",
    ];

    let valuable_passed = story.contains_any_keyword(&value_keywords);
    let valuable_score = if valuable_passed { 20 } else { 0 };
    total_score += valuable_score;

    let valuable_obs = if valuable_passed {
        "Clear user or business value statement identified.".to_string()
    } else {
        let issue = "Missing explicit user or business value statement (e.g. 'So that...').".to_string();
        issues.push(issue.clone());
        issue
    };

    criteria.push(InvestCriterionResult {
        criterion: InvestCriterion::Valuable,
        name: "Valuable".to_string(),
        passed: valuable_passed,
        score: valuable_score,
        observation: valuable_obs,
        recommendation: if valuable_passed {
            None
        } else {
            Some("Add a clear rationale or user benefit: 'As a [persona], I want [capability] so that [value]'.".to_string())
        },
    });

    // 4. Estimable (Weight: 20)
    let vague_keywords = [
        "etc.",
        "etc",
        "tbd",
        "t.b.d.",
        "details later",
        "make it fast",
        "fast and simple",
        "clean up stuff",
        "do whatever",
        "whatever is needed",
        "approx",
        "approximately",
        "and so on",
    ];

    let found_vague = story.find_matching_keywords(&vague_keywords);

    let estimable_passed = found_vague.is_empty();
    let estimable_score = if estimable_passed { 20 } else { 0 };
    total_score += estimable_score;

    let estimable_obs = if estimable_passed {
        "Scope is concrete and bounded without ambiguous quantifiers.".to_string()
    } else {
        let issue = format!(
            "Contains ambiguous phrasing ('{}') that increases estimate uncertainty.",
            found_vague.join(", ")
        );
        issues.push(issue.clone());
        issue
    };

    criteria.push(InvestCriterionResult {
        criterion: InvestCriterion::Estimable,
        name: "Estimable".to_string(),
        passed: estimable_passed,
        score: estimable_score,
        observation: estimable_obs,
        recommendation: if estimable_passed {
            None
        } else {
            Some("Replace vague placeholders with explicit constraints or split unknowns into a spike.".to_string())
        },
    });

    // 5. Small (Weight: 15)
    let multi_feature_indicators = [
        "and also",
        "in addition to building",
        "search engine, payment",
        "multiple features",
        "complete rewrite",
        "build everything",
    ];
    let is_oversized = story.is_oversized(&multi_feature_indicators);

    let small_passed = !is_oversized;
    let small_score = if small_passed { 15 } else { 0 };
    total_score += small_score;

    let small_obs = if small_passed {
        "Scope appears appropriately bounded for single-sprint delivery.".to_string()
    } else {
        let issue = "Story bundles multiple large features or exceeds 8 AC items; high risk of estimate divergence.".to_string();
        issues.push(issue.clone());
        issue
    };

    criteria.push(InvestCriterionResult {
        criterion: InvestCriterion::Small,
        name: "Small".to_string(),
        passed: small_passed,
        score: small_score,
        observation: small_obs,
        recommendation: if small_passed {
            None
        } else {
            Some("Use SPIDR vertical slicing to decompose this story into 2–4 smaller estimable items.".to_string())
        },
    });

    // 6. Testable (Weight: 20)
    let testable_passed = story.has_testable_criteria();
    let testable_score = if testable_passed { 20 } else { 0 };
    total_score += testable_score;

    let testable_obs = if testable_passed {
        format!(
            "Acceptance criteria provided ({} item(s)) with verifiable verification expectations.",
            story.acceptance_criteria.len().max(1)
        )
    } else {
        let issue = "Missing explicit acceptance criteria or verification checklist.".to_string();
        issues.push(issue.clone());
        issue
    };

    criteria.push(InvestCriterionResult {
        criterion: InvestCriterion::Testable,
        name: "Testable".to_string(),
        passed: testable_passed,
        score: testable_score,
        observation: testable_obs,
        recommendation: if testable_passed {
            None
        } else {
            Some("Add 2–4 bulleted acceptance criteria with expected behaviors and edge-case boundaries.".to_string())
        },
    });

    let summary = if total_score == 100 {
        "Story meets all INVEST criteria and is ready for team estimation.".to_string()
    } else if total_score >= 80 {
        "High quality story with minor recommendations.".to_string()
    } else if total_score >= 50 {
        "Moderate readiness; review highlighted criteria before opening votes.".to_string()
    } else {
        "Low readiness score; missing key criteria (e.g. acceptance criteria or value statements).".to_string()
    };

    InvestScorecard {
        overall_score: total_score,
        criteria,
        summary,
        issues,
    }
}

pub fn analyze_3axis_complexity(story: &Story) -> ComplexitySummary {
    // 1. Data Models
    let data_keywords = [
        "postgres", "database", "schema", "table", "migration", "cache", "redis", "index",
        "column", "persistence", "jsonb", "query", "sql", "model", "entity", "store",
    ];
    let matched_data = story.find_matching_keywords(&data_keywords);

    let data_models = if !matched_data.is_empty() {
        format!(
            "Database/persistence mutations involving {}, indexing, and state caching.",
            matched_data.join(", ")
        )
    } else {
        "Standard in-memory / UI state mutations without dedicated database schema alterations.".to_string()
    };

    // 2. Dependencies & APIs
    let api_keywords = [
        "api", "webhook", "websocket", "http", "rest", "graphql", "oauth", "token", "linear",
        "jira", "github", "stripe", "external", "third-party", "queue", "worker", "service",
    ];
    let matched_apis = story.find_matching_keywords(&api_keywords);

    let dependencies_apis = if !matched_apis.is_empty() {
        format!(
            "External service integration, protocol boundaries, or background jobs ({})",
            matched_apis.join(", ")
        )
    } else {
        "Internal application components with no external third-party API dependencies.".to_string()
    };

    // 3. Blast Radius
    let blast_keywords = [
        "downtime", "deployment", "migration", "auth", "security", "permission", "concurrency",
        "lock", "race", "active user", "session", "real-time", "latency", "sla", "backward",
        "regression", "export",
    ];
    let matched_blast = story.find_matching_keywords(&blast_keywords);

    let blast_radius = if !matched_blast.is_empty() {
        format!(
            "High impact on active user sessions, backward compatibility, or latency SLAs ({})",
            matched_blast.join(", ")
        )
    } else {
        "Isolated component change with low regression risk and localized failure blast radius.".to_string()
    };

    ComplexitySummary {
        data_models,
        dependencies_apis,
        blast_radius,
    }
}

pub fn generate_4category_edge_cases(story: &Story) -> Vec<EdgeCaseItem> {
    let mut items = Vec::with_capacity(4);

    // 1. Error & Failure States
    let (err_title, err_desc) = if story.contains_keyword_in_title_or_desc("webhook")
        || story.contains_keyword_in_title_or_desc("api")
        || story.contains_keyword_in_title_or_desc("tracker")
    {
        (
            "External API timeout or rate limit (HTTP 429)".to_string(),
            "Handling network drops, exponential backoff retries, and surfacing user-friendly error toasts.".to_string(),
        )
    } else if story.contains_keyword_in_title_or_desc("export")
        || story.contains_keyword_in_title_or_desc("csv")
    {
        (
            "Export format & payload sanitization failure".to_string(),
            "Handling special formula injection characters (=, +, -, @) and corrupt UTF-8 character sets.".to_string(),
        )
    } else {
        (
            "Network timeout or unexpected 5xx response".to_string(),
            "Graceful fallback behavior when server fails to respond or connection drops mid-request.".to_string(),
        )
    };

    items.push(EdgeCaseItem {
        id: format!("{}-ec-err", story.id),
        category: EdgeCaseCategoryType::ErrorFailure,
        category_name: EdgeCaseCategoryType::ErrorFailure.display_name().to_string(),
        title: err_title,
        description: err_desc,
        checked: false,
    });

    // 2. Empty & Boundary States
    let (empty_title, empty_desc) = if story.contains_keyword_in_title_or_desc("list")
        || story.contains_keyword_in_title_or_desc("backlog")
        || story.contains_keyword_in_title_or_desc("search")
    {
        (
            "Empty dataset (0 items returned)".to_string(),
            "Clear zero-state illustration and instructions when no records or matches exist.".to_string(),
        )
    } else if story.contains_keyword_in_title_or_desc("field")
        || story.contains_keyword_in_title_or_desc("input")
        || story.contains_keyword_in_title_or_desc("title")
    {
        (
            "String boundary length & unicode overflow".to_string(),
            "Max character constraints, emoji rendering, and whitespace-only submission prevention.".to_string(),
        )
    } else {
        (
            "Zero / boundary state and extreme payloads".to_string(),
            "Handling initial empty states, maximum payload boundaries, and non-ASCII character inputs.".to_string(),
        )
    };

    items.push(EdgeCaseItem {
        id: format!("{}-ec-empty", story.id),
        category: EdgeCaseCategoryType::EmptyBoundary,
        category_name: EdgeCaseCategoryType::EmptyBoundary.display_name().to_string(),
        title: empty_title,
        description: empty_desc,
        checked: false,
    });

    // 3. Concurrency & Race Conditions
    let (race_title, race_desc) = if story.contains_keyword_in_title_or_desc("vote")
        || story.contains_keyword_in_title_or_desc("real-time")
        || story.contains_keyword_in_title_or_desc("websocket")
    {
        (
            "Simultaneous multi-tab or multi-user mutations".to_string(),
            "Handling concurrent vote submissions or state flips across multiple tabs for the same participant.".to_string(),
        )
    } else if story.contains_keyword_in_title_or_desc("migration")
        || story.contains_keyword_in_title_or_desc("cache")
    {
        (
            "Stale cache reads during active database write".to_string(),
            "Ensuring transactional consistency and read-after-write coherence during high-concurrency loads.".to_string(),
        )
    } else {
        (
            "Rapid consecutive clicks / optimistic race condition".to_string(),
            "Debouncing rapid user actions and preventing out-of-order response reconciliation.".to_string(),
        )
    };

    items.push(EdgeCaseItem {
        id: format!("{}-ec-race", story.id),
        category: EdgeCaseCategoryType::ConcurrencyRaces,
        category_name: EdgeCaseCategoryType::ConcurrencyRaces.display_name().to_string(),
        title: race_title,
        description: race_desc,
        checked: false,
    });

    // 4. Permissions & Access
    let (perm_title, perm_desc) = if story.contains_keyword_in_title_or_desc("auth")
        || story.contains_keyword_in_title_or_desc("session")
        || story.contains_keyword_in_title_or_desc("token")
    {
        (
            "Expired session token or invalidated credentials".to_string(),
            "Automatic refresh attempt or clean redirect to login without corrupting ongoing work.".to_string(),
        )
    } else if story.contains_keyword_in_title_or_desc("facilitator")
        || story.contains_keyword_in_title_or_desc("role")
    {
        (
            "Observer attempting restricted facilitator action".to_string(),
            "Server-side authorization validation rejecting unauthorized role actions with clear error feedback.".to_string(),
        )
    } else {
        (
            "Unauthorized access & session recovery".to_string(),
            "Enforcing role privilege boundaries and secure reconnect recovery for dropped sessions.".to_string(),
        )
    };

    items.push(EdgeCaseItem {
        id: format!("{}-ec-perm", story.id),
        category: EdgeCaseCategoryType::PermissionsAccess,
        category_name: EdgeCaseCategoryType::PermissionsAccess.display_name().to_string(),
        title: perm_title,
        description: perm_desc,
        checked: false,
    });

    items
}

pub fn generate_story_doctor_prompt(story: &Story) -> String {
    let ac_formatted = if story.acceptance_criteria.is_empty() {
        "None provided".to_string()
    } else {
        story
            .acceptance_criteria
            .iter()
            .enumerate()
            .map(|(i, ac)| format!("{}. {}", i + 1, ac))
            .collect::<Vec<String>>()
            .join("\n")
    };

    format!(
        r#"You are an expert Agile Scrum Coach and Principal Technical Architect serving as Story Doctor.
Analyze the following user story for pre-vote refinement:

Story ID: {id}
Title: {title}
Description: {description}
Acceptance Criteria:
{ac}

Perform the following tasks:
1. INVEST Quality Audit:
   - Evaluate Independent, Negotiable, Valuable, Estimable, Small, Testable criteria.
   - Assign an overall readiness score (0-100%) and highlight missing criteria or ambiguous phrasing.

2. 3-Axis Technical Complexity Summary:
   - Data Models: Database mutations, schema changes, persistence, caching.
   - Dependencies & APIs: Background queues, external APIs, third-party libraries.
   - Blast Radius: User regressions, backwards compatibility, SLA risks.

3. 4-Category Edge Cases:
   - Error & Failure States (rate limits, network drops)
   - Empty & Boundary States (zero rows, max length)
   - Concurrency & Race Conditions (simultaneous writes, cache consistency)
   - Permissions & Access (unauthorized roles, token expiry)

Output valid JSON adhering to the StoryDoctorReport schema."#,
        id = story.id,
        title = story.title,
        description = story.description,
        ac = ac_formatted
    )
}
