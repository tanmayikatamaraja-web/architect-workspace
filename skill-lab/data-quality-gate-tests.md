# Trigger Tests — `data-quality-gate`

Manual test set for the Skill at `.claude/skills/data-quality-gate/SKILL.md`.
Purpose: confirm the description fires on publish-readiness requests and stays
silent on ordinary data work.

**How to run:** start a fresh session (the description is read at session
start), paste one prompt verbatim, and record whether the Skill was invoked.
Do not name the Skill in the prompt — naming it proves nothing about the
description. One prompt per session; a prior run in the same session biases
the next.

**Pass condition:** all six cases behave as specified below.

---

## Positive cases — the Skill SHOULD trigger

### P1 — Named dataset, named contract, explicit publish decision

> Before this data feeds the executive revenue dashboard, validate
> `skill-lab/orders.csv` against `skill-lab/quality-contract.md`. Tell me
> whether I should PUBLISH or BLOCK the dataset.

*Why it should fire:* specific dataset, supplied contract, and an explicit
publish decision. This is the Skill's centre of mass.

### P2 — ETL output, named quality dimensions, no contract supplied

> The nightly ETL just wrote `exports/customer_churn_extract.csv`. Check it for
> duplicates, nulls, and stale loads before I hand it to the BI team.

*Why it should fire:* ETL output plus named quality dimensions plus a
downstream consumer. Tests that the Skill fires without the word "validate"
and without a contract path — it should fall back to defaults and say so.

### P3 — Publish-readiness phrasing, no quality vocabulary at all

> Is the Q3 pipeline table ready to go into the board deck, or is it still
> broken? Give me a go/no-go.

*Why it should fire:* no words like "validate", "quality", "duplicates", or
"nulls" — the trigger has to come from *publish-readiness* and *go/no-go*.
This is the weakest positive; if only one case fails, expect this one.

---

## Negative cases — the Skill should NOT trigger

### N1 — SQL authoring

> Write me a SQL query that sums revenue by region from the orders table and
> ranks regions by total.

*Why it must not fire:* authoring a query. No dataset is being cleared for
publication. Mentioning a table is not a gate request.

### N2 — Metric calculation

> Using `skill-lab/orders.csv`, calculate average order value and
> month-over-month revenue growth.

*Why it must not fire:* **the strongest negative** — it names a real dataset,
the exact file the Skill was built against. The ask is for a number, not a
verdict. If this one fires, the description is over-triggering on file paths
and needs the "not sufficient" clause strengthened.

### N3 — Dashboard design

> Design an executive revenue dashboard. What KPIs, chart types, and layout
> should it use for a 35–60 exec audience?

*Why it must not fire:* design and layout work. "Dashboard" and "executive"
appear in the Skill's description as *context* for validation, never as
triggers on their own.

---

## Borderline (record behavior, do not score)

> Check `orders.csv` for problems, then chart revenue by region.

Correct behavior: run the gate first, then let the verdict govern the chart —
and if the verdict is BLOCK, say so rather than silently charting known-bad
data. Recorded for observation; not part of the six-case pass condition.

---

## Expected output requirements

When the Skill fires, the response must contain **all** of the following. A
missing item is a defect in `SKILL.md`, not a one-off miss.

| # | Requirement |
|---|---|
| 1 | Header: dataset path, contract source (path or "defaults"), row count, column count |
| 2 | A results table with exactly the columns `Check`, `Evidence`, `Status`, `Recommended Action` |
| 3 | All eight checks present as rows: schema, freshness, expected volume, key uniqueness, duplicate rows, required fields, nulls, numeric rules — none skipped; inapplicable ones marked `N/A` with a reason |
| 4 | Every status is exactly one of `PASS`, `WARN`, `FAIL` |
| 5 | Evidence is specific — row numbers, key values, counts, actual vs expected. `duplicates found` is a failure; `ORD-1007 appears on rows 7 and 9` is a pass |
| 6 | Recommended Action is one imperative sentence naming who fixes what |
| 7 | A single roll-up line: `Overall: PASS` / `Overall: WARN` / `Overall: FAIL`, consistent with the roll-up rule (any FAIL → FAIL) |
| 8 | A single line: `Recommendation: PUBLISH` or `Recommendation: BLOCK`, plus one sentence of justification |
| 9 | The source dataset is unmodified — no cleaning, sorting, de-duplicating, or re-saving |
| 10 | If no dataset path was supplied, the Skill asks for one and stops — it must not guess or glob |
| 11 | Counts and sums are computed from the file, not asserted from reading it |

When the Skill does **not** fire, the correct behavior is to answer the
question normally. A refusal, or an unprompted quality audit the user did not
ask for, is also a failed negative case.

---

## Results log

| Case | Expected | Observed | Date | Notes |
|---|---|---|---|---|
| P1 | Trigger | Triggered | 2026-08-03 | Ran against `orders.csv` + contract; returned FAIL / BLOCK with all 8 checks and evidence. Requirements 1–11 met. |
| P2 | Trigger | not yet run | | |
| P3 | Trigger | not yet run | | |
| N1 | No trigger | not yet run | | |
| N2 | No trigger | not yet run | | |
| N3 | No trigger | not yet run | | |

P1 was exercised in session `CC-20260803-4m8t` against the pre-hardening
description. The five remaining cases have not been run; the hardened
description's negative boundary is therefore **untested**, and N2 is the case
most worth running first.
