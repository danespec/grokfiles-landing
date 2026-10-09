// Handler-level tests for the atomic admin-login throttle.
//
// Drives the REAL gahSecAdminLoginAdmit / gahSecAdminLoginClear functions
// (extracted from the Pages _worker.js) against a REAL Durable Object
// namespace under Miniflare (workerd), exercising the complete handler
// sequence — admit -> token verification -> clear — with simultaneous
// requests. This goes beyond counter-op concurrency: it proves the
// admission gate itself is atomic.
//
// Run: node test/admin_login.mjs   (from workers/sec-rate-limiter,
// after npm install)
import { Miniflare } from "miniflare";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dir, "..", "..", "..");
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
function extractAsyncFn(source, name) {
  const start = source.indexOf(`async function ${name}(`);
  if (start < 0) throw new Error(`${name} not found in _worker.js`);
  let i = source.indexOf("{", start);
  let depth = 0;
  for (let j = i; j < source.length; j++) {
    if (source[j] === "{") depth++;
    else if (source[j] === "}") {
      depth--;
      if (depth === 0) return source.slice(start, j + 1).replace(`async function ${name}`, `async function ${name}`);
    }
  }
  throw new Error(`unbalanced braces in ${name}`);
}
function extractConst(source, name) {
  const m = source.match(new RegExp(`const ${name} = ([^;]+);`));
  if (!m) throw new Error(`${name} not found`);
  return `const ${name} = ${m[1]};`;
}

const loader = new Function(
  [
    extractConst(src, "GAH_SEC_ADMIN_LOGIN_WINDOW_SECONDS"),
    extractConst(src, "GAH_SEC_ADMIN_LOGIN_MAX_FAILURES"),
    extractConst(src, "GAH_SEC_ADMIN_LOGIN_PREFIX"),
    `const PHANG_DOCKET_STORE_BINDINGS = ["PHANG_DOCKET_STORE"];`,
    extractFn(src, "phangStore"),
    extractFn(src, "gahSecClientIp"),
    extractAsyncFn(src, "gahSecDoCall"),
    extractAsyncFn(src, "gahSecAdminLoginAdmit"),
    extractAsyncFn(src, "gahSecAdminLoginClear"),
    `return { gahSecClientIp, gahSecAdminLoginAdmit, gahSecAdminLoginClear };`,
  ].join("\n")
);
const { gahSecClientIp, gahSecAdminLoginAdmit, gahSecAdminLoginClear } = loader();

const mf = new Miniflare({
  modules: true,
  scriptPath: path.join(dir, "..", "src", "index.js"),
  durableObjects: { GAH_SEC_RATE_LIMITER: "GahSecRateLimiterDO" },
});
const ns = await mf.getDurableObjectNamespace("GAH_SEC_RATE_LIMITER");

const fakeReq = (ip, extraHeaders = {}) =>
  new Request("https://gah.test/admin/login", {
    method: "POST",
    headers: { "CF-Connecting-IP": ip, ...extraHeaders },
  });

// Mirrors handleXAdminLogin's security-relevant sequence:
// atomic admit at the gate -> token verification -> clear on success.
// (The sealed-cookie xAdminLoginRateBlocked check is pre-existing and
// orthogonal; the server-side throttle under test is what changed.)
async function simulatedAdminLoginPost(env, req, tokenOk) {
  if (!(await gahSecAdminLoginAdmit(env, req))) return 429;
  if (!tokenOk) return 401; // failure recorded at admission
  await gahSecAdminLoginClear(env, req);
  return 302;
}

let pass = 0,
  fail = 0;
const t = (name, cond, extra = "") => {
  cond ? pass++ : fail++;
  console.log((cond ? "PASS" : "FAIL") + " " + name + (extra ? `  [${extra}]` : ""));
};

const env = { GAH_SEC_RATE_LIMITER: ns };

// Test 1: 10 simultaneous bad-token attempts, max 5 -> 5 admitted (401), 5 blocked (429).
{
  const results = await Promise.all(
    Array.from({ length: 10 }, () => simulatedAdminLoginPost(env, fakeReq("203.0.113.50"), false))
  );
  const admitted = results.filter((s) => s === 401).length;
  const blocked = results.filter((s) => s === 429).length;
  t("10 simultaneous bad logins: 5 admitted", admitted === 5, `admitted=${admitted}`);
  t("10 simultaneous bad logins: 5 blocked at gate", blocked === 5, `blocked=${blocked}`);
}

// Test 2: a good token after failures clears the counter.
{
  const r1 = await simulatedAdminLoginPost(env, fakeReq("203.0.113.51"), false);
  const r2 = await simulatedAdminLoginPost(env, fakeReq("203.0.113.51"), false);
  const ok = await simulatedAdminLoginPost(env, fakeReq("203.0.113.51"), true);
  const after = await simulatedAdminLoginPost(env, fakeReq("203.0.113.51"), false);
  t("failures admitted before success", r1 === 401 && r2 === 401);
  t("good token succeeds and clears", ok === 302);
  t("counter cleared: next failure admitted", after === 401);
}

// Test 3: trusted client IP — CF-Connecting-IP wins over spoofed X-Forwarded-For.
{
  const req = fakeReq("198.51.100.7", { "X-Forwarded-For": "1.2.3.4, 5.6.7.8" });
  t("CF-Connecting-IP preferred", gahSecClientIp(req) === "198.51.100.7");
  const req2 = new Request("https://gah.test/admin/login", {
    method: "POST",
    headers: { "X-Forwarded-For": "9.9.9.9" },
  });
  t("XFF fallback when no CF header", gahSecClientIp(req2) === "9.9.9.9");
  const req3 = new Request("https://gah.test/admin/login", { method: "POST" });
  t("missing headers -> unknown bucket", gahSecClientIp(req3) === "unknown");
}

// Test 4: per-IP isolation — one attacker's lockout doesn't block others.
{
  for (let i = 0; i < 5; i++) await simulatedAdminLoginPost(env, fakeReq("192.0.2.10"), false);
  const attacker = await simulatedAdminLoginPost(env, fakeReq("192.0.2.10"), false);
  const legit = await simulatedAdminLoginPost(env, fakeReq("192.0.2.11"), true);
  t("attacker locked out after 5", attacker === 429);
  t("other IP unaffected", legit === 302);
}

// Test 5: missing DO binding AND no KV -> fail open (never a lockout, never a 500).
{
  const bareEnv = {};
  const admitted = await gahSecAdminLoginAdmit(bareEnv, fakeReq("203.0.113.99"));
  t("missing binding + no KV admits (fail-open)", admitted === true);
}

// Test 6: DO binding present but subrequest throws -> KV/fail-open path admits.
{
  const brokenEnv = {
    GAH_SEC_RATE_LIMITER: {
      idFromName: () => {
        throw new Error("simulated outage");
      },
    },
  };
  const admitted = await gahSecAdminLoginAdmit(brokenEnv, fakeReq("203.0.113.99"));
  t("DO outage admits (fail-open)", admitted === true);
}

console.log(`\n${pass} passed, ${fail} failed`);
await mf.dispose();
process.exit(fail ? 1 : 0);
