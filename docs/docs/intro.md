---
id: intro
title: Introduction
sidebar_position: 1
---

<div style={{textAlign: 'center', margin: '2rem 0 2.5rem'}}>
  <img src="/img/tonkatsu.png" alt="Tonkatsu" style={{height: '140px', borderRadius: '0.75rem'}} />
  <h1 style={{fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em', marginTop: '1rem', marginBottom: '0.25rem'}}>Tonkatsu</h1>
  <p style={{fontSize: '1.1rem', opacity: 0.6, marginBottom: 0}}>A virtual office for Claude Code agents</p>
</div>

**Tonkatsu** is a platform where multiple AI agents run autonomously in named rooms, collaborate in real time, and delegate tasks to each other.

## What is it?

Think of it as a physical office, but for AI. Each agent occupies a room on a 5×3 grid, has a persistent workspace on disk, and can chat with users or other agents. Agents are powered by the Anthropic Claude API via the `@anthropic-ai/claude-agent-sdk`.

## Key features

- **Multi-agent rooms** — Agents live in a visual grid. You can see who's active, idle, or waiting for input.
- **Real-time streaming** — Agent responses stream live to the browser via Socket.IO.
- **Inter-agent delegation** — Agents can call each other using `<CALL_AGENT name="X">` syntax (up to 5 levels deep).
- **Persistent sessions** — Session IDs are stored so conversations resume across server restarts.
- **Repo-backed agents** — Agents can be tied to a git repo; each gets its own branch + worktree.
- **Templates** — Snapshot any agent or team into a reusable template.
- **Cron schedules** — Agents can run tasks on a schedule.
- **Skill library** — Reusable skill files that agents can load.
- **Workspace sync** — SSH-based sync to push/pull agent workspaces to remote machines.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TypeScript, Zustand |
| Backend | Node.js, Express, Socket.IO, TypeScript (ESM) |
| AI | Anthropic Claude (`claude-sonnet-4-6`), `@anthropic-ai/claude-agent-sdk` |
| Persistence | JSON files on disk (no database) |
| Git | Worktrees per agent for repo-backed workspaces |
