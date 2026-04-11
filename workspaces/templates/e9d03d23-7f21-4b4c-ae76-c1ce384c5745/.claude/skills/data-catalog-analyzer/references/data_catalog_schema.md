# Data Catalog Schema Reference

## Table: `finary_public.data_catalog`

The data catalog is the source of truth for all public models in the data platform.

### Schema

| Column | Type | Description |
|--------|------|-------------|
| `table_name` | STRING | Name of the table/view in finary_public |
| `table_type` | STRING | Type: TABLE, VIEW, MATERIALIZED_VIEW |
| `description` | STRING | Business description from dbt .yml |
| `source_system` | STRING | Origin: postgres, hubspot, bigquery, etc. |
| `update_frequency` | STRING | Refresh cadence: hourly, daily, weekly |
| `owner_team` | STRING | Responsible team: data, product, finance |
| `data_classification` | STRING | Sensitivity: public, internal, confidential |
| `is_active` | BOOLEAN | Whether model is currently maintained |
| `created_at` | TIMESTAMP | When added to catalog |
| `updated_at` | TIMESTAMP | Last metadata update |

### Usage Pattern

```sql
-- Check if a public model exists for "users"
SELECT *
FROM `finary_public.data_catalog`
WHERE table_name = 'users'
  AND is_active = TRUE;

-- List all active models from postgres source
SELECT table_name, description
FROM `finary_public.data_catalog`
WHERE source_system = 'postgres'
  AND is_active = TRUE
ORDER BY table_name;

-- Find models updated in last 7 days
SELECT table_name, updated_at
FROM `finary_public.data_catalog`
WHERE updated_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND is_active = TRUE;
```

### Mapping to dbt Models

| Catalog Field | dbt Equivalent |
|---------------|----------------|
| `table_name` | Model filename (without .sql) |
| `description` | First line of model `.yml` |
| `source_system` | Inferred from staging path |
| `table_type` | Materialization config (view/table) |

### Gap Analysis Pattern

To identify missing models, compare:

1. **Landing zone tables** being queried (from INFORMATION_SCHEMA)
2. **Data catalog entries** (existing public models)
3. **Gap** = Tables in #1 NOT IN #2

```sql
WITH queried_tables AS (
    -- Tables users are querying from landing_zone
    SELECT DISTINCT referenced_table.table_id
    FROM `finary-data-platform-prod.region-europe-west1.INFORMATION_SCHEMA.JOBS_BY_PROJECT`
    CROSS JOIN UNNEST(referenced_tables) AS referenced_table
    WHERE referenced_table.dataset_id = 'finary_landing_zone'
),
existing_models AS (
    -- Tables we already have public models for
    SELECT table_name
    FROM `finary_public.data_catalog`
    WHERE is_active = TRUE
)
SELECT qt.table_id AS missing_model
FROM queried_tables qt
LEFT JOIN existing_models em ON qt.table_id = em.table_name
WHERE em.table_name IS NULL;
```
