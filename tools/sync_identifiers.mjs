#!/usr/bin/env node
// Syncs the canonical identifier functions from workers/lib/gah_identifiers.js
// into _worker.js (Cloudflare Pages deploys a single worker file; there is
// currently no bundler step — see the rebuild decisions list).
//
// The lib is the single source of truth. This script injects its contents
// (minus `export` keywords) between the GENERATED IDENTIFIERS markers in
// _worker.js. Run after any lib change:
//     node tools/sync_identifiers.mjs
// tests/test_identifiers_sync.mjs fails if the inlined copy drifts.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const libPath = path.join(repoRoot, "workers", "lib", "gah_identifiers.js");
const workerPath = path.join(repoRoot, "_worker.js");

const BEGIN = "// BEGIN GENERATED IDENTIFIERS (from workers/lib/gah_identifiers.js — do not edit by hand; run node tools/sync_identifiers.mjs)";
const END = "// END GENERATED IDENTIFIERS";

const lib = fs.readFileSync(libPath, "utf8");
// Strip `export ` so the declarations land in the worker's top-level scope.
const inlined = lib.replace(/^export /gm, "");

let worker = fs.readFileSync(workerPath, "utf8");
const start = worker.indexOf(BEGIN);
const end = worker.indexOf(END);
if (start < 0 || end < 0 || end < start) {
  console.error("markers not found in _worker.js");
  process.exit(1);
}
worker =
  worker.slice(0, start) +
  BEGIN +
  "\n" +
  inlined.trim() +
  "\n" +
  worker.slice(end);
fs.writeFileSync(workerPath, worker);
console.log("identifiers synced into _worker.js");
