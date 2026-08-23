use server::domain::markdown_parser::{
    export_csv_summary, export_markdown_summary, parse_markdown_backlog,
};
use server::domain::models::Story;
use std::collections::HashMap;

#[test]
fn test_parse_single_markdown_story_with_checklist() {
    let md = r#"# ENG-101: User Profile Page

Build the user profile page allowing users to update their avatar and bio.

### Acceptance Criteria
- [ ] User can upload avatar PNG/JPG
- [ ] User can edit display name and bio
- [ ] Profile changes persist across sessions
"#;

    let stories = parse_markdown_backlog(md);
    assert_eq!(stories.len(), 1);
    assert_eq!(stories[0].title, "ENG-101: User Profile Page");
    assert!(stories[0]
        .description
        .contains("Build the user profile page"));
    assert_eq!(stories[0].acceptance_criteria.len(), 3);
    assert_eq!(
        stories[0].acceptance_criteria[0],
        "User can upload avatar PNG/JPG"
    );
    assert_eq!(
        stories[0].acceptance_criteria[1],
        "User can edit display name and bio"
    );
    assert_eq!(
        stories[0].acceptance_criteria[2],
        "Profile changes persist across sessions"
    );
}

#[test]
fn test_parse_multiple_markdown_stories() {
    let md = r#"## Story 1: JWT Authentication
Implement token verification middleware.
- [ ] Validate Bearer token
- [ ] Handle expiry

## Story 2: Rate Limiter
Limit IP requests to 100/min.
- [ ] In-memory bucket
- [ ] Return 429 Too Many Requests
"#;

    let stories = parse_markdown_backlog(md);
    assert_eq!(stories.len(), 2);
    assert_eq!(stories[0].title, "Story 1: JWT Authentication");
    assert_eq!(stories[0].acceptance_criteria.len(), 2);
    assert_eq!(stories[1].title, "Story 2: Rate Limiter");
    assert_eq!(stories[1].acceptance_criteria.len(), 2);
}

#[test]
fn test_export_markdown_and_csv_summaries() {
    let stories = vec![
        Story {
            id: "s-1".to_string(),
            key: Some("ENG-101".to_string()),
            title: "JWT Authentication".to_string(),
            description: "Auth middleware".to_string(),
            acceptance_criteria: vec!["Validate token".to_string()],
            url: Some("https://linear.app/team/ENG-101".to_string()),
            tracker_provider: Some("Linear".to_string()),
            external_id: Some("lin-1".to_string()),
            points: Some("5".to_string()),
            status: Some("Estimated".to_string()),
        },
        Story {
            id: "s-2".to_string(),
            key: Some("ENG-102".to_string()),
            title: "Rate Limiter".to_string(),
            description: "Token bucket".to_string(),
            acceptance_criteria: vec!["429 status".to_string()],
            url: None,
            tracker_provider: None,
            external_id: None,
            points: Some("3".to_string()),
            status: Some("Estimated".to_string()),
        },
    ];

    let mut notes = HashMap::new();
    notes.insert("s-1".to_string(), "100% consensus on 5 points".to_string());
    notes.insert("s-2".to_string(), "Resolved outlier 8 -> 3".to_string());

    let md_summary = export_markdown_summary(&stories, &notes);
    assert!(md_summary.contains("| Key | Title | Points | Consensus / Notes |"));
    assert!(md_summary.contains("ENG-101"));
    assert!(md_summary.contains("JWT Authentication"));
    assert!(md_summary.contains("100% consensus on 5 points"));

    let csv_summary = export_csv_summary(&stories);
    assert!(csv_summary.starts_with("Key,Title,Points,Status,URL\n"));
    assert!(csv_summary
        .contains("ENG-101,\"JWT Authentication\",5,Estimated,https://linear.app/team/ENG-101"));
}
