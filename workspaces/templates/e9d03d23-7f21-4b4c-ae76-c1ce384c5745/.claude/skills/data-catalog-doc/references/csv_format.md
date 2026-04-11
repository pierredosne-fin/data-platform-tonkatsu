# CSV Format Reference

## data_catalog_table_description.csv

**Columns:** `source_system, database_name, table_name, table_description`

```csv
bigquery,finary-data-platform-prod,hubspot_leads,"Lead records from HubSpot CRM extracted via the paginated GET /crm/v3/objects/leads API. Contains 100+ properties covering lead identity, pipeline stage, owner/team assignment, associated contact and company engagement metrics, activity counts, stage timing history, disqualification details, and custom Finary fields. Loaded in full refresh mode (replace). Used for lead tracking, sales pipeline analysis, conversion reporting, and wealth advisor performance monitoring."
```

### Source system values

| Source | database_name | Notes |
|---|---|---|
| `bigquery` | `finary-data-platform-prod` | dlt pipelines, external tables, BQ-native sources |
| `postgres` | `finary-track-production` | Main Rails app (track_pg) |
| `postgres` | `finary-invest-production` | Investment engine |
| `postgres` | `finary-life-production` | Life insurance |
| `hubspot` | `finary-data-platform-prod` | Use `bigquery` as source_system for landing_zone tables |

> For tables loaded by dlt (hubspot, adjust, intercom, frankfurter, revenuecat), the source_system is `bigquery` and database_name is `finary-data-platform-prod` — because the physical table lives in BigQuery, not in the origin system.

---

## data_catalog_description.csv

**Columns:** `database_name, table_name, column_name, source_system, column_data_type, contains_pii, column_description`

```csv
finary-data-platform-prod,hubspot_leads,hs_lead_name,bigquery,STRING,TRUE,"Full name of the lead. Contains PII."
finary-data-platform-prod,hubspot_leads,hs_lead_type,bigquery,STRING,FALSE,"Classification type of the lead (e.g. NEW_BUSINESS, UPSELL, RE_ATTEMPTING)."
finary-data-platform-prod,hubspot_leads,hs_createdate,bigquery,TIMESTAMP,FALSE,"Timestamp when the lead was created in HubSpot (system field)."
finary-data-platform-prod,hubspot_leads,_dlt_load_id,bigquery,STRING,FALSE,"dlt pipeline load identifier."
finary-data-platform-prod,hubspot_leads,_dlt_id,bigquery,STRING,FALSE,"dlt unique row identifier."
```

### Data type mapping (BigQuery → CSV value)

| BigQuery type | CSV column_data_type |
|---|---|
| STRING | `STRING` |
| TIMESTAMP | `TIMESTAMP` |
| DATE | `DATE` |
| FLOAT64 / NUMERIC | `FLOAT64` |
| INT64 | `INT64` |
| BOOL | `BOOL` |
| JSON | `JSON` |

> dlt pipelines often land numeric values as STRING because HubSpot returns numbers as strings in its API. Use the actual BigQuery column type from `get_table_info`, not the HubSpot property type.

### Row ordering within a table

1. Primary key / id columns first
2. Core business fields
3. Timestamps (created, modified)
4. Foreign keys and associated object IDs
5. Metrics and counts
6. Engagement / activity fields
7. Custom / source-specific fields
8. dlt internals last (`_dlt_load_id`, `_dlt_id`, `_dlt_parent_id`, `_dlt_list_idx`)

### PII rules

Mark `contains_pii = TRUE` for:
- Person names (first name, last name, full name, display name)
- Email addresses
- Phone numbers
- Free-text fields that sales reps fill in (qualification notes, call notes)
- Personal URLs linking to identifiable profiles

Mark `contains_pii = FALSE` for:
- HubSpot/system identifiers (IDs, pipeline stages, source labels)
- Aggregate metrics (counts, amounts)
- Enum/categorical values
- Timestamps
- Boolean flags

### Junction table pattern (dlt array flattening)

When dlt flattens a repeated field (e.g. `associations.contacts`), it creates a `{parent_table}__{field}` child table:

```csv
finary-data-platform-prod,hubspot_leads__contacts,value,bigquery,STRING,FALSE,"Contact ID associated with the lead."
finary-data-platform-prod,hubspot_leads__contacts,_dlt_parent_id,bigquery,STRING,FALSE,"Reference to parent lead (_dlt_id from hubspot_leads)."
finary-data-platform-prod,hubspot_leads__contacts,_dlt_list_idx,bigquery,INT64,FALSE,"Index of this row within the contacts array."
finary-data-platform-prod,hubspot_leads__contacts,_dlt_id,bigquery,STRING,FALSE,"dlt unique row identifier."
```
