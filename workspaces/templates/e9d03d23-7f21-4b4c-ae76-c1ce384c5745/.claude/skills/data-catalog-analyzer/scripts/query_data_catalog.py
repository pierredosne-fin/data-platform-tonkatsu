#!/usr/bin/env python3
"""
Query finary_public.data_catalog to understand existing dbt models.

This script checks what public models already exist in the data catalog,
allowing comparison with usage patterns to identify gaps.

Usage:
    python query_data_catalog.py --project finary-data-platform-prod --output catalog.json
"""

import argparse
import json
import subprocess
import sys
from typing import List, Dict, Any


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
        print(f"❌ BigQuery query failed:", file=sys.stderr)
        print(f"STDERR: {e.stderr}", file=sys.stderr)
        print(f"STDOUT: {e.stdout}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ Failed to parse BigQuery output: {e}", file=sys.stderr)
        sys.exit(1)


def get_data_catalog(project_id: str) -> List[Dict[str, Any]]:
    """Get all models from the data catalog."""
    query = f"""
    SELECT DISTINCT
      table_name,
      table_description,
      source_system,
      database_name,
      asset_type
    FROM `{project_id}.finary_public.data_catalog`
    WHERE database_name = 'finary_public'
    ORDER BY table_name
    """
    return run_bq_query(project_id, query)


def get_public_models(project_id: str) -> List[Dict[str, Any]]:
    """Get list of all public models from INFORMATION_SCHEMA."""
    query = f"""
    SELECT
      table_name,
      table_type,
      creation_time
    FROM `{project_id}.finary_public.INFORMATION_SCHEMA.TABLES`
    WHERE table_type IN ('TABLE', 'VIEW')
    ORDER BY table_name
    """
    return run_bq_query(project_id, query)


def get_landing_zone_tables(project_id: str) -> List[Dict[str, Any]]:
    """Get all tables in landing_zone for comparison."""
    query = f"""
    SELECT
      table_name,
      table_type
    FROM `{project_id}.finary_landing_zone.INFORMATION_SCHEMA.TABLES`
    WHERE table_type IN ('TABLE', 'VIEW', 'EXTERNAL')
    ORDER BY table_name
    """
    return run_bq_query(project_id, query)


def main():
    parser = argparse.ArgumentParser(
        description="Query data catalog to understand existing models"
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
        default="data_catalog.json",
        help="Output JSON file path (default: data_catalog.json)"
    )

    args = parser.parse_args()

    print(f"🔍 Querying data catalog for {args.project}...")

    catalog_data = {
        "metadata": {
            "project_id": args.project,
        },
        "data_catalog": get_data_catalog(args.project),
        "public_models": get_public_models(args.project),
        "landing_zone_tables": get_landing_zone_tables(args.project),
    }

    with open(args.output, "w") as f:
        json.dump(catalog_data, f, indent=2, default=str)

    print(f"✅ Catalog query complete. Results saved to {args.output}")

    # Print summary
    print(f"\n📊 Summary:")
    print(f"   Data catalog entries: {len(catalog_data['data_catalog'])}")
    print(f"   Public models: {len(catalog_data['public_models'])}")
    print(f"   Landing zone tables: {len(catalog_data['landing_zone_tables'])}")


if __name__ == "__main__":
    main()
