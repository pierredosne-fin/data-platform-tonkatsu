# dbt Mart Layer Architecture Rules

All models in `models/marts/` are driven by the **Business Name**. The filename must be the `snake_case` version of the Business Name, including its specific suffix/prefix.

| Business Name | Filename (snake_case) | Mandatory Columns | Grain (Atom) |
| :--- | :--- | :--- | :--- |
| **`🌕 <Entity>`** | `<entity>` | `entity_id`, `created_at`, `updated_at` | Most recent state of an entity. |
| **`🪙 <Entity> Snapshot History`** | `snapshot_<entity>` | `log_id`, `entity_id`, `snapshot_from`, `snapshot_to`, `is_current` | Historical version (SCD Type 2). |
| **`🌕 <Event>`** | `<event>` | `log_id`, `event_date` | Point-in-time event. |
| **`🪙 <Entity> <Granularity> Snapshot History`** | `<entity>_<granularity>_snapshot_history` | `log_id`, `entity_id`, `event_date` | Periodic state capture. |
| **`🌕 <Event> <Granularity> Metrics`** | `<event>_<granularity>_aggr_metrics` | `log_id`, `event_date` | Aggregated metrics over time. |

## 🛠️ Implementation Rules

### 1. Naming Logic
- **Primary Source:** Always start with the **Business Name** in Title Case (e.g., `Institution Connections Daily Snapshot History`).
- **Filename:** Convert the Business Name to `snake_case` to create the filename (e.g., `institution_connections_daily_snapshot_history.sql`).
- **Documentation:** The `description` in `schema.yml` must match the **Business Name** exactly.
- **Business Name:** Should be always used for Metabase model name in the sematic layer

### 2. Structural Requirements
- **Strict Columns:** You are forbidden from creating a mart model that lacks the **Mandatory Columns** specified for its category.
- **Joins:** Always use `ref()` to join models.
- **Grain Validation:** Verify that the SQL logic produces the exact **Grain (Atom)** defined in the table.

### 3. Workflow
- If a requested model does not clearly fit one of these 5 Business Name patterns, you must ask for clarification before creating any files.