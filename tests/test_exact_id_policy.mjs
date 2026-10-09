// Unit tests for the exact-identifier policy (ren/phase0-exact-id).
//
// Extracts the REAL validateExactIdSource, applyExactIdentifierPolicy,
// actualHitCount, and publicSearchExactId from _worker.js and verifies the
// Phase 0 contract across all three situations:
//
//   (1) identifier matches + VALIDATED evidence -> verified record
//   (2) identifier matches but evidence fails validation -> missing-record
//       (identifier match alone, or a bare non-empty URL/source string,
//       is NOT verification)
//   (3) no identifier match -> missing-record response
//
// Plus: missing-record responses never carry bundle/visual-evidence URLs,
// archive routes are never manufactured, and explanatory missing-record
// cards are excluded from hit counts.
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
  `${extractFn(src, "publicSearchExactId")}\n${extractFn(src, "validateExactIdSource")}\n${extractFn(src, "actualHitCount")}\n${extractFn(src, "applyExactIdentifierPolicy")}\nreturn { validateExactIdSource, actualHitCount, applyExactIdentifierPolicy };`
);
const { validateExactIdSource, actualHitCount, applyExactIdentifierPolicy } = loader();

let pass = 0,
  fail = 0;
const t = (name, cond, extra = "") => {
  cond ? pass++ : fail++;
  console.log((cond ? "PASS" : "FAIL") + " " + name + (extra ? `  [${extra}]` : ""));
};
const vr = (row, exact) => validateExactIdSource(row, exact);

// --- source-validation policy ---
t("canonical relative route validates", vr({ efta_id: "EFTA00000001", read_url: "/archive/EFTA00000001" }, "EFTA00000001").valid === true);
t("canonical route for a DIFFERENT id fails", vr({ efta_id: "EFTA00000001", read_url: "/archive/EFTA00000002" }, "EFTA00000001").valid === false);
t("non-canonical relative url fails", vr({ efta_id: "EFTA00000001", read_url: "/files/doc.pdf" }, "EFTA00000001").valid === false);
t("trusted https host validates", vr({ efta_id: "EFTA00000001", url: "https://www.justice.gov/x.pdf" }, "EFTA00000001").valid === true);
t("untrusted host fails", vr({ efta_id: "EFTA00000001", url: "https://evil.example/x" }, "EFTA00000001").valid === false);
t("non-https url fails", vr({ efta_id: "EFTA00000001", url: "http://www.justice.gov/x" }, "EFTA00000001").valid === false);
t("malformed url fails", vr({ efta_id: "EFTA00000001", url: "::::" }, "EFTA00000001").valid === false);
t("bare source string without attestation fails", vr({ efta_id: "EFTA00000001", source: "House Oversight set" }, "EFTA00000001").valid === false);
t("upstream attestation with provenance validates", vr({ efta_id: "EFTA00000001", source_verified: true, source: "DOJ set 1 indexer" }, "EFTA00000001").valid === true);
t("attestation without provenance fails", vr({ efta_id: "EFTA00000001", source_verified: true, source: "" }, "EFTA00000001").valid === false);
t("no evidence fails", vr({ efta_id: "EFTA00000001" }, "EFTA00000001").valid === false);

const realRow = (id, extra = {}) => ({ title: "Real record", efta_id: id, read_url: `/archive/${id}`, dataset: "DS1", ...extra });
const bareRow = (id) => ({ title: id, efta_id: id, dataset: "" });
const untrustedRow = (id) => ({ title: id, efta_id: id, url: "https://untrusted.example/doc" });

// --- situation 1: match + validated evidence -> verified ---
{
  const rows = [bareRow("EFTA00000002"), untrustedRow("EFTA00000002"), realRow("EFTA00000002")];
  const data = {};
  const out = applyExactIdentifierPolicy(rows, "EFTA00000002", data);
  t("S1: validated record returned first", out[0].read_url === "/archive/EFTA00000002" && !out[0].missing);
  t("S1: route is the row's own URL (not manufactured)", data.exact_identifier_route === "/archive/EFTA00000002");
  t("S1: no missing flag", data.exact_identifier_missing !== true);
  t("S1: unverified same-id rows dropped", out.length === 1);
  t("S1: hit count counts the verified record", actualHitCount(out) === 1);
}

// --- situation 2a: match but NO evidence -> missing ---
{
  const data = {};
  const out = applyExactIdentifierPolicy([bareRow("EFTA00000003")], "EFTA00000003", data);
  t("S2a: id-only row is NOT verified", out.length === 1 && out[0].missing === true);
  t("S2a: no route set", data.exact_identifier_route === undefined);
  t("S2a: missing flag set", data.exact_identifier_missing === true);
  t("S2a: hit count is zero", actualHitCount(out) === 0);
}

// --- situation 2b: match + untrusted URL -> missing (bare URL is not enough) ---
{
  const data = {};
  const out = applyExactIdentifierPolicy([untrustedRow("EFTA00000004")], "EFTA00000004", data);
  t("S2b: untrusted-URL row is NOT verified", out.length === 1 && out[0].missing === true);
  t("S2b: no route manufactured", data.exact_identifier_route === undefined);
}

// --- situation 3: no match -> missing ---
{
  const data = {};
  const out = applyExactIdentifierPolicy([realRow("EFTA00000001")], "EFTA00999999", data);
  t("S3: missing-record response", out.length === 1 && out[0].missing === true);
  t("S3: missing row carries no URLs", out[0].read_url == null && out[0].url == null && out[0].document_bundle_url == null && out[0].visual_evidence_url == null);
  t("S3: missing flag set, no route", data.exact_identifier_missing === true && data.exact_identifier_route === undefined);
  t("S3: hit count is zero", actualHitCount(out) === 0);
}

// --- empty index ---
{
  const data = {};
  const out = applyExactIdentifierPolicy([], "EFTA00000001", data);
  t("empty index yields missing record", out.length === 1 && out[0].missing === true && actualHitCount(out) === 0);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
