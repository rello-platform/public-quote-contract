# @rello-platform/public-quote-contract

The public borrower-quote contract, in one declaration: the scenario answers a spoke forwards, the priced response the engine returns, and the forbidden-key vocabulary both W-3 guards assert from.

## Why

The contract could not cross the repo boundary, so both halves drifted:

1. **The consumer read the producer by hand** — nine keys off an untyped payload with `?? null` fallbacks. Rename one in the engine and the borrower sees a blank price while both suites stay green. `??` cannot tell a legitimately-absent field from a moved one; `parse` can.
2. **The W-3 guard forked, and the weaker copy guarded the public** — 7 keys + a pattern + 8 PII keys in the engine, versus four hardcoded strings and zero PII keys on the only response the public can fetch.

## Use

```ts
import { parsePricedQuote, findForbiddenKeys, scenarioAnswersSchema } from "@rello-platform/public-quote-contract";
```

Load-bearing response fields are **required** (nullable where null is a real answer), so a rename throws at the boundary. Unknown keys pass through, so the engine can add a field without breaking a consumer.

## v0.3.0 — a PII guard, by ruling (R-20 / R-21 / R-23, 2026-09-28)

**Breaking.** Kelly lifted the summed-cost ban ("The problem is creating a form, not showing the
numbers"), so the walker no longer judges arithmetic. `FORBIDDEN_SUMMED_COST_KEYS` and
`FORBIDDEN_KEY_PATTERN` are **deleted**; `totalClosingCosts`, `cashToClose` and every suffix form are
cleared. The H-24 boundary (section names verbatim, lettered subtotals, the ledger) is a rendering
check and lives with the renderer.

What remains is PII, where v0.2.0 was weakest: it matched eight exact spellings, and the Stage A
audit's `borrowerIncome`, `grossIncome` and `ssnLast4` all passed. Every key is now canonicalised
(`ssnLast4` → `ssn last 4`) and judged by category: income (not `income limit`), tax id, birth date,
a person's street address, a person's name, and a person's email/phone (a business's is not PII).
It walks JSON strings, keys carried as data, and short labels held under a label key.

- `findForbiddenKeyFindings(value, options?)` → `{ path, category }[]`; `findForbiddenKeys` → paths.
- `FORBIDDEN_RESPONSE_KEYS` is kept under its old name and now equals `FORBIDDEN_PII_KEYS`.
- `options.exemptCanonical` scopes the guard per surface; empty by default, set by no caller.
- `npm test` runs the corpus against the compiled `dist/`.
