---
id: server
title: Server
sidebar_position: 2
---

# Server Architecture

The server is an Express + Socket.IO application written in TypeScript (ESM), running under `tsx watch` for hot-reload in development.

## Services

### `agentService.ts`

Central registry for all agents.

- Agents are stored in an in-memory `Map<string, Agent>`.
- All mutations call `persist()` which writes `workspaces/<teamId>/agents.json`.
- On startup: `loadAllAgents()` + `restoreAgent()` rebuild the map from disk.
- Each agent gets a room in a 5×3 grid (per team) managed by `roomService.ts`.

### `claudeService.ts`

Executes agent tasks via the Anthropic SDK.

- Uses `@anthropic-ai/claude-agent-sdk` `query()` with `permissionMode: 'acceptEdits'`.
- Model: `claude-sonnet-4-6`, up to 200 turns per task.
- System prompt is built via `buildSystemPromptAppend()` — injects agent identity, workspace docs, delegation protocol.
- **Inter-agent delegation**: output containing `<CALL_AGENT name="X">…</CALL_AGENT>` triggers a recursive call (max depth 5).
- **User input requests**: `<NEED_INPUT>…</NEED_INPUT>` sets agent status to `pending`.
- Session IDs are persisted so conversations resume across restarts.

### `persistenceService.ts`

Manages all JSON file I/O:

| File | Contents |
|------|----------|
| `workspaces/<teamId>/agents.json` | Agent runtime state per team |
| `workspaces/templates.json` | Agent and team templates |
| `workspaces/schedules.json` | Cron schedules |
| `workspaces/skills.json` | Skill library |

### `roomService.ts`

Assigns agents to rooms in a 5×3 grid per team. Handles room moves.

### `gitService.ts`

Manages git worktrees for repo-backed agents:
- Bare clone stored in `repos/`
- Worktree created under `workspaces/` on a per-agent branch
- Runtime files excluded from git via `info/exclude`

### `cronService.ts`

Reads `schedules.json` and registers `node-cron` jobs that trigger agent tasks on schedule.

### `skillService.ts`

CRUD for the skill library (`workspaces/skills.json`). Skills are injected into agent prompts.

## Routing pattern

Every router is a factory function:

```ts
export function createAgentsRouter(io: Server): Router {
  const router = Router();
  // ...
  return router;
}
```

[Zod](https://zod.dev) validates all request bodies.
