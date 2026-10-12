// Tests for workers/lib/gah_identifiers.js.
//
// Mirrors docs/phase0/search-contract-tests/test_id_normalization.py
// (the same 37 checks) against the JS implementation. Run:
//   node workers/lib/test_identifiers.mjs   (from the repo root)
import {
  normalizeEfta,
  normalizeBarak,
  normalizeBarakParent,
  classifyQuery,
  missingRecordResponse,
} from "./gah_identifiers.js";

const failures = [];
let checksRun = 0;
const check = (name, got, want) => {
  checksRun++;
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    failures.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }
};

// --- EFTA normalization (§2.1) ---
check("efta canonical", normalizeEfta("EFTA00033413"), "EFTA00033413");
check("efta lowercase", normalizeEfta("efta00033413"), "EFTA00033413");
check("efta hyphen", normalizeEfta("EFTA-00033413"), "EFTA00033413");
check("efta space", normalizeEfta("EFTA 00033413"), "EFTA00033413");
check("efta underscore", normalizeEfta("EFTA_00033413"), "EFTA00033413");
check("efta short digits pad", normalizeEfta("EFTA33413"), "EFTA00033413");
check("efta very short", normalizeEfta("efta1"), "EFTA00000001");
check("efta mixed seps", normalizeEfta(" efta - 0003 3413 "), "EFTA00033413");
check("efta 9 digits rejected", normalizeEfta("EFTA000334134"), null);
check("efta letters rejected", normalizeEfta("EFTA0003341A"), null);
check("efta no prefix rejected", normalizeEfta("00033413"), null);
check("efta empty", normalizeEfta(""), null);
check("efta none", normalizeEfta(null), null);

// --- BARAK recovered-parent namespace (V2 viewer, distinct from receipt IDs) ---
check("parent canonical", normalizeBarakParent("BARAK-EML-001"), "BARAK-EML-001");
check("parent lowercase short", normalizeBarakParent("barak-eml-1"), "BARAK-EML-001");
check("parent spaces", normalizeBarakParent("barak eml 19"), "BARAK-EML-019");
check("parent zero rejected", normalizeBarakParent("BARAK-EML-000"), null);
check("parent excessive digits rejected", normalizeBarakParent("BARAK-EML-1000"), null);
check("parent classified in Barak namespace", classifyQuery("BARAK-EML-001"), { kind: "barak", canonical: "BARAK-EML-001" });
check("parent short classified in Barak namespace", classifyQuery("barak-eml-1"), { kind: "barak", canonical: "BARAK-EML-001" });
const parentHint = missingRecordResponse("barak", "BARAK-EML-001", "efta");
check("parent redirect to index not fabricated PDF", parentHint.suggested_route, "/barak/emails");
check("parent does not become EFTA collection", parentHint.collection, "efta");
check("parent evidence availability unverified", parentHint.message.includes("does not verify"), true);

// --- BARAK normalization (§2.2) ---
check("barak canonical", normalizeBarak("BARAK-174-001"), "BARAK-174-001");
check("barak lowercase", normalizeBarak("barak-174-001"), "BARAK-174-001");
check("barak no seps", normalizeBarak("BARAK174001"), "BARAK-174-001");
check("barak spaces", normalizeBarak("BARAK 174 001"), "BARAK-174-001");
check("barak short groups pad", normalizeBarak("BARAK-174-1"), "BARAK-174-001");
check("barak 4-digit group rejected", normalizeBarak("BARAK-1744-001"), null);
check("barak missing group rejected", normalizeBarak("BARAK-174"), null);
check("barak letters rejected", normalizeBarak("BARAK-ABC-001"), null);
check("barak empty", normalizeBarak(""), null);

// --- classifyQuery ---
check("classify efta hyphenated", classifyQuery("EFTA-00033413"), { kind: "efta", canonical: "EFTA00033413" });
check("classify barak", classifyQuery("barak174001"), { kind: "barak", canonical: "BARAK-174-001" });
check("classify text", classifyQuery("flight logs").kind, "text");
check("barak not efta", classifyQuery("BARAK-174-001").kind, "barak");

// --- missing-record responses (§7): never silence, always a collection hint ---
let r = missingRecordResponse("barak", "BARAK-174-001", "efta");
check("barak-in-efta hint", r.collection_hint, "barak");
check("barak-in-efta type", r.result_type, "missing_record");
check("barak-in-efta message", r.message.includes("not an EFTA record"), true);

r = missingRecordResponse("efta", "EFTA00033413", "barak");
check("efta-in-barak hint", r.collection_hint, "efta");
check("efta-in-barak message", r.message.includes("not a Barak archive record"), true);

r = missingRecordResponse("efta", "EFTA00999999", "efta");
check("efta missing message", r.message.includes("No EFTA record") && r.message.includes("EFTA00999999"), true);
check("efta missing no fabricated route", r.suggested_route, null);

r = missingRecordResponse("barak", "BARAK-174-999", "barak");
check("barak missing message", r.message.includes("No Barak archive record"), true);

r = missingRecordResponse("text", "zzz", "efta");
check(
  "malformed guidance has examples",
  r.message.includes("EFTA00033413") && r.message.includes("BARAK-174-001"),
  true
);

if (failures.length) {
  console.log(`FAIL (${failures.length}):`);
  for (const f of failures) console.log("  " + f);
  process.exit(1);
}
console.log(`test_identifiers: all ${checksRun} checks passed`);
