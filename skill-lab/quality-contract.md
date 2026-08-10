# Quality Contract — orders

Dataset: `skill-lab/orders.csv`
Owner: Analytics
Applies to: any pre-publication validation of the orders extract.

## Schema

| Column | Type | Required |
|---|---|---|
| order_id | string | yes |
| order_date | date (YYYY-MM-DD) | yes |
| customer_id | string | yes |
| region | string | yes |
| product | string | yes |
| quantity | integer | yes |
| revenue | decimal | yes |
| load_timestamp | ISO-8601 timestamp (UTC) | yes |

## Rules

1. **Key uniqueness** — `order_id` must be unique. No value may appear more than once.
2. **Required field** — `region` is required. No row may have a blank, null, or whitespace-only region.
3. **Numeric rule** — `revenue` must be greater than zero. Zero and negative values are violations.
4. **Freshness** — `load_timestamp` must be less than 24 hours old, measured against the time the check runs.
5. **Expected volume** — the dataset must contain at least 10 data rows (excluding the header).

## Status mapping

| Rule | Violation severity |
|---|---|
| order_id uniqueness | FAIL |
| region required | FAIL |
| revenue > 0 | FAIL |
| load_timestamp < 24h | WARN |
| row count >= 10 | FAIL |

## Publish decision

Any FAIL-severity violation blocks publication. WARN-severity violations may
publish with the caveat stated explicitly to the consumer.
