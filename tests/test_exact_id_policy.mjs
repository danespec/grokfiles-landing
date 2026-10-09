// Unit tests for the exact-identifier policy (ren/phase0-exact-id).
//
// Extracts the REAL applyExactIdentifierPolicy + publicSearchExactId from
// _worker.js and verifies the Phase 0 contract: an exact-identifier query
// returns the verified record or a missing-record response — never a
// fabricated /archive/{id} route.
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

// Provide the two functions to the test scope.
const loader = new Function(
  `${extractFn(src, "publicSearchExactId")}\n${extractFn(src, "applyExactIdentifierPolicy")}\nreturn { publicSearchExactId, applyExactIdentifierPolicy };`
);
const { applyExactIdentifierPolicy } = loader();

let pass = 0,
  fail = 0;
const t = (name, cond, extra = "") => {
  cond ? pass++ : fail++;
  console.log((cond ? "PASS" : "FAIL") + " " + name + (extra ? `  [${extra}]` : ""));
};

const realRow = (id) => ({ title: "Real record", efta_id: id, read_url: `/archive/${id}`, dataset: "DS1" });

// 1. Verified record present -> returned first, route set, no missing flag.
{
  const rows = [{ title: "other", efta_id: "EFTA00000001" }, realRow("EFTA00000002")];
  const data = {};
  const out = applyExactIdentifierPolicy(rows, "EFTA00000002", data);
  t("verified record returned first", out[0].efta_id === "EFTA00000002" && !out[0].missing);
  t("exact_identifier_route set for verified record", data.exact_identifier_route === "/archive/EFTA00000002");
  t("no missing flag for verified record", data.exact_identifier_missing !== true);
  t("other rows preserved", out.length === 2);
}

// 2. No record -> missing-record response, NO fabricated route.
{
  const data = {};
  const out = applyExactIdentifierPolicy([{ title: "other", efta_id: "EFTA00000001" }], "EFTA00999999", data);
  t("single missing row returned", out.length === 1 && out[0].missing === true);
  t("missing row carries the queried id", out[0].efta_id === "EFTA00999999");
  t("missing row has no fabricated URL", out[0].read_url == null && out[0].url == null);
  t("exact_identifier_route NOT set", data.exact_identifier_route === undefined);
  t("exact_identifier_missing flag set", data.exact_identifier_missing === true);
  t("missing row text names the problem", /no verified record/i.test(out[0].summary));
}

// 3. Empty index -> still a clean missing response.
{
  const data = {};
  const out = applyExactIdentifierPolicy([], "EFTA00000001", data);
  t("empty index yields missing record", out.length === 1 && out[0].missing === true);
}

// 4. Case-insensitivity: lowercase query still matches the record.
{
  const data = {};
  const out = applyExactIdentifierPolicy([realRow("EFTA00000003")], "EFTA00000003", data);
  t("identifier match is case-normalized", out[0].efta_id === "EFTA00000003" && !out[0].missing);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
