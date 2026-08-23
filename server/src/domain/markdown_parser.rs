use crate::domain::models::Story;
use std::collections::HashMap;
use uuid::Uuid;

/// Extracts acceptance criteria checklist items from a Markdown description.
///
/// Recognises both `- [ ]`/`- [x]` and `* [ ]`/`* [x]` GFM task-list syntax.
/// This is a free function so that all tracker adapters can share it without
/// coupling to a specific adapter implementation.
pub fn extract_acceptance_criteria(description: &str) -> Vec<String> {
    let mut ac = Vec::new();
    for line in description.lines() {
        let trimmed = line.trim();
        if let Some(rest) = trimmed
            .strip_prefix("- [ ] ")
            .or_else(|| trimmed.strip_prefix("- [x] "))
            .or_else(|| trimmed.strip_prefix("* [ ] "))
            .or_else(|| trimmed.strip_prefix("* [x] "))
        {
            if !rest.trim().is_empty() {
                ac.push(rest.trim().to_string());
            }
        }
    }
    ac
}

pub fn sanitize_csv_cell(cell: &str) -> String {
    let trimmed = cell.trim_start();
    if trimmed.starts_with('=')
        || trimmed.starts_with('+')
        || trimmed.starts_with('-')
        || trimmed.starts_with('@')
        || trimmed.starts_with('\t')
        || trimmed.starts_with('\r')
    {
        format!("'{}", cell)
    } else {
        cell.to_string()
    }
}

pub fn parse_markdown_backlog(markdown: &str) -> Vec<Story> {
    let mut stories = Vec::new();
    let mut current_title: Option<String> = None;
    let mut current_desc_lines = Vec::new();
    let mut current_ac = Vec::new();

    let flush_current = |stories: &mut Vec<Story>,
                         title: &mut Option<String>,
                         desc_lines: &mut Vec<String>,
                         ac: &mut Vec<String>| {
        if let Some(t) = title.take() {
            let desc = desc_lines.join("\n").trim().to_string();
            let story_id = format!("story-{}", Uuid::new_v4());
            stories.push(Story {
                id: story_id,
                title: t,
                description: desc,
                acceptance_criteria: ac.clone(),
                key: None,
                url: None,
                tracker_provider: None,
                external_id: None,
                points: None,
                status: Some("Ready".to_string()),
            });
            desc_lines.clear();
            ac.clear();
        }
    };

    let has_headings = markdown.lines().any(|l| {
        let t = l.trim();
        (t.starts_with("# ") || t.starts_with("## ") || t.starts_with("### "))
            && !t.to_lowercase().contains("acceptance criteria")
    });

    if !has_headings {
        let has_bullets = markdown.lines().any(|l| {
            let t = l.trim();
            (t.starts_with("- ") || t.starts_with("* ") || t.starts_with("+ "))
                && !t.starts_with("- [")
                && !t.starts_with("* [")
                && !t.starts_with("+ [")
        });

        if has_bullets {
            for line in markdown.lines() {
                let trimmed = line.trim();
                if let Some(stripped) = trimmed
                    .strip_prefix("- [ ] ")
                    .or_else(|| trimmed.strip_prefix("- [x] "))
                    .or_else(|| trimmed.strip_prefix("* [ ] "))
                    .or_else(|| trimmed.strip_prefix("* [x] "))
                {
                    if !stripped.trim().is_empty() {
                        current_ac.push(stripped.trim().to_string());
                    }
                } else if (trimmed.starts_with("- ")
                    || trimmed.starts_with("* ")
                    || trimmed.starts_with("+ "))
                    && !trimmed.starts_with("- [")
                    && !trimmed.starts_with("* [")
                    && !trimmed.starts_with("+ [")
                {
                    flush_current(
                        &mut stories,
                        &mut current_title,
                        &mut current_desc_lines,
                        &mut current_ac,
                    );
                    let bullet_title = trimmed[2..].trim();
                    current_title = Some(bullet_title.to_string());
                } else if current_title.is_some() {
                    current_desc_lines.push(line.to_string());
                }
            }
            flush_current(
                &mut stories,
                &mut current_title,
                &mut current_desc_lines,
                &mut current_ac,
            );
            if !stories.is_empty() {
                return stories;
            }
        }
    }

    for line in markdown.lines() {
        let trimmed = line.trim();

        // Check for Story header (# Title or ## Title)
        if (trimmed.starts_with("# ") || trimmed.starts_with("## "))
            && !trimmed.to_lowercase().contains("acceptance criteria")
        {
            flush_current(
                &mut stories,
                &mut current_title,
                &mut current_desc_lines,
                &mut current_ac,
            );
            let header_text = if let Some(stripped) = trimmed.strip_prefix("## ") {
                stripped.trim()
            } else if let Some(stripped) = trimmed.strip_prefix("# ") {
                stripped.trim()
            } else {
                trimmed
            };
            current_title = Some(header_text.to_string());
            continue;
        }

        // Check for checklist items (- [ ] AC or * [ ] AC)
        if let Some(stripped) = trimmed
            .strip_prefix("- [ ] ")
            .or_else(|| trimmed.strip_prefix("- [x] "))
            .or_else(|| trimmed.strip_prefix("* [ ] "))
            .or_else(|| trimmed.strip_prefix("* [x] "))
        {
            if !stripped.trim().is_empty() {
                current_ac.push(stripped.trim().to_string());
            }
            continue;
        }

        // If currently in a story, collect description lines (skip the "### Acceptance Criteria" line itself)
        if current_title.is_some()
            && !trimmed.starts_with("### Acceptance")
            && !trimmed.starts_with("## Acceptance")
        {
            current_desc_lines.push(line.to_string());
        }
    }

    flush_current(
        &mut stories,
        &mut current_title,
        &mut current_desc_lines,
        &mut current_ac,
    );

    // If no header markdown found but input is non-empty, treat entire input as single story
    if stories.is_empty() && !markdown.trim().is_empty() {
        let lines: Vec<&str> = markdown.lines().collect();
        let first_line = lines[0].trim();
        let desc_lines: Vec<String> = lines[1..].iter().map(|l| l.to_string()).collect();
        stories.push(Story {
            id: format!("story-{}", Uuid::new_v4()),
            title: first_line.to_string(),
            description: desc_lines.join("\n").trim().to_string(),
            acceptance_criteria: vec![],
            key: None,
            url: None,
            tracker_provider: None,
            external_id: None,
            points: None,
            status: Some("Ready".to_string()),
        });
    }

    stories
}

pub fn export_markdown_summary(stories: &[Story], notes: &HashMap<String, String>) -> String {
    let mut out = String::new();
    out.push_str("# Sprint Estimation Summary\n\n");
    out.push_str("| Key | Title | Points | Consensus / Notes |\n");
    out.push_str("| --- | --- | --- | --- |\n");

    for story in stories {
        let key = story.key.as_deref().unwrap_or("-");
        let points = story.points.as_deref().unwrap_or("?");
        let note = notes
            .get(&story.id)
            .cloned()
            .unwrap_or_else(|| "-".to_string());
        let title_clean = story.title.replace('|', "\\|");
        let note_clean = note.replace('|', "\\|");

        out.push_str(&format!(
            "| {} | {} | {} | {} |\n",
            key, title_clean, points, note_clean
        ));
    }

    out
}

pub fn export_csv_summary(stories: &[Story]) -> String {
    let mut out = String::new();
    out.push_str("Key,Title,Points,Status,URL\n");

    for story in stories {
        let key = sanitize_csv_cell(story.key.as_deref().unwrap_or(""));
        let points = sanitize_csv_cell(story.points.as_deref().unwrap_or(""));
        let status = sanitize_csv_cell(story.status.as_deref().unwrap_or(""));
        let url = sanitize_csv_cell(story.url.as_deref().unwrap_or(""));
        let title_clean = sanitize_csv_cell(&story.title);
        let title_escaped = title_clean.replace('"', "\"\"");

        out.push_str(&format!(
            "{},\"{}\",{},{},{}\n",
            key, title_escaped, points, status, url
        ));
    }

    out
}
