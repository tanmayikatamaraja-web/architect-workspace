# ETL Triage — orders-etl run `orders-etl-20260803-0600`

> **Scope warning — read first.** Both inputs (`orders-pipeline-failure.log`,
> `pipeline-run-metadata.md`) are **synthetic lab fixtures authored for this
> exercise**, not captured production telemetry. The reasoning is sound *given
> those inputs*, but the causes were planted by the fixture author. Do not treat
> any ranking here as a finding about a real system.

**Correlation ID:** `7c4e9b12-3f8a-4d21-9e55-0a1b2c3d4e5f`
**Failed run:** 2026-08-03T06:00:00Z → 06:16:05Z (965s, exit code 1)
**Terminal error:** `ValidationError: region NOT NULL violated` (`ORD-1006`)
**Triaged:** 2026-08-06 · read-only; pipeline not modified, job not rerun

## Summary

The job did not fail because of the error it died on. A ~3-minute upstream
outage was converted into a hard failure by a fallback that writes `NULL` into
a field the contract declares NOT NULL — nine minutes before the validator
caught it. A separate defect in the same run silently duplicated a row. Both
were logged at `info`/`warn` and the run carried on.

Three distinct defects, one shared theme: **every failure path in this run
degraded quietly instead of stopping.**

**As of 2026-08-06 this is unresolved.** The last successful run was
2026-08-02. The watermark still sits at `2026-07-31T02:40:00Z`, and
`orders.csv` has not been refreshed since 2026-08-03T06:15:00Z — which is why
the quality gate now reports all 13 rows stale rather than one.

---

## Ranked causes

### 1. Enrichment fallback writes NULL into a NOT NULL field — primary, high confidence

**Evidence**

| Source | Line / field |
|---|---|
| Log 06:06:30–06:06:55Z | 3× `region_lookup_failed`/`_retry`, `status_code 503`, `UpstreamUnavailable`, `CUST-4440`, retries exhausted at max 3 |
| Log 06:07:00Z | `circuit_breaker_open`, `failures_in_window: 3`, `cooldown_s: 45` |
| Log 06:07:01Z | `enrichment_fallback_applied`, `fallback_policy: null_on_unavailable`, `region_written: null`, `order_id: ORD-1006` — logged at **warn**, run continued |
| Log 06:16:02Z | `validation_failed`, `rule: region NOT NULL`, `ORD-1006`, `validateOrders.js:88` |
| Metadata → Config | `enrichment_fallback_policy: null_on_unavailable` |
| Metadata → Open items | `ETL-140` — this exact conflict, filed 2026-07-19, still backlog |

**Why first:** it is the only chain reaching the terminal error, and the
cheapest to fix. The outage self-healed — the breaker closed at 06:07:52Z on a
200 probe, 8 minutes before validation ran. Had the fallback quarantined the
row or failed fast, the run could have retried one lookup and completed.
Instead the bad value was written at 06:07:01Z and caught at 06:16:02Z,
wasting the load and leaving 13 rows in staging.

**Contributing:** `rollback_on_validation_failure: false` and
`dlq_configured: false` (log 06:16:04Z `dead_letter_skipped`) left dirty state
with nowhere for the bad row to go.

### 2. Retry without an idempotency key duplicated a row — high confidence, independent defect

Did not cause the failure. Did corrupt the output.

**Evidence**

| Source | Line / field |
|---|---|
| Log 06:14:32Z | `batch_write_timeout`, `TimeoutError`, batch 2, `note: "ack not received; commit state unknown"` |
| Log 06:14:33Z | `batch_write_retry`, **`idempotency_key: null`**, `"replaying full batch; no dedup key present"` |
| Log 06:15:01Z | `load_complete`, `rows_written: 13`, `rows_expected: 12`, `delta: 1`, `"no assertion configured on this field"` |
| Log 06:12:38Z | batch 2 contents include `ORD-1007` — the key the gate found duplicated on rows 7 and 9 |
| Metadata → Deploy | loader **2.4.0** (2026-08-02T22:40Z) moved single-row → batch inserts; **first scheduled run after this deploy** |
| Metadata → Open items | `ETL-118` — no idempotency key in the write path, filed 2026-06-11 |

**Open question, unresolved by the evidence:** a full 5-row replay should have
duplicated every row committed before the timeout, but only `ORD-1007`
duplicated (delta 1). Either one row landed pre-timeout, or the batch is not
transactionally wrapped. This determines whether the next timeout costs 1 row
or 5. Test 2 resolves it.

### 3. Watermark never advanced — high confidence, compounding

**Evidence:** log 06:00:03Z `watermark_read: 2026-07-31T02:40:00Z` ("unchanged
since 2026-07-31 run"); log 06:16:03Z `watermark_not_advanced`,
`would_have_advanced_to: 2026-08-03T06:15:00Z`, `reason: validation gate failed
before commit`; metadata → Watermark state.

**Why it matters now:** this explains both the stale `ORD-1011` row and the
fact that the whole extract is now 89.4h old. Each further scheduled run
re-extracts from 2026-07-31 and, with cause #2 unfixed, adds duplicates on any
retry. The window widens with every failure.

### 4. Connection pool saturation — medium confidence, contributing factor only

**Evidence:** log 06:14:02Z `db_pool_pressure`, `in_use: 5/5`, `waiters: 3`,
`wait_ms_p95: 9400` — 30s before the 06:14:32Z timeout. Metadata:
`db_pool_size: 5` unchanged since 2026-06 while 2.4.0 raised `batch_size` 1→5.
Duration 965s vs ~414s trailing average (2.3×).

**Assessment:** plausibly why the write timed out, so upstream of cause #2 —
but it produced no data defect alone and is not why the job exited 1. Fixing
the pool without fixing #2 removes a trigger and leaves the loaded gun.

### 5. Negative revenue on `ORD-1010` — ruled out as a cause

Log 06:15:06Z `row_passthrough`, `"negative revenue accepted; loader applies no
sign rule"`. The loader has no opinion on sign. This is a contract-vs-reality
mismatch (refunds are legitimate), not a pipeline defect.

### Also ruled out

**Source API.** `oied_orders_api` returned 3/3 HTTP 200, p95 2.2s (log
06:02:11–06:05:03Z; metadata → Dependency health), with 12 records and 12
distinct order IDs. The input was correct; everything went wrong after
extraction.

---

## What to test next

Sandbox or read-only only. Per CLAUDE.md, integration tests must never touch
production and require explicit opt-in. None of these rerun the failed job.

**Test 1 — Reproduce the null-region fallback (first).** In the dev sandbox,
run the loader against a mocked `region-enrichment-svc` returning 503 for one
customer. Assert the run fails fast or quarantines the row rather than writing
`NULL` and deferring the error 9 minutes. Then re-run with
`fail_fast`/`quarantine_row` and assert the other 11 rows still load — same
test proves the candidate fix.

**Test 2 — Determine the duplicate blast radius.** Inject a mid-batch write
timeout on a 5-row batch; count duplicates after the retry. Answers the open
question in cause #2 and reveals whether the batch is transactionally wrapped.
Then add a `(run_id, order_id)` idempotency key and assert the replay is a
no-op — the regression test that closes `ETL-118`.

**Test 3 — Confirm the next run's extract window.** Read-only query of
`etl_watermarks.orders` plus a dry-run of the window resolver. Quantifies how
many rows the next run re-pulls from 2026-07-31. Consider pausing the schedule
until Test 2 lands.

**Test 4 — Pool headroom under batch inserts.** Load-test at `batch_size: 5`
against `db_pool_size: 5`, measuring wait p95 and timeout rate vs
`batch_size: 1`. Confirms or drops cause #4. A config change here is tuning,
not a fix — do not raise the pool as a substitute for Tests 1 and 2.

**Inspection (not a test) — staging cleanliness.** `job_end` reports
`staging_left_dirty: true`, `rollback_performed: false`. Count what is actually
in `staging.orders_extract` for this `run_id` before any re-run, or the next
attempt stacks on top of it.

---

## Cross-reference

| Defect (from the quality gate) | Cause |
|---|---|
| Duplicate `ORD-1007`, rows 7 and 9 | #2 — retry without idempotency key |
| Blank `region` on `ORD-1006` | #1 — `null_on_unavailable` fallback |
| Stale loads across all 13 rows | #3 — watermark never advanced; no successful run since 2026-08-02 |
| Negative revenue on `ORD-1010` | #5 — not a pipeline defect; contract mismatch |

Fixing the pipeline does not clean the artifact already on disk. `orders.csv`
must be regenerated by a healthy run and re-gated before it reaches the
dashboard.
