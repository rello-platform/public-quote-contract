// The PII walker's corpus: the Stage A audit's PII plants (260928-AUDIT-STAGE-A.md §4),
// the widened vocabulary (R-23), and the summed-cost keys R-20 CLEARED — which must
// now pass. Runs against the COMPILED dist/ — the thing a consumer installs from the tag.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as C from "../dist/index.js";
const { findForbiddenKeys } = C;
const findForbiddenKeyFindings = (...a) => (C.findForbiddenKeyFindings ? C.findForbiddenKeyFindings(...a) : assert.fail("findForbiddenKeyFindings not exported"));
const hit = (payload, path) => assert.ok(findForbiddenKeys(payload).includes(path), `expected ${path} in ${JSON.stringify(findForbiddenKeys(payload))}`);

test("CONTROL — a listed PII key nested 4 deep inside an array", () => {
  hit({ a: [{ b: { c: { ssn: "123-45-6789" } } }] }, "a.0.b.c.ssn");
});

const PLANTS = [
  // the audit's three — all passed v0.2.0
  ["audit · borrowerIncome", { borrowerIncome: 120000 }, "borrowerIncome"],
  ["audit · grossIncome", { grossIncome: 120000 }, "grossIncome"],
  ["audit · ssnLast4", { ssnLast4: "6789" }, "ssnLast4"],
  ["digits fused to the word — ssn4", { ssn4: "6789" }, "ssn4"],
  // widened (R-23)
  ["income · snake case", { annual_household_income: 1 }, "annual_household_income"],
  ["income · salary", { borrowerSalary: 1 }, "borrowerSalary"],
  ["income · wages", { monthlyWages: 1 }, "monthlyWages"],
  ["tax id", { taxpayerId: "x" }, "taxpayerId"],
  ["birth date", { birthDate: "1980-01-01" }, "birthDate"],
  ["dob", { DOB: "1980-01-01" }, "DOB"],
  ["property address", { propertyAddress: "1 Main St" }, "propertyAddress"],
  ["mailing address", { mailing_address: "x" }, "mailing_address"],
  ["first name", { firstName: "Ann" }, "firstName"],
  ["co-borrower name", { coBorrowerName: "Bo" }, "coBorrowerName"],
  ["borrower email", { borrowerEmail: "a@b.c" }, "borrowerEmail"],
  ["bare phone", { phone: "555" }, "phone"],
  // carried where a key-list never looks
  ["PII inside a JSON string", { meta: JSON.stringify({ applicant: { ssn: "x" } }) }, "meta(json).applicant.ssn"],
  ["a PII key carried as data", { fields: [{ key: "ssnLast4", value: "6789" }] }, "fields.0.key=ssnLast4"],
  ["a PII label rendered from data", { rows: [{ label: "Gross income", amount: 120000 }] }, "rows.0.label=Gross income"],
];
for (const [name, payload, path] of PLANTS) test(`PLANT — ${name}`, () => hit(payload, path));

test("✅ R-20 — the summed-cost keys are CLEARED, not merely tolerated", () => {
  const sums = {
    totalClosingCosts: 3547, cashToClose: 68499, estimatedCashToClose: 1, closingCostsTotal: 1, grandTotal: 1,
    outOfPocket: 1, totalFees: 1, totalCost: 1, closingCosts: { total: 3774, sheet: { total: 3774 } },
    rows: [{ label: "Total Est. Closing Costs", amount: 3547 }], meta: JSON.stringify({ totalClosingCosts: 1 }),
  };
  assert.deepEqual(findForbiddenKeyFindings(sums), []);
});

test("⛔ CLEAN — a real quote's names, a business's contact, and area thresholds pass", () => {
  const clean = {
    rateType: "RATE_30YR_FIXED", lenderName: "CMG Financial", productName: "30-Year Fixed", countyName: "Salt Lake",
    assumptions: { loanAmount: 400000, incomeLimit: 112000, zip: "84092" },
    mlo: { loanOfficerPhone: "801-555-0100", companyEmail: "hello@example.com", agentName: "Kelly" },
    delivery: { audience: "email" },
    notes: "We never ask for your income or your Social Security number here.",
    // live, three-options 2026-09-28: request copy, not a carried figure
    fit: { openGate: { whatWeNeed: "your household size and income" } },
  };
  assert.deepEqual(findForbiddenKeyFindings(clean), []);
});

test("every finding names its category", () => {
  const f = findForbiddenKeyFindings({ grossIncome: 1, ssnLast4: "1", firstName: "a" });
  assert.deepEqual(f.map((x) => x.category).sort(), ["income", "person-name", "tax-id"]);
});

test("⚖️ per-surface scope works — and is inert unless a caller passes it", () => {
  assert.deepEqual(findForbiddenKeys({ firstName: "a" }, { exemptCanonical: ["first name"] }), []);
  assert.deepEqual(findForbiddenKeys({ firstName: "a" }), ["firstName"]);
});

test("the retired summed-cost exports are GONE, not left for someone to import", () => {
  assert.equal(C.FORBIDDEN_SUMMED_COST_KEYS, undefined);
  assert.equal(C.FORBIDDEN_KEY_PATTERN, undefined);
  assert.deepEqual([...C.FORBIDDEN_RESPONSE_KEYS], [...C.FORBIDDEN_PII_KEYS]);
});

test("a v0.2.0-style trail argument is accepted and ignored", () => {
  assert.deepEqual(findForbiddenKeys({ ssn: "1" }, []), ["ssn"]);
});
