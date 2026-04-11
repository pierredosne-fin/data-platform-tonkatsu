-- BigQuery Analysis Query Templates
-- These templates are used by analyze_bq_usage.py

-- =============================================================================
-- 1. DATASET ACCESS DISTRIBUTION
-- Shows how queries are distributed across datasets (landing_zone, tmp, public)
-- =============================================================================

SELECT
  referenced_table.dataset_id,
  COUNT(*) as query_count,
  COUNT(DISTINCT referenced_table.table_id) as unique_tables,
  COUNT(DISTINCT user_email) as unique_users
FROM `{project}.region-europe-west1.INFORMATION_SCHEMA.JOBS_BY_PROJECT`
CROSS JOIN UNNEST(referenced_tables) AS referenced_table
WHERE
  creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
  AND job_type = 'QUERY'
  AND state = 'DONE'
  AND error_result IS NULL
  AND referenced_table.project_id = '{project}'
  -- Exclude service accounts
  AND user_email NOT LIKE '%iam.gserviceaccount.com'
  AND user_email NOT LIKE '%@finary-ci.iam%'
GROUP BY 1
ORDER BY query_count DESC;

-- =============================================================================
-- 2. LANDING ZONE DIRECT ACCESS (PROBLEMATIC)
-- Identifies users querying raw sources instead of public models
-- =============================================================================

SELECT
  referenced_table.table_id,
  COUNT(*) as query_count,
  COUNT(DISTINCT user_email) as unique_users,
  ARRAY_AGG(DISTINCT user_email LIMIT 5) as sample_users
FROM `{project}.region-europe-west1.INFORMATION_SCHEMA.JOBS_BY_PROJECT`
CROSS JOIN UNNEST(referenced_tables) AS referenced_table
WHERE
  creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
  AND job_type = 'QUERY'
  AND state = 'DONE'
  AND error_result IS NULL
  AND referenced_table.dataset_id = 'finary_landing_zone'
  AND referenced_table.project_id = '{project}'
  AND user_email NOT LIKE '%iam.gserviceaccount.com'
  AND user_email NOT LIKE '%@finary-ci.iam%'
GROUP BY 1
ORDER BY query_count DESC
LIMIT 50;

-- =============================================================================
-- 3. CLOUD SQL EXTERNAL QUERIES (PROBLEMATIC)
-- Detects EXTERNAL_QUERY() calls to postgres databases
-- =============================================================================

SELECT
  query,
  user_email,
  creation_time,
  total_bytes_processed / 1024 / 1024 / 1024 as gb_processed
FROM `{project}.region-europe-west1.INFORMATION_SCHEMA.JOBS_BY_PROJECT`
WHERE
  creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
  AND job_type = 'QUERY'
  AND state = 'DONE'
  AND error_result IS NULL
  AND user_email NOT LIKE '%iam.gserviceaccount.com'
  AND user_email NOT LIKE '%@finary-ci.iam%'
  -- Match EXTERNAL_QUERY pattern
  AND REGEXP_CONTAINS(LOWER(query), r'external_query\s*\(')
ORDER BY creation_time DESC
LIMIT 25;

-- =============================================================================
-- 4. TMP LAYER OVER-USAGE
-- Users should query public layer, not tmp tables directly
-- =============================================================================

SELECT
  referenced_table.table_id,
  COUNT(*) as query_count,
  COUNT(DISTINCT user_email) as unique_users
FROM `{project}.region-europe-west1.INFORMATION_SCHEMA.JOBS_BY_PROJECT`
CROSS JOIN UNNEST(referenced_tables) AS referenced_table
WHERE
  creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
  AND job_type = 'QUERY'
  AND state = 'DONE'
  AND error_result IS NULL
  AND referenced_table.dataset_id = 'finary_tmp'
  AND referenced_table.project_id = '{project}'
  AND user_email NOT LIKE '%iam.gserviceaccount.com'
  AND user_email NOT LIKE '%@finary-ci.iam%'
GROUP BY 1
ORDER BY query_count DESC
LIMIT 50;

-- =============================================================================
-- 5. PUBLIC LAYER USAGE (DESIRED PATTERN)
-- This is what we want users to do
-- =============================================================================

SELECT
  referenced_table.table_id,
  COUNT(*) as query_count,
  COUNT(DISTINCT user_email) as unique_users
FROM `{project}.region-europe-west1.INFORMATION_SCHEMA.JOBS_BY_PROJECT`
CROSS JOIN UNNEST(referenced_tables) AS referenced_table
WHERE
  creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
  AND job_type = 'QUERY'
  AND state = 'DONE'
  AND error_result IS NULL
  AND referenced_table.dataset_id = 'finary_public'
  AND referenced_table.project_id = '{project}'
  AND user_email NOT LIKE '%iam.gserviceaccount.com'
  AND user_email NOT LIKE '%@finary-ci.iam%'
GROUP BY 1
ORDER BY query_count DESC
LIMIT 50;

-- =============================================================================
-- 6. DATA CATALOG QUERY
-- Check existing public models in the data catalog
-- =============================================================================

SELECT
  table_name,
  table_type,
  description,
  source_system,
  update_frequency,
  owner_team,
  data_classification
FROM `finary_public.data_catalog`
WHERE is_active = TRUE
ORDER BY table_name;
