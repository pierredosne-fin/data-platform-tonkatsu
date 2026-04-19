---
id: repo-backed-agent
title: Repo-Backed Agent
sidebar_position: 3
---

# Repo-Backed Agent

A repo-backed agent works directly inside a git repository. Its code changes are tracked in git, while its identity (SOUL.md, MEMORY.md, etc.) stays private.

## How it works

1. A **bare clone** of the repo is stored in `repos/<repo-slug>/`
2. A **git worktree** is created at `workspaces/<teamId>/<agentSlug>/` on a per-agent branch
3. Runtime files (`.claude/**`, `SOUL.md`, `MEMORY.md`, etc.) are excluded from git via `info/exclude`

The agent can read, edit, and commit code in the repo. Its identity files are never committed.

## Setup

### 1. Create the agent with a repo URL

When creating a new agent, set the **Repo URL** field to a git remote:

```
git@github.com:your-org/your-repo.git
```

The server will:
- Clone the repo into `repos/`
- Create a branch `agent/<agentSlug>`
- Set up a worktree at the agent's workspace path

### 2. Configure SSH keys

Repo-backed agents use SSH to clone and push. Go to **Settings → SSH Keys** in the UI and add the private key for the repo.

Keys are stored in `.sync-data/ssh-keys/` (chmod 600) and never committed.

### 3. Give the agent coding permissions

In the agent's **Permissions** panel, add:

```
Bash
Read
Write
Edit
Glob
Grep
```

This allows the agent to run shell commands and modify files in the repo.

### 4. Example task

Send the agent:

```
Review the open issues in this repo and create a fix for the most critical bug.
Commit your changes with a descriptive message.
```

The agent will use `Bash` to run git commands, read files, make edits, and commit — all within its worktree.

## Workspace isolation

Each repo-backed agent gets its own branch. Multiple agents can work on the same repo simultaneously without conflicts. Use `git merge` to combine their work when ready.
