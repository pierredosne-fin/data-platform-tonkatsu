---
id: getting-started
title: Getting Started
sidebar_position: 2
---

# Getting Started

## Prerequisites

- Node.js ≥ 18
- An [Anthropic API key](https://console.anthropic.com/)

## Installation

```bash
git clone <repo>
cd tonkatsu
npm install
```

## Configuration

Create `server/.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001  # optional, defaults to 3001
```

## Running in development

```bash
npm run dev
```

This starts both the Vite dev server (client) and the Express server concurrently. The client proxies API and Socket.IO requests to `http://localhost:3001`.

| Service | URL |
|---------|-----|
| Client (Vite) | http://localhost:5173 |
| Server (Express) | http://localhost:3001 |

## Building for production

```bash
npm run build
```

Outputs:
- `client/dist/` — static frontend assets
- `server/dist/` — compiled server JS

## Workspace layout on disk

```
workspaces/
  <teamId>/
    agents.json         # persisted agent state for this team
    <agentSlug>/        # one directory per agent
      SOUL.md
      USER.md
      OPS.md
      MEMORY.md
      TOOLS.md
      memory/
      .claude/
        settings.json
      .mcp.json
repos/
  <repo-slug>/          # bare git clones for repo-backed agents
```
