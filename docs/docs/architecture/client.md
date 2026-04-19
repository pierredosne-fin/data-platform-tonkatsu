---
id: client
title: Client
sidebar_position: 3
---

# Client Architecture

The client is a React 19 + TypeScript application bundled with Vite.

## State management

Two Zustand stores handle all state:

### `agentStore`

Holds:
- `agents` — list of all agents
- `teams` — team metadata
- `streamBuffers` — per-agent streaming text (cleared on new task)
- `toolEvents` — tool call/result history
- `delegationEvents` — inter-agent delegation records
- `conversationHistory` — per-agent message history

### `socketStore`

- Holds the Socket.IO client instance.
- `connect()` establishes the connection and registers all event handlers.
- Event handlers update `agentStore` directly.
- Provides emit helpers (`sendMessage`, `sleepAgent`, `newConversation`, …).

## Key components

| Component | Purpose |
|-----------|---------|
| `OfficeMap` | Renders the 5×3 room grid |
| `Room` | Individual room cell with agent avatar and status |
| `AgentSidebar` | Agent details panel (mission, files, settings) |
| `ChatModal` | Full chat interface with streaming output |
| `HUD` | Team-level controls (new conversation, sleep all, etc.) |
| `TeamTabs` | Switch between teams |
| `TemplatesPanel` | Browse and instantiate agent/team templates |
| `WorkspaceSyncModal` | Configure and trigger workspace git sync |
| `CreateAgentModal` | Create a new agent |
| `ScheduleModal` | Configure cron schedules for an agent |

## Real-time event flow

```
Socket.IO event → socketStore handler → agentStore mutation → React re-render
```

Stream chunks accumulate in `streamBuffers[agentId]` and are cleared when a new task starts.
