---
id: multi-agent-team
title: Multi-Agent Team
sidebar_position: 2
---

# Multi-Agent Team

This example sets up a two-agent team where a **project manager** delegates research tasks to an **analyst**.

## 1. Create the analyst agent

Create an agent named `analyst` with this mission:

```
You are a data analyst. When given a research question, you investigate it
thoroughly and return a structured report with findings and recommendations.
```

## 2. Create the project manager agent

Create an agent named `pm` with this mission:

```
You are a project manager. When given a goal, you break it into tasks and
delegate research to the analyst agent. Use <CALL_AGENT name="analyst">
to ask the analyst for information.
```

## 3. Trigger a delegation

Send this message to `pm`:

```
Research the top 3 trends in AI infrastructure for 2025 and summarize them.
```

The PM agent will respond with something like:

```xml
<CALL_AGENT name="analyst">
Please research the top 3 trends in AI infrastructure for 2025.
Return a structured summary with: trend name, description, and business impact.
</CALL_AGENT>
```

The server intercepts this, calls `analyst`, and returns the result to `pm`.

## 4. Watch the delegation in real time

In the UI, you'll see:
- `pm` status → `running`
- `agent:delegating` event: "pm → analyst"
- `analyst` status → `running`
- `agent:delegationComplete` when analyst finishes
- `pm` continues with analyst's output

## 5. Delegation limits

Delegations are capped at **depth 5** to prevent infinite loops. If an agent
tries to delegate beyond this limit, the call is rejected with an error message.

## 6. Save as a team template

Once you're happy with the setup, click **Save as Template** in the HUD.
This snapshots both agents into a reusable team template you can reinstantiate
with `POST /api/templates/teams/:id/instantiate`.
