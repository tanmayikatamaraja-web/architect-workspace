# Pipeline Run Metadata — orders-etl

> **FIXTURE — synthetic lab data authored 2026-08-03 for the Agent Skills lab.**
> Not a real production run. Paired with `orders-pipeline-failure.log`.

## Run under investigation

| Field | Value |
|---|---|
| Run ID | `orders-etl-20260803-0600` |
| Correlation ID | `7c4e9b12-3f8a-4d21-9e55-0a1b2c3d4e5f` |
| Trigger | cron `0 6 * * *` (daily 06:00 UTC) |
| Started / ended | 2026-08-03T06:00:00Z → 06:16:05Z (965s) |
| Outcome | **FAILED**, exit code 1 |
| Terminal error | `ValidationError: region NOT NULL violated` |
| Rows extracted / written | 12 / 13 |
| Output artifact | `skill-lab/orders.csv` (written before the failure) |
| Staging state | left dirty, no rollback performed |

## Deploy history

| When | Component | Version | Change |
|---|---|---|---|
| 2026-08-02T22:40Z | `orderLoader` | 2.3.1 → **2.4.0** | Switched single-row inserts to **batch inserts** for throughput; retry logic carried over unchanged |
| 2026-07-28T14:05Z | `region-enrichment-svc` | 1.8.0 | Added per-tenant rate limiting |
| 2026-07-14T09:20Z | `ordersPipeline` | 3.1.2 | No functional change (dependency bump) |

**This failed run was the first scheduled execution after the 2.4.0 loader deploy.**

## Run history

| Date | Outcome | Duration | Rows | Notes |
|---|---|---|---|---|
| 2026-07-30 | success | 402s | 11 | |
| 2026-07-31 | success | 388s | 9 | Last run to advance the watermark |
| 2026-08-01 | success | 445s | 12 | |
| 2026-08-02 | success | 419s | 10 | Ran at 06:00Z, **before** the 22:40Z loader deploy |
| 2026-08-03 | **FAILED** | 965s | 13 written / 12 expected | This run — 2.3× the trailing-average duration |

## Configuration at run time

| Setting | Value | Notes |
|---|---|---|
| `batch_size` | 5 | New in 2.4.0 (was 1) |
| `write_timeout_ms` | 30000 | |
| `retry_max_attempts` | 3 | Fixed 5s backoff |
| `idempotency_keys_enabled` | **false** | Not implemented in the loader write path |
| `db_pool_size` | 5 | Unchanged since 2026-06 |
| `dlq_configured` | **false** | No dead-letter destination |
| `enrichment_fallback_policy` | `null_on_unavailable` | Writes NULL rather than failing fast |
| `rollback_on_validation_failure` | **false** | Staging left as-is on failure |

## Dependency health, 2026-08-03 06:00–06:20Z

| Dependency | Status | Detail |
|---|---|---|
| `oied_orders_api` | healthy | 3/3 pages HTTP 200, p95 2.2s |
| `region-enrichment-svc` | **degraded** | 3× HTTP 503 in a 25s window (06:06:30–06:06:55Z); provider status page reports a partial outage 06:04–06:07Z |
| staging Postgres | **saturated** | Pool 5/5 in use with 3 waiters at 06:14:02Z; p95 wait 9.4s |

## Watermark state

| Field | Value |
|---|---|
| Current | `2026-07-31T02:40:00Z` |
| Last advanced | 2026-07-31 run |
| Expected after this run | `2026-08-03T06:15:00Z` |
| Status | **not advanced** — validation gate failed before commit |

## Known open items (pre-existing, filed before this run)

- `ETL-118` — loader write path has no idempotency key. Opened 2026-06-11, unassigned.
- `ETL-131` — no DLQ for failed rows. Opened 2026-07-02, backlog.
- `ETL-140` — `null_on_unavailable` enrichment fallback conflicts with the NOT NULL contract on `region`. Opened 2026-07-19, backlog.
