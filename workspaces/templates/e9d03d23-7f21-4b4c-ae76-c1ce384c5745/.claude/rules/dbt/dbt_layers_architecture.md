# dbt Layers Architecture Rules

This document defines the transformation responsibilities for each layer in Finary's dbt medallion architecture.

## Layer Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│  STAGING (ephemeral)                                                    │
│  ├── base__*   →  Raw extraction, type casting, column renaming        │
│  └── stg__*    →  Light transformations, denormalization (same grain)  │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  INTERMEDIATE (ephemeral or table)                                      │
│  └── _int_*    →  Heavy transformations that ALTER grain               │
│                   (aggregations, unions, joins changing cardinality)   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  MARTS                                                                  │
│  ├── tmp/      →  Materialized tables (partition + cluster)            │
│  └── public/   →  Views with projection only (SELECT, CAST)            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Staging Layer (`models/staging/`)

**Purpose:** Extract and lightly clean raw data while preserving the original grain.

### Base Models (`base__*`)

| Allowed | Forbidden |
|---------|-----------|
| ✅ `SELECT` from source | ❌ `JOIN` |
| ✅ Column renaming (`AS`) | ❌ `GROUP BY` |
| ✅ Type casting (`CAST`, `::`) | ❌ `UNION ALL` |
| ✅ `WHERE` for partition pruning | ❌ Window functions |
| ✅ Simple expressions (`COALESCE`, `IFNULL`) | ❌ Aggregations (`SUM`, `COUNT`) |

**Example:**
```sql
-- base__provider_connections.sql
SELECT
    id::VARCHAR AS connection_id,
    user_id::VARCHAR AS user_id,
    created_at,
    updated_at
FROM {{ source('track_pg', 'provider_connections') }}
```

### Stg Models (`stg__*`)

> ⚠️ **Create a staging model only when justified.** If the downstream intermediate model only needs the raw base columns, ref `base__*` directly and skip `stg__*` entirely. Good justifications for creating a staging model: adding denormalized lookup columns (1:1 join), deduplication logic, or business-level filters that will be reused by multiple downstream models.

| Allowed | Forbidden |
|---------|-----------|
| ✅ Everything from base | ❌ `GROUP BY` (changes grain) |
| ✅ `LEFT JOIN` for denormalization **if grain unchanged** | ❌ `UNION ALL` |
| ✅ `ROW_NUMBER()` for deduplication (`QUALIFY`) | ❌ Aggregations that collapse rows |
| ✅ Business logic filters (`WHERE`) | ❌ Date spine generation |
| ✅ Surrogate key generation | ❌ Cross-joins |

**Grain Rule:** The output row count must equal the input row count (or less if deduplicating/filtering). Never more.

**Example:**
```sql
-- stg__deals.sql
WITH source AS (
    SELECT * FROM {{ ref('base__deals') }}
),
stages AS (
    SELECT * FROM {{ ref('base__pipelines_deals_stages') }}
),
final AS (
    SELECT
        source.*,
        stages.label AS deal_stage_label  -- Denormalization (1:1 join)
    FROM source
    LEFT JOIN stages ON source.stage_id = stages.stage_id
)
SELECT * FROM final
```

---

## 2. Intermediate Layer (`models/intermediate/`)

**Purpose:** Perform heavy transformations that alter the grain or combine multiple data sources.

### Upstream Dependencies

Intermediate models can ref **either** `base__*`, `stg__*`, or other `_int_*` models — whichever is appropriate:

- **Ref `base__*` directly** when no extra columns from staging are needed (e.g., the transformation only needs the raw extracted columns).
- **Ref `stg__*`** when denormalized/cleaned columns produced by staging are actually required.
- **Ref other `_int_*`** when chaining intermediate transformations.

> ❌ Do **not** create a `stg__*` model just to have an intermediate ref it. Only create staging models when the staging transformations (1:1 joins, deduplication, business filters) are genuinely needed.

> ❌ **Never ref `tmp_*` from `_int_*`.** The DAG must flow `staging → intermediate → tmp → public/applications`. An intermediate model referencing a `tmp_*` model creates a backwards dependency and breaks the layer hierarchy.

### Allowed Transformations (`_int_*`)

| Transformation | Use Case |
|----------------|----------|
| ✅ `GROUP BY` + Aggregations | Collapse rows to new grain |
| ✅ `UNION ALL` | Combine multiple sources |
| ✅ `JOIN` that changes cardinality | Fan-out or fan-in joins |
| ✅ `GENERATE_DATE_ARRAY` / Date spines | Create time-series snapshots |
| ✅ Window functions for analytics | Running totals, rankings |
| ✅ Complex CTEs with multiple steps | Multi-stage transformations |
| ✅ `CROSS JOIN` for date expansion | Daily snapshot generation |

### Materialization Decision

| Scenario | Materialization |
|----------|-----------------|
| Referenced by 1 downstream model | `ephemeral` (default) |
| Referenced by multiple models | `table` or `view` |
| Large date spine expansion | `table` with partitioning |
| Performance-critical path | `table` with clustering |

**Example - Aggregation:**
```sql
-- _int_metrics_aggregated_month.sql
WITH source AS (
    SELECT * FROM {{ ref('stg__daily_metrics') }}
),
aggregated AS (
    SELECT
        DATE_TRUNC(event_date, MONTH) AS event_month,
        metric_name,
        SUM(metric_value) AS total_value,
        COUNT(*) AS record_count
    FROM source
    GROUP BY 1, 2  -- ⚠️ Grain change: daily → monthly
)
SELECT * FROM aggregated
```

**Example - Date Spine Expansion:**
```sql
-- _int_institution_connections_daily_snapshot_history.sql
{{ config(materialized='table', partition_by={'field': 'event_date'}) }}

WITH date_spine AS (
    SELECT day AS event_date
    FROM UNNEST(GENERATE_DATE_ARRAY('2020-01-01', CURRENT_DATE())) AS day
),
source AS (
    SELECT * FROM {{ ref('_int_institution_connections_drop_duplicates') }}
),
expanded AS (
    SELECT
        date_spine.event_date,
        source.*
    FROM date_spine
    CROSS JOIN source  -- ⚠️ Grain change: entity → entity × day
    WHERE date_spine.event_date BETWEEN source.valid_from AND source.valid_to
)
SELECT * FROM expanded
```

---

## 3. Marts Layer (`models/marts/`)

**Purpose:** Expose final models to business users with zero transformation logic.

### Tmp Models (`marts/tmp/`)

**Role:** Materialize heavy computations as tables for performance.

| Allowed | Forbidden |
|---------|-----------|
| ✅ `SELECT * FROM ref('_int_*')` | ❌ New business logic |
| ✅ Final column selection | ❌ `JOIN` |
| ✅ Column ordering | ❌ `GROUP BY` |
| ✅ Partitioning + Clustering config | ❌ `UNION ALL` |

**Example:**
```sql
-- tmp_aum_daily_metrics.sql
{{ config(
    materialized='table',
    partition_by={'field': 'event_date', 'data_type': 'date'},
    cluster_by=['asset_type']
) }}

WITH source AS (
    SELECT * FROM {{ ref('_int_compute_aum') }}
),
final AS (
    SELECT
        log_id,
        event_date,
        asset_type,
        aum_euro
    FROM source
)
SELECT * FROM final
```

### Public Models (`marts/public/`)

**Role:** Thin views exposing tmp tables to BI tools (Metabase, Dust).

| Allowed | Forbidden |
|---------|-----------|
| ✅ `SELECT` specific columns | ❌ Any transformation |
| ✅ `CAST()` for type alignment | ❌ `JOIN` |
| ✅ Column aliasing | ❌ `WHERE` filters |
| ✅ Column reordering | ❌ `GROUP BY` |
| | ❌ `CASE WHEN` |
| | ❌ Business logic |

**Rule:** Public models are **projection-only**. If you need logic, it belongs in `_int_*` or `tmp_*`.

**Example:**
```sql
-- aum_daily_metrics.sql (public)
WITH source AS (
    SELECT * FROM {{ ref('tmp_aum_daily_metrics') }}
),
final AS (
    SELECT
        CAST(log_id AS STRING) AS log_id,  -- ✅ Type casting allowed
        event_date,
        asset_type,
        aum_euro
    FROM source
)
SELECT * FROM final
```

### Applications Models (`marts/applications/`)

**Role:** Thin views exposing tmp tables to application integrations (Segment, Reverse ETL, APIs). Same rules as public views.

| Allowed | Forbidden |
|---------|-----------|
| ✅ `SELECT` specific columns | ❌ Any transformation |
| ✅ `CAST()` for type alignment | ❌ `JOIN` |
| ✅ Column aliasing | ❌ `WHERE` filters |
| ✅ Column reordering | ❌ `GROUP BY` |
| | ❌ `CASE WHEN` |
| | ❌ Business logic |

**Rule:** Applications models follow the **same projection-only constraint** as public models. They must ref a `tmp_*` model. Any filtering, business logic, or computed columns must be pushed to `_int_*` and materialized through `tmp_*`.

---

## Quick Reference: Where Does This Transformation Belong?

| Transformation | Layer |
|----------------|-------|
| Extract from source | `base__*` |
| Rename/cast columns | `base__*` or `stg__*` |
| Deduplicate rows | `stg__*` |
| Add lookup labels (1:1 join) | `stg__*` |
| Filter deleted records | `stg__*` |
| Aggregate (`GROUP BY`) | `_int_*` |
| Union multiple sources | `_int_*` |
| Fan-out joins (1:N) | `_int_*` |
| Date spine expansion | `_int_*` |
| Materialize for performance | `tmp_*` |
| Expose to BI tools | `public` |
| Expose to application integrations | `applications` |

---

## Anti-Patterns

### ❌ Aggregation in Staging
```sql
-- WRONG: stg__daily_revenue.sql
SELECT DATE(created_at) AS day, SUM(amount) AS revenue
FROM {{ ref('base__transactions') }}
GROUP BY 1  -- ❌ This belongs in _int_*
```

### ❌ Business Logic in Public
```sql
-- WRONG: revenue_metrics.sql (public)
SELECT *,
    CASE WHEN revenue > 1000 THEN 'high' ELSE 'low' END AS tier  -- ❌ Move to _int_*
FROM {{ ref('tmp_revenue_metrics') }}
```

### ❌ Joins in Marts
```sql
-- WRONG: tmp_user_summary.sql
SELECT u.*, o.order_count
FROM {{ ref('_int_users') }} u
LEFT JOIN {{ ref('_int_orders') }} o ON u.user_id = o.user_id  -- ❌ Move to _int_*
```

### ❌ Skipping the tmp Layer
```sql
-- WRONG: user_metrics.sql (public or applications)
SELECT * FROM {{ ref('_int_user_metrics') }}  -- ❌ Should ref tmp_user_metrics
```

### ❌ Intermediate Referencing tmp (Backwards Dependency)
```sql
-- WRONG: _int_new_paid_customer.sql
SELECT * FROM {{ ref('tmp_paid_customer') }}  -- ❌ _int_* must not ref tmp_*
-- FIX: ref the upstream _int_* model instead
SELECT * FROM {{ ref('_int_paid_customer_with_churn') }}  -- ✅ Correct
```

---

## Summary

| Layer | Schema | Materialization | Grain Change | Transformations |
|-------|--------|-----------------|--------------|-----------------|
| `base__*` | tmp | ephemeral | ❌ Never | Extract, cast, rename |
| `stg__*` | tmp | ephemeral | ❌ Never | Denormalize (1:1), dedupe, filter |
| `_int_*` | tmp | ephemeral/table | ✅ Yes | Aggregate, union, fan-out joins |
| `tmp_*` | tmp | table | ❌ Never | Materialize + partition, NO TRANSFORMATION |
| `public` | public | view | ❌ Never | Projection only (SELECT, CAST) |
| `applications` | applications | view | ❌ Never | Projection only (SELECT, CAST) |
