# ETL Triage — orders-etl run `orders-etl-20260803-0600`

> **Scope warning — read first.** Both inputs (`orders-pipeline-failure.log`,
> `pipeline-run-metadata.md`) are **synthetic lab fixtures authored for this
> exercise**, not captured production telemetry. The reasoning below is sound
> *given those inputs*, but the causes were planted by the fixture author. Do
> not treat any ranking here as a finding about a real system.

**Correlation ID:** `7c4e9b12-3f8a-4d21-9e55-0a1b2c3d4e5f`
**Window:** 2026-08-03T06:00:00Z → 06:16:05Z (965s, exit code 1)
**Terminal error:** `ValidationError: region NOT NULL violated` (`ORD-1006`)
**Triaged:** 2026-08-04 · read-only; pipeline not modified, job not rerun

## Summary

The job did not fail because of the error it died on. A 3-minute upstream
outage was converted into a hard failure by a fallback policy that writes
`NULL` into a field the contract declares NOT NULL — nine minutes before the
validator caught it. A separate defect in the same run silently duplicated a
row. The pipeline's own logs recorded both problems as `info`/`warn` and
carried on.

Three distinct defects, one shared theme: **every failure path in this run
degraded quietly instead of stopping.**

---

## Ranked causes

### 1. Enrichment fallback writes NULL into a NOT NULL field — **primary, high confidence**

The `null_on_unavailable` policy turned a transient 503 into a fatal run and a
dirty staging table.

**Evidence**

| Source | Line / field |
|---|---|
| Log 06:06:30–06:06:55Z | 3× `region_lookup_failed` / `_retry`, `status_code 503`, `UpstreamUnavailable`, `CUST-4440`, attempts exhausted at max 3 |
| Log 06:07:00Z | `circuit_breaker_open`, `failures_in_window: 3`, `cooldown_s: 45` |
| Log 06:07:01Z | `enrichment_fallback_applied`, `fallback_policy: null_on_unavailable`, `region_written: null`, `order_id: ORD-1006` — logged at **warn**, run continued |
| Log 06:16:02Z | `validation_failed`, `rule: region NOT NULL`, `order_id: ORD-1006`, at `validateOrders.js:88` |
| Metadata → Config | `enrichment_fallback_policy: null_on_unavailable` |
| Metadata → Open items | **`ETL-140`** — this exact conflict, filed 2026-07-19, still in backlog |

**Why it ranks first:** it is the only chain that reaches the terminal error,
and it is the cheapest to fix. The outage itself was self-healing — the
breaker closed at 06:07:52Z after a 200 probe, 8 minutes before validation ran.
Had the fallback quarantined the row or failed fast, the run could have
retried the single lookup and completed. Instead the bad value was baked in at
06:07:01Z and detected at 06:16:02Z, wasting the whole load and leaving 13
unrolled-back rows in staging.

**Contributing:** `rollback_on_validation_failure: false` (metadata → Config)
and `dlq_configured: false` (log 06:16:04Z `dead_letter_skipped`) mean the
failure left dirty state with nowhere for the bad row to go.

### 2. Retry without an idempotency key duplicated a row — **high confidence, independent defect**

Did not cause the failure. Did corrupt the output.

**Evidence**

| Source | Line / field |
|---|---|
| Log 06:14:32Z | `batch_write_timeout`, `TimeoutError`, batch 2, `note: "ack not received; commit state unknown"` |
| Log 06:14:33Z | `batch_write_retry`, **`idempotency_key: null`**, `note: "replaying full batch; no dedup key present"` |
| Log 06:14:58Z | retry committed, 5 rows |
| Log 06:15:01Z | `load_complete`, `rows_written: 13`, `rows_expected: 12`, `delta: 1`, `note: "no assertion configured on this field"` |
| Log 06:12:38Z | batch 2 contents include `ORD-1007` — the key the quality gate found duplicated on rows 7 and 9 |
| Metadata → Deploy | loader **2.4.0** (2026-08-02T22:40Z) moved single-row → batch inserts; **first scheduled run after this deploy** |
| Metadata → Open items | **`ETL-118`** — no idempotency key in the write path, filed 2026-06-11 |

**Open question, unresolved by the evidence:** a full 5-row replay should have
duplicated every row that committed before the timeout, but only `ORD-1007`
duplicated (`rows_written 13`, delta 1). Either just one row landed pre-timeout,
or the batch is not transactionally wrapped and partial-commit behavior is
non-obvious. This gap matters — it determines whether the blast radius on the
next timeout is 1 row or 5. Test 2 below resolves it.

### 3. Watermark never advanced — **high confidence, compounding risk**

**Evidence:** log 06:00:03Z `watermark_read: 2026-07-31T02:40:00Z` ("unchanged
since 2026-07-31 run"); log 06:16:03Z `watermark_not_advanced`,
`would_have_advanced_to: 2026-08-03T06:15:00Z`, `reason: validation gate failed
before commit`; metadata → Watermark state confirms.

**Why it matters going forward:** this explains the stale `ORD-1011` row the
quality gate flagged (94.6h old) — it dates from the 2026-07-31 window that
keeps being re-extracted. More importantly, the **next** scheduled run will
re-extract from 2026-07-31 and, with cause #2 unfixed, add more duplicates on
any retry. Each failed run widens the window.

### 4. Connection pool saturation — **medium confidence, contributing factor only**

**Evidence:** log 06:14:02Z `db_pool_pressure`, `in_use: 5/5`, `waiters: 3`,
`wait_ms_p95: 9400` — 30 seconds before the timeout at 06:14:32Z. Metadata:
`db_pool_size: 5` unchanged since 2026-06, while 2.4.0 raised `batch_size` 1→5.
Run duration 965s vs a ~414s trailing average (2.3×).

**Assessment:** plausibly why the write timed out at all, so it is upstream of
cause #2 — but it produced no data defect on its own and is not why the job
exited 1. Fixing the pool without fixing #2 removes a trigger and leaves the
loaded gun.

### 5. Negative revenue on `ORD-1010` — **ruled out as a cause**

Log 06:15:06Z `row_passthrough`, `revenue: -7900.00`, `note: "negative revenue
accepted; loader applies no sign rule"`. The loader has no opinion on sign, so
this did not contribute to the failure. It is a contract-vs-reality mismatch
(refunds are legitimate), tracked separately in
[data-quality-report.md](data-quality-report.md).

### Also ruled out

**Source API.** `oied_orders_api` returned 3/3 HTTP 200 with p95 2.2s (log
06:02:11–06:05:03Z; metadata → Dependency health). Extract completed cleanly
with 12 records and 12 distinct order IDs — the input was correct. Everything
that went wrong happened after extraction.

---

## What to test next

Read-only or sandbox only. Per CLAUDE.md, integration tests must never touch
production and require explicit opt-in. None of these rerun the failed job.

### Test 1 — Reproduce the null-region fallback (do this first)

In the dev sandbox, run the loader against a mocked `region-enrichment-svc`
returning 503 for exactly one customer, with the real
`null_on_unavailable` policy.

- **Confirms:** cause #1 end to end.
- **Assert:** the run stops at the enrich step or quarantines the row — it must
  not write `NULL` and defer the error to validation 9 minutes later.
- **Then:** re-run with a `fail_fast` / `quarantine_row` policy and assert the
  other 11 rows still load. That is the candidate fix, and this test is the one
  that proves it.

### Test 2 — Determine the real duplicate blast radius

Inject a write timeout mid-batch on a 5-row batch in the sandbox and count
duplicates after the retry.

- **Answers:** the open question in cause #2 — 1 row or 5?
- **Assert:** whether the batch is transactionally wrapped. If it is not, that
  is a second finding beyond the missing idempotency key.
- **Then:** add a `(run_id, order_id)` idempotency key and assert the replay is
  a no-op. This is the regression test that closes `ETL-118`.

### Test 3 — Confirm the next run's extract window

Read-only query of `etl_watermarks.orders`, plus a dry-run of the extract
window resolver.

- **Confirms:** cause #3, and quantifies how many rows the next scheduled run
  will re-pull from 2026-07-31.
- **Why now:** if the cron fires before #2 is fixed, this predicts the damage.
  Consider pausing the schedule until Test 2 lands.

### Test 4 — Pool headroom under batch inserts

Load-test the sandbox at `batch_size: 5` against `db_pool_size: 5`, measuring
wait-time p95 and timeout rate; compare against `batch_size: 1`.

- **Confirms or drops:** cause #4.
- **Note:** a config change here is a tuning decision, not a fix. Do not raise
  the pool as a substitute for Tests 1 and 2.

### Inspection (not a test) — staging cleanliness

`load_complete` wrote 13 rows and `job_end` reports `staging_left_dirty: true`,
`rollback_performed: false`. Count what is actually sitting in
`staging.orders_extract` for this `run_id` before any re-run, or the next
attempt stacks on top of it.

---

## Cross-reference

Every data defect the quality gate found in `orders.csv` maps to a cause here:

| Defect (from `data-quality-report.md`) | Cause |
|---|---|
| Duplicate `ORD-1007`, rows 7 and 9 | #2 — retry without idempotency key |
| Blank `region` on `ORD-1006` | #1 — `null_on_unavailable` fallback |
| Stale load on `ORD-1011` (94.6h) | #3 — watermark never advanced |
| Negative revenue on `ORD-1010` | #5 — not a pipeline defect; contract mismatch |

The gate's **BLOCK** verdict stands. Fixing the pipeline does not clean the
artifact already on disk — `orders.csv` must be regenerated by a healthy run
and re-gated before it reaches the executive dashboard.
