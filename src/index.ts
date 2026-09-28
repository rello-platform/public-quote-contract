/**
 * ── THE PUBLIC BORROWER-QUOTE CONTRACT ───────────────────────────────────────
 *
 * One declaration of the surface a member of the public can fetch: the
 * scenario answers a spoke forwards, the priced response the engine returns,
 * and the ONE public-payload PII guard both sides assert from (v0.3.0: PII only —
 * the summed-cost ban was lifted by ruling R-20; see section 3).
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

export const SCENARIO_PURPOSES = ["buy", "refinance"] as const;
export const SCENARIO_OCCUPANCIES = ["PRIMARY", "SECOND_HOME", "INVESTMENT"] as const;
export const SCENARIO_PROPERTY_TYPES = ["CONDO", "MANUFACTURED"] as const;

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
] as const;

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
export type ScenarioAnswers = z.infer<typeof scenarioAnswersSchema>;

/** Every key a spoke may put on the wire — the allowlist's own source. */
export const SCENARIO_ANSWER_KEYS = Object.keys(scenarioAnswersSchema.shape) as
  (keyof ScenarioAnswers)[];

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
export type QuoteRung = z.infer<typeof quoteRungSchema>;

/** The engine's designed decline. A reason and a message — never an empty grid. */
export const routeToHumanSchema = z
  .object({
    reason: z.string().min(1),
    message: z.string().min(1),
  })
  .passthrough();
export type RouteToHuman = z.infer<typeof routeToHumanSchema>;

/**
 * Freshness as a TRI-STATE, where `unknown` survives as its own value. A
 * consumer that collapsed unknown into either neighbour would recreate the
 * defect the tri-state exists to prevent: a degraded price rendering as live.
 */
export const FRESHNESS_STATES = ["live", "stale", "unknown"] as const;

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
    /**
     * v0.1.1 (additive, optional) — WHY `par` is null when the engine withheld
     * it: the curve par exists but its offset-0 rung carries no APR, so no bare
     * rate ships (PFP #497, "par-apr-unavailable"). Absent on an older engine;
     * null when par is present.
     */
    parOmittedReason: z.string().nullable().optional(),
    /**
     * v0.1.1 (additive, optional) — rungs the engine withheld from `points`
     * because they carry no APR (PFP #496). A consumer that renders a rate
     * reads this before the number so the absence is a value, not a gap.
     */
    withheldRungs: z
      .array(z.object({ offset: z.number(), aprOmittedReason: z.string() }).passthrough())
      .optional(),
  })
  .passthrough();
export type PricedQuote = z.infer<typeof pricedQuoteSchema>;

/**
 * Parse an engine payload. THROWS when a load-bearing field is missing —
 * which is the behaviour a hand-read `?? null` could not provide: a rename
 * becomes a loud failure at the boundary instead of a blank price downstream.
 */
export function parsePricedQuote(raw: unknown): PricedQuote {
  return pricedQuoteSchema.parse(raw);
}

/** Non-throwing variant, for a consumer that must degrade to a designed
 *  unavailable state rather than 500. The error is still explicit — it is
 *  never silently coerced into an empty price. */
export function safeParsePricedQuote(
  raw: unknown,
): { ok: true; quote: PricedQuote } | { ok: false; error: string } {
  const r = pricedQuoteSchema.safeParse(raw);
  return r.success
    ? { ok: true, quote: r.data }
    : { ok: false, error: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3 · THE PUBLIC-PAYLOAD PII GUARD, DECLARED ONCE
//
// ⚖️ v0.3.0 — RE-SCOPED BY RULING (RATES-KA-RULINGS R-20 / R-21 / R-23, 2026-09-28).
// This section used to be "W-3": a ban on summed cost fields (`totalClosingCosts`,
// `cashToClose`, …) on the theory that a total makes a quote resemble a Loan
// Estimate. Kelly lifted that ban — "The problem is creating a form, not showing
// the numbers" — and the H-24 boundary now lives where the FORM is (section
// names verbatim, the lettered subtotals, the two-column ledger), which is a
// rendering question, not a key question. So the summed-cost vocabulary is
// RETIRED here, entirely: `FORBIDDEN_SUMMED_COST_KEYS` and
// `FORBIDDEN_KEY_PATTERN` are deleted rather than left exported, because a
// retired list that still exports is a list somebody imports.
//
// What remains is the walker's real job: a public quote must never carry the
// borrower's identity or finances. And that is exactly where it was weakest —
// the 2026-09-28 Stage A audit planted `borrowerIncome`, `grossIncome` and
// `ssnLast4`, and all three passed, because the guard matched eight exact
// spellings. It now judges canonical tokens by rule.
// ─────────────────────────────────────────────────────────────────────────────

/** The v0.2.0 spellings, kept as the floor: a key on this list is always a finding. */
export const FORBIDDEN_PII_KEYS = [
  "ssn",
  "socialSecurityNumber",
  "income",
  "annualIncome",
  "monthlyIncome",
  "streetAddress",
  "addressLine1",
  "dateOfBirth",
] as const;

/**
 * The walker's listed vocabulary. Since v0.3.0 this is PII only (R-23); the
 * summed-cost keys it once carried are retired. Kept under its old name so a
 * consumer's import does not break on the upgrade.
 */
export const FORBIDDEN_RESPONSE_KEYS = FORBIDDEN_PII_KEYS;

const INVISIBLE = /[­​-‏⁠﻿]/g;

/**
 * A key or a short label as lowercase SINGULAR words, however it was spelled:
 * `borrowerGrossIncome`, `borrower_gross_income` and `Borrower Gross Income`
 * all become `["borrower","gross","income"]`; `ssnLast4` becomes
 * `["ssn","last","4"]`.
 */
export function canonicalTokens(raw: string): string[] {
  const words = raw
    .normalize("NFKC")
    .replace(INVISIBLE, "")
    .replace(/&/g, " and ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/([A-Za-z])([0-9])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w !== "");
  // Singular, so `wages`/`wage` are one word. Never strips a double-s
  // (`address`, `gross`) or a short token (`ssn`, `dob`).
  return words.map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));
}

const has = (tokens: readonly string[], seq: readonly string[]): boolean => {
  for (let i = 0; i + seq.length <= tokens.length; i++) {
    if (seq.every((w, j) => tokens[i + j] === w)) return true;
  }
  return false;
};

export type PiiCategory = "listed" | "tax-id" | "income" | "birth-date" | "street-address" | "person-name" | "contact";

/** Words that make an address, a name, an email or a phone number a PERSON's. */
const PERSON_ADDRESS = ["property", "mailing", "home", "borrower", "residence", "current", "subject", "applicant"];
const PERSON_NAME = ["first", "last", "middle", "full", "legal", "borrower", "applicant", "maiden", "given", "family"];
/** A business's public contact is not PII: the MLO's phone is on every rate card. */
const BUSINESS_OWNER = new Set(["lender", "company", "mlo", "agent", "officer", "office", "support", "broker", "branch", "business", "team"]);

/**
 * The PII a payload can carry under any spelling. `strict` is the subset
 * judged on string VALUES (a key carried as data, a short label): identity and
 * finances only, never `email`/`phone`/`name`, which are ordinary words in data.
 */
function piiCategory(tokens: readonly string[], strict = false): PiiCategory | null {
  // `income limit` is an AREA threshold (USDA / HomeReady), a public figure.
  if (tokens.some((t, i) => (t === "income" && tokens[i + 1] !== "limit") || t === "salary" || t === "wage")) return "income";
  if (tokens.includes("ssn") || has(tokens, ["social", "security"]) || has(tokens, ["taxpayer", "id"]) || has(tokens, ["tax", "id"])) return "tax-id";
  if (has(tokens, ["date", "of", "birth"]) || has(tokens, ["birth", "date"]) || tokens.includes("dob") || tokens.includes("birthday")) return "birth-date";
  if (tokens.includes("street") || has(tokens, ["address", "line"]) || PERSON_ADDRESS.some((w) => has(tokens, [w, "address"]))) return "street-address";
  if (strict) return null;
  if (PERSON_NAME.some((w) => has(tokens, [w, "name"])) || has(tokens, ["co", "borrower", "name"])) return "person-name";
  const contactAt = tokens.findIndex((t) => t === "email" || t === "phone" || t === "mobile" || t === "cell");
  if (contactAt >= 0 && !tokens.slice(0, contactAt).some((t) => BUSINESS_OWNER.has(t))) return "contact";
  return null;
}

function categoryForKey(key: string): PiiCategory | null {
  if ((FORBIDDEN_PII_KEYS as readonly string[]).includes(key)) return "listed";
  return piiCategory(canonicalTokens(key));
}

/** Keys whose string value NAMES a field rather than saying something. */
const LABEL_KEYS = new Set(["label", "name", "title", "field", "key", "heading", "caption"]);

/**
 * A string that is really a key (`"ssnLast4"`, judged wherever it sits) or a
 * short label held under a label key (`{ label: "Gross income" }`). Copy is
 * neither: "your household size and income" under `whatWeNeed` ASKS for the
 * figure, it does not carry it (measured on the live three-options payload,
 * 2026-09-28).
 */
function categoryForStringValue(s: string, heldBy: string | undefined): PiiCategory | null {
  const t = s.trim();
  if ((FORBIDDEN_PII_KEYS as readonly string[]).includes(t)) return "listed";
  const tokens = canonicalTokens(t);
  if (tokens.length === 0 || tokens.length > 6 || /[.!?]\s*$/.test(t)) return null;
  const identifier = /^[A-Za-z_$][\w$-]*$/.test(t);
  if (!identifier && !(heldBy !== undefined && LABEL_KEYS.has(canonicalTokens(heldBy).join(" ")))) return null;
  return piiCategory(tokens, true);
}

export interface ForbiddenKeyFinding {
  /** Dotted path. A value inside a JSON string is marked `path(json)`; a
   *  forbidden key or label carried AS DATA is marked `path=<value>`. */
  path: string;
  category: PiiCategory;
}

/**
 * ⚖️ PER-SURFACE SCOPE, WITHOUT A REWRITE. A surface whose ruling permits a
 * field passes it here by canonical form (`"borrower name"`), and only that
 * surface is affected. Empty by default; no caller in this package sets it.
 */
export interface ForbiddenKeyOptions {
  exemptCanonical?: readonly string[];
}

/**
 * Every PII key in a payload, with its category — RECURSIVE through objects,
 * arrays and JSON-encoded strings. [] when clean.
 */
export function findForbiddenKeyFindings(value: unknown, options: ForbiddenKeyOptions = {}): ForbiddenKeyFinding[] {
  const exempt = new Set((options.exemptCanonical ?? []).map((e) => canonicalTokens(e).join(" ")));
  const out: ForbiddenKeyFinding[] = [];
  const walk = (v: unknown, trail: string[]): void => {
    if (typeof v === "string") {
      const t = v.trim();
      if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
        try {
          walk(JSON.parse(t), [...trail.slice(0, -1), `${trail[trail.length - 1] ?? ""}(json)`]);
          return;
        } catch {
          // Not JSON — judged as a string below. A parse failure is not a finding.
        }
      }
      const category = categoryForStringValue(v, trail[trail.length - 1]);
      if (category && !exempt.has(canonicalTokens(v).join(" "))) out.push({ path: `${trail.join(".")}=${t}`, category });
      return;
    }
    if (v === null || typeof v !== "object") return;
    if (Array.isArray(v)) {
      v.forEach((item, i) => walk(item, [...trail, String(i)]));
      return;
    }
    for (const [k, child] of Object.entries(v as Record<string, unknown>)) {
      const category = categoryForKey(k);
      if (category && !exempt.has(canonicalTokens(k).join(" "))) out.push({ path: [...trail, k].join("."), category });
      walk(child, [...trail, k]);
    }
  };
  walk(value, []);
  return out;
}

/**
 * Every PII key in a payload, as dotted paths. [] when clean. ONE
 * implementation, so the suites cannot drift into checking different things.
 * (The second parameter was a recursion `trail` before v0.3.0; an array there
 * is still accepted and ignored.)
 */
export function findForbiddenKeys(value: unknown, options: ForbiddenKeyOptions | string[] = {}): string[] {
  return findForbiddenKeyFindings(value, Array.isArray(options) ? {} : options).map((f) => f.path);
}
