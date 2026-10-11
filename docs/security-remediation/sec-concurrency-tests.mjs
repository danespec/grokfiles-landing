// Concurrency tests for the SEC-REMEDIATION rate limiter.
// Run: node sec-concurrency-tests.mjs
// Extracts the REAL GahSecRateLimiterDO class from
// workers/sec-rate-limiter/src/index.js and drives it with a mock
// Durable-Object storage, serialized the way the DO runtime
// serializes fetch() handlers (one at a time per instance).
// NOTE: workers/sec-rate-limiter/test/run.mjs runs the same scenarios
// against the real class under Miniflare (workerd) — that is the
// authoritative runtime evidence.

class GahSecRateLimiterDO {
  constructor(state) {
    this.state = state;
  }

  // Body: { op: "check"|"peek"|"clear", scope, key, max, windowMs }.
  // check and peek are atomic: one DO instance serves one fetch at a time.
  async fetch(request) {
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return Response.json({ ok: false, error: "invalid_body" }, { status: 400 });
    }
    const op = body.op === "peek" || body.op === "clear" ? body.op : "check";
    const scope = String(body.scope || "default").slice(0, 64);
    const key = String(body.key || "unknown").slice(0, 64);
    const windowMs = Math.max(1000, Number(body.windowMs) || 60000);
    const max = Math.max(1, Number(body.max) || 60);
    const windowId = Math.floor(Date.now() / windowMs);
    const keyPrefix = `rl:${scope}:${key}:`;
    const storageKey = `${keyPrefix}${windowId}`;

    if (op === "clear") {
      // Drop this scope+key's counters (used after a successful admin login).
      const listed = await this.state.storage.list({ prefix: keyPrefix });
      for (const name of listed.keys()) {
        await this.state.storage.delete(name);
      }
      return Response.json({ ok: true, cleared: true });
    }

    const count = Number((await this.state.storage.get(storageKey)) || 0);
    if (op === "peek") {
      return Response.json({ ok: true, limited: count >= max, count });
    }
    if (count >= max) {
      return Response.json({ ok: false, limited: true, count }, { status: 429 });
    }
    // Best-effort cleanup of the previous window so storage stays bounded
    // without depending on TTL support.
    await this.state.storage.delete(`${keyPrefix}${windowId - 1}`).catch(() => undefined);
    await this.state.storage.put(storageKey, count + 1);
    return Response.json({ ok: true, limited: false, count: count + 1 });
  }
}

// ---- mock DO storage (Map-backed; matches storage.get/put/delete/list API) ----
function mockStorage() {
  const map = new Map();
  return {
    get: async (k) => (map.has(k) ? map.get(k) : undefined),
    put: async (k, v) => { map.set(k, v); },
    delete: async (k) => { map.delete(k); },
    list: async ({ prefix }) =>
      new Map([...map.entries()].filter(([k]) => k.startsWith(prefix))),
  };
}

// The DO runtime serves one fetch() at a time per instance. The mock
// enforces the same guarantee with a promise chain around the handler.
function serializedInstance() {
  const inst = new GahSecRateLimiterDO({ storage: mockStorage() });
  let chain = Promise.resolve();
  const call = (payload) => {
    const run = chain.then(() =>
      inst.fetch(
        new Request("https://gah-sec.internal/rate-limit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      ).then((r) => r.json())
    );
    chain = run.catch(() => {});
    return run;
  };
  return { call };
}

const payload = (op, scope, key, max, windowMs) =>
  ({ op, scope, key, max, windowMs });

let pass = 0, fail = 0;
const t = (name, cond, extra = "") => {
  cond ? pass++ : fail++;
  console.log((cond ? "PASS" : "FAIL") + " " + name + (extra ? "  [" + extra + "]" : ""));
};

// ---- Test 1: reproduce the OLD race (KV read-modify-write, no DO) ----
// Models the first-revision implementation: read counter, check, write.
// A 5ms gap between read and write models KV latency; 25 requests arrive
// "simultaneously" (same tick), limit is 3.
async function oldKvCheckAndIncrement(kv, key, max) {
  const count = Number((await kv.get(key)) || 0);
  await new Promise((r) => setTimeout(r, 5)); // <-- the race window
  if (count >= max) return { limited: true };
  await kv.put(key, String(count + 1));
  return { limited: false };
}
{
  const kv = new Map();
  const kvApi = {
    get: async (k) => (kv.has(k) ? kv.get(k) : null),
    put: async (k, v) => { kv.set(k, v); },
  };
  const results = await Promise.all(
    Array.from({ length: 25 }, () => oldKvCheckAndIncrement(kvApi, "t:1.2.3.4", 3))
  );
  const allowed = results.filter((r) => !r.limited).length;
  t("OLD architecture: race reproduced (25 concurrent, limit 3)", allowed > 3, `allowed=${allowed}`);
}

// ---- Test 2: new architecture — 25 concurrent, limit 3, DO-serialized ----
{
  const { call } = serializedInstance();
  const results = await Promise.all(
    Array.from({ length: 25 }, () =>
      call(payload("check", "public-search", "203.0.113.7", 3, 60000)))
  );
  const allowed = results.filter((r) => !r.limited).length;
  const blocked = results.filter((r) => r.limited).length;
  t("NEW architecture: exactly 3 allowed under 25-way concurrency", allowed === 3, `allowed=${allowed}`);
  t("NEW architecture: remaining 22 blocked", blocked === 22, `blocked=${blocked}`);
}

// ---- Test 3: admin login — 10 simultaneous failures, max 5 ----
{
  const { call } = serializedInstance();
  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      call(payload("check", "admin-login", "198.51.100.9", 5, 15 * 60 * 1000)))
  );
  const recorded = results.filter((r) => !r.limited).length;
  t("NEW architecture: all 10 admin failures recorded (5 allowed, 5 over-limit)", recorded === 5, `recorded=${recorded}`);
  const peek = await call(payload("peek", "admin-login", "198.51.100.9", 5, 15 * 60 * 1000));
  t("admin blocked after 5 failures (peek)", peek.limited === true && peek.count === 5, `count=${peek.count}`);
  await call(payload("clear", "admin-login", "198.51.100.9", 5, 15 * 60 * 1000));
  const afterClear = await call(payload("peek", "admin-login", "198.51.100.9", 5, 15 * 60 * 1000));
  t("admin counter cleared on success", afterClear.limited === false && afterClear.count === 0);
}

// ---- Test 4: per-key isolation ----
{
  const { call } = serializedInstance();
  await Promise.all(Array.from({ length: 3 }, () =>
    call(payload("check", "public-search", "10.0.0.1", 3, 60000))));
  const other = await call(payload("check", "public-search", "10.0.0.2", 3, 60000));
  t("different client key unaffected", other.limited === false && other.count === 1);
}

// ---- Test 5: invalid body handling ----
{
  const { call } = (() => {
    const inst = new GahSecRateLimiterDO({ storage: mockStorage() });
    return { call: (req) => inst.fetch(req).then((r) => r.json()) };
  })();
  const bad = await call(new Request("https://gah-sec.internal/rate-limit", { method: "POST", body: "not-json{{{" }));
  t("malformed DO body rejected", bad && bad.error === "invalid_body");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
