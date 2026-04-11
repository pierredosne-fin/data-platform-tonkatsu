# CLAUDE.md

This file provides guidance to Claude Code when working with Finary's Data Platform dbt project.

## Project Overview

**Finary's Data Platform** - A production-grade dbt project implementing a **medallion architecture** to transform multi-source data into analytics-ready models in Google BigQuery.

**Key Principles:**
- ✅ **Denormalization first** - Flatten data for business user accessibility
- ✅ **Point-in-time accuracy** - Support temporal analysis with `at_event_*` vs `cur_*` columns
- ✅ **Data quality enforcement** - All primary keys must have `unique` + `not_null` tests
- ✅ **Layer separation** - Strict rules for what transformations belong in each layer
- ✅ **Documentation as code** - Every model requires `.sql`, `.yml`, and `.md` files

---

## 🚨 Critical Rules

### 1. Layer Architecture (STRICTLY ENFORCED)

| Layer | Allowed | Forbidden | Materialization |
|-------|---------|-----------|-----------------|
| **`base__*`** | SELECT, CAST, rename | JOIN, GROUP BY, aggregations | ephemeral |
| **`stg__*`** | base + 1:1 joins, dedup | Grain changes, aggregations | ephemeral |
| **`_int_*`** | All transformations | Ref `tmp_*` (backwards dep) | ephemeral/table |
| **`tmp_*`** | Final column selection | New business logic | table (partitioned) |
| **`public`** | Projection only (SELECT, CAST) | JOIN, WHERE, CASE, logic | view |
| **`applications`** | Projection only (SELECT, CAST) | JOIN, WHERE, CASE, logic | view |

**❌ NEVER:**
- Aggregate in staging (`GROUP BY` belongs in intermediate)
- Add business logic in public or applications views (use intermediate layer)
- Skip the `tmp_*` layer for materialized marts
- Join in marts (do it in intermediate)
- Ref `tmp_*` from `_int_*` (DAG must flow staging → intermediate → tmp → public/applications)

**📖 Detailed rules:** [`.claude/rules/dbt/dbt_layers_architecture.md`](./.claude/rules/dbt/dbt_layers_architecture.md)

### 2. File Structure (MANDATORY)

Every dbt model **must** have 3 files in a dedicated folder:

```
models/
└── marts/
    └── public/
        └── revenue_metrics/
            ├── revenue_metrics.sql    # Model query
            ├── revenue_metrics.yml    # Tests & schema
            └── revenue_metrics.md     # Documentation
```

**For staging models**, also include a `base/` folder:

```
models/
└── staging/
    └── postgres/
        ├── base/
        │   ├── base__users.sql
        │   ├── base__users.yml
        │   └── base__users.md
        ├── stg__users.sql
        ├── stg__users.yml
        └── stg__users.md
```

### 3. Data Quality Tests (NON-NEGOTIABLE)

Every model with `log_id` or `entity_id` as primary key **must** have:

```yaml
# models/marts/public/revenue_metrics/revenue_metrics.yml
version: 2

models:
  - name: revenue_metrics
    description: "Daily revenue aggregated by source."
    columns:
      - name: log_id
        description: "Primary identifier for this model."
        data_tests:
          - unique
          - not_null
```

**`.yml` files are required at every layer**, but only `marts/public/` and `marts/applications/` models must have descriptions and data tests fully filled in. Other layers only need a minimal `.yml` to register the model.

**📖 Full standards:** [`.claude/rules/dbt/dbt_data_quality_tests.md`](./.claude/rules/dbt/dbt_data_quality_tests.md)

---

## 📁 Architecture

### Medallion Layers

```
┌────────────────────────────────────────────────────────────┐
│  STAGING (ephemeral, schema: tmp)                          │
│  ├─ base__<source>_<entity>   → Raw extraction            │
│  └─ stg__<source>_<entity>    → Light cleaning            │
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│  INTERMEDIATE (ephemeral/table, schema: tmp)               │
│  └─ _int_<description>         → Heavy transformations    │
│     (aggregations, unions, joins that change grain)        │
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│  MARTS                                                     │
│  ├─ tmp/<model>               → Materialized tables       │
│  │  (partitioned + clustered for performance)             │
│  └─ public/<model>            → Views for BI tools        │
│     (projection only, no logic)                            │
└────────────────────────────────────────────────────────────┘
```

### Schemas in BigQuery

| Schema | Purpose | Access |
|--------|---------|--------|
| `finary.public` | Business-facing views | Metabase, Dust, analysts |
| `finary.tmp` | Staging, intermediate, tmp tables | dbt only (internal) |
| `finary.finary_snapshots` | SCD Type 2 history tables | dbt + analytics |
| `finary.landing_zone` | Raw seeds, dlt pipelines | Data ingestion |

---

## 🏷️ Naming Conventions

### Mart Models (Business Name → Filename)

**Process:**
1. Define **Business Name** in Title Case (e.g., `Institution Connections Daily Snapshot History`)
2. Convert to `snake_case` for filename (e.g., `institution_connections_daily_snapshot_history.sql`)
3. Use Business Name as `description` in `.yml`

| Business Name | Filename | Mandatory Columns | Grain |
|---------------|----------|-------------------|-------|
| **`<Entity>`** | `<entity>` | `entity_id`, `created_at`, `updated_at` | Current state |
| **`<Entity> Snapshot History`** | `snapshot_<entity>` | `log_id`, `entity_id`, `snapshot_from`, `snapshot_to`, `is_current` | SCD Type 2 |
| **`<Event>`** | `<event>` | `log_id`, `event_date` | Point-in-time event |
| **`<Entity> <Granularity> Snapshot History`** | `<entity>_<granularity>_snapshot_history` | `log_id`, `entity_id`, `event_date` | Periodic snapshots |
| **`<Event> <Granularity> Metrics`** | `<event>_<granularity>_aggr_metrics` | `log_id`, `event_date` | Aggregated metrics |

**📖 Full taxonomy:** [`.claude/rules/dbt/dbt_tables_taxonomy.md`](./.claude/rules/dbt/dbt_tables_taxonomy.md)

### Point-in-Time Columns (Temporal Analysis)

For columns that change over time, provide **both perspectives**:

| Prefix | Meaning | Use Case |
|--------|---------|----------|
| `at_event_*` | Value at event time | Historical accuracy, cohort analysis |
| `cur_*` | Current/latest value | Real-time reporting, current state |

**Example:**
```sql
SELECT
    subscription_id,
    created_at AS event_date,

    -- Historical context (at event time)
    at_event_subscription_status,
    at_event_pricing_plan,

    -- Current state (for live reporting)
    cur_subscription_status,
    cur_pricing_plan
FROM {{ ref('fact_new_subscription') }}
```

**📖 Denormalization guide:** [`.claude/rules/dbt/dbt_denormalization.md`](./.claude/rules/dbt/dbt_denormalization.md)

### Staging Models

| Layer | Pattern | Example | Required? |
|-------|---------|---------|-----------|
| Base | `base__<source>_<entity>` | `base__postgres_users` | ✅ Always |
| Staging | `stg__<source>_<entity>` | `stg__postgres_users` | ⚠️ Only when justified |

**When to create a `stg__*` model:** Only create one if you actually need its value-adds — denormalized lookup columns (1:1 join), deduplication, or business filters reused by multiple downstream models. If the intermediate model only needs raw base columns, ref `base__*` directly.

---

## 💾 Data Sources

| Source | Description | Connection |
|--------|-------------|------------|
| `postgres` (track_pg) | Primary operational database (users, transactions) | Cloud SQL Proxy |
| `hubspot` | CRM data (deals, contacts, companies) | dlt pipeline → landing_zone |
| `bigquery` | BigQuery native sources (logs, external tables) | Direct query |
| `googlesheet` | External spreadsheet data (budgets, mappings) | Sheets API |
| `dbt` | dbt artifacts (Elementary monitoring) | BigQuery metadata |

**Source definitions:** `models/staging/<source>/src_<source>.yml`

---

## 🛠️ Common Commands

### Local Development (from `app/dbt/fin_dw/`)

```bash
# Run specific model
dbt run --select model_name

# Run model with upstream dependencies
dbt run --select +model_name

# Run model with downstream dependencies
dbt run --select model_name+

# Run + test model
dbt build --select model_name

# Test specific model
dbt test --select model_name

# Generate and serve documentation
dbt docs generate && dbt docs serve

# Compile model to see generated SQL
dbt compile --select model_name

# Run models by tag
dbt run --select tag:public
dbt run --select tag:tmp

# Run models by path
dbt run --select marts/public/*
```

### Advanced Selectors

```bash
# Run all staging models for a source
dbt run --select staging.postgres.*

# Run models modified in git
dbt run --select state:modified+

# Run marts and their upstream dependencies
dbt run --select +marts/*

# Exclude specific models
dbt run --exclude tag:deprecated
```

### Testing & Quality

```bash
# Run all tests
dbt test

# Test specific column
dbt test --select source:postgres,column:user_id

# Dry run (compile without execution)
dbt compile --select model_name
```

---

## 🔄 Development Workflow

### 1. Before Writing Any Code

**Ask yourself:**
- What layer does this transformation belong to?
- Does this change the grain of the data?
- Is this logic already implemented elsewhere?

**Read existing models:**
```bash
dbt ls --select +model_name  # See upstream dependencies
```

### 2. Creating a New Model

**Step-by-step:**

1. **Determine the layer:**
   - Extracting from source? → `base__*`
   - Light transformations? → `stg__*`
   - Aggregating/joining? → `_int_*`
   - Materializing for performance? → `tmp_*`
   - Exposing to BI? → `public/`

2. **Create the folder structure:**
   ```bash
   mkdir -p models/marts/public/revenue_metrics
   touch models/marts/public/revenue_metrics/{revenue_metrics.sql,revenue_metrics.yml,revenue_metrics.md}
   ```

3. **Write the SQL:**
   ```sql
   -- revenue_metrics.sql
   {{ config(
       materialized='view',
       schema='public'
   ) }}

   WITH source AS (
       SELECT * FROM {{ ref('tmp_revenue_metrics') }}
   ),
   final AS (
       SELECT
           log_id,
           event_date,
           revenue_amount_euro
       FROM source
   )
   SELECT * FROM final
   ```

4. **Add tests:**
   ```yaml
   # revenue_metrics.yml
   version: 2

   models:
     - name: revenue_metrics
       description: "Daily revenue aggregated by source."
       columns:
         - name: log_id
           description: "Primary identifier."
           data_tests:
             - unique
             - not_null
   ```

5. **Document the model:**
   ```markdown
   # revenue_metrics.md

   ## Overview
   Daily revenue metrics aggregated from transaction events.

   ## Grain
   One row per day per revenue source.

   ## Use Cases
   - Executive dashboards
   - Revenue trend analysis
   ```

6. **Run and test:**
   ```bash
   dbt run --select revenue_metrics
   dbt test --select revenue_metrics
   ```

### 3. Modifying Existing Models

**Always:**
- ✅ Read the model first (`Read` tool, not `cat`)
- ✅ Check downstream dependencies (`dbt ls --select revenue_metrics+`)
- ✅ Run tests after changes (`dbt test --select revenue_metrics`)
- ✅ Update documentation if grain/logic changes

**Never:**
- ❌ Guess file paths - verify they exist
- ❌ Skip reading the current code
- ❌ Assume no downstream impact

---

## 🚫 Common Anti-Patterns

### ❌ Aggregating in Staging
```sql
-- WRONG: stg__daily_revenue.sql
SELECT DATE(created_at) AS day, SUM(amount) AS revenue
FROM {{ ref('base__transactions') }}
GROUP BY 1  -- This changes grain - belongs in _int_*
```

**Fix:** Move to intermediate layer

### ❌ Business Logic in Public Views
```sql
-- WRONG: revenue_metrics.sql (public)
SELECT *,
    CASE WHEN revenue > 1000 THEN 'high' ELSE 'low' END AS tier
FROM {{ ref('tmp_revenue_metrics') }}  -- Logic should be in _int_* or tmp_*
```

**Fix:** Add logic in `_int_*`, materialize in `tmp_*`, project in `public`

### ❌ Skipping tmp Layer
```sql
-- WRONG: revenue_metrics.sql (public)
{{ config(materialized='view') }}
SELECT * FROM {{ ref('_int_revenue_metrics') }}  -- Should ref tmp_*
```

**Fix:** Create `tmp_revenue_metrics` with table materialization

### ❌ Missing Tests
```yaml
# WRONG: revenue_metrics.yml
version: 2

models:
  - name: revenue_metrics
    description: "Daily revenue metrics."
    # Missing columns section with log_id tests!
```

**Fix:** Always test primary keys

---

## 🌍 Environments

| Environment | Project | Target | Use Case |
|-------------|---------|--------|----------|
| **Staging** | `finary-data-platform-staging` | `staging` (default) | Development, testing, CI/CD |
| **Production** | `finary-data-platform-prod` | `prod` | Production workloads |

**Set environment:**
```bash
# Default (staging)
dbt run

# Production
ENV=production dbt run

# In profiles.yml
export DBT_TARGET=prod
```

---

## 🎯 Best Practices

### Performance Optimization

**For large tables (>1M rows):**
```sql
{{ config(
    materialized='table',
    partition_by={'field': 'event_date', 'data_type': 'date'},
    cluster_by=['user_id', 'event_type']
) }}
```

**For small tables (<100K rows):**
```sql
{{ config(materialized='table') }}  # No partitioning needed
```

### Commit Messages

Commits are validated by [commitlint](commitlint.config.js) using `@commitlint/config-conventional`:

- **Header max length: 100 characters** (including `type: ` prefix)
- **Allowed types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`, `revert`
- **Subject must not start with uppercase**
- Keep messages concise — if you can't fit it in 100 chars, shorten it

### SQL Style (SQLFluff)

SQLFluff lints all models with the BigQuery dialect (see `.sqlfluff`). Key rules:

- **Keywords** must be `UPPER` (SELECT, FROM, WHERE, etc.)
- **Identifiers** must be `lower` (column names, aliases)
- **Functions** must be `UPPER` (COALESCE, SUM, CAST, etc.)
- **Literals** must be `lower` (`true`, `false`, `null`)
- **No unnecessary CASE** (ST02): use `condition AS col` instead of `CASE WHEN condition THEN true ELSE false END`
- **Explicit aliasing**: always use `AS` for table and column aliases

### Code Style

**Use CTEs for readability:**
```sql
WITH source AS (
    SELECT * FROM {{ ref('stg__users') }}
),
filtered AS (
    SELECT * FROM source WHERE deleted_at IS NULL
),
final AS (
    SELECT
        user_id,
        email,
        created_at
    FROM filtered
)
SELECT * FROM final
```

**Always use `ref()` for dependencies:**
```sql
SELECT * FROM {{ ref('stg__users') }}  -- ✅ Correct
SELECT * FROM finary.tmp.stg__users    -- ❌ Wrong (hardcoded)
```

### Documentation

**Be specific about grain:**
```yaml
models:
  - name: user_daily_metrics
    description: "Daily aggregated metrics per user. One row per user per day."
```

---

## 🐛 Troubleshooting

### "Relation does not exist" error
- **Cause:** Referencing a model that hasn't been run
- **Fix:** `dbt run --select +your_model` (include upstream)

### Tests failing after changes
- **Cause:** Transformation introduced duplicates or nulls
- **Debug:**
  ```sql
  SELECT log_id, COUNT(*)
  FROM {{ ref('your_model') }}
  GROUP BY 1
  HAVING COUNT(*) > 1
  ```

### Slow query performance
- **Check:** Is the table partitioned? Clustered?
- **Fix:** Add partition/cluster config in model config block

### Circular dependency error
- **Cause:** Model A refs B, and B refs A
- **Fix:** Introduce intermediate model to break cycle

---

## 📚 Key Files

| File | Purpose |
|------|---------|
| `app/dbt/fin_dw/dbt_project.yml` | Project configuration, schema mappings |
| `app/dbt/profiles/profiles.yml` | BigQuery connection profiles |
| `.sqlfluff` | SQL linting rules |
| `.pre-commit-config.yaml` | Git pre-commit hooks |
| `CHANGELOG.md` | Automated release notes |

---

## 📖 Reference Documentation

**Essential reading:**
- [Layer Architecture Rules](./.claude/rules/dbt/dbt_layers_architecture.md) - What transformations belong where
- [Tables Taxonomy](./.claude/rules/dbt/dbt_tables_taxonomy.md) - Business name → filename mapping
- [Data Quality Tests](./.claude/rules/dbt/dbt_data_quality_tests.md) - Testing standards
- [Denormalization Guide](./.claude/rules/dbt/dbt_denormalization.md) - Point-in-time joins
- [Documentation Standards](./.claude/rules/dbt/dbt_documentation.md) - `.yml` description template for marts models

**External resources:**
- [dbt Documentation](https://docs.getdbt.com/)
- [BigQuery Best Practices](https://cloud.google.com/bigquery/docs/best-practices)

---

## 🤖 Working with Claude Code

When I (Claude) work with this codebase, I will:

1. ✅ **Always read files before editing** - Never guess file contents
2. ✅ **Follow layer architecture strictly** - Check `.claude/rules/dbt/` for constraints
3. ✅ **Add tests for all primary keys** - `unique` + `not_null` are mandatory
4. ✅ **Create all 3 files** - `.sql`, `.yml`, `.md` for every model
5. ✅ **Use the correct layer** - Aggregations go in intermediate, not staging
6. ✅ **Check downstream impact** - Run `dbt ls --select model+` before major changes
7. ✅ **Verify file structure** - Models must be in dedicated folders

**If you notice I'm violating any of these rules, please remind me by referencing this CLAUDE.md file.**

---

**Questions?** Check the README.md or reach out to the Data Platform team.
