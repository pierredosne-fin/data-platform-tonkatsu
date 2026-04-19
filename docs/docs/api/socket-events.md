---
id: socket-events
title: Socket.IO Events
sidebar_position: 2
---

# Socket.IO Events

The server uses Socket.IO for all real-time communication. Connect to `http://localhost:3001`.

---

## Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `agent:list` | `Agent[]` | Full agent list on connect or refresh |
| `agent:created` | `Agent` | A new agent was created |
| `agent:updated` | `Agent` | Agent metadata changed |
| `agent:deleted` | `{ id: string }` | An agent was deleted |
| `team:list` | `Team[]` | Full team list |
| `agent:statusChanged` | `{ id, status }` | Agent status changed (`idle`, `running`, `pending`, `sleeping`) |
| `agent:stream` | `{ id, chunk }` | A streaming text chunk from the agent |
| `agent:history` | `{ id, messages }` | Conversation history for an agent |
| `agent:message` | `{ id, message }` | A complete message (non-streaming) |
| `agent:toolCall` | `{ id, tool, input }` | Agent invoked a tool |
| `agent:toolResult` | `{ id, tool, result }` | Tool returned a result |
| `agent:sessions` | `{ id, sessions }` | List of saved sessions for an agent |
| `agent:delegating` | `{ fromId, toName, prompt }` | Agent is delegating to another |
| `agent:delegationComplete` | `{ fromId, toName, result }` | Delegation finished |

---

## Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `agent:subscribe` | `{ id }` | Subscribe to updates for a specific agent |
| `agent:unsubscribe` | `{ id }` | Unsubscribe |
| `agent:sendMessage` | `{ id, message }` | Send a message to an agent |
| `agent:sleep` | `{ id }` | Put an agent to sleep |
| `agent:newConversation` | `{ id }` | Start a fresh conversation (clears history) |
| `team:newConversation` | `{ teamId }` | Start fresh conversations for all agents in a team |
| `agent:listSessions` | `{ id }` | Request saved sessions list |
| `agent:resumeSession` | `{ id, sessionId }` | Resume a previous session |
| `agent:moveRoom` | `{ id, room }` | Move agent to a different room |

---

## Agent status values

| Status | Meaning |
|--------|---------|
| `idle` | Ready for a new task |
| `running` | Currently executing a task |
| `pending` | Waiting for user input (`<NEED_INPUT>`) |
| `sleeping` | Manually put to sleep |
