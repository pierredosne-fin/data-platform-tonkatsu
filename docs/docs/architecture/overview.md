---
id: overview
title: Overview
sidebar_position: 1
---

# Architecture Overview

Tonkatsu is a monorepo with two npm workspaces:

```
tonkatsu/
├── client/       # React 19 + Vite frontend
├── server/       # Express + Socket.IO backend
├── docs/         # This Docusaurus site
├── workspaces/   # Agent workspaces on disk (not in git)
└── repos/        # Bare git clones for repo-backed agents (not in git)
```

## Request flow

```
Browser ──HTTP/WS──► Express + Socket.IO server
                          │
                    agentService (in-memory Map)
                          │
                    claudeService ──► @anthropic-ai/claude-agent-sdk
                          │                     │
                    persistenceService    Anthropic API
                          │
                    workspaces/<teamId>/agents.json
```

## Data flow

1. User opens the browser → connects via Socket.IO
2. Server emits `agent:list` and `team:list` with current state
3. User sends a message → `agent:sendMessage` socket event
4. `claudeService.query()` starts a Claude session, streaming chunks back via `agent:stream`
5. On tool calls: `agent:toolCall` / `agent:toolResult` events update the UI
6. Agent state mutations call `persist()` → writes `agents.json`

## Key design decisions

- **No database** — All state is stored as JSON files on disk. Simple, portable, no migrations.
- **In-memory agent map** — Fast lookups; rebuilt from disk on server restart.
- **Socket.IO for everything real-time** — Streaming, status changes, tool events.
- **ESM TypeScript** — Both client and server use native ES modules.
