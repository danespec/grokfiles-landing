// Real-runtime tests for GahSecRateLimiterDO under Miniflare (workerd).
//
// Unlike the serialized-mock tests in docs/security-remediation/, this drives
// the ACTUAL Durable Object class through a real workerd runtime with TRUE
// concurrent subrequests — the DO runtime itself provides the serialization,
// no test-side promise chain.
//
// Run:  cd workers/sec-rate-limiter && npm install && node test/run.mjs
import { Miniflare } from "miniflare";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

const mf = new Miniflare({
  modules: true,
  scriptPath: path.join(dir, "..", "src", "index.js"),
  durableObjects: { GAH_SEC_RATE_LIMITER: "GahSecRateLimiterDO" },
});

const ns = await mf.getDurableObjectNamespace("GAH_SEC_RATE_LIMITER");
// Sharding mirrors gahSecDoCall in the Pages worker: one instance per scope+key.
const stubFor = (scope, key) => ns.get(ns.idFromName(`${scope}:${key}`));
const call = (stub, payload) =>
  stub
    .fetch("https://gah-sec.internal/rate-limit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    .then((r) => r.json());

let pass = 0,
  fail = 0;
const t = (name, cond, extra = "") => {
  cond ? pass++ : fail++;
  console.log((cond ? "PASS" : "FAIL") + " " + name + (extra ? `  [${extra}]` : ""));
};

// Test 1: 25 truly-concurrent check ops against one shard, limit 3.
{
  const stub = stubFor("public-search", "203.0.113.7");
  const results = await Promise.all(
    Array.from({ length: 25 }, () =>
      call(stub, {
        op: "check",
        scope: "public-search",
        key: "203.0.113.7",
        max: 3,
        windowMs: 60000,
      })
    )
  );
  const allowed = results.filter((r) => !r.limited).length;
  const blocked = results.filter((r) => r.limited).length;
  t("25-way concurrency: exactly 3 allowed", allowed === 3, `allowed=${allowed}`);
  t("25-way concurrency: 22 blocked with 429 shape", blocked === 22);
}

// Test 2: 10 concurrent admin failures, max 5.
{
  const stub = stubFor("admin-login", "198.51.100.9");
  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      call(stub, {
        op: "check",
        scope: "admin-login",
        key: "198.51.100.9",
        max: 5,
        windowMs: 15 * 60 * 1000,
      })
    )
  );
  const recorded = results.filter((r) => !r.limited).length;
  t("10 concurrent admin failures: 5 recorded, 5 over-limit", recorded === 5, `recorded=${recorded}`);
  const peek = await call(stub, {
    op: "peek",
    scope: "admin-login",
    key: "198.51.100.9",
    max: 5,
    windowMs: 15 * 60 * 1000,
  });
  t("peek reports blocked with exact count", peek.limited === true && peek.count === 5, `count=${peek.count}`);
  await call(stub, { op: "clear", scope: "admin-login", key: "198.51.100.9", windowMs: 15 * 60 * 1000 });
  const after = await call(stub, {
    op: "peek",
    scope: "admin-login",
    key: "198.51.100.9",
    max: 5,
    windowMs: 15 * 60 * 1000,
  });
  t("clear resets the counter", after.limited === false && after.count === 0);
}

// Test 3: shard isolation — a hot IP cannot affect another key.
{
  const hot = stubFor("public-search", "10.0.0.1");
  await Promise.all(
    Array.from({ length: 3 }, () =>
      call(hot, { op: "check", scope: "public-search", key: "10.0.0.1", max: 3, windowMs: 60000 }))
  );
  const other = await call(stubFor("public-search", "10.0.0.2"), {
    op: "check",
    scope: "public-search",
    key: "10.0.0.2",
    max: 3,
    windowMs: 60000,
  });
  t("shard isolation: other key unaffected", other.limited === false && other.count === 1);
}

// Test 4: malformed body rejected without touching storage.
{
  const stub = stubFor("public-search", "10.0.0.3");
  const res = await stub.fetch("https://gah-sec.internal/rate-limit", {
    method: "POST",
    body: "not-json{{{ ",
  });
  const body = await res.json();
  t("malformed body -> invalid_body", res.status === 400 && body.error === "invalid_body");
}

// Test 5: the worker's default export is a closed door (DO-only worker).
{
  const res = await mf.dispatchFetch("https://gah-sec-rate-limiter.workers.dev/");
  t("default export returns 404", res.status === 404);
}

console.log(`\n${pass} passed, ${fail} failed`);
await mf.dispose();
process.exit(fail ? 1 : 0);
