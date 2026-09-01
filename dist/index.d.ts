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
export declare const SCENARIO_PURPOSES: readonly ["buy", "refinance"];
export declare const SCENARIO_OCCUPANCIES: readonly ["PRIMARY", "SECOND_HOME", "INVESTMENT"];
export declare const SCENARIO_PROPERTY_TYPES: readonly ["CONDO", "MANUFACTURED"];
/**
 * The credit BANDS the adjusters key on, asked verbatim — "the question is the
 * answer". The engine prices at a band's floor, so no consumer maps a label to
 * a score. `FICO_BELOW_680` is deliberately floorless: it routes to a person
 * rather than inventing a score the borrower may not have.
 */
export declare const CREDIT_BAND_IDS: readonly ["FICO_760_PLUS", "FICO_740_759", "FICO_720_739", "FICO_700_719", "FICO_680_699", "FICO_BELOW_680"];
export declare const scenarioAnswersSchema: z.ZodObject<{
    purpose: z.ZodEnum<{
        buy: "buy";
        refinance: "refinance";
    }>;
    price: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    down: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    propertyValue: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    loanBalance: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    cashOut: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    zip: z.ZodString;
    occupancy: z.ZodEnum<{
        PRIMARY: "PRIMARY";
        SECOND_HOME: "SECOND_HOME";
        INVESTMENT: "INVESTMENT";
    }>;
    propertyType: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
        CONDO: "CONDO";
        MANUFACTURED: "MANUFACTURED";
    }>>>;
    units: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    creditBand: z.ZodEnum<{
        FICO_760_PLUS: "FICO_760_PLUS";
        FICO_740_759: "FICO_740_759";
        FICO_720_739: "FICO_720_739";
        FICO_700_719: "FICO_700_719";
        FICO_680_699: "FICO_680_699";
        FICO_BELOW_680: "FICO_BELOW_680";
    }>;
    military: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type ScenarioAnswers = z.infer<typeof scenarioAnswersSchema>;
/** Every key a spoke may put on the wire — the allowlist's own source. */
export declare const SCENARIO_ANSWER_KEYS: (keyof ScenarioAnswers)[];
export declare const quoteRungSchema: z.ZodObject<{
    rate: z.ZodNumber;
    price: z.ZodNumber;
    apr: z.ZodNullable<z.ZodNumber>;
    offset: z.ZodOptional<z.ZodNumber>;
    disclosureText: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$loose>;
export type QuoteRung = z.infer<typeof quoteRungSchema>;
/** The engine's designed decline. A reason and a message — never an empty grid. */
export declare const routeToHumanSchema: z.ZodObject<{
    reason: z.ZodString;
    message: z.ZodString;
}, z.core.$loose>;
export type RouteToHuman = z.infer<typeof routeToHumanSchema>;
/**
 * Freshness as a TRI-STATE, where `unknown` survives as its own value. A
 * consumer that collapsed unknown into either neighbour would recreate the
 * defect the tri-state exists to prevent: a degraded price rendering as live.
 */
export declare const FRESHNESS_STATES: readonly ["live", "stale", "unknown"];
export declare const pricedQuoteSchema: z.ZodObject<{
    rateType: z.ZodString;
    lockDays: z.ZodNullable<z.ZodNumber>;
    par: z.ZodNullable<z.ZodObject<{
        rate: z.ZodNumber;
    }, z.core.$loose>>;
    points: z.ZodArray<z.ZodObject<{
        rate: z.ZodNumber;
        price: z.ZodNumber;
        apr: z.ZodNullable<z.ZodNumber>;
        offset: z.ZodOptional<z.ZodNumber>;
        disclosureText: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$loose>>;
    lenderName: z.ZodNullable<z.ZodString>;
    effectiveDate: z.ZodNullable<z.ZodString>;
    freshUntil: z.ZodNullable<z.ZodString>;
    freshnessState: z.ZodNullable<z.ZodString>;
    emptyReason: z.ZodNullable<z.ZodString>;
    assumptions: z.ZodNullable<z.ZodUnknown>;
    routeToHuman: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        reason: z.ZodString;
        message: z.ZodString;
    }, z.core.$loose>>>;
    snapshotFreshness: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
}, z.core.$loose>;
export type PricedQuote = z.infer<typeof pricedQuoteSchema>;
/**
 * Parse an engine payload. THROWS when a load-bearing field is missing —
 * which is the behaviour a hand-read `?? null` could not provide: a rename
 * becomes a loud failure at the boundary instead of a blank price downstream.
 */
export declare function parsePricedQuote(raw: unknown): PricedQuote;
/** Non-throwing variant, for a consumer that must degrade to a designed
 *  unavailable state rather than 500. The error is still explicit — it is
 *  never silently coerced into an empty price. */
export declare function safeParsePricedQuote(raw: unknown): {
    ok: true;
    quote: PricedQuote;
} | {
    ok: false;
    error: string;
};
/** Summed cost fields. A borrower-facing quote must not resemble a Loan
 *  Estimate, and a total is the field that makes it resemble one. */
export declare const FORBIDDEN_SUMMED_COST_KEYS: readonly ["totalClosingCosts", "estimatedCashToClose", "cashToClose", "totalFees", "totalCost", "allInCost", "sumOfCosts"];
/** Never on a public quote, at any depth. */
export declare const FORBIDDEN_PII_KEYS: readonly ["ssn", "socialSecurityNumber", "income", "annualIncome", "monthlyIncome", "streetAddress", "addressLine1", "dateOfBirth"];
export declare const FORBIDDEN_RESPONSE_KEYS: readonly ["totalClosingCosts", "estimatedCashToClose", "cashToClose", "totalFees", "totalCost", "allInCost", "sumOfCosts", "ssn", "socialSecurityNumber", "income", "annualIncome", "monthlyIncome", "streetAddress", "addressLine1", "dateOfBirth"];
/** A summed cost field under another name. Catches what a denylist cannot. */
export declare const FORBIDDEN_KEY_PATTERN: RegExp;
/**
 * Every forbidden key in a payload, as dotted paths — RECURSIVE, because a
 * top-level-only check passes while the field sits one level down. Returns []
 * when the payload is clean.
 *
 * ONE implementation, so the two suites cannot drift into checking different
 * things while both report green.
 */
export declare function findForbiddenKeys(value: unknown, trail?: string[]): string[];
//# sourceMappingURL=index.d.ts.map