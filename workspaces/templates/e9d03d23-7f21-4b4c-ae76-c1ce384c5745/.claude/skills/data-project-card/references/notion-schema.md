# Data Projects — Notion Schema

## Data Source
- **data_source_id:** `2e391904-5b5d-80f9-9eea-000b610a44a1`
- **Database ID:** `2e3919045b5d80c5bdd2c01e37169e01`
- **Default template ID:** `2e691904-5b5d-80cb-9eed-ed446aa9991e`

## Properties

| Property | Type | Allowed Values / Notes |
|---|---|---|
| `Name` | title | Card name — typically "[Topic] — V[N]" |
| `Status` | status | `Not started`, `Next`, `Pending`, `In progress`, `User Acceptance Testing`, `Done`, `Discarded` |
| `Type` | select | `New feature`, `Improvement`, `Scalability`, `Compliance`, `Analytics`, `Reliability`, `Observability` |
| `Data requests` | relation (JSON array) | Page URLs from the Data Requests database — links card to parent request |
| `Description` | text | One-line summary of what this version delivers |
| `Engineering` | person (JSON array) | Assigned engineer Notion user ID(s) |
| `Owner` | person (JSON array) | Notion user ID(s) |
| `date:In progress since:start` | ISO date | Set when status moves to In progress |
| `date:Target release date:start` | ISO date | Expected delivery date (optional) |

## Default Status for New Cards
Start new cards at `Not started`.

## Linking to Parent Data Request
The `Data requests` property accepts a JSON array of Notion page URLs:
```json
["https://www.notion.so/<data-request-page-id>"]
```
Always set this after creating the card so the relation is visible in both databases.

## Type Selection Guide

| Scenario | Type |
|---|---|
| New dbt model + Metabase metrics | `New feature` |
| Adding columns to existing model | `Improvement` |
| Refactoring for performance (partitioning, clustering) | `Scalability` |
| Data quality / testing improvements | `Reliability` |
| New dashboard or reporting | `Analytics` |
