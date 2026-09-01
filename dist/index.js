/**
 * ── THE PUBLIC BORROWER-QUOTE CONTRACT ───────────────────────────────────────
 *
 * One declaration of the surface a member of the public can fetch: the
 * scenario answers a spoke forwards, the priced response the engine returns,
 * and the forbidden-key vocabulary both sides' W-3 guards assert from.
 *
 * ── WHY A PACKAGE, AND NOT A COPY ON EACH SIDE ───────────────────────────────
 *
 * The contract could not cross the repo boundary, so both halves drifted in
 * the two ways an uncrossable contract always drifts:
 *
 * 1. THE CONSUMER READ THE PRODUCER BY HAND. Home Scout pulled NINE keys off
 *    an untyped payload with `?? null` / `?? []` fallbacks. Rename `par` in the
 *    engine and the borrower sees a blank price — while BOTH test suites stay
 *    green, because neither one asserts the pairing. A fallback is the right
 *    answer to a field that is legitimately absent and the wrong answer to a
 *    field that moved; `??` cannot tell those apart, and `parse` can.
 *
 * 2. THE GUARD FORKED, AND THE WEAKER COPY GUARDED THE PUBLIC. W-3 ("no summed
 *    cost field can exist") ran as 7 keys + a name pattern + 8 PII keys inside
 *    the engine, and as FOUR HARDCODED STRINGS with ZERO PII keys on the only
 *    response the public can actually fetch. Two descriptions of one rule, and
 *    the thinner one was pointed at the wider blast radius.
 *
 * So: one vocabulary, one walker, one schema — imported by both. The precedent
 * sits two import lines above the gap it was needed for
 * (`@rello-platform/pfp-intake-from-spoke`, already consumed by the same client
 * module for the other endpoint).
 *
 * ⛔ MIRRORED BY CONTRACT, NEVER IMPORTED ACROSS A RUNNING BOUNDARY (DL3). This
 * package is a shared TYPE + VOCABULARY, not a shared runtime: no HTTP, no DB,
 * no engine logic. Pricing lives in the engine and stays there.
 */
import { z } from "zod";
// ─────────────────────────────────────────────────────────────────────────────
// 1 · THE ANSWERS A SPOKE FORWARDS
//
// The borrower's own answers, verbatim. Deliberately NOT the derived figures:
// no `fico` (the credit band's floor is pricing POLICY), no `loanAmount`
// (price − down), no `ltv`, and NO `propertyState` — the property's state is
// the engine's derivation from the ZIP, and a spoke that could send one would
// send its SITE pin, which is a different axis that reads identical.
// ─────────────────────────────────────────────────────────────────────────────
export const SCENARIO_PURPOSES = ["buy", "refinance"];
export const SCENARIO_OCCUPANCIES = ["PRIMARY", "SECOND_HOME", "INVESTMENT"];
export const SCENARIO_PROPERTY_TYPES = ["CONDO", "MANUFACTURED"];
/**
 * The credit BANDS the adjusters key on, asked verbatim — "the question is the
 * answer". The engine prices at a band's floor, so no consumer maps a label to
 * a score. `FICO_BELOW_680` is deliberately floorless: it routes to a person
 * rather than inventing a score the borrower may not have.
 */
export const CREDIT_BAND_IDS = [
    "FICO_760_PLUS",
    "FICO_740_759",
    "FICO_720_739",
    "FICO_700_719",
    "FICO_680_699",
    "FICO_BELOW_680",
];
export const scenarioAnswersSchema = z.object({
    purpose: z.enum(SCENARIO_PURPOSES),
    price: z.number().finite().nullable().optional(),
    down: z.number().finite().nullable().optional(),
    propertyValue: z.number().finite().nullable().optional(),
    loanBalance: z.number().finite().nullable().optional(),
    cashOut: z.number().finite().nullable().optional(),
    /** The PROPERTY's ZIP — the engine derives BOTH county-dependent facts from
     *  it: the property state (licensing) and the conforming limit (jumbo). */
    zip: z.string().regex(/^\d{5}$/, "zip must be 5 digits"),
    occupancy: z.enum(SCENARIO_OCCUPANCIES),
    propertyType: z.enum(SCENARIO_PROPERTY_TYPES).nullable().optional(),
    units: z.number().int().min(1).max(4).nullable().optional(),
    creditBand: z.enum(CREDIT_BAND_IDS),
    /** Routes to a person; never a pricing dimension. */
    military: z.boolean().optional(),
});
/** Every key a spoke may put on the wire — the allowlist's own source. */
export const SCENARIO_ANSWER_KEYS = Object.keys(scenarioAnswersSchema.shape);
// ─────────────────────────────────────────────────────────────────────────────
// 2 · THE PRICED RESPONSE
//
// Load-bearing fields are REQUIRED — nullable where a null is a real answer
// (an empty ladder has `par: null`), but never optional. That is the whole
// point: a renamed field goes MISSING and `parse` throws, where `?? null`
// would have rendered a blank price and said nothing.
//
// Unknown keys pass through, so the engine can ADD a field without breaking a
// consumer. Additive evolution is safe; a rename is not, and only the second
// one is a defect.
// ─────────────────────────────────────────────────────────────────────────────
export const quoteRungSchema = z
    .object({
    rate: z.number().finite(),
    /** Signed points at this rung; negative is a lender credit. */
    price: z.number().finite(),
    /** ⛔ NULLABLE AND STAYS NULLABLE. An APR that cannot be honestly computed
     *  is null — never 0, never fabricated. Render it verbatim or render none. */
    apr: z.number().finite().nullable(),
    offset: z.number().finite().optional(),
    /** Per-rung composed text; null = could not be composed honestly. */
    disclosureText: z.string().nullable().optional(),
})
    .passthrough();
/** The engine's designed decline. A reason and a message — never an empty grid. */
export const routeToHumanSchema = z
    .object({
    reason: z.string().min(1),
    message: z.string().min(1),
})
    .passthrough();
/**
 * Freshness as a TRI-STATE, where `unknown` survives as its own value. A
 * consumer that collapsed unknown into either neighbour would recreate the
 * defect the tri-state exists to prevent: a degraded price rendering as live.
 */
export const FRESHNESS_STATES = ["live", "stale", "unknown"];
export const pricedQuoteSchema = z
    .object({
    rateType: z.string().min(1),
    lockDays: z.number().int().nullable(),
    par: z.object({ rate: z.number().finite() }).passthrough().nullable(),
    points: z.array(quoteRungSchema),
    lenderName: z.string().nullable(),
    effectiveDate: z.string().nullable(),
    freshUntil: z.string().nullable(),
    freshnessState: z.string().nullable(),
    emptyReason: z.string().nullable(),
    assumptions: z.unknown().nullable(),
    /** Present when the engine declined; absent when it priced. */
    routeToHuman: routeToHumanSchema.nullable().optional(),
    snapshotFreshness: z.unknown().nullable().optional(),
})
    .passthrough();
/**
 * Parse an engine payload. THROWS when a load-bearing field is missing —
 * which is the behaviour a hand-read `?? null` could not provide: a rename
 * becomes a loud failure at the boundary instead of a blank price downstream.
 */
export function parsePricedQuote(raw) {
    return pricedQuoteSchema.parse(raw);
}
/** Non-throwing variant, for a consumer that must degrade to a designed
 *  unavailable state rather than 500. The error is still explicit — it is
 *  never silently coerced into an empty price. */
export function safeParsePricedQuote(raw) {
    const r = pricedQuoteSchema.safeParse(raw);
    return r.success
        ? { ok: true, quote: r.data }
        : { ok: false, error: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
}
// ─────────────────────────────────────────────────────────────────────────────
// 3 · W-3 — THE FORBIDDEN VOCABULARY, DECLARED ONCE
//
// "If the number does not exist in the payload, no one can render it by
// accident." Both suites assert from THIS list and THIS walker, so the guard
// cannot fork again — and it cannot fork in the direction it forked last time,
// with the thinner copy on the public surface.
// ─────────────────────────────────────────────────────────────────────────────
/** Summed cost fields. A borrower-facing quote must not resemble a Loan
 *  Estimate, and a total is the field that makes it resemble one. */
export const FORBIDDEN_SUMMED_COST_KEYS = [
    "totalClosingCosts",
    "estimatedCashToClose",
    "cashToClose",
    "totalFees",
    "totalCost",
    "allInCost",
    "sumOfCosts",
];
/** Never on a public quote, at any depth. */
export const FORBIDDEN_PII_KEYS = [
    "ssn",
    "socialSecurityNumber",
    "income",
    "annualIncome",
    "monthlyIncome",
    "streetAddress",
    "addressLine1",
    "dateOfBirth",
];
export const FORBIDDEN_RESPONSE_KEYS = [
    ...FORBIDDEN_SUMMED_COST_KEYS,
    ...FORBIDDEN_PII_KEYS,
];
/** A summed cost field under another name. Catches what a denylist cannot. */
export const FORBIDDEN_KEY_PATTERN = /^(total|sum|estimated|all)[A-Z_]?.*(closingcost|cashtoclose|cost|fee)s?$/i;
/**
 * Every forbidden key in a payload, as dotted paths — RECURSIVE, because a
 * top-level-only check passes while the field sits one level down. Returns []
 * when the payload is clean.
 *
 * ONE implementation, so the two suites cannot drift into checking different
 * things while both report green.
 */
export function findForbiddenKeys(value, trail = []) {
    if (value === null || typeof value !== "object")
        return [];
    const out = [];
    if (Array.isArray(value)) {
        value.forEach((v, i) => out.push(...findForbiddenKeys(v, [...trail, String(i)])));
        return out;
    }
    for (const [k, v] of Object.entries(value)) {
        const at = [...trail, k].join(".");
        if (FORBIDDEN_RESPONSE_KEYS.includes(k))
            out.push(at);
        else if (FORBIDDEN_KEY_PATTERN.test(k))
            out.push(at);
        out.push(...findForbiddenKeys(v, [...trail, k]));
    }
    return out;
}
