# dbt Data Quality

## 📋 Model Identity & Test Standards

When creating or modifying any dbt model, you **must** ensure the primary identifier (e.g., `log_id`, `entity_id`) is properly tested for data integrity.

> **Scope:** A `.yml` file is **required for every model** at every layer. However, table descriptions and column descriptions with data tests must only be **fully filled** for models in `marts/public/` and `marts/applications/`. For other layers (staging, base, intermediate, `tmp_*`), a minimal `.yml` registering the model is sufficient.

### 1. Mandatory Test Policy

Every identifier column used as a Primary Key or unique grain must have the following tests:

* **`unique`**: To prevent row fan-outs and duplicates.
* **`not_null`**: To ensure every record is reachable and valid.

### 2. YAML Implementation Pattern

For every `.sql` model file created, ensure a corresponding `.yml` file exists in the same directory with this structure:

```yaml
version: 2

models:
  - name: [model_name]
    description: "Brief description of the model grain."
    columns:
      - name: log_id  # or entity_id
        description: "Primary identifier for this model."
        data_tests:
          - unique
          - not_null

```

### 3. Logic & Enforcement

* **Constraint Checking**: If a model contains `log_id` or `entity_id`, you must verify if these columns represent the grain of the table. If they do, apply the tests.
* **Composite Keys**: If the uniqueness is defined by a combination of columns, use the `dbt_utils.unique_combination_of_columns` test instead.
* **Scope**: Full descriptions and `data_tests` are required **only** for `marts/public/` and `marts/applications/` models. Other layers must have a `.yml` file but descriptions and tests are not required.

### 4. Style Guide

* Use the `data_tests:` key (dbt v1.6+) rather than the legacy `tests:` key.
* Always include a column-level `description` to provide context for the ID.

---

### Would you like me to scan your current `models/` folder to identify any missing tests for `log_id` or `entity_id`?
