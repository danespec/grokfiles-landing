// Unit tests for the exact-identifier policy (ren/phase0-exact-id).
//
// Extracts the REAL exactIdRowHasSourceEvidence, applyExactIdentifierPolicy,
// actualHitCount, and publicSearchExactId from _worker.js and verifies the
// Phase 0 contract across all three situations:
//
//   (1) identifier matches + source evidence  -> verified record
//   (2) identifier matches but NO evidence    -> missing-record response
//       (identifier match alone is NOT verification)
//   (3) no identifier match                   -> missing-record response
//
// Plus: missing-record responses never carry bundle/visual-evidence URLs,
// and explanatory missing-record cards are excluded from hit counts.
//
// Run: node tests/test_exact_id_policy.mjs   (from the repo root)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(repoRoot, "_worker.js"), "utf8");

function extractFn(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`${name} not found in _worker.js`);
  let i = source.indexOf("{", start);
  let depth = 0;
  for (let j = i; j < source.length; j++) {
    if (source[j] === "{") depth++;
    else if (source[j] === "}") {
      depth--;
      if (depth === 0) return source.slice(start, j + 1);
    }
  }
  throw new Error(`unbalanced braces in ${name}`);
}

const loader = new Function(
  `${extractFn(src, "publicSearchExactId")}\n${extractFn(src, "exactIdRowHasSourceEvidence")}\n${extractFn(src, "actualHitCount")}\n${extractFn(src, "applyExactIdentifierPolicy")}\nreturn { exactIdRowHasSourceEvidence, actualHitCount, applyExactIdentifierPolicy };`
);
const { exactIdRowHasSourceEvidence, actualHitCount, applyExactIdentifierPolicy } = loader();

let pass = 0,
  fail = 0;
const t = (name, cond, extra = "") => {
  cond ? pass++ : fail++;
  console.log((cond ? "PASS" : "FAIL") + " " + name + (extra ? `  [${extra}]` : ""));
};

const realRow = (id, extra = {}) => ({
  title: "Real record",
  efta_id: id,
  read_url: `/archive/${id}`,
  dataset: "DS1",
  ...extra,
});
const bareRow = (id) => ({ title: id, efta_id: id, dataset: "" }); // id matches, no evidence

// --- evidence helper ---
t("row with read_url has evidence", exactIdRowHasSourceEvidence(realRow("EFTA00000001")) === true);
t("row with source text has evidence", exactIdRowHasSourceEvidence({ efta_id: "EFTA00000001", source: "DOJ set 1" }) === true);
t("bare id-only row has no evidence", exactIdRowHasSourceEvidence(bareRow("EFTA00000001")) === false);
t("empty row has no evidence", exactIdRowHasSourceEvidence({}) === false);

// --- situation 1: match + evidence -> verified ---
{
  const rows = [bareRow("EFTA00000002"), realRow("EFTA00000002"), { title: "other", efta_id: "EFTA00000001" }];
  const data = {};
  const out = applyExactIdentifierPolicy(rows, "EFTA00000002", data);
  t("S1: verified record returned first", out[0].read_url === "/archive/EFTA00000002" && !out[0].missing);
  t("S1: route points at the verified record", data.exact_identifier_route === "/archive/EFTA00000002");
  t("S1: no missing flag", data.exact_identifier_missing !== true);
  t("S1: unverified same-id rows dropped", out.every((r) => r.efta_id !== "EFTA00000002" || !r.missing) && out.length === 2);
  t("S1: hit count counts the verified record", actualHitCount(out) === 2);
}

// --- situation 2: match but NO evidence -> missing (not verified) ---
{
  const data = {};
  const out = applyExactIdentifierPolicy([bareRow("EFTA00000003")], "EFTA00000003", data);
  t("S2: id-only row is NOT labeled verified", out.length === 1 && out[0].missing === true);
  t("S2: no route fabricated", data.exact_identifier_route === undefined);
  t("S2: missing flag set", data.exact_identifier_missing === true);
  t("S2: missing row carries no URLs", out[0].read_url == null && out[0].url == null && out[0].document_bundle_url == null && out[0].visual_evidence_url == null);
  t("S2: explanatory card excluded from hit count", actualHitCount(out) === 0);
}

// --- situation 3: no match -> missing ---
{
  const data = {};
  const out = applyExactIdentifierPolicy([{ title: "other", efta_id: "EFTA00000001", read_url: "/archive/EFTA00000001" }], "EFTA00999999", data);
  t("S3: missing-record response", out.length === 1 && out[0].missing === true);
  t("S3: missing row carries the queried id", out[0].efta_id === "EFTA00999999");
  t("S3: no fabricated URLs", out[0].read_url == null && out[0].url == null);
  t("S3: missing flag set, no route", data.exact_identifier_missing === true && data.exact_identifier_route === undefined);
  t("S3: hit count is zero", actualHitCount(out) === 0);
}

// --- empty index ---
{
  const data = {};
  const out = applyExactIdentifierPolicy([], "EFTA00000001", data);
  t("empty index yields missing record", out.length === 1 && out[0].missing === true && actualHitCount(out) === 0);
}

// --- source-documented row (no URL) still counts as verified ---
{
  const data = {};
  const row = { title: "Record", efta_id: "EFTA00000004", source: "House Oversight set, part 3" };
  const out = applyExactIdentifierPolicy([row], "EFTA00000004", data);
  t("documented source counts as evidence", out[0] === row && !out[0].missing);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
