// v0.4.0 (R-226) — CREDIT_BANDS mirrors PathfinderPro's `CREDIT_BANDS` (src/lib/rate-sheets/scenario-contract.ts:65–105 @
// ed5e5666) exactly: ids, labels, floors and families. The engine's lines are committed verbatim under test/fixtures/ with
// their sha256, and the expected bands are PARSED from that copy, never retyped here — so a label retyped in src/ that
// differs by one character, a reordered band, or a widened family is a red test, not a review item. Moving the mirror to a
// newer engine SHA means replacing the copy and its sha256 together. Runs against the COMPILED dist/.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as C from "../dist/index.js";

const FIX = fileURLToPath(new URL("./fixtures/", import.meta.url));
const CONTRACT = "pfp-ed5e5666-scenario-contract-L60-105.ts.txt";
const PROGRAM_MAP = "pfp-ed5e5666-rate-type-program-map-L34-36.ts.txt";
const read = (name) => readFileSync(FIX + name, "utf8");

test("the committed engine copy is the one its sha256 names", () => {
  const pinned = Object.fromEntries(
    read("pfp-ed5e5666.sha256").trim().split("\n").map((l) => l.split(/\s+/)).map(([sha, f]) => [f, sha]),
  );
  for (const f of [CONTRACT, PROGRAM_MAP]) {
    assert.equal(createHash("sha256").update(readFileSync(FIX + f)).digest("hex"), pinned[f], f);
  }
});

/** The engine's bands, read from its own lines: every `{ id, label, floor[, families] }` row, families resolved. */
function engineBands() {
  const src = read(CONTRACT);
  const family = Object.fromEntries([...read(PROGRAM_MAP).matchAll(/(RATE_\w+): \{ family: "(\w+)"/g)].map((m) => [m[1], m[2]]));
  const lists = {};
  for (const m of src.matchAll(/const (\w+): readonly string\[\] = \[([\s\S]*?)\];/g)) {
    lists[m[1]] = [...m[2].matchAll(/RATE_TYPE_TO_PROGRAM\.(RATE_\w+)\.family/g)].map((r) => {
      assert.ok(family[r[1]], `no family for ${r[1]} in the committed program map`);
      return family[r[1]];
    });
  }
  const rows = [...src.matchAll(/\{ id: "(\w+)", label: "([^"]+)", floor: (\d+|null)(?:, families: (\w+))? \}/g)];
  assert.equal(rows.length, 12, "the engine copy carries twelve bands");
  return rows.map(([, id, label, floor, fam]) => ({
    id,
    label,
    floor: floor === "null" ? null : Number(floor),
    ...(fam ? { families: lists[fam] ?? assert.fail(`unresolved families list ${fam}`) } : {}),
  }));
}

test("CREDIT_BANDS equals the engine's bands: ids, labels, floors, families, in order", () => {
  assert.deepEqual(C.CREDIT_BANDS.map((b) => ({ ...b, ...(b.families ? { families: [...b.families] } : {}) })), engineBands());
});

test("CREDIT_BAND_IDS is CREDIT_BANDS' ids, in order, and the answers schema accepts exactly those", () => {
  assert.deepEqual([...C.CREDIT_BAND_IDS], C.CREDIT_BANDS.map((b) => b.id));
  const base = { purpose: "buy", zip: "84020", occupancy: "PRIMARY" };
  for (const id of C.CREDIT_BAND_IDS) assert.equal(C.scenarioAnswersSchema.safeParse({ ...base, creditBand: id }).success, true, id);
  for (const bad of ["FICO_540_549", "fico_660_679", "660", ""]) {
    assert.equal(C.scenarioAnswersSchema.safeParse({ ...base, creditBand: bad }).success, false, bad);
  }
});

test("the original six keep their order; the six FHA/VA bands are appended after FICO_BELOW_680", () => {
  assert.deepEqual(C.CREDIT_BAND_IDS.slice(0, 6), ["FICO_760_PLUS", "FICO_740_759", "FICO_720_739", "FICO_700_719", "FICO_680_699", "FICO_BELOW_680"]);
  assert.deepEqual(C.CREDIT_BANDS.filter((b) => b.families).map((b) => b.id), C.CREDIT_BAND_IDS.slice(6));
});
