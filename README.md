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
