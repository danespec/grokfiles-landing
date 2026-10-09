const PHANG_DOCKET_STORE_BINDINGS = ["PHANG_DOCKET_STORE"];
function phangStore(env) {
  for (const bindingName of PHANG_DOCKET_STORE_BINDINGS) {
    const binding = env?.[bindingName];
    if (binding && typeof binding.get === "function" && typeof binding.put === "function") {
      return { bindingName, binding };
    }
  }
  return null;
}
// SEC-REMEDIATION (ren/security-remediation): worker-side abuse throttles.
//
// Architecture (revised after review): atomic enforcement lives in the
// GahSecRateLimiterDO Durable Object below. The first revision used KV
// read-modify-write, which is NOT atomic — under concurrency, N simultaneous
// requests can all read the same counter before any write lands (review
// repro: 25 requests passed a limit of 3; 10 simultaneous admin failures
// recorded as one). A Durable Object instance is single-threaded, so
// check-and-increment inside one fetch() cannot interleave: the throttle
// is exact.
//
// Wiring: [[durable_objects.bindings]] name = "GAH_SEC_RATE_LIMITER",
// class_name = "GahSecRateLimiterDO" (see wrangler.example.toml), plus a
// migrations new_classes entry. When the binding is absent the helpers
// fall back to KV best-effort (documented approximate) and then fail open.
// Throttles are defense-in-depth in front of the Cloudflare edge rules.
// ---------------------------------------------------------------------------
const GAH_SEC_RATE_PREFIX = "gah:sec:rate:";
const GAH_SEC_RATE_WINDOW_MS = 60 * 1000;
const GAH_SEC_PUBLIC_SEARCH_MAX_PER_MIN = 60;
const GAH_SEC_A2A_SEND_MAX_PER_MIN = 30;
const GAH_SEC_ADMIN_LOGIN_PREFIX = "gah:sec:admin-login-fail:";
const GAH_SEC_ADMIN_LOGIN_WINDOW_SECONDS = 60 * 15; // matches X_ADMIN_LOGIN_WINDOW_SECONDS
const GAH_SEC_ADMIN_LOGIN_MAX_FAILURES = 5;         // matches X_ADMIN_LOGIN_MAX_FAILURES

// NOTE (ren/security-remediation): GahSecRateLimiterDO now lives in
// workers/sec-rate-limiter/src/index.js (separate Worker project — Pages
// cannot host Durable Objects). This worker reaches it through the
// env.GAH_SEC_RATE_LIMITER binding (script_name).

function gahSecClientIp(request) {
  const fwd = request.headers.get("X-Forwarded-For");
  return String(
    request.headers.get("CF-Connecting-IP") ||
    (fwd ? fwd.split(",")[0].trim() : "") ||
    "unknown"
  ).slice(0, 64);
}

// Subrequest to the rate-limiter DO. Returns the parsed JSON body, or null
// when the binding is absent or the subrequest fails (caller falls back).
async function gahSecDoCall(env, payload) {
  const ns = env.GAH_SEC_RATE_LIMITER;
  if (!ns || typeof ns.idFromName !== "function") return null;
  try {
    // Shard limiter instances by scope+key (usually scope + client IP) so
    // all website traffic does not funnel through one global DO instance.
    // Each shard is single-threaded; a spike from one IP cannot contend
    // with anyone else's counters.
    const shard = `${String(payload.scope || "default").slice(0, 64)}:${String(payload.key || "unknown").slice(0, 64)}`;
    const stub = ns.get(ns.idFromName(shard));
    const res = await stub.fetch(
      new Request("https://gah-sec.internal/rate-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    );
    return await res.json().catch(() => null);
  } catch (_) {
    return null;
  }
}

async function gahSecKvRateLimit(env, scope, key, maxPerMinute) {
  // Fallback path: KV read-modify-write. APPROXIMATE under concurrency —
  // acceptable only as defense-in-depth until the DO binding is configured.
  // NOTE: reads bypass the Phang KV read cache on purpose — throttles need
  // fresh counters, not cached ones.
  const store = phangStore(env);
  if (!store) return { ok: true, limited: false, reason: "no_kv_fail_open" };
  const kvKey = `${GAH_SEC_RATE_PREFIX}${scope}:${key}:${Math.floor(Date.now() / GAH_SEC_RATE_WINDOW_MS)}`;
  let count = 0;
  try {
    count = Number(await store.binding.get(kvKey)) || 0;
  } catch (_) {
    return { ok: true, limited: false, reason: "kv_read_failed_fail_open" };
  }
  if (count >= maxPerMinute) return { ok: false, limited: true, via: "kv-approximate" };
  try {
    await store.binding.put(kvKey, String(count + 1), { expirationTtl: 180 });
  } catch (_) { /* best-effort: never fail a legitimate request on a KV write error */ }
  return { ok: true, limited: false, via: "kv-approximate" };
}

async function gahSecRateLimit(env, scope, request, maxPerMinute) {
  const key = gahSecClientIp(request);
  // Preferred path: atomic check-and-increment in the DO.
  const viaDo = await gahSecDoCall(env, {
    op: "check", scope, key, max: maxPerMinute, windowMs: GAH_SEC_RATE_WINDOW_MS,
  });
  if (viaDo) return { ok: !viaDo.limited, limited: !!viaDo.limited, via: "durable-object" };
  return gahSecKvRateLimit(env, scope, key, maxPerMinute);
}

function gahSecRateLimitedJson(retryAfterSeconds = 60) {
  return new Response(JSON.stringify({ ok: false, error: "rate_limited", retry_after_seconds: retryAfterSeconds }), {
    status: 429,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Retry-After": String(retryAfterSeconds)
    }
  });
}

// Server-side admin-login throttle. The sealed-cookie counter used by
// xAdminLoginRateState is client-resettable (clearing the cookie restarts
// the count); the counter here is authoritative.
async function gahSecAdminLoginBlocked(env, request) {
  const key = gahSecClientIp(request);
  const windowMs = GAH_SEC_ADMIN_LOGIN_WINDOW_SECONDS * 1000;
  const viaDo = await gahSecDoCall(env, {
    op: "peek", scope: "admin-login", key,
    max: GAH_SEC_ADMIN_LOGIN_MAX_FAILURES, windowMs,
  });
  if (viaDo) return !!viaDo.limited;
  const store = phangStore(env);
  if (!store) return false; // fail open: the sealed-cookie mechanism still applies
  try {
    const raw = await store.binding.get(`${GAH_SEC_ADMIN_LOGIN_PREFIX}${key}`);
    if (!raw) return false;
    const rec = JSON.parse(raw);
    const windowStart = Date.now() - windowMs;
    return rec.firstAt > windowStart && Number(rec.failures || 0) >= GAH_SEC_ADMIN_LOGIN_MAX_FAILURES;
  } catch (_) {
    return false;
  }
}

async function gahSecAdminLoginRecord(env, request, failed) {
  const key = gahSecClientIp(request);
  const windowMs = GAH_SEC_ADMIN_LOGIN_WINDOW_SECONDS * 1000;
  if (!failed) {
    // Successful login clears the counter.
    const cleared = await gahSecDoCall(env, { op: "clear", scope: "admin-login", key, windowMs });
    if (cleared) return;
    const store = phangStore(env);
    if (!store) return;
    try { await store.binding.delete(`${GAH_SEC_ADMIN_LOGIN_PREFIX}${key}`); } catch (_) { /* best-effort */ }
    return;
  }
  const viaDo = await gahSecDoCall(env, {
    op: "check", scope: "admin-login", key,
    max: GAH_SEC_ADMIN_LOGIN_MAX_FAILURES, windowMs,
  });
  if (viaDo) return;
  const store = phangStore(env);
  if (!store) return;
  try {
    const raw = await store.binding.get(`${GAH_SEC_ADMIN_LOGIN_PREFIX}${key}`);
    const rec = raw ? JSON.parse(raw) : { firstAt: 0, failures: 0 };
    const windowStart = Date.now() - windowMs;
    const inWindow = rec.firstAt > windowStart;
    await store.binding.put(`${GAH_SEC_ADMIN_LOGIN_PREFIX}${key}`, JSON.stringify({
      firstAt: inWindow ? rec.firstAt : Date.now(),
      failures: inWindow ? Number(rec.failures || 0) + 1 : 1
    }), { expirationTtl: GAH_SEC_ADMIN_LOGIN_WINDOW_SECONDS + 60 });
  } catch (_) { /* best-effort */ }
}


// ---- unit tests: fallback path (no DO binding) + shared behaviors ----
const kv = new Map();
const mockBinding = {
  get: async (k) => kv.has(k) ? kv.get(k) : null,
  put: async (k, v) => { kv.set(k, v); },
  delete: async (k) => { kv.delete(k); },
};
const envWithKv = { PHANG_DOCKET_STORE: mockBinding };
const envNoKv = {};
const req = new Request("https://grokarchivehub.com/api/search", {
  method: "POST",
  headers: { "CF-Connecting-IP": "203.0.113.7" },
});
let pass = 0, fail = 0;
const t = (name, cond) => { cond ? pass++ : fail++; console.log((cond ? "PASS" : "FAIL") + " " + name); };

// fallback path (no DO binding configured): KV best-effort still works
for (let i = 0; i < 3; i++) await gahSecRateLimit(envWithKv, "t", req, 3);
const r4 = await gahSecRateLimit(envWithKv, "t", req, 3);
t("KV fallback: blocks 4th sequential request", r4.limited === true && r4.via === "kv-approximate");
const fo = await gahSecRateLimit(envNoKv, "t", req, 1);
t("fail-open with no KV and no DO", fo.ok && !fo.limited);
t("429 JSON shape", await (async () => { const r = gahSecRateLimitedJson(); const j = await r.json(); return r.status === 429 && j.error === "rate_limited" && r.headers.get("Retry-After") === "60"; })());
const req2 = new Request("https://x.test/", { headers: { "CF-Connecting-IP": "198.51.100.9" } });
t("per-IP isolation (fallback)", (await gahSecRateLimit(envWithKv, "t", req2, 3)).limited === false);
t("CF-Connecting-IP preferred", gahSecClientIp(req) === "203.0.113.7");
t("unknown IP fallback", gahSecClientIp(new Request("https://x.test/")) === "unknown");
// admin KV fallback
for (let i = 0; i < 5; i++) await gahSecAdminLoginRecord(envWithKv, req, true);
t("admin KV fallback: blocked after 5", await gahSecAdminLoginBlocked(envWithKv, req));
await gahSecAdminLoginRecord(envWithKv, req, false);
t("admin KV fallback: cleared on success", !(await gahSecAdminLoginBlocked(envWithKv, req)));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
