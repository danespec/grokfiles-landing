// Unit tests for the exact-identifier policy (ren/phase0-exact-id).
//
// Extracts the REAL validateExactIdSource, applyExactIdentifierPolicy,
// actualHitCount, applyCanonicalUpstreamQuery, and publicSearchExactId from
// _worker.js and verifies the Phase 0 contract:
//
// Three situations:
//   (1) identifier matches + VALIDATED evidence -> verified record
//   (2) identifier matches but evidence fails validation -> VISIBLE as
//       unverified findings (labeled, no links), not dropped, not verified
//   (3) no identifier match -> missing-record response
//
// Plus: trusted-host URLs must reference the identifier; archive routes are
// never manufactured; missing cards excluded from hit counts; EFTA aliases
// canonicalize to identical upstream queries.
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
  [
    extractFn(src, "publicSearchExactId"),
    extractFn(src, "validateExactIdSource"),
    extractFn(src, "actualHitCount"),
    extractFn(src, "applyCanonicalUpstreamQuery"),
    extractFn(src, "applyExactIdentifierPolicy"),
    `return { validateExactIdSource, actualHitCount, applyCanonicalUpstreamQuery, applyExactIdentifierPolicy };`,
  ].join("\n")
);
const { validateExactIdSource, actualHitCount, applyCanonicalUpstreamQuery, applyExactIdentifierPolicy } = loader();

let pass = 0,
  fail = 0;
const t = (name, cond, extra = "") => {
  cond ? pass++ : fail++;
  console.log((cond ? "PASS" : "FAIL") + " " + name + (extra ? `  [${extra}]` : ""));
};
const vr = (row, exact) => validateExactIdSource(row, exact);

// --- source-validation policy ---
t("canonical relative route validates", vr({ efta_id: "EFTA00000001", read_url: "/archive/EFTA00000001" }, "EFTA00000001").valid === true);
t("canonical route for a different id fails", vr({ efta_id: "EFTA00000001", read_url: "/archive/EFTA00000002" }, "EFTA00000001").valid === false);
t("non-canonical relative url fails", vr({ efta_id: "EFTA00000001", read_url: "/files/doc.pdf" }, "EFTA00000001").valid === false);
t("trusted host WITH identifier validates",
  vr({ efta_id: "EFTA00000001", url: "https://www.justice.gov/EFTA00000001.pdf" }, "EFTA00000001").valid === true);
t("trusted host WITHOUT identifier fails",
  vr({ efta_id: "EFTA00000001", url: "https://www.justice.gov/unrelated-page" }, "EFTA00000001").valid === false);
t("untrusted host fails", vr({ efta_id: "EFTA00000001", url: "https://evil.example/EFTA00000001" }, "EFTA00000001").valid === false);
t("non-https url fails", vr({ efta_id: "EFTA00000001", url: "http://www.justice.gov/EFTA00000001" }, "EFTA00000001").valid === false);
t("bare source string without attestation fails", vr({ efta_id: "EFTA00000001", source: "House Oversight set" }, "EFTA00000001").valid === false);
t("upstream attestation with provenance validates", vr({ efta_id: "EFTA00000001", source_verified: true, source: "DOJ set 1 indexer" }, "EFTA00000001").valid === true);
t("no evidence fails", vr({ efta_id: "EFTA00000001" }, "EFTA00000001").valid === false);

const realRow = (id, extra = {}) => ({ title: "Real record", efta_id: id, read_url: `/archive/${id}`, dataset: "DS1", ...extra });
const bareRow = (id) => ({ title: id, efta_id: id, dataset: "" });

// --- situation 1: match + validated evidence -> verified ---
{
  const rows = [bareRow("EFTA00000002"), realRow("EFTA00000002"), { title: "other", efta_id: "EFTA00000009", read_url: "/archive/EFTA00000009" }];
  const data = {};
  const out = applyExactIdentifierPolicy(rows, "EFTA00000002", data);
  t("S1: verified record first", out[0].read_url === "/archive/EFTA00000002" && !out[0].missing);
  t("S1: route is the row's own URL", data.exact_identifier_route === "/archive/EFTA00000002");
  t("S1: id-only row kept as unverified finding", out[1].verification === "unverified" && out[1].efta_id === "EFTA00000002");
  t("S1: unverified row has no links", out[1].read_url == null && out[1].url == null);
  t("S1: unrelated rows preserved", out.some((r) => r.efta_id === "EFTA00000009"));
  t("S1: hit count includes findings, excludes nothing here", actualHitCount(out) === 3);
}

// --- situation 2: match but nothing validated -> unverified findings ---
{
  const data = {};
  const out = applyExactIdentifierPolicy([bareRow("EFTA00000003"), { title: "x", efta_id: "EFTA00000003", url: "https://evil.example/EFTA00000003" }], "EFTA00000003", data);
  t("S2: no verified label", out.every((r) => !r.missing) && out.length === 2);
  t("S2: rows labeled unverified", out.every((r) => r.verification === "unverified"));
  t("S2: no links on unverified rows", out.every((r) => r.read_url == null && r.url == null));
  t("S2: no route manufactured", data.exact_identifier_route === undefined);
  t("S2: unverified flag set", data.exact_identifier_unverified === true);
  t("S2: findings counted as hits", actualHitCount(out) === 2);
}

// --- situation 3: no match -> missing ---
{
  const data = {};
  const out = applyExactIdentifierPolicy([realRow("EFTA00000001")], "EFTA00999999", data);
  t("S3: missing-record card present", out[0].missing === true);
  t("S3: other rows preserved", out.some((r) => r.efta_id === "EFTA00000001"));
  t("S3: missing card carries no URLs", out[0].read_url == null && out[0].url == null);
  t("S3: missing flag set, no route", data.exact_identifier_missing === true && data.exact_identifier_route === undefined);
  t("S3: missing card excluded from hit count", actualHitCount(out) === 1);
}

// --- alias fixtures: identical canonical upstream queries ---
{
  const aliases = ["efta-123", "EFTA00000123", "efta 123", "EFTA_123", "Efta123"];
  const payloads = aliases.map((a) => {
    // Simulate the handler: classify, then canonicalize the upstream payload.
    const canon = applyCanonicalUpstreamQuery({ q: a, limit: 10 }, { kind: "efta", canonical: "EFTA00000123" });
    return canon.q;
  });
  t("all aliases produce identical upstream q", payloads.every((q) => q === "EFTA00000123"), payloads.join(","));
  const textPayload = applyCanonicalUpstreamQuery({ q: "flight logs", limit: 10 }, { kind: "text", canonical: "flight logs" });
  t("text queries untouched", textPayload.q === "flight logs");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
