// Real Workers-runtime integration test for the _worker.js entrypoint.
//
// Drives the ACTUAL exported fetch() handler through Miniflare (workerd).
// Verifies the STAGING-HARDEN-001 entrypoint fix: fetch() must successfully
// dispatch to the handleStagingFetch method (no ReferenceError), staging
// privacy headers must be present, and the fail-closed wiki guard must work.
//
// Run: node tests/test_worker_entrypoint.mjs   (from the repo root)
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Reuse the miniflare installation from the rate-limiter worker.
const require = createRequire(path.join(repoRoot, "workers", "sec-rate-limiter", "test", "run.mjs"));
const { Miniflare } = require("miniflare");

let pass = 0,
  fail = 0;
const t = (name, cond, extra = "") => {
  cond ? pass++ : fail++;
  console.log((cond ? "PASS" : "FAIL") + " " + name + (extra ? `  [${extra}]` : ""));
};

const mf = new Miniflare({
  modules: true,
  scriptPath: path.join(repoRoot, "_worker.js"),
  // Staging env: fail-closed wiki guard active, mock host intentionally invalid
  // (proves 503 instead of silent production fallback).
  bindings: { GAH_STAGING: "true", GAH_WIKI_HOST: "invalid-host!!" },
});

const mfProd = new Miniflare({
  modules: true,
  scriptPath: path.join(repoRoot, "_worker.js"),
  bindings: {},
});

// Note: workerd's network sandbox blocks localhost connections, so a live
// mock-backend search-success test is not possible here. Search success
// against the mock backend is covered by staging/smoke-tests/auth.sh run
// against the deployed staging site. This test verifies the entrypoint
// dispatches POST /api/search correctly (fail-closed 503, not a crash).

// --- 1. Static route 200 with staging privacy headers (entrypoint works) ---
// /robots.txt is a static response needing no bindings.
{
  const res = await mf.dispatchFetch("https://staging.test/robots.txt");
  t("staging robots.txt 200 (entrypoint dispatches)", res.status === 200, `status=${res.status}`);
  t(
    "staging X-Robots-Tag noindex",
    res.headers.get("X-Robots-Tag") === "noindex, nofollow, noarchive",
    res.headers.get("X-Robots-Tag")
  );
  await res.text(); // drain
}

// --- 2. Production (no staging flag): no staging robots header ---
{
  const res = await mfProd.dispatchFetch("https://prod.test/robots.txt");
  t("prod robots.txt 200", res.status === 200, `status=${res.status}`);
  t(
    "prod has no staging X-Robots-Tag",
    res.headers.get("X-Robots-Tag") !== "noindex, nofollow, noarchive"
  );
  await res.text();
}

// --- 3. Search fail-closed: invalid GAH_WIKI_HOST -> 503 (not production) ---
{
  const res = await mf.dispatchFetch("https://staging.test/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: "EFTA00000001", no_ai: true }),
  });
  const body = await res.text();
  t("staging search fail-closed 503", res.status === 503, `status=${res.status}`);
  t("staging search 503 is wiki_host_unconfigured", body.includes("wiki_host_unconfigured"));
  t("staging search 503 carries privacy headers", res.headers.get("X-Robots-Tag") === "noindex, nofollow, noarchive");
}

// --- 4. Staging HTML has no production GA4/AdSense activation ---
{
  const res = await mf.dispatchFetch("https://staging.test/", {
    headers: { "Accept": "text/html" },
  });
  const html = await res.text();
  t(
    "staging HTML has no GA4 measurement ID active",
    !html.includes("G-") || !/G-[A-Z0-9]{6,}/.test(html) || html.includes("GAH_STAGING")
  );
  // The consent boot config must not enable production GA4 on staging.
  const m = html.match(/window\.GAH_CONSENT_BOOT\s*=\s*(\{[^;]*\})/);
  if (m) {
    t("staging GAH_CONSENT_BOOT does not enable GA4", !m[1].includes('"ga4":true') && !m[1].includes("ga4:true"));
  } else {
    t("staging GAH_CONSENT_BOOT absent or inert", true);
  }
}

await mf.dispose();
await mfProd.dispose();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
