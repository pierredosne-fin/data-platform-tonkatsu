---
id: first-agent
title: Your First Agent
sidebar_position: 1
---

# Your First Agent

This walkthrough creates a simple assistant agent from scratch.

## 1. Start the server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). You'll see an empty 5×3 office grid.

## 2. Create an agent

Click **+ New Agent** in the HUD. Fill in:

| Field | Example |
|-------|---------|
| Name | `assistant` |
| Mission | `You are a helpful general-purpose assistant.` |
| Avatar color | Any color |

Click **Create**. The agent appears in an empty room.

## 3. Chat with the agent

Click on the agent's room to open the **ChatModal**. Type a message and press Enter.

The agent streams its response back in real time. You can see:
- Text chunks arriving via `agent:stream`
- Tool calls (if the agent uses tools) via `agent:toolCall` / `agent:toolResult`

## 4. Inspect the workspace

After the first conversation, the agent's workspace is on disk at:

```
workspaces/<teamId>/assistant/
├── SOUL.md       ← agent identity
├── USER.md       ← user context
├── OPS.md        ← operational guidelines
├── MEMORY.md     ← memory index
└── TOOLS.md      ← available tools
```

You can edit these files directly or via the **AgentSidebar** in the UI.

## 5. Persist across restarts

Session IDs are stored in `agents.json`. When you restart the server, the agent resumes its last session automatically.
