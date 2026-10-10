// Unit tests for STAGING-HARDEN-001.
//
// Verifies:
//   1. isStagingEnv detects GAH_STAGING=true.
//   2. applyStagingPrivacyHeaders adds X-Robots-Tag: noindex, nofollow,
//      noarchive on staging; leaves production responses untouched.
//   3. googleTagEnabled returns false on staging (GA4/ads disabled).
//   4. The X-publisher production fallback is blocked on staging.
//
// Run: node tests/test_staging_harden.mjs   (from the repo root)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(repoRoot, "_worker.js"), "utf8");

function extractFn(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`${name} not found in _worker.js`);
  // Skip the parameter list (may contain {} defaults) to find the body brace.
  const parenEnd = source.indexOf(")", start);
  let i = source.indexOf("{", parenEnd);
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
    // Stubs for googleTagEnabled's dependencies.
    `function cleanText(v){ return String(v || "").trim(); }`,
    `const GAH_GA4_MEASUREMENT_ID = "";`,
    extractFn(src, "isStagingEnv"),
    extractFn(src, "applyStagingPrivacyHeaders"),
    extractFn(src, "googleTagEnabled"),
    `return { isStagingEnv, applyStagingPrivacyHeaders, googleTagEnabled };`,
  ].join("\n")
);
const { isStagingEnv, applyStagingPrivacyHeaders, googleTagEnabled } = loader();

let pass = 0,
  fail = 0;
const t = (name, cond) => {
  cond ? pass++ : fail++;
  console.log((cond ? "PASS" : "FAIL") + " " + name);
};

// --- 1. isStagingEnv ---
t("staging detected", isStagingEnv({ GAH_STAGING: "true" }) === true);
t("staging case-insensitive", isStagingEnv({ GAH_STAGING: "TRUE" }) === true);
t("not staging when unset", isStagingEnv({}) === false);
t("not staging when false", isStagingEnv({ GAH_STAGING: "false" }) === false);
t("not staging when undefined", isStagingEnv(undefined) === false);

// --- 2. applyStagingPrivacyHeaders ---
{
  const res = new Response("hello", { status: 200, headers: { "Content-Type": "text/html" } });
  const out = applyStagingPrivacyHeaders(res, { GAH_STAGING: "true" });
  t("staging adds X-Robots-Tag", out.headers.get("X-Robots-Tag") === "noindex, nofollow, noarchive");
  t("staging preserves status", out.status === 200);
  t("staging preserves content-type", out.headers.get("Content-Type") === "text/html");
}
{
  const res = new Response("hello", { status: 200 });
  const out = applyStagingPrivacyHeaders(res, {});
  t("production untouched (no X-Robots-Tag)", out.headers.get("X-Robots-Tag") === null);
  t("production returns same response", out === res);
}
{
  t("null response passthrough", applyStagingPrivacyHeaders(null, { GAH_STAGING: "true" }) === null);
}

// --- 3. googleTagEnabled disabled on staging ---
t("GA4 disabled on staging even with ID set", googleTagEnabled({ GAH_STAGING: "true", GA4_MEASUREMENT_ID: "G-XXXX" }) === false);
t("GA4 enabled in prod with ID", googleTagEnabled({ GA4_MEASUREMENT_ID: "G-XXXX" }) === true);
t("GA4 disabled in prod without ID", googleTagEnabled({}) === false);

// --- 4. X-publisher fallback blocked on staging (static check) ---
t(
  "xReadRouteHtml blocks production fetch on staging",
  src.includes('if (isStagingEnv(env)) return { ok: false, status: 404, html: "", assetPath };')
);

// --- 5. Fetch handler wrapped ---
t(
  "fetch handler applies staging privacy headers",
  src.includes("return applyStagingPrivacyHeaders(await handleStagingFetch(request, env), env);")
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
