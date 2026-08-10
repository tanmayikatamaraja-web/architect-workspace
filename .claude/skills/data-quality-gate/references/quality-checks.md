# Quality Checks — Reference

Detailed definitions for the eight checks in the `data-quality-gate` Skill.
Read this at step 4 of the Procedure, before running any check.

**Contract precedence:** a supplied quality contract always overrides the
defaults and severities here. If the contract maps a rule to a severity, use
that severity. Only fall back to this file's guidance when the contract is
silent.

**Evidence discipline:** every check reports concrete evidence — counts,
offending row numbers, offending key values, actual vs expected. Never report
a status without it. State whether row numbers are data rows (header excluded)
or file lines, and use one convention throughout the report.

**Compute, don't eyeball.** Derive counts, sums, ages, and duplicate sets by
running something over the file. Reading a small file and asserting a count
from memory is how a gate reports a wrong number with full confidence.

---

## 1. Schema

**Verify:** every contract column is present; no unexpected extra columns;
column order matches if the contract declares one; every value parses as its
declared type; field count is identical on every line.

**Evidence:** columns found vs declared; any missing/extra names; per-type
parse results; the line numbers of any ragged rows.

**Status:** FAIL on a missing required column, a type that will not parse, or
ragged field counts — all corrupt downstream reporting. WARN on an unexpected
extra column or column-order drift when the contract does not pin order.

**Edge cases:** a blank cell is a *null*, not a type failure — report it under
Required fields / Nulls, not here. Numbers stored with currency symbols,
thousands separators, or quoting still count as parse failures if the contract
declares a numeric type.

## 2. Freshness

**Verify:** the load/ingest timestamp is within the contract's maximum age,
measured against the time the check runs. Record that run time in the report.

Read the contract's wording carefully — it decides what you compare:

- "the dataset must be less than N hours old" → test the **newest** timestamp
- "load_timestamp must be less than N hours old" → test **every row**

When ambiguous, test both and report both readings.

**Evidence:** the run timestamp; newest and oldest timestamps; the age of each
violating row in hours; how many rows pass vs fail.

**Status:** per the contract. Absent a contract severity, WARN when the data is
stale but internally consistent; FAIL when staleness means required rows are
missing entirely (a partition that never landed).

**Edge cases:** mixed or absent timezones — normalize to UTC and say so. A
timestamp in the future signals a broken clock upstream: report FAIL, not a
negative age.

## 3. Expected volume

**Verify:** row count against the contract minimum, and maximum if set. Count
data rows, excluding the header. Report the de-duplicated count too when
duplicates exist, since that is the count that actually reaches the consumer.

**Evidence:** actual count vs threshold; the de-duplicated count when it
differs; the delta against the prior run if known.

**Status:** FAIL below the contract minimum or above a stated maximum. WARN on
a soft shortfall the contract flags as advisory, or a volume swing large
enough to suggest an upstream break even while inside the bounds.

**Edge cases:** an empty file, or a file with only a header, is FAIL — never
PASS by vacuous satisfaction. A count that clears the minimum only because
duplicates inflate it is a WARN at minimum; say so explicitly.

## 4. Key uniqueness

**Verify:** the declared primary or business key has no repeated values. If no
key is declared, identify the plausible key and say which column you used.

**Evidence:** each repeated key value with every row number it appears on;
unique-value count vs row count.

**Status:** FAIL. A duplicated key double-counts in any join or aggregate.
WARN only if the contract explicitly permits a multi-row key.

**Edge cases:** composite keys — test the tuple, not each column. Keys
differing only by whitespace or letter case are duplicates in practice; report
them, and note the normalization you applied.

## 5. Duplicate rows

**Verify:** fully identical records, and materially identical ones (all fields
equal except an audit or load column). This is broader than the key check —
run it even when key uniqueness passes.

**Evidence:** the duplicated row's contents; every row number in the duplicate
set; **the aggregate impact** — the affected measure summed with and without
the duplicates, and the difference.

**Status:** FAIL when the duplicate distorts a measure the consumer reads.
WARN when it lands in a dimension nobody aggregates.

**Edge cases:** legitimate repeats exist — the same customer buying the same
item twice on the same day is real. Distinguish those from a re-loaded batch
by checking whether the key also repeats. Quantifying the revenue impact is
what turns "there are duplicates" into a decision the reader can act on.

## 6. Required fields

**Verify:** every contract-required column is populated on every row. Treat
empty string, whitespace-only, `NULL`, `null`, `N/A`, and `-` as unpopulated,
and state the sentinel set you applied.

**Evidence:** the offending column, row number, and key value of each gap; the
count of affected rows per column.

**Status:** FAIL. A missing required field silently drops rows from any
filtered or grouped view.

**Edge cases:** a required field that is blank on *every* row usually means an
upstream mapping broke, not that rows are individually bad — call that out, as
the fix differs.

## 7. Nulls

**Verify:** null/blank rate per column against contract tolerance. Report per
column, not just overall — an overall rate near zero hides one badly broken
column.

**Evidence:** per-column null count and percentage; the tolerance; overall
rate for context.

**Status:** FAIL when a required column breaches a 0% tolerance or any column
breaches a stated tolerance. WARN for nulls in optional columns, or a rate
that is inside tolerance but has clearly moved since the last run.

**Edge cases:** this check overlaps Required fields by design. Report both, and
name the shared root cause rather than presenting them as two separate
problems.

## 8. Numeric rules

**Verify:** every range, sign, and bound rule in the contract — `revenue > 0`,
`quantity >= 1`, percentages within 0–100, and so on. Also sanity-check
declared numerics the contract left unbounded.

**Evidence:** each violating row number, key value, and actual value against
the rule; count of violations vs total rows.

**Status:** FAIL for a breach of a stated rule. WARN for an unbounded value
that looks anomalous (an extreme outlier) without breaching any rule.

**Edge cases — the one that matters most:** a violation is sometimes the
*contract* being wrong, not the data. A negative revenue row labeled as a
refund is a legitimate business event that a naive `revenue > 0` rule
misclassifies. Report the breach, **and** flag the conflict, and recommend
routing such rows to a separate signed measure or amending the contract.
Never recommend silently dropping the row — deleting refunds to make a gate
green overstates net revenue, which is a worse defect than the one being
fixed.

---

## No-contract defaults

Used only when no contract is supplied. Say explicitly in the report that
defaults were used and that the gate is therefore weaker than a contracted one.

| Check | Default |
|---|---|
| Freshness | Newest timestamp within 24 hours |
| Expected volume | Minimum 1 row |
| Key uniqueness | Required if a key column is identifiable |
| Required fields | Any column populated in >95% of rows is treated as required |
| Nulls | 0% tolerance on required fields |
| Numeric rules | None assumed — report observed ranges instead |
| Schema | Inferred from the header and observed types; report the inference |

## Roll-up

Any FAIL → **Overall: FAIL**. No FAIL but any WARN → **Overall: WARN**. All
PASS → **Overall: PASS**.

FAIL → BLOCK. PASS → PUBLISH. WARN → PUBLISH with the caveats stated, unless a
warned check feeds a financial, compliance, or externally-visible surface, in
which case BLOCK.

When several checks fail from one underlying cause, report each failing check
separately but group the root causes in the summary. Five failing checks from
three real defects is a more useful sentence than either number alone.
