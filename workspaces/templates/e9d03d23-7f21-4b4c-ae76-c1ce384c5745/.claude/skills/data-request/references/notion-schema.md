# Data Requests — Notion Schema

## Data Source
- **data_source_id:** `2e391904-5b5d-8023-9626-000b7411bca4`
- **Database URL:** `https://www.notion.so/2e3919045b5d8072accbf8d9fd40c294`

## Properties

| Property | Type | Allowed Values / Notes |
|---|---|---|
| `Name` | title | Data request name (business-friendly, Title Case) |
| `Status` | status | `draft`, `Pending`, `To review`, `Reviewed`, `Next`, `In progress`, `Done`, `Discarded` |
| `Requesting team` | select | `Care`, `Compliance`, `Founder unit`, `Growth`, `People`, `Product`, `Tech`, `F1` |
| `Impact on` | multi_select (JSON array) | `AuM`, `Subscription ARR`, `NPS`, `Differentiation`, `Ops monitoring`, `Transaction revenue`, `Ops load`, `Compliance`, `Security`, `Cost`, `Finops` |
| `ICE Score` | number | Impact × Confidence × Ease (each 1–3). Max = 27 |
| `date:Request date:start` | ISO date | When the request was made |
| `date:Needed for:start` | ISO date | Target delivery date (optional) |
| `Requested by` | person (JSON array) | Notion user ID(s) — use notion-search to find user |
| `Description` | text | One-line summary of the request |

## Default Status Flow
`draft` → `Pending` → `To review` → `Reviewed` → `Next` → `In progress` → `Done`

Start new requests at `draft`.

## ICE Score Guidance

| Dimension | 1 | 2 | 3 |
|---|---|---|---|
| **Impact** | Nice-to-have, indirect effect | Improves a secondary KPI | Directly impacts a North Star KPI (ARR, AUM, users) |
| **Confidence** | Major data gaps / unknown sources | Some gaps but main sources exist | All sources clean, schema known |
| **Ease** | Requires new pipeline or complex modelling | New model needed but pattern exists | Uses existing models/sources with minor changes |
