Title: SSE Stream Lifecycle & Disconnect Presence Detection
Status: open
Type: task
Blocked by: 01

## Question

How can we reliably detect SSE stream termination / client drops in Axum to trigger `RoomCommand::Disconnect` and Facilitator failover, and configure Keep-Alive heartbeats to prevent proxy timeouts?
