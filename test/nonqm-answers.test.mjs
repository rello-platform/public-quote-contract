// v0.5.0 (R-274, Rates KA 127) — the five U6 answers the engine reads since PathfinderPro #650
// (`scenario-product-inputs.ts` PRODUCT_ANSWER_SPECS): additive and optional, absent ≠ 0.
// Runs against the COMPILED dist/ — the thing a consumer installs from the tag.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as C from "../dist/index.js";

const base = { purpose: "buy", price: 500000, down: 125000, zip: "84020", occupancy: "INVESTMENT", creditBand: "FICO_740_759" };
const ok = (a) => C.scenarioAnswersSchema.safeParse({ ...base, ...a });
const NEW = ["docType", "monthsSelfEmployed", "avgMonthlyDeposits", "grossMonthlyRent", "monthlyHoaDues"];

test("the five keys are on the allowlist, and every v0.4.0 key is still there in its order", () => {
  const v040 = ["purpose", "price", "down", "propertyValue", "loanBalance", "cashOut", "zip", "occupancy", "propertyType", "units", "creditBand", "military"];
  assert.deepEqual(C.SCENARIO_ANSWER_KEYS.slice(0, v040.length), v040);
  assert.deepEqual(C.SCENARIO_ANSWER_KEYS.slice(v040.length), NEW);
});

test("docType is exactly the engine's five canonical spellings", () => {
  assert.deepEqual([...C.SCENARIO_DOC_TYPES], ["FULL_DOC", "BANK_STATEMENT", "P_AND_L", "ASSET_DEPLETION", "DSCR"]);
  for (const d of C.SCENARIO_DOC_TYPES) assert.equal(ok({ docType: d }).success, true, d);
});

test("an unknown, lower-case or empty docType is refused — the contract carries canonical spellings only", () => {
  for (const bad of ["W2", "bank_statement", "BANK STATEMENT", "", "FULL_DOC "]) assert.equal(ok({ docType: bad }).success, false, JSON.stringify(bad));
});

test("the four numbers parse, and a request that answers all five keeps them verbatim", () => {
  const a = { docType: "BANK_STATEMENT", monthsSelfEmployed: 36, avgMonthlyDeposits: 14500.5, grossMonthlyRent: 3200, monthlyHoaDues: 185.5 };
  const r = ok(a);
  assert.equal(r.success, true);
  assert.deepEqual(Object.fromEntries(NEW.map((k) => [k, r.data[k]])), a);
});

test("0 is an answer (no HOA, no deposits), and null is absent", () => {
  const r = ok({ monthlyHoaDues: 0, avgMonthlyDeposits: 0, monthsSelfEmployed: 0, grossMonthlyRent: 0 });
  assert.equal(r.success, true);
  assert.equal(r.data.monthlyHoaDues, 0);
  for (const k of NEW) assert.equal(ok({ [k]: null }).success, true, `${k}: null`);
});

test("negative, NaN, Infinity and a numeric string are refused on every number", () => {
  for (const k of NEW.slice(1)) for (const bad of [-1, -0.01, Number.NaN, Number.POSITIVE_INFINITY, "3200"]) {
    assert.equal(ok({ [k]: bad }).success, false, `${k}: ${String(bad)}`);
  }
});

test("ABSENT stays absent — a request that sends none of them parses to exactly v0.4.0's output", () => {
  const r = ok({});
  assert.equal(r.success, true);
  assert.deepEqual(r.data, base);
  for (const k of NEW) assert.equal(k in r.data, false, k);
});

test("none of the five is PII to the walker — as keys, and as a key carried as data", () => {
  const a = { docType: "DSCR", monthsSelfEmployed: 24, avgMonthlyDeposits: 9000, grossMonthlyRent: 3200, monthlyHoaDues: 0 };
  assert.deepEqual(C.findForbiddenKeyFindings(a), []);
  assert.deepEqual(C.findForbiddenKeyFindings({ fields: NEW.map((key) => ({ key, value: 1 })) }), []);
});
