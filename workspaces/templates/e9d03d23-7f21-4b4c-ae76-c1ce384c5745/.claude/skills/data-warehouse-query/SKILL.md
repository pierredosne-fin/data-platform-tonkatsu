---
name: data-warehouse-query
description: |
  Answer business questions by querying Finary's data platform. Use when:
  - User asks a business question ("How many users signed up last month?", "What's our MRR?")
  - User wants to run a SQL query against BigQuery or Postgres
  - User needs to explore available tables and columns
  - User says "query", "SQL", "look up", "find out", "how many", "what is the"
args:
  question:
    description: The business question to answer (e.g., "How many users signed up last month?")
    required: true
---

# SQL Query Skill

Answer business questions by discovering data assets and executing queries against Finary's data platform.

## Usage

This skill requires a business question as an argument:

```bash
/data-warehouse-query "How many active users do we have?"
/data-warehouse-query "What's our MRR for January 2024?"
/data-warehouse-query "How many users signed up last month?"
```

## Data Asset Hierarchy

Finary provides **3 types of data assets**, listed by priority (most trusted first):

| Priority | Asset Type | Description | Trust Level |
|----------|------------|-------------|-------------|
| 🥇 1st | **Metrics** | Pre-computed KPIs in `company_metrics_aggregated` | ✅ High - validated business logic |
| 🥈 2nd | **Models** | Transformed dbt models (marts) | ✅ High - tested & documented |
| 🥉 3rd | **Sources** | Raw source tables | ⚠️ Lower - requires careful interpretation |

**Trust Level Warning:** The more raw sources you use in your query, the higher the risk of misinterpretation or hallucination. Always prefer higher-priority assets when available.

## Workflow

### 1. Clarification

Start with the provided business question as context.

**Only ask follow-up questions if critical details are missing:**
- What time period? (if not specified)
- What filters or groupings? (if ambiguous)
- What output format? (if relevant)

If the question is clear and specific enough, proceed directly to discovery.

Do NOT proceed until the business logic is unambiguous.

### 2. Discovery (Follow Priority Order)

#### Step 2a: Check Metrics FIRST

Before exploring the data catalog, check if a pre-computed metric already answers the question:

```sql
SELECT DISTINCT
    metric_name,
    metric_description
FROM `finary-data-platform-prod.finary_public.company_metrics_aggregated`
WHERE
    LOWER(metric_name) LIKE '%keyword%'
    OR LOWER(metric_description) LIKE '%keyword%'
ORDER BY metric_name
```

If a matching metric exists, use it directly:

```sql
SELECT
    event_date,
    metric_value
FROM `finary-data-platform-prod.finary_public.company_metrics_aggregated`
WHERE metric_name = '<metric_name>'
    AND event_date BETWEEN '<start_date>' AND '<end_date>'
ORDER BY event_date
```

**If a metric solves the request → STOP HERE. No need to explore further.**

#### Step 2b: Check Models in Data Catalog

If no metric matches, search for transformed **models** (asset_type = 'model'):

```sql
SELECT
    table_name,
    table_description,
    column_name,
    column_description
FROM `finary-data-platform-prod.finary_public.data_catalog`
WHERE
    asset_type = 'model'
    AND (
        LOWER(table_name) LIKE '%keyword%'
        OR LOWER(column_description) LIKE '%keyword%'
        OR LOWER(table_description) LIKE '%keyword%'
    )
```

#### Step 2c: Fall Back to Sources (Last Resort)

Only if no models satisfy the request, search for raw **sources**:

```sql
SELECT
    source_system,
    database_name,
    table_name,
    table_description,
    column_name,
    column_data_type,
    column_description
FROM `finary-data-platform-prod.finary_public.data_catalog`
WHERE
    asset_type = 'source'
    AND (
        LOWER(table_name) LIKE '%keyword%'
        OR LOWER(column_description) LIKE '%keyword%'
        OR LOWER(table_description) LIKE '%keyword%'
    )
```

#### Data Catalog Reference

**Data Catalog Columns:**
| Column | Description |
|--------|-------------|
| `source_system` | Origin system (e.g., track, invest, hubspot) |
| `asset_type` | Type: `source` (raw), `model` (transformed), or `metric` |
| `database_name` | Logical database name |
| `table_name` | Table name |
| `table_description` | Business description of the table |
| `column_name` | Column identifier |
| `column_data_type` | Data type (STRING, INTEGER, TIMESTAMP, etc.) |
| `column_description` | Business meaning of the column |

### 3. Drafting & Execution

Write the SQL query and execute it using the dbt MCP `show` tool.

**For BigQuery tables (most common):**
```sql
SELECT columns FROM `finary-data-platform-prod.finary_public.table_name`
```

**For Postgres sources (federated query):**
When `source_system` indicates postgres (track, invest, life), use `external_query()`:

```sql
SELECT * FROM external_query(
    "finary-data-platform-prod.europe-west1.<connection>",
    """<postgres_sql>"""
)
```

**Available Postgres Connections:**
| Connection | Database |
|------------|----------|
| `track_pg` | Main track database (users, holdings, institutions) |
| `track_report_pg` | Track reporting database |
| `invest_report_pg` | Invest reporting database |
| `invest_life_pg` | Life insurance database |

**Postgres SQL Notes:**
- Cast enums to varchar: `column::varchar`
- Cast UUIDs to varchar: `id::varchar`
- Use standard Postgres syntax inside the inner query

## Output Format

After execution, provide:

1. **Data Source Badge** - Indicate which asset type(s) were used:
   - 🟢 `METRIC` - Used pre-computed metric from `company_metrics_aggregated`
   - 🔵 `MODEL` - Used transformed dbt model(s)
   - 🟡 `SOURCE` - Used raw source table(s)

2. **The SQL query executed** (in a code block)

3. **The results** in a readable format

4. **A plain-text answer** to the business question

5. **Trust Level Disclaimer** (required when using sources):

| Assets Used | Trust Disclaimer |
|-------------|------------------|
| Metrics only | ✅ *High confidence - This uses validated business metrics.* |
| Models only | ✅ *High confidence - This uses tested and documented data models.* |
| Models + Sources | ⚠️ *Medium confidence - This combines curated models with raw sources. Please verify business logic.* |
| Sources only | ⚠️ *Lower confidence - This uses raw source data which may require domain expertise to interpret correctly. Results should be validated before making business decisions.* |

**Example Output:**

> 🟢 **Data Source:** METRIC (`company_metrics_aggregated`)
>
> ```sql
> SELECT event_date, metric_value FROM ...
> ```
>
> | event_date | metric_value |
> |------------|--------------|
> | 2024-01-01 | 1234 |
>
> **Answer:** The MRR for January 2024 was €1,234.
>
> ✅ *High confidence - This uses validated business metrics.*