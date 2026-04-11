#!/usr/bin/env python3
"""
Analyze BigQuery usage patterns from INFORMATION_SCHEMA.

Queries INFORMATION_SCHEMA.JOBS_BY_PROJECT to identify:
- Direct landing_zone access (indicates missing public models)
- EXTERNAL_QUERY calls to Cloud SQL
- Dataset access distribution
- Query patterns by human users (excludes service accounts)

Usage:
    python analyze_bq_usage.py --days 30 --project finary-data-platform-prod --output usage.json
"""

import argparse
import json
import subprocess
import sys
from typing import Dict, List, Any


def run_bq_query(project_id: str, query: str) -> List[Dict[str, Any]]:
    """Execute BigQuery query and return results as JSON."""
    cmd = [
        "bq", "query",
        "--project_id", project_id,
        "--format", "json",
        "--use_legacy_sql=false",
        "--max_rows=10000",
        query
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return json.loads(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"❌ BigQuery query failed: {e.stderr}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ Failed to parse BigQuery output: {e}", file=sys.stderr)
        sys.exit(1)


def get_dataset_distribution(project_id: str, days: int) -> List[Dict[str, Any]]:
    """Get query count distribution across datasets."""
    query = f"""
    SELECT
      referenced_table.dataset_id,
      COUNT(*) as query_count,
      COUNT(DISTINCT referenced_table.table_id) as unique_tables,
      COUNT(DISTINCT user_email) as unique_users
    FROM `{project_id}.region-europe-west1.INFORMATION_SCHEMA.JOBS_BY_PROJECT`
    CROSS JOIN UNNEST(referenced_tables) AS referenced_table
    WHERE
      creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
      AND job_type = 'QUERY'
      AND state = 'DONE'
      AND error_result IS NULL
      AND referenced_table.project_id = '{project_id}'
      AND user_email NOT LIKE '%iam.gserviceaccount.com'
      AND user_email NOT LIKE '%@finary-ci.iam%'
    GROUP BY 1
    ORDER BY query_count DESC
    """
    return run_bq_query(project_id, query)


def get_landing_zone_access(project_id: str, days: int) -> List[Dict[str, Any]]:
    """Get landing_zone tables accessed directly by users."""
    query = f"""
    SELECT
      referenced_table.table_id,
      COUNT(*) as query_count,
      COUNT(DISTINCT user_email) as unique_users,
      ARRAY_AGG(DISTINCT user_email LIMIT 5) as sample_users
    FROM `{project_id}.region-europe-west1.INFORMATION_SCHEMA.JOBS_BY_PROJECT`
    CROSS JOIN UNNEST(referenced_tables) AS referenced_table
    WHERE
      creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
      AND job_type = 'QUERY'
      AND state = 'DONE'
      AND error_result IS NULL
      AND referenced_table.dataset_id = 'finary_landing_zone'
      AND referenced_table.project_id = '{project_id}'
      AND user_email NOT LIKE '%iam.gserviceaccount.com'
      AND user_email NOT LIKE '%@finary-ci.iam%'
    GROUP BY 1
    ORDER BY query_count DESC
    LIMIT 50
    """
    return run_bq_query(project_id, query)


def get_cloud_sql_queries(project_id: str, days: int) -> List[Dict[str, Any]]:
    """Get queries using EXTERNAL_QUERY to Cloud SQL."""
    query = f"""
    SELECT
      query,
      user_email,
      creation_time,
      total_bytes_processed / 1024 / 1024 / 1024 as gb_processed
    FROM `{project_id}.region-europe-west1.INFORMATION_SCHEMA.JOBS_BY_PROJECT`
    WHERE
      creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
      AND job_type = 'QUERY'
      AND state = 'DONE'
      AND error_result IS NULL
      AND user_email NOT LIKE '%iam.gserviceaccount.com'
      AND user_email NOT LIKE '%@finary-ci.iam%'
      AND REGEXP_CONTAINS(LOWER(query), r'external_query\\s*\\(')
    ORDER BY creation_time DESC
    LIMIT 25
    """
    return run_bq_query(project_id, query)


def get_tmp_layer_usage(project_id: str, days: int) -> List[Dict[str, Any]]:
    """Get tmp layer tables accessed directly by users."""
    query = f"""
    SELECT
      referenced_table.table_id,
      COUNT(*) as query_count,
      COUNT(DISTINCT user_email) as unique_users
    FROM `{project_id}.region-europe-west1.INFORMATION_SCHEMA.JOBS_BY_PROJECT`
    CROSS JOIN UNNEST(referenced_tables) AS referenced_table
    WHERE
      creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
      AND job_type = 'QUERY'
      AND state = 'DONE'
      AND error_result IS NULL
      AND referenced_table.dataset_id = 'finary_tmp'
      AND referenced_table.project_id = '{project_id}'
      AND user_email NOT LIKE '%iam.gserviceaccount.com'
      AND user_email NOT LIKE '%@finary-ci.iam%'
    GROUP BY 1
    ORDER BY query_count DESC
    LIMIT 50
    """
    return run_bq_query(project_id, query)


def get_public_layer_usage(project_id: str, days: int) -> List[Dict[str, Any]]:
    """Get public layer usage (the desired pattern)."""
    query = f"""
    SELECT
      referenced_table.table_id,
      COUNT(*) as query_count,
      COUNT(DISTINCT user_email) as unique_users
    FROM `{project_id}.region-europe-west1.INFORMATION_SCHEMA.JOBS_BY_PROJECT`
    CROSS JOIN UNNEST(referenced_tables) AS referenced_table
    WHERE
      creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
      AND job_type = 'QUERY'
      AND state = 'DONE'
      AND error_result IS NULL
      AND referenced_table.dataset_id = 'finary_public'
      AND referenced_table.project_id = '{project_id}'
      AND user_email NOT LIKE '%iam.gserviceaccount.com'
      AND user_email NOT LIKE '%@finary-ci.iam%'
    GROUP BY 1
    ORDER BY query_count DESC
    LIMIT 50
    """
    return run_bq_query(project_id, query)


def main():
    parser = argparse.ArgumentParser(
        description="Analyze BigQuery usage patterns to identify missing models"
    )
    parser.add_argument(
        "--days",
        type=int,
        default=30,
        help="Number of days to analyze (default: 30)"
    )
    parser.add_argument(
        "--project",
        type=str,
        default="finary-data-platform-prod",
        help="GCP project ID (default: finary-data-platform-prod)"
    )
    parser.add_argument(
        "--output",
        type=str,
        default="bq_usage_analysis.json",
        help="Output JSON file path (default: bq_usage_analysis.json)"
    )

    args = parser.parse_args()

    print(f"🔍 Analyzing BigQuery usage for {args.project} (last {args.days} days)...")

    analysis = {
        "metadata": {
            "project_id": args.project,
            "days_analyzed": args.days,
        },
        "dataset_distribution": get_dataset_distribution(args.project, args.days),
        "landing_zone_access": get_landing_zone_access(args.project, args.days),
        "cloud_sql_queries": get_cloud_sql_queries(args.project, args.days),
        "tmp_layer_usage": get_tmp_layer_usage(args.project, args.days),
        "public_layer_usage": get_public_layer_usage(args.project, args.days),
    }

    with open(args.output, "w") as f:
        json.dump(analysis, f, indent=2, default=str)

    print(f"✅ Analysis complete. Results saved to {args.output}")

    # Print summary
    total_queries = sum(int(d.get("query_count", 0)) for d in analysis["dataset_distribution"])
    landing_zone_queries = sum(int(d.get("query_count", 0)) for d in analysis["landing_zone_access"])
    cloud_sql_count = len(analysis["cloud_sql_queries"])

    print(f"\n📊 Summary:")
    print(f"   Total queries analyzed: {total_queries:,}")
    print(f"   Landing zone direct access: {landing_zone_queries:,} queries")
    print(f"   Cloud SQL EXTERNAL_QUERY: {cloud_sql_count} queries")
    print(f"   Unique tables in landing_zone: {len(analysis['landing_zone_access'])}")


if __name__ == "__main__":
    main()
