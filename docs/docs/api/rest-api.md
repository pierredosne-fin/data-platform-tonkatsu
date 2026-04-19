---
id: rest-api
title: REST API
sidebar_position: 1
---

# REST API

Base URL: `http://localhost:3001`

All request bodies use `Content-Type: application/json`. Zod validates all inputs server-side.

---

## Agent Templates

Base path: `/api/templates/agents`

### `GET /api/templates/agents`
List all agent templates.

### `POST /api/templates/agents`
Create a new agent template.

### `PATCH /api/templates/agents/:id`
Update template metadata (name, mission, avatarColor, repoUrl, …).

### `DELETE /api/templates/agents/:id`
Delete a template.

### `GET /api/templates/agents/:id/files`
Read workspace files: `CLAUDE.md`, settings, commands, rules, skills.

### `PUT /api/templates/agents/:id/files/claude-md`
Write `CLAUDE.md`.

```json
{ "content": "# My Agent\n..." }
```

### `PUT /api/templates/agents/:id/files/settings`
Write `.claude/settings.json`.

```json
{ "content": "{\"permissions\":{\"allow\":[\"Bash\"]}}" }
```

### `GET /api/templates/agents/:id/override-settings`
Read override settings (merged on top of workspace settings at instantiation).

### `PUT /api/templates/agents/:id/override-settings`
Set override settings. Body is the raw JSON object.

### `PUT /api/templates/agents/:id/files/commands/:name`
### `DELETE /api/templates/agents/:id/files/commands/:name`
Manage command files.

### `PUT /api/templates/agents/:id/files/rules/:name`
### `DELETE /api/templates/agents/:id/files/rules/:name`
Manage rule files.

### `PUT /api/templates/agents/:id/files/skills/:name`
### `DELETE /api/templates/agents/:id/files/skills/:name`
Manage skill files.

### `POST /api/templates/agents/:id/generate-claude-md`
AI-generate a `CLAUDE.md` for the template.

```json
{ "current": "optional existing content" }
```

### `POST /api/templates/agents/from-agent/:agentId`
Snapshot a live agent as a new template.

---

## Team Templates

Base path: `/api/templates/teams`

### `GET /api/templates/teams`
List all team templates.

### `POST /api/templates/teams`
Create a team template.

```json
{ "name": "Data Squad", "agentTemplateIds": ["id1", "id2"] }
```

### `PATCH /api/templates/teams/:id`
Update team template metadata.

### `DELETE /api/templates/teams/:id`
Delete a team template.

### `POST /api/templates/teams/:id/instantiate`
Spawn a team from the template.

```json
{ "teamId": "optional-custom-id" }
```

---

## Live Agents

Base path: `/api/agents`

### `GET /api/agents`
List all live agents.

### `POST /api/agents`
Create a live agent.

### `PATCH /api/agents/:id`
Update agent metadata.

### `DELETE /api/agents/:id`
Delete an agent and its workspace.

### `GET /api/agents/:id/permissions`
Read the agent's tool allow list.

```json
{ "allow": ["Bash", "Read", "Write"] }
```

### `PUT /api/agents/:id/permissions`
Replace the allow list.

```json
{ "allow": ["Bash", "Read"] }
```

### `POST /api/agents/:id/permissions`
Add one permission.

```json
{ "permission": "Write" }
```

### `DELETE /api/agents/:id/permissions`
Remove one permission.

```json
{ "permission": "Write" }
```

### `PUT /api/agents/:id/files/settings`
Write the agent's `.claude/settings.json`.

### `PUT /api/agents/:id/files/claude-md`
Write the agent's `CLAUDE.md`.
