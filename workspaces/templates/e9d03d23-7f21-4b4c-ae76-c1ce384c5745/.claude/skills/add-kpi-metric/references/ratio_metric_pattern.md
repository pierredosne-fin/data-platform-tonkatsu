# Ratio Metric Pattern

Ratio metrics are percentages computed from numerator/denominator pairs (conversion rates, health percentages).

## Template

```sql
{%- macro aggregate_<name>_by_granularity(granularity, comparable=false) -%}
{%- set suffix = '_comparable' if comparable else '' -%}
SELECT
  {{ get_period_bucket('event_date', granularity) }} AS period_bucket,
  COUNT(DISTINCT IF(<numerator_condition>, <id_column>, NULL)) AS numerator_<metric>{{ suffix }},
  COUNT(DISTINCT IF(<denominator_condition>, <id_column>, NULL)) AS denominator_<metric>{{ suffix }}
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

## Real Example: Healthy Connections

From `aggregate_inst_co_by_granularity.sql`:

```sql
{%- macro aggregate_inst_co_by_granularity(granularity, comparable=false) -%}
{%- set suffix = '_comparable' if comparable else '' -%}
SELECT
  {{ get_period_bucket('event_date', granularity) }} AS period_bucket,
  COUNT(
    DISTINCT (
      IF(
        has_unhealthy_connection_event = 0 AND cur_user_is_active = true,
        entity_id,
        NULL
      )
    )
  ) AS numerator_healthy_connections{{ suffix }},
  COUNT(DISTINCT (
    IF(
      cur_user_is_active = true,
      entity_id,
      NULL
    )
  )) AS denominator_healthy_connections{{ suffix }},
  -- Second metric from same source
  COUNT(DISTINCT (
    IF(
      cur_user_is_active = true,
      user_id,
      NULL
    )
  )) - COUNT(
    DISTINCT (
      IF(
        has_unhealthy_connection_event = 1 AND cur_user_is_active = true,
        user_id,
        NULL
      )
    )
  ) AS numerator_healthy_connected_users{{ suffix }},
  COUNT(DISTINCT (
    IF(
      cur_user_is_active = true,
      user_id,
      NULL
    )
  )) AS denominator_healthy_connected_users{{ suffix }}
FROM
  {{ ref('_int_institution_connections_daily_snapshot_history') }}
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

## Integration in calc_metrics_by_granularity.sql

Ratio metrics use SAFE_DIVIDE in the unpivot:

```sql
-- In unpivoted_metrics CTE
UNION ALL
SELECT
  source_inst_co_aggregated.numerator_healthy_connections,
  source_inst_co_aggregated.denominator_healthy_connections,
  source_inst_co_aggregated.period_bucket,
  'perc_healthy_connections',
  SAFE_DIVIDE(
    source_inst_co_aggregated.numerator_healthy_connections,
    source_inst_co_aggregated.denominator_healthy_connections
  ) * 100
FROM
  source_inst_co_aggregated
```

```sql
-- In unpivoted_metrics_comparable CTE
UNION ALL
SELECT
  source_inst_co_comparable.period_bucket,
  'perc_healthy_connections',
  SAFE_DIVIDE(
    source_inst_co_comparable.numerator_healthy_connections_comparable,
    source_inst_co_comparable.denominator_healthy_connections_comparable
  ) * 100
FROM
  source_inst_co_comparable
```

## Key Points

1. Use `{%- set suffix = '_comparable' if comparable else '' -%}` for column naming
2. Output `numerator_<metric>` and `denominator_<metric>` columns (not a computed ratio)
3. The ratio is computed in `calc_metrics_by_granularity.sql` using `SAFE_DIVIDE(...) * 100`
4. Both numerator and denominator are passed through to enable drill-down analysis
5. Multiple ratio metrics can share the same aggregate snippet if they use the same source
