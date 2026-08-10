# Data Quality Gate — Report

**Dataset:** `skill-lab/orders.csv`
**Contract source:** `skill-lab/quality-contract.md` (supplied)
**Consumer:** executive revenue dashboard
**Checked at:** 2026-08-04T00:42:06Z
**Rows:** 13 data rows (14 lines incl. header) — 12 unique `order_id`
**Columns:** 8 — `order_id, order_date, customer_id, region, product, quantity, revenue, load_timestamp`

Row numbers below are **data rows** (header excluded). File line = data row + 1.

## Rules enforced

1. `order_id` must be unique — violation severity FAIL
2. `region` is required, no blank/null/whitespace — violation severity FAIL
3. `revenue` must be greater than zero — violation severity FAIL
4. `load_timestamp` must be less than 24 hours old — violation severity WARN
5. At least 10 data rows — violation severity FAIL

## Results

| Check | Evidence | Status | Recommended Action |
|---|---|---|---|
| Schema | All 8 contract columns present in declared order; every line parses to exactly 8 fields (14/14); `quantity` parses as integer on all 13 rows, `revenue` as decimal on all 13, `order_date` as `YYYY-MM-DD` on all 13, `load_timestamp` as ISO-8601 UTC on all 13; no unexpected columns | PASS | No action. |
| Freshness | Newest `load_timestamp` = `2026-08-03T06:15:00Z`, age 18.5h (within 24h). Per-row rule breached on row 12, `ORD-1011`, `load_timestamp 2026-07-31T02:40:00Z`, age **94.0h** — 3.9× the 24h limit. 12 of 13 rows ok | WARN | Data Engineering: re-extract `ORD-1011` in the current load window or confirm the stale partition is intentional. |
| Expected volume | 13 data rows vs contract minimum of 10 (12 rows after de-duplication, still ≥ 10) | PASS | No action. |
| Key uniqueness | `order_id ORD-1007` appears on rows 7 and 9 (file lines 8 and 10); 12 unique values across 13 rows | FAIL | Data Engineering: enforce the `order_id` unique constraint at load and drop the repeated key before re-publishing. |
| Duplicate rows | Rows 7 and 9 are byte-identical across all 8 fields (`ORD-1007,2026-08-02,CUST-4444,West,Reporting Add-on,4,1280.00,2026-08-03T06:15:00Z`). Revenue sum as-is = **$25,023.00**; de-duplicated = **$23,743.00**; the duplicate inflates reported revenue by **$1,280.00** | FAIL | Data Engineering: de-duplicate at the source extract; do not let the dashboard de-duplicate downstream. |
| Required fields | `region` is blank on row 6, `ORD-1006` (file line 7, field 4) — `CUST-4440`, `Analytics Seat - Annual`, `$1,490.00`. All other required cells populated across all 8 columns | FAIL | Analytics: backfill `region` for `ORD-1006` from the customer master before publication. |
| Nulls | 1 blank cell out of 104 (13 rows × 8 columns) = 0.96% overall; `region` column is 1/13 = **7.69% blank** against a 0% tolerance (all 8 columns are contract-required). No other column has nulls | FAIL | Analytics: same root cause as Required fields — fix `ORD-1006`, then re-run this gate. |
| Numeric rules | `revenue > 0` breached on row 11, `ORD-1010`, `revenue = -7900.00`, product `Refund - Bootcamp Withdrawal`. 12 of 13 rows positive. `quantity` is a positive integer on all 13 rows (no contract bound declared) | FAIL | Analytics + Data Engineering: the contract forbids non-positive revenue but the row is a legitimate refund — either route refunds to a separate signed measure or amend the contract; do not silently drop the row. |

## Overall verdict

**Overall: FAIL**

Five checks FAIL — key uniqueness, duplicate rows, required fields, nulls, numeric rules — tracing to three distinct root causes (duplicated `ORD-1007`, blank `region` on `ORD-1006`, negative revenue on `ORD-1010`). One check WARNs (stale `ORD-1011`). Two PASS. Roll-up rule: any FAIL makes the overall verdict FAIL.

## Recommendation

**Recommendation: BLOCK**

The dataset feeds an executive revenue dashboard and carries a duplicated order that overstates revenue by $1,280.00 plus an unresolved -$7,900.00 refund row, so publishing would put two known-wrong revenue figures in front of executives.

## Distinct defects to fix before re-running this gate

1. **Duplicate key + duplicate record** — `ORD-1007`, rows 7 and 9. Inflates revenue $1,280.00.
2. **Missing required `region`** — `ORD-1006`, row 6. Breaks any region-segmented view.
3. **Negative revenue** — `ORD-1010`, row 11, -$7,900.00. Contract violation and a modeling question (refund handling).
4. **Stale load** — `ORD-1011`, row 12, 94.0h old against a 24h freshness limit.

Source data was not modified. This gate is read-only.
