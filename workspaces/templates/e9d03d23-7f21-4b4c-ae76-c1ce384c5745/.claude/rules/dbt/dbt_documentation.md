# dbt Model Documentation Standards

Every model in `marts/public/` and `marts/applications/` **must** follow this documentation template. Models in other layers (staging, intermediate, `tmp_*`) only require a minimal `.yml` to register the model — full documentation is not required.

---

## Table Documentation Template

The `description` field in `.yml` **must** use the following structure (block scalar `|`):

```yaml
description: |
  1. Business Purpose & Grain
     - Table Description: <high-level summary using business terminology>
     - Grain (The "Atom"): <exactly what one row represents>
     - Primary/Surrogate Keys: <columns that uniquely identify the grain>

  2. Use Cases
     - <Business question this table can answer #1>
     - <Business question this table can answer #2>
     - <Business question this table can answer #3>
```

### Section 1 — Business Purpose & Grain

| Field | Instructions |
|-------|-------------|
| **Table Description** | High-level summary in business terms. No technical jargon. |
| **Grain (The "Atom")** | One sentence: "1 row = ..." Define uniqueness precisely. Example: *"1 row = AUM level (in euros) for an asset type on a reference date."* |
| **Primary/Surrogate Keys** | List key column(s) and how they are generated. Example: *"log_id (MD5 hash of event_date + asset_type)."* |

### Section 2 — Use Cases

Provide **2–4 concrete business questions** this table answers. Be specific — reference actual column names or metrics where helpful.

> Example: *"Track campaign ROI and identify profitable campaigns for budget optimization (ROAS = revenue_d7_good / cost)."*

---

## Column Documentation Template

For every column in `marts/public/` and `marts/applications/`, the `description` field **must** include:

| Field | Instructions |
|-------|-------------|
| **Attribute Description / Business Logic** | What does this field represent in the real world? Why do we track it? |
| **Data Nature** | `Categorical` (discrete groups) or `Continuous` (measurable amount). |
| **Categorical Metadata** | If categorical: is it `Ordinal` (ordered, e.g., Bronze/Silver/Gold)? List expected values if finite. |
| **Continuous Metadata** | If continuous: is it `Cumulative` (running total) or `Point-in-Time`? State the **unit** (e.g., EUR, count of users). |
| **Nullability Logic** | Is NULL deterministic? State: `Never NULL`, `Can be NULL if <condition>`, or `non-NULL expected (sourced from <upstream>)`. |

Use the `>` block scalar (folded) for column descriptions to keep YAML readable:

```yaml
- name: aum_euro
  description: >
    AUM amount in euros for the (event_date, asset_type) pair.
    Data Nature: Continuous (Point-in-Time), unit = EUR.
    Nullability: Never NULL (defaults to 0).
```

---

## Full Example

```yaml
models:
  - name: aum_daily_metrics
    meta:
      metabase.display_name: 🌕 AUM Daily Metrics
    config:
      tags: ["cloudrun", "finary", "bi"]
    description: |
      1. Business Purpose & Grain
         - Table Description: Daily view of Asset Under Management (AUM) aggregated by asset type (crypto, Finary Life, advisory). Acts as the single entry point to track day-by-day balances.
         - Grain (The "Atom"): 1 row = AUM level (in euros) for an asset type on a reference date.
         - Primary/Surrogate Keys: log_id (surrogate generated from event_date + asset_type).

      2. Use Cases
         - Track daily AUM by asset type and spot trends over time.
         - Compute AUM changes between two dates for any asset family (e.g., flow vs. market effects).
         - Feed weekly/monthly AUM aggregates for finance or investor dashboards.

    columns:
      - name: log_id
        description: >
          Technical surrogate key for the grain: concat(event_date, asset_type),
          used to uniquely identify each daily asset-type AUM row.
          Data Nature: Categorical (surrogate key).
          Nullability: Never NULL (derived from non-null components).
        data_tests:
          - not_null
          - unique

      - name: event_date
        description: >
          Reference date of the observed AUM balance (day-level dimension).
          Data Nature: Categorical (Date dimension, ordinal chronological).
          Nullability: Never NULL (sourced from upstream events).
        data_tests:
          - not_null

      - name: asset_type
        description: >
          Aggregated asset family. Data Nature: Categorical (Nominal, 3 values: crypto, finary_life, advisory).
          Nullability: Never NULL.
        data_tests:
          - not_null

      - name: aum_euro
        description: >
          AUM amount in euros for the (event_date, asset_type) pair.
          Data Nature: Continuous (Point-in-Time), unit = EUR.
          Nullability: Never NULL (defaults to 0).
        data_tests:
          - not_null
```

---

## Checklist

Before submitting a model in `marts/public/` or `marts/applications/`, verify:

- [ ] `description` block follows the 2-section template (Business Purpose & Grain, Use Cases)
- [ ] **`meta.metabase.display_name` is present** and matches the Business Name from the taxonomy (e.g., `🌕 AUM Daily Metrics`). This is **mandatory** for all `marts/public/` and `marts/applications/` models.
- [ ] Every column has a `description` covering: attribute logic, data nature, categorical/continuous metadata, and nullability
- [ ] Primary key columns (`log_id`, `entity_id`) have `data_tests: [unique, not_null]`
- [ ] Block scalars used correctly: `|` for multi-line model description, `>` for single-paragraph column descriptions
