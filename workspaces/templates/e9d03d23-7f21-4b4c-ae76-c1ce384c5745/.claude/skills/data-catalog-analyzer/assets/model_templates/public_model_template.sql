-- {model_name}.sql
-- Public view exposing tmp_{model_name}
-- Projection only - NO transformation logic allowed

{{ config(
    materialized='view',
    schema='public'
) }}

WITH source AS (
    SELECT * FROM {{ ref('tmp_{model_name}') }}
),
final AS (
    SELECT
        log_id,
        entity_id,
        {column_list}
        created_at,
        updated_at
    FROM source
)
SELECT * FROM final
