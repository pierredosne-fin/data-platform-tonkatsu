#!/usr/bin/env python3
"""
Generate dbt model files following Finary's architecture rules.

Creates the complete 3-file structure (.sql, .yml, .md) for dbt models
following layer architecture, naming conventions, and testing standards.

Usage:
    python generate_dbt_model.py --name users --layer public --source postgres
"""

import argparse
import sys
from pathlib import Path


def create_public_model(name: str, base_path: Path):
    """Create a public view model (projection only)."""
    model_dir = base_path / "models" / "marts" / "public" / name
    model_dir.mkdir(parents=True, exist_ok=True)

    # .sql file
    sql_content = f"""-- {name}.sql
-- Public view exposing tmp_{name}
-- Projection only - NO transformation logic allowed

{{{{ config(
    materialized='view',
    schema='public'
) }}}}

WITH source AS (
    SELECT * FROM {{{{ ref('tmp_{name}') }}}}
),
final AS (
    SELECT
        log_id,
        -- TODO: Add specific columns here
        created_at,
        updated_at
    FROM source
)
SELECT * FROM final
"""
    (model_dir / f"{name}.sql").write_text(sql_content)

    # .yml file
    yml_content = f"""version: 2

models:
  - name: {name}
    description: "TODO: Add Business Name description here."
    columns:
      - name: log_id
        description: "Primary identifier for this model."
        data_tests:
          - unique
          - not_null
"""
    (model_dir / f"{name}.yml").write_text(yml_content)

    # .md file
    md_content = f"""# {name.replace('_', ' ').title()}

## Overview
TODO: Describe what this model represents.

## Grain
TODO: Define the grain (e.g., "One row per user", "One row per transaction").

## Use Cases
- TODO: List primary use cases
- TODO: Who uses this model and why

## Source
- **Upstream**: `tmp_{name}`
- **Layer**: Public (view)
"""
    (model_dir / f"{name}.md").write_text(md_content)

    print(f"✅ Created public model: {model_dir}")


def create_tmp_model(name: str, base_path: Path):
    """Create a tmp materialized table."""
    model_dir = base_path / "models" / "marts" / "tmp" / f"tmp_{name}"
    model_dir.mkdir(parents=True, exist_ok=True)

    # .sql file
    sql_content = f"""-- tmp_{name}.sql
-- Materialized table from intermediate layer
-- Final column selection only - NO new logic

{{{{ config(
    materialized='table',
    schema='tmp',
    partition_by={{'field': 'event_date', 'data_type': 'date'}},
    cluster_by=['entity_id']
) }}}}

WITH source AS (
    SELECT * FROM {{{{ ref('_int_{name}') }}}}
),
final AS (
    SELECT
        log_id,
        entity_id,
        event_date,
        -- TODO: Add specific columns
        created_at,
        updated_at
    FROM source
)
SELECT * FROM final
"""
    (model_dir / f"tmp_{name}.sql").write_text(sql_content)

    # .yml file
    yml_content = f"""version: 2

models:
  - name: tmp_{name}
    description: "Materialized table for {name}."
    columns:
      - name: log_id
        description: "Primary identifier."
        data_tests:
          - unique
          - not_null
"""
    (model_dir / f"tmp_{name}.yml").write_text(yml_content)

    # .md file
    md_content = f"""# tmp_{name}

## Overview
Materialized table for performance optimization.

## Grain
TODO: Define the grain.

## Upstream
- `_int_{name}` (intermediate layer)
"""
    (model_dir / f"tmp_{name}.md").write_text(md_content)

    print(f"✅ Created tmp model: {model_dir}")


def create_staging_model(base_path: Path, source: str, table: str):
    """Create staging models (base + stg)."""
    staging_dir = base_path / "models" / "staging" / source / f"stg__{table}"
    staging_dir.mkdir(parents=True, exist_ok=True)

    base_dir = staging_dir / "base"
    base_dir.mkdir(parents=True, exist_ok=True)

    # base__*.sql
    base_sql = f"""-- base__{table}.sql
-- Raw extraction from {source}
-- Type casting and column renaming only

{{{{ config(
    materialized='ephemeral',
    schema='tmp'
) }}}}

WITH source AS (
    SELECT * FROM {{{{ source('{source}', '{table}') }}}}
),
final AS (
    SELECT
        id::VARCHAR AS entity_id,
        -- TODO: Add column mappings
        created_at,
        updated_at
    FROM source
)
SELECT * FROM final
"""
    (base_dir / f"base__{table}.sql").write_text(base_sql)

    # base__*.yml
    base_yml = f"""version: 2

models:
  - name: base__{table}
    description: "Base extraction of {table} from {source}."
"""
    (base_dir / f"base__{table}.yml").write_text(base_yml)

    # base__*.md
    base_md = f"""# base__{table}

## Overview
Raw extraction from {source}.{table}.

## Transformations
- Type casting
- Column renaming
- No logic or joins
"""
    (base_dir / f"base__{table}.md").write_text(base_md)

    # stg__*.sql
    stg_sql = f"""-- stg__{table}.sql
-- Staging model with light transformations
-- Denormalization (1:1 joins), dedup, filters allowed

{{{{ config(
    materialized='ephemeral',
    schema='tmp'
) }}}}

WITH source AS (
    SELECT * FROM {{{{ ref('base__{table}') }}}}
),
final AS (
    SELECT
        entity_id,
        -- TODO: Add denormalized columns if needed
        created_at,
        updated_at
    FROM source
    WHERE deleted_at IS NULL  -- Example filter
)
SELECT * FROM final
"""
    (staging_dir / f"stg__{table}.sql").write_text(stg_sql)

    # stg__*.yml
    stg_yml = f"""version: 2

models:
  - name: stg__{table}
    description: "Staging model for {table}."
    columns:
      - name: entity_id
        description: "Primary identifier."
        data_tests:
          - unique
          - not_null
"""
    (staging_dir / f"stg__{table}.yml").write_text(stg_yml)

    # stg__*.md
    stg_md = f"""# stg__{table}

## Overview
Staging model for {table}.

## Grain
Same as source (one row per {table.rstrip('s')}).

## Transformations
- TODO: Document transformations applied
"""
    (staging_dir / f"stg__{table}.md").write_text(stg_md)

    print(f"✅ Created staging models: {staging_dir}")


def main():
    parser = argparse.ArgumentParser(
        description="Generate dbt model files following Finary architecture"
    )
    parser.add_argument("--name", required=True, help="Model name (e.g., 'users')")
    parser.add_argument(
        "--layer",
        choices=["public", "tmp", "staging"],
        required=True,
        help="Model layer"
    )
    parser.add_argument("--source", help="Source system (for staging models)")
    parser.add_argument("--table", help="Source table name (for staging models)")
    parser.add_argument(
        "--path",
        default=".",
        help="Base path to dbt project (default: current directory)"
    )

    args = parser.parse_args()
    base_path = Path(args.path)

    if not (base_path / "dbt_project.yml").exists():
        print(f"❌ No dbt_project.yml found at {base_path}", file=sys.stderr)
        print(f"   Tip: Run from dbt project root or use --path", file=sys.stderr)
        sys.exit(1)

    if args.layer == "staging":
        if not args.source or not args.table:
            print("❌ --source and --table required for staging models", file=sys.stderr)
            sys.exit(1)
        create_staging_model(base_path, args.source, args.table)

    elif args.layer == "tmp":
        create_tmp_model(args.name, base_path)

    elif args.layer == "public":
        create_public_model(args.name, base_path)

    print(f"\n🎯 Next steps:")
    print(f"   1. Review and customize the generated files")
    print(f"   2. Update TODO placeholders with actual logic")
    print(f"   3. Test with: dbt run --select {args.name}")
    print(f"   4. Validate with: dbt test --select {args.name}")


if __name__ == "__main__":
    main()
