---
name: data-quality-gate
description: Use when the user asks whether existing data is fit to publish - validating a dataset, CSV, table, ETL or pipeline output, query result, or dashboard/report source before it ships. Triggers on data-quality checks (duplicates, nulls, freshness, schema drift, row counts, key uniqueness), quality-contract conformance, and publish-readiness or go/no-go sign-off. Checks the data against a quality contract and returns PASS, WARN, or FAIL with evidence and a PUBLISH or BLOCK recommendation. Do NOT use for ordinary data work where nothing is being cleared for publication - writing or debugging SQL, calculating or defining a metric, designing or building a dashboard, exploratory analysis, or cleaning and transforming data are not sufficient reasons to invoke it.
---

# Data Quality Gate

A pre-publication gate. Validate a dataset against a quality contract, report
evidence, and issue a publish decision. This Skill is read-only.

## When to use

Invoke only when the request is about **whether existing data is fit to
publish**. Two things must be true: there is a **specific dataset**, and there
is a **publication or trust decision** riding on it.

Use it for:

- Validating a CSV, table, extract, ETL/pipeline output, or query result
- Data-quality checks: duplicates, nulls, freshness, schema drift, row counts,
  key uniqueness, numeric-range breaches
- Conformance against a stated quality contract, SLA, or data spec
- Publish-readiness / go/no-go sign-off before data reaches a dashboard,
  report, board deck, customer, or downstream consumer

**Do not use it for** (these are ordinary data work, not a gate):

| Request | Why it does not trigger |
|---|---|
| "Write / fix / optimize this SQL" | Authoring a query, not judging data fitness |
| "Calculate MoM growth" / "define our churn metric" | Producing a number, not validating a source |
| "Design / build an executive dashboard" | Design and layout work; no dataset is being cleared |
| "What's driving the Q3 revenue drop?" | Exploratory analysis, not a publish decision |
| "Clean this file / dedupe these rows / fix the nulls" | Asks you to **modify** data; this Skill never writes |

Borderline: if the user names a dataset **and** asks whether it is safe,
trustworthy, correct, or ready — trigger. If they name a dataset but only want
a number, a query, or a chart from it — do not. When a request mixes both
("check it, then chart it"), run the gate first and let the verdict govern
whether the rest proceeds.

## Hard rules

- **Never modify the source data.** No writes, edits, cleaning, sorting,
  de-duplicating, or re-saving of the dataset. Read only.
- **A dataset path is required.** If the user has not supplied one, ask for it
  and stop. Do not guess, glob, or invent a path.
- **Use the supplied quality contract when one is available.** Contract
  thresholds always override the defaults in `references/quality-checks.md`.
  If no contract is supplied, look for one alongside the dataset, then fall
  back to those defaults and say explicitly in the output that defaults were
  used.
- Be concise and procedural. Report findings; do not narrate the process.

## Procedure

1. Confirm the dataset path exists and is readable. If not, stop and report.
2. Load the quality contract (supplied path, then adjacent file, then
   defaults). Restate the rules being enforced in one line each.
3. Read the dataset. Record row count, column list, and column order.
4. **Read `references/quality-checks.md` now, before running anything.** It
   defines how each check is computed, the evidence each must produce, and how
   to assign its status. Read it every run — do not work from memory. Then run
   all eight checks.
5. Record concrete evidence for each check: counts, offending row numbers,
   offending key values, actual vs expected. Never report a status without
   evidence.
6. Emit the results table, then the verdict, then the recommendation.

## Checklist

Run all eight, in this order. Never skip one — a check with no applicable
contract rule is reported as `N/A` with the reason.

1. Schema
2. Freshness
3. Expected volume
4. Key uniqueness
5. Duplicate rows
6. Required fields
7. Nulls
8. Numeric rules

Definitions, computation method, required evidence, per-check status
thresholds, the no-contract defaults, and edge cases all live in
`references/quality-checks.md`. Read it at step 4 of the Procedure.

## Status assignment

- **PASS** — fully satisfied.
- **WARN** — violated, but downstream reporting stays correct.
- **FAIL** — violated in a way that makes downstream reporting wrong.

Per-check guidance on which violations are WARN vs FAIL is in the reference.
A contract's own severity mapping always overrides both.

## Output format

Emit exactly this structure and nothing extra.

### 1. Header

Dataset path, contract source (path or "defaults"), row count, column count.

### 2. Results table

| Check | Evidence | Status | Recommended Action |
|---|---|---|---|
| Schema | ... | PASS / WARN / FAIL | ... |
| Freshness | ... | ... | ... |
| Expected volume | ... | ... | ... |
| Key uniqueness | ... | ... | ... |
| Duplicate rows | ... | ... | ... |
| Required fields | ... | ... | ... |
| Nulls | ... | ... | ... |
| Numeric rules | ... | ... | ... |

Evidence must be specific: `order_id ORD-1007 appears on rows 7 and 9`, not
`duplicates found`. Recommended Action is one imperative sentence naming who
fixes what.

### 3. Overall verdict

One line: `Overall: PASS` / `Overall: WARN` / `Overall: FAIL`.

Roll-up rule: any FAIL makes the overall verdict FAIL. No FAIL but any WARN
makes it WARN. All PASS makes it PASS.

### 4. Recommendation

One line: `Recommendation: PUBLISH` or `Recommendation: BLOCK`, followed by a
single sentence of justification.

Decision rule: FAIL means BLOCK. WARN means PUBLISH with the warnings stated
as caveats, unless a warned check feeds a financial, compliance, or
externally-visible surface, in which case BLOCK. PASS means PUBLISH.
