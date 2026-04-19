---
id: agent-workspace
title: Agent Workspace
sidebar_position: 4
---

# Agent Workspace

Each agent gets a dedicated directory under `workspaces/<teamId>/<agentSlug>/`.

## Directory structure

```
workspaces/<teamId>/<agentSlug>/
├── SOUL.md          # Agent identity and personality
├── USER.md          # User context and preferences
├── OPS.md           # Operational guidelines
├── MEMORY.md        # Index of memory files
├── TOOLS.md         # Available tools and capabilities
├── memory/          # Append-only daily logs and project docs
├── .claude/
│   └── settings.json  # Allowed tools and permissions
└── .mcp.json        # MCP server configuration
```

## Identity files

These files are written by `fileService.setupWorkspaceStructure()` and injected into the system prompt:

| File | Purpose |
|------|---------|
| `SOUL.md` | Agent's name, mission, personality traits |
| `USER.md` | Who the agent works for, communication preferences |
| `OPS.md` | How to run tasks, coding standards, git workflow |
| `MEMORY.md` | Index of memory files (like this project's auto-memory) |
| `TOOLS.md` | Description of available MCP tools and skills |

## Permissions

`.claude/settings.json` controls which tools the agent can use:

```json
{
  "permissions": {
    "allow": ["Bash", "Read", "Write", "Edit", "Glob", "Grep"]
  }
}
```

Permissions can be managed via the REST API or the UI.

## Repo-backed agents

When an agent is tied to a git repository:

1. A bare clone is stored in `repos/<repo-slug>/`
2. A git worktree is created at `workspaces/<teamId>/<agentSlug>/` on a per-agent branch
3. Runtime files (`.claude/**`, `SOUL.md`, `MEMORY.md`, etc.) are excluded from git via `info/exclude`

This means the agent's code changes are tracked in git, but its identity and memory stay private.

## Inter-agent delegation

Agents can delegate to each other by emitting a special tag in their output:

```
<CALL_AGENT name="analyst">
Please analyze the sales data for Q1 2024.
</CALL_AGENT>
```

The server intercepts this, finds the agent named `analyst`, and recursively calls it. Delegation depth is capped at 5.

If an agent needs human input, it emits:

```
<NEED_INPUT>
What date range should I use for the report?
</NEED_INPUT>
```

This sets the agent's status to `pending` until the user responds.
