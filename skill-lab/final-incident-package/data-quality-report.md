# Data Quality Gate — Report

**Dataset:** `skill-lab/orders.csv`
**Contract source:** `skill-lab/quality-contract.md` (supplied)
**Consumer:** executive orders/revenue dashboard, scheduled to publish
**Checked at:** 2026-08-06T23:39:25Z
**Rows:** 13 data rows — 12 unique `order_id`
**Columns:** 8 — `order_id, order_date, customer_id, region, product, quantity, revenue, load_timestamp`

Row numbers are data rows (header excluded). File line = data row + 1.

## Rules enforced

1. `order_id` must be unique — severity FAIL
2. `region` is required, no blank/null/whitespace — severity FAIL
3. `revenue` must be greater than zero — severity FAIL
4. `load_timestamp` must be less than 24 hours old — severity WARN
5. At least 10 data rows — severity FAIL

## Results

| Check | Evidence | Status | Recommended Action |
|---|---|---|---|
| Schema | All 8 contract columns present in declared order; every line parses to exactly 8 fields; `order_date`, `quantity`, `revenue`, `load_timestamp` all parse as declared on all 13 rows; no unexpected columns | PASS | No action. |
| Freshness | **0 of 13 rows within the 24h limit.** Newest `load_timestamp` `2026-08-03T06:15:00Z` = **89.4h** old (3.7× the limit); oldest, row 12 `ORD-1011` `2026-07-31T02:40:00Z` = **165.0h** old (6.9×) | WARN | Pipeline owner: no successful load since 2026-08-03 — restore the pipeline before any publish. |
| Expected volume | 13 data rows vs contract minimum 10; 12 after de-duplication, still ≥ 10 | PASS | No action. |
| Key uniqueness | `order_id ORD-1007` appears on rows 7 and 9; 12 unique keys across 13 rows | FAIL | Pipeline owner: enforce the `order_id` unique constraint at load. |
| Duplicate rows | Rows 7 and 9 are byte-identical across all 8 fields (`ORD-1007,2026-08-02,CUST-4444,West,Reporting Add-on,4,1280.00,…`). Revenue as-is **$25,023.00**; de-duplicated **$23,743.00**; duplicate inflates revenue by **$1,280.00** | FAIL | Pipeline owner: de-duplicate at the source extract, not in the dashboard. |
| Required fields | `region` blank on row 6, `ORD-1006` (`CUST-4440`, Analytics Seat - Annual, $1,490.00). Sentinels treated as unpopulated: empty, whitespace-only, `NULL`, `null`, `N/A`, `-`. All other required cells populated | FAIL | Data owner (Analytics, per contract): backfill `region` for `ORD-1006`. |
| Nulls | Per column: `region` **1/13 = 7.69%**; all seven other columns 0.00%. Tolerance 0% (all 8 columns contract-required). Overall 1/104 cells = 0.96% | FAIL | Data owner (Analytics, per contract): same root cause as Required fields; fix, then re-run this gate. |
| Numeric rules | `revenue > 0` breached on row 11, `ORD-1010`, `-7900.00`, product "Refund - Bootcamp Withdrawal" — 1 of 13 rows. `quantity` range 1–12, all positive integers, no contract bound declared | FAIL | Data owner + pipeline owner: route refunds to a separate signed measure or amend the contract — do not silently drop the row. |

## Overall verdict

**Overall: FAIL**

Five checks fail from three root causes (duplicated `ORD-1007`; blank `region` on `ORD-1006`; negative revenue on `ORD-1010`), one warns, two pass.

## Recommendation

**Recommendation: BLOCK**

The extract would place two provably wrong revenue figures on an executive dashboard — $1,280.00 of double-counted revenue and an unresolved -$7,900.00 refund — on top of data that is now at minimum 89.4 hours old.

## Change since the 2026-08-04 run

Freshness has degraded from **1 of 13 rows stale** to **13 of 13**. On 2026-08-04 the newest load was 19.0h old and inside tolerance; it is now 89.4h old. Nothing in the file changed — `orders.csv` is byte-identical (md5 `1b9c5fac6bef0d746d7d684ca5fc5795`). The dataset did not get worse; **it stopped being refreshed**, which the triage report explains.

Per contract the freshness severity is WARN, so the overall FAIL is still driven by the other five checks. But the WARN is no longer a single stale row — it is the whole extract, and it independently justifies BLOCK under the decision rule, since this WARN feeds a financial, externally-visible surface.

Source data was not modified. This gate is read-only.
