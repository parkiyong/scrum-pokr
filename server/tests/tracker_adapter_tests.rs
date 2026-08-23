use server::domain::tracker::{
    create_adapter, ExternalStory, IssueTrackerAdapter, MockTrackerAdapter, StorySlice,
    TrackerConfig, TrackerError, TrackerProvider, TrackerQuery,
};

#[tokio::test]
async fn test_mock_tracker_adapter_lifecycle() {
    let mock = MockTrackerAdapter::new();
    mock.add_story(ExternalStory {
        id: "lin-1".to_string(),
        key: "ENG-101".to_string(),
        title: "Implement OAuth2 Flow".to_string(),
        description: "Support Google and GitHub logins\n\nAcceptance Criteria:\n- [ ] Google login\n- [ ] GitHub login".to_string(),
        acceptance_criteria: vec!["Google login".to_string(), "GitHub login".to_string()],
        url: Some("https://linear.app/team/issue/ENG-101".to_string()),
        current_estimate: None,
        status: Some("In Progress".to_string()),
    });

    let preview = mock
        .test_connection()
        .await
        .expect("test connection failed");
    assert!(preview.authenticated);
    assert_eq!(preview.provider, TrackerProvider::Linear);

    let query = TrackerQuery {
        team_id: Some("team-1".to_string()),
        cycle_id: None,
        project_id: None,
        sprint_id: None,
        milestone: None,
        labels: vec![],
        jql: None,
    };

    let stories = mock.fetch_backlog(&query).await.expect("fetch failed");
    assert_eq!(stories.len(), 1);
    assert_eq!(stories[0].key, "ENG-101");
    assert_eq!(stories[0].acceptance_criteria.len(), 2);

    // Sync estimate
    mock.sync_estimate("lin-1", 5)
        .await
        .expect("sync estimate failed");
    assert_eq!(mock.get_recorded_estimate("lin-1"), Some(5));

    // Post comment
    mock.post_summary_comment("lin-1", "Agreed on 5 story points with 100% consensus.")
        .await
        .expect("post comment failed");
    let comments = mock.get_recorded_comments("lin-1");
    assert_eq!(comments.len(), 1);
    assert!(comments[0].contains("Agreed on 5 story points"));

    // Push SPIDR vertical slices
    let slices = vec![
        StorySlice {
            title: "Slice 1: Google OAuth only".to_string(),
            description: "Implement initial Google provider".to_string(),
            acceptance_criteria: vec!["Google login works".to_string()],
            estimated_points: Some(2),
        },
        StorySlice {
            title: "Slice 2: GitHub OAuth".to_string(),
            description: "Add GitHub provider".to_string(),
            acceptance_criteria: vec!["GitHub login works".to_string()],
            estimated_points: Some(3),
        },
    ];

    let created_slices = mock
        .push_slices("lin-1", &slices)
        .await
        .expect("push slices failed");
    assert_eq!(created_slices.len(), 2);
    assert_eq!(created_slices[0].key, "ENG-101-S1");
    assert_eq!(created_slices[1].key, "ENG-101-S2");
}

#[tokio::test]
async fn test_mock_tracker_error_handling() {
    let mock = MockTrackerAdapter::new();
    mock.set_simulate_auth_failure(true);

    let err = mock.test_connection().await.unwrap_err();
    match err {
        TrackerError::AuthError(msg) => assert!(msg.contains("Invalid token")),
        _ => panic!("Expected AuthError, got {:?}", err),
    }

    mock.set_simulate_auth_failure(false);
    mock.set_simulate_rate_limit(true);

    let query = TrackerQuery::default();
    let err = mock.fetch_backlog(&query).await.unwrap_err();
    match err {
        TrackerError::RateLimited(msg) => assert!(msg.contains("Rate limit exceeded")),
        _ => panic!("Expected RateLimited, got {:?}", err),
    }
}

#[tokio::test]
async fn test_linear_adapter_construction_and_query_formatting() {
    let config = TrackerConfig::Linear {
        api_key: "lin_api_test_12345".to_string(),
        endpoint: Some("http://127.0.0.1:9999/graphql".to_string()),
    };

    let adapter = create_adapter(config);
    assert_eq!(adapter.provider_name(), "Linear");
}

#[tokio::test]
async fn test_github_adapter_construction_and_label_mapping() {
    let config = TrackerConfig::GitHub {
        personal_access_token: "ghp_test_token_12345".to_string(),
        owner: "my-org".to_string(),
        repo: "my-repo".to_string(),
        endpoint: Some("http://127.0.0.1:9999".to_string()),
    };

    let adapter = create_adapter(config);
    assert_eq!(adapter.provider_name(), "GitHub");
}

#[tokio::test]
async fn test_jira_adapter_construction() {
    let config = TrackerConfig::Jira {
        domain: "my-domain".to_string(),
        email: "dev@example.com".to_string(),
        api_token: "jira_token_12345".to_string(),
        project_key: "PROJ".to_string(),
        endpoint: Some("http://127.0.0.1:9999/rest/api/3".to_string()),
        points_field: Some("customfield_10016".to_string()),
    };

    let adapter = create_adapter(config);
    assert_eq!(adapter.provider_name(), "Jira");
}

#[test]
fn test_tracker_config_debug_redaction() {
    let linear_config = TrackerConfig::Linear {
        api_key: "secret_linear_key_12345".to_string(),
        endpoint: None,
    };
    let debug_str = format!("{:?}", linear_config);
    assert!(!debug_str.contains("secret_linear_key_12345"));
    assert!(debug_str.contains("[REDACTED]"));

    let github_config = TrackerConfig::GitHub {
        personal_access_token: "ghp_secret_pat_999".to_string(),
        owner: "acme".to_string(),
        repo: "poker".to_string(),
        endpoint: None,
    };
    let gh_debug = format!("{:?}", github_config);
    assert!(!gh_debug.contains("ghp_secret_pat_999"));
    assert!(gh_debug.contains("[REDACTED]"));
}

#[test]
fn test_csv_formula_sanitization() {
    use server::domain::markdown_parser::{export_csv_summary, sanitize_csv_cell};
    use server::domain::models::Story;

    assert_eq!(sanitize_csv_cell("=1+2"), "'=1+2");
    assert_eq!(sanitize_csv_cell("+cmd"), "'+cmd");
    assert_eq!(sanitize_csv_cell("-100"), "'-100");
    assert_eq!(sanitize_csv_cell("@SUM(A1:A5)"), "'@SUM(A1:A5)");
    assert_eq!(sanitize_csv_cell("Normal Title"), "Normal Title");

    let stories = vec![Story {
        id: "s1".to_string(),
        title: "=SUM(A1:A10)".to_string(),
        description: "".to_string(),
        acceptance_criteria: vec![],
        key: Some("+KEY-1".to_string()),
        url: None,
        tracker_provider: None,
        external_id: None,
        points: Some("-5".to_string()),
        status: Some("@Ready".to_string()),
    }];

    let csv = export_csv_summary(&stories);
    assert!(csv.contains("'+KEY-1"));
    assert!(csv.contains("'=SUM(A1:A10)"));
    assert!(csv.contains("'-5"));
    assert!(csv.contains("'@Ready"));
}
