---
id: scheduled-tasks
title: Scheduled Tasks
sidebar_position: 4
---

# Scheduled Tasks

Agents can run tasks on a cron schedule — useful for daily reports, monitoring jobs, or periodic data syncs.

## 1. Open the Schedule modal

Click the **clock icon** on an agent to open the **ScheduleModal**.

## 2. Add a schedule

Fill in:

| Field | Example |
|-------|---------|
| Cron expression | `0 9 * * 1-5` *(weekdays at 9am)* |
| Message | `Generate the daily standup report for the team.` |

Common cron expressions:

| Schedule | Expression |
|----------|-----------|
| Every hour | `0 * * * *` |
| Daily at 8am | `0 8 * * *` |
| Weekdays at 9am | `0 9 * * 1-5` |
| Every 30 minutes | `*/30 * * * *` |

## 3. How it works

Schedules are persisted in `workspaces/schedules.json`. On startup, `cronService.ts` reads this file and registers `node-cron` jobs.

When a job fires, it calls `agent:sendMessage` internally — the same path as a user message. The agent runs, streams output, and returns to idle.

## 4. View schedule history

Open the **ChatModal** for the agent. Scheduled runs appear in the conversation history alongside manual messages.

## 5. Manage via API

You can also manage schedules via the REST API:

```bash
# Create a schedule
POST /api/schedules
{
  "agentId": "abc123",
  "cron": "0 9 * * 1-5",
  "message": "Generate the daily standup report."
}

# List schedules
GET /api/schedules

# Delete a schedule
DELETE /api/schedules/:id
```

## 6. Example: Daily standup bot

Create an agent named `standup` with this mission:

```
You are a standup bot. Each morning, you:
1. Check the git log for commits since yesterday
2. Summarize what was done
3. Post a formatted standup message
```

Schedule it with `0 9 * * 1-5` and message `Run the daily standup.`

The bot will run every weekday morning and produce a summary of the team's previous day's work.
