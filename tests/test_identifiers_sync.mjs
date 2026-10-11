// Verifies the identifier codegen sync (tools/sync_identifiers.mjs).
//
// 1. The GENERATED IDENTIFIERS section in _worker.js must be byte-identical
//    to workers/lib/gah_identifiers.js (minus `export ` keywords). Anyone
//    editing one without running the sync breaks this test.
// 2. handlePublicSearch must actually call the wired functions
//    (classifyQuery, missingRecordResponse) — the library is not ornamental.
//
// Run: node tests/test_identifiers_sync.mjs   (from the repo root)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = fs.readFileSync(path.join(repoRoot, "workers", "lib", "gah_identifiers.js"), "utf8");
const worker = fs.readFileSync(path.join(repoRoot, "_worker.js"), "utf8");

let pass = 0,
  fail = 0;
const t = (name, cond, extra = "") => {
  cond ? pass++ : fail++;
  console.log((cond ? "PASS" : "FAIL") + " " + name + (extra ? `  [${extra}]` : ""));
};

const BEGIN = "// BEGIN GENERATED IDENTIFIERS";
const END = "// END GENERATED IDENTIFIERS";
const start = worker.indexOf(BEGIN);
const end = worker.indexOf(END);
t("generated markers present", start >= 0 && end > start);
if (start >= 0 && end > start) {
  const section = worker.slice(worker.indexOf("\n", start) + 1, end).trim();
  const expected = lib.replace(/^export /gm, "").trim();
  t("inlined copy matches the lib source", section === expected);
}

const handlerStart = worker.indexOf("async function handlePublicSearch(");
const handlerEnd = worker.indexOf("async function handlePublicSearch(") >= 0
  ? worker.indexOf("\nasync function ", handlerStart + 10)
  : -1;
const handler = handlerStart >= 0 && handlerEnd > handlerStart ? worker.slice(handlerStart, handlerEnd) : "";
t("handlePublicSearch calls classifyQuery", handler.includes("classifyQuery(query)"));
t("handlePublicSearch handles the barak namespace", handler.includes('queryClassification.kind === "barak"'));
t("handlePublicSearch derives exact from canonical", handler.includes('queryClassification.kind === "efta" ? queryClassification.canonical'));
t("handlePublicSearch uses missingRecordResponse", handler.includes("missingRecordResponse("));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
