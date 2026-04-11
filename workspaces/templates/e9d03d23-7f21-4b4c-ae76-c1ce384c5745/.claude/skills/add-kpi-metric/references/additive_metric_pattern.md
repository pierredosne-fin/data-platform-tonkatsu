# Additive Metric Pattern

Additive metrics are summed values (revenue, counts, amounts) that can be aggregated across time periods.

## Template

```sql
{%- macro aggregate_<name>_by_granularity(granularity, comparable=false) -%}
SELECT
  {{ get_period_bucket('event_date', granularity) }} AS period_bucket,
  {%- if comparable %}
  SUM(<value_column>) AS <metric>_realised_comparable
  {%- else %}
  SUM(<value_column>) AS <metric>_realised
  {%- endif %}
FROM
  {{ ref('_int_<source_model>') }}
{%- if comparable %}
CROSS JOIN period_boundaries
{%- endif %}
WHERE
  event_date < CURRENT_DATE()
  {%- if comparable %}
  AND DATE_DIFF(
    event_date,
    {{ get_period_bucket('event_date', granularity) }},
    DAY
  ) <= period_boundaries.days_elapsed_in_current_period
  {%- endif %}
GROUP BY
  1
{%- endmacro -%}
```

## Real Example: New Users

From `aggregate_new_users_by_granularity.sql`:

```sql
{%- macro aggregate_new_users_by_granularity(granularity, comparable=false) -%}
SELECT
  {{ get_period_bucket('event_date', granularity) }} AS period_bucket,
  {%- if comparable %}
  SUM(new_users_count) AS new_users_realised_comparable
  {%- else %}
  SUM(new_users_count) AS new_users_realised
  {%- endif %}
FROM
  {{ ref('_int_new_users_metric') }}
{%- if comparable %}
CROSS JOIN period_boundaries
{%- endif %}
WHERE
  event_date < CURRENT_DATE()
  {%- if comparable %}
  AND DATE_DIFF(
    event_date,
    {{ get_period_bucket('event_date', granularity) }},
    DAY
  ) <= period_boundaries.days_elapsed_in_current_period
  {%- endif %}
GROUP BY
  1
{%- endmacro -%}
```

## Multiple Related Metrics (Parent + Children)

For metrics with sub-components (like AUM with crypto/advisory/life), output multiple columns:

```sql
{%- macro aggregate_aum_by_granularity(granularity, comparable=false) -%}
SELECT
  {{ get_period_bucket('event_date', granularity) }} AS period_bucket,
  {%- if comparable %}
  SUM(aum_euro) AS total_realised_comparable,
  SUM(IF(asset_type = 'crypto', aum_euro, 0)) AS crypto_realised_comparable,
  SUM(IF(asset_type = 'advisory', aum_euro, 0)) AS advisory_realised_comparable
  {%- else %}
  SUM(aum_euro) AS total_realised,
  SUM(IF(asset_type = 'crypto', aum_euro, 0)) AS crypto_realised,
  SUM(IF(asset_type = 'advisory', aum_euro, 0)) AS advisory_realised
  {%- endif %}
FROM
  {{ ref('_int_compute_aum') }}
-- ... rest of pattern
```

Then in `calc_metrics_by_granularity.sql`, use CROSS JOIN UNNEST to unpivot:

```sql
SELECT
  NULL AS numerator,
  NULL AS denominator,
  period_bucket AS event_date,
  metric_code,
  realised
FROM
  source_aum_aggregated
  CROSS JOIN UNNEST(
    [
      STRUCT(total_realised AS realised, 'asset_under_managment_total' AS metric_code),
      STRUCT(crypto_realised AS realised, 'asset_under_managment_crypto' AS metric_code),
      STRUCT(advisory_realised AS realised, 'asset_under_managment_advisory' AS metric_code)
    ]
  )
```

## Key Points

1. Output column must end with `_realised` or `_realised_comparable`
2. The `comparable` mode filters to same number of days elapsed as current period
3. Source must be an `_int_*` intermediate model with `event_date` column
4. Always exclude current day: `WHERE event_date < CURRENT_DATE()`
