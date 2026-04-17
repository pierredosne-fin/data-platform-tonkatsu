# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (runs client + server concurrently)
npm run dev

# Build everything
npm run build

# Server only (tsx watch, auto-reloads on src/ changes)
npm run dev -w server

# Client only (Vite)
npm run dev -w client

# Lint client
npm run lint -w client
```

There are no automated tests. No test runner is configured.

## Environment

The server reads `server/.env` (not committed). Required variable:
```
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001  # optional, defaults to 3001
```

## Architecture

This is a **virtual office for Claude Code agents** — a platform where multiple AI agents run autonomously in named rooms, collaborate, and can delegate tasks to each other.

### Monorepo layout

- `server/` — Express + Socket.IO backend (ESM TypeScript, `tsx watch`)
- `client/` — React 19 + Vite frontend (TypeScript, Zustand)
- `workspaces/` — agent workspaces on disk, one directory per agent under `workspaces/<teamId>/<agentSlug>/`
- `repos/` — bare git clones for repo-backed agents (worktree sources)
- `.sync-data/` — SSH keys and workspace sync config (outside git)

### Server

**Agent lifecycle** (`server/src/services/agentService.ts`):
- Agents live in an in-memory `Map<string, Agent>`. All mutations call `persist()` which writes `workspaces/<teamId>/agents.json`.
- On startup, `loadAllAgents()` + `restoreAgent()` rebuild the map from disk.
- Each agent gets a room in a 5×3 grid (per team) managed by `roomService.ts`.
- Repo-backed agents: a git clone is stored in `repos/` and a worktree is created under `workspaces/` on a per-agent branch.

**Agent execution** (`server/src/services/claudeService.ts`):
- Uses `@anthropic-ai/claude-agent-sdk` `query()` with `permissionMode: 'acceptEdits'` and `settingSources: ['project']`.
- Runs as `claude-sonnet-4-6`, up to 200 turns per task.
- The system prompt is built via `buildSystemPromptAppend()` — it injects agent identity, workspace structure docs (SOUL.md, USER.md, OPS.md, MEMORY.md, TOOLS.md), delegation protocol, and optionally agent-creation capability.
- Inter-agent delegation: agent output containing `<CALL_AGENT name="X">…</CALL_AGENT>` triggers a recursive call to another agent (max depth 5).
- User input requests: `<NEED_INPUT>…</NEED_INPUT>` in output sets agent status to `pending`.
- Session IDs from the SDK are persisted so conversations can be resumed across server restarts.

**Persistence** (`server/src/services/persistenceService.ts`):
- `workspaces/<teamId>/agents.json` — agent runtime state per team
- `workspaces/templates.json` — agent and team templates
- `workspaces/schedules.json` — cron schedules
- `workspaces/skills.json` — skill library
- `.sync-data/ssh-keys/` — SSH private keys (chmod 600), never committed

**Routing pattern**: every router is a factory function `createXRouter(io: Server)` that returns an Express `Router`. Zod is used for request validation.

**Socket.IO events** (server → client): `agent:list`, `agent:created`, `agent:updated`, `agent:deleted`, `team:list`, `agent:statusChanged`, `agent:stream`, `agent:history`, `agent:message`, `agent:toolCall`, `agent:toolResult`, `agent:sessions`, `agent:delegating`, `agent:delegationComplete`.

**Socket.IO events** (client → server): `agent:subscribe`, `agent:unsubscribe`, `agent:sendMessage`, `agent:sleep`, `agent:newConversation`, `team:newConversation`, `agent:listSessions`, `agent:resumeSession`, `agent:moveRoom`.

### Client

**State management**: Zustand with two primary stores:
- `agentStore` — agents, teams, stream buffers, tool events, delegation events, conversation history
- `socketStore` — Socket.IO connection; handles all real-time events and emits

The socket connection is established once in `socketStore.connect()` and drives all agent state updates. Stream chunks accumulate in `streamBuffers` until cleared on new task start.

**Key components**: `OfficeMap` renders the room grid; `AgentSidebar` / `ChatModal` handle agent interaction; `HUD` shows team-level controls; `WorkspaceSyncModal` manages git sync.

### Workspace structure per agent

Each agent workspace (`workspaces/<teamId>/<slug>/`) contains:
- `SOUL.md`, `USER.md`, `OPS.md`, `MEMORY.md`, `TOOLS.md` — identity and context docs (written by `fileService.setupWorkspaceStructure`)
- `memory/` — append-only daily logs and project docs
- `.claude/settings.json` — allowed tools, permissions
- `.mcp.json` — MCP server config

For repo-backed agents, runtime files (`.claude/**`, `SOUL.md`, `MEMORY.md`, etc.) are excluded from git tracking via a per-worktree `info/exclude` file.
