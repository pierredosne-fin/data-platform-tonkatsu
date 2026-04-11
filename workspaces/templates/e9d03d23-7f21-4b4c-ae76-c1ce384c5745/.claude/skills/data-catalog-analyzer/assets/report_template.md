# BigQuery Usage Analysis Report

**Generated**: {timestamp}
**Period Analyzed**: Last {days} days
**Project**: `{project_id}`

---

## Executive Summary

**Key Findings:**
- Total queries analyzed: **{total_queries}**
- Landing zone direct access: **{landing_zone_queries}** queries ({landing_zone_pct}%)
- Cloud SQL external queries: **{cloud_sql_queries}** queries
- Public layer usage: **{public_queries}** queries ({public_pct}%)

**Health Score**: {health_score}/100

**Critical Issue**: {critical_issue_description}

---

## 1. Query Pattern Distribution

### Dataset Access by Query Volume

| Dataset | Query Count | Unique Tables | Unique Users | % of Total |
|---------|-------------|---------------|--------------|------------|
{dataset_distribution_table}

### Analysis

{dataset_analysis}

---

## 2. Problematic Access Patterns

### 2.1 Landing Zone Direct Access

**Impact**: Users querying raw sources instead of curated public models.

| Table Name | Query Count | Unique Users | Sample Users |
|------------|-------------|--------------|--------------|
{landing_zone_table}

### 2.2 Cloud SQL External Queries

**Impact**: Bypassing BigQuery data platform entirely.

| User | Query Time | Query |
|------|------------|-------|
{cloud_sql_table}

### 2.3 Tmp Layer Over-Usage

**Impact**: Users accessing internal implementation details.

| Table Name | Query Count | Unique Users |
|------------|-------------|--------------|
{tmp_layer_table}

---

## 3. Missing Public Models

### Gap Analysis

Comparing usage patterns with `finary_public.data_catalog`:

| Priority | Table Name | Query Count | Users | Exists in Catalog? | Action Required |
|----------|------------|-------------|-------|-------------------|-----------------|
{missing_models_table}

**Summary**:
- **Critical** (>50 queries/month): {critical_missing} tables
- **Medium** (10-50 queries/month): {medium_missing} tables
- **Low** (<10 queries/month): {low_missing} tables

---

## 4. Root Cause Analysis

### Why are users not using public models?

1. **Model doesn't exist**: {missing_model_count} tables have no public equivalent
2. **Model is outdated**: Users prefer fresher landing_zone data
3. **Model is incomplete**: Missing columns users need
4. **Discoverability**: Users don't know the model exists

### Evidence

{root_cause_evidence}

---

## 5. Implementation Plan

### Phase 1: Critical Gaps (Week 1)

**Priority models to create**:

{phase1_models}

**Estimated Impact**: Reduce landing_zone access by {phase1_impact}%

### Phase 2: Medium Priority (Week 2-3)

{phase2_models}

**Estimated Impact**: Reduce landing_zone access by {phase2_impact}%

### Phase 3: Long-tail (Month 2)

{phase3_models}

**Estimated Impact**: Achieve >80% public layer usage

---

## 6. Expected Impact

### Before

```
Dataset Distribution:
  ├── finary_landing_zone: {before_landing_pct}%
  ├── finary_tmp:          {before_tmp_pct}%
  └── finary_public:       {before_public_pct}%
```

### After (Projected)

```
Dataset Distribution:
  ├── finary_landing_zone: <5%
  ├── finary_tmp:          <10%
  └── finary_public:       >85%
```

**Benefits**:
- ✅ Consistent data definitions across teams
- ✅ Better query performance (pre-aggregated models)
- ✅ Improved data quality (tested models)
- ✅ Reduced maintenance burden (single source of truth)

---

## 7. Success Metrics

Track these metrics monthly:

| Metric | Current | Target | Tracking Query |
|--------|---------|--------|----------------|
| Public layer usage % | {current_public_pct}% | >80% | `SELECT COUNT(*) FROM INFORMATION_SCHEMA WHERE dataset='finary_public'` |
| Landing zone queries | {current_landing_queries} | <100/month | `SELECT COUNT(*) FROM INFORMATION_SCHEMA WHERE dataset='finary_landing_zone'` |
| Avg query latency | {current_latency}s | <2s | Check query performance logs |
| Data quality test pass rate | {current_test_pass}% | >95% | `dbt test` results |

---

## 8. Next Steps

1. **Review this report** with Data Platform team
2. **Prioritize models** based on query volume and user need
3. **Create missing models** following dbt architecture rules
4. **Communicate changes** to users via Slack/documentation
5. **Monitor adoption** using success metrics above

---

## Appendix: Detailed Data

### A. Full Landing Zone Access Log

{appendix_landing_zone}

### B. Full Cloud SQL Query Log

{appendix_cloud_sql}

### C. Data Catalog Coverage

{appendix_catalog_coverage}
