# Unified Issue Tracker Integration & 2-Way Sync (Linear, GitHub, Jira)

Type: research
Status: closed
Superseded by: .okf/decisions/ADR-005-unified-issue-tracker-sync.md
Blocked by: 01

## Question

How should the zero-auth Scrum Poker platform integrate directly with external issue trackers (Linear, GitHub Issues, Jira) to fetch sprint/cycle backlogs, sync consensus estimates back in real time, and push SPIDR vertical slices without requiring persistent user accounts or storing secrets on disk?

## Answer

1. **Zero-Auth Ephemeral Credential Security**:
   - **Ephemeral Facilitator Session**: The Facilitator inputs their provider credentials (Linear API Key, GitHub Personal Access Token, or Jira Domain + API Token) in a room connection modal.
   - **In-Memory Isolation**: Credentials are held strictly in Tokio actor memory (and the Facilitator's browser `sessionStorage`) for the duration of the room. They are never written to disk or the database, never broadcast to other room participants (Estimators/Observers), and are securely dropped upon room closure.

2. **Unified `IssueTrackerAdapter` Architecture**:
   - A unified asynchronous trait in Rust defines the contract across all providers:
   ```rust
   #[async_trait]
   pub trait IssueTrackerAdapter: Send + Sync {
       /// Fetch backlog stories matching team, cycle, milestone, or sprint filters
       async fn fetch_backlog(&self, query: &TrackerQuery) -> Result<Vec<ExternalStory>, TrackerError>;
       
       /// Write back finalized story point estimates to the external tracker
       async fn sync_estimate(&self, external_id: &str, points: u32) -> Result<(), TrackerError>;
       
       /// Optional: Post consensus/divergence summary comment to the issue
       async fn post_summary_comment(&self, external_id: &str, comment: &str) -> Result<(), TrackerError>;
       
       /// Push SPIDR vertical child slices as linked sub-issues/tasks
       async fn push_slices(&self, parent_id: &str, slices: &[StorySlice]) -> Result<Vec<ExternalStory>, TrackerError>;
   }
   ```

3. **Provider Implementations**:
   - **Linear (`LinearAdapter`)**:
     - Uses Linear GraphQL API (`https://api.linear.app/graphql`).
     - Queries issues by `teamId`, `cycleId`, or `projectId` with title, description, acceptance criteria, and current estimate.
     - Estimate writeback via `issueUpdate(id: $id, input: { estimate: $points })`.
     - Slice creation via `issueCreate(input: { teamId: $teamId, parentId: $parentId, ... })`.
   - **GitHub Issues (`GitHubAdapter`)**:
     - Uses GitHub REST & GraphQL API (`/repos/{owner}/{repo}/issues`).
     - Queries issues filtered by `milestone`, `project`, or `labels`.
     - Estimate writeback via label assignment (`points: <N>`) or GraphQL Projects v2 field update.
     - Slice creation via new issue creation referencing parent issue (`Parent: #<id>`).
   - **Jira Cloud (`JiraAdapter`)**:
     - Uses Jira Cloud REST API v3 (`https://{domain}.atlassian.net/rest/api/3/`).
     - Queries issues using JQL (`project = "KEY" AND sprint in openSprints()`).
     - Estimate writeback updates the configured Story Points custom field.
     - Slice creation creates Sub-tasks under the parent story issue.

4. **Lifecycle & Automated Synchronization**:
   - **Ingestion**: Facilitator fetches active sprint/cycle -> stories are imported directly into the room's live queue.
   - **Estimation**: Story details (title, description, AC, external tracker URL) sync live across all connected clients.
   - **Finalization**: When consensus points are agreed, the room actor dispatches an async background writeback to the tracker.
   - **Vertical Slicing**: When SPIDR decomposition is accepted, child stories are automatically created in the tracker and appended to the queue.
