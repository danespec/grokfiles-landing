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
// Defense-in-depth in front of the Cloudflare edge rules. Reuses the
// KV-backed minute-window pattern already established by the Phang ingest
// limiter. FAILS OPEN when no KV binding is present (availability first);
// strict enforcement requires a bound KV namespace. Tunables are the
// GAH_SEC_* constants below.
// ---------------------------------------------------------------------------
const GAH_SEC_RATE_PREFIX = "gah:sec:rate:";
const GAH_SEC_RATE_WINDOW_MS = 60 * 1000;
const GAH_SEC_PUBLIC_SEARCH_MAX_PER_MIN = 60;
const GAH_SEC_A2A_SEND_MAX_PER_MIN = 30;
const GAH_SEC_ADMIN_LOGIN_PREFIX = "gah:sec:admin-login-fail:";
const GAH_SEC_ADMIN_LOGIN_WINDOW_SECONDS = 60 * 15; // matches X_ADMIN_LOGIN_WINDOW_SECONDS
const GAH_SEC_ADMIN_LOGIN_MAX_FAILURES = 5;         // matches X_ADMIN_LOGIN_MAX_FAILURES

function gahSecClientIp(request) {
  const fwd = request.headers.get("X-Forwarded-For");
  return String(
    request.headers.get("CF-Connecting-IP") ||
    (fwd ? fwd.split(",")[0].trim() : "") ||
    "unknown"
  ).slice(0, 64);
}

async function gahSecRateLimit(env, scope, request, maxPerMinute) {
  // NOTE: reads bypass the Phang KV read cache on purpose — throttles need
  // fresh counters, not cached ones.
  const store = phangStore(env);
  if (!store) return { ok: true, limited: false, reason: "no_kv_fail_open" };
  const kvKey = `${GAH_SEC_RATE_PREFIX}${scope}:${gahSecClientIp(request)}:${Math.floor(Date.now() / GAH_SEC_RATE_WINDOW_MS)}`;
  let count = 0;
  try {
    count = Number(await store.binding.get(kvKey)) || 0;
  } catch (_) {
    return { ok: true, limited: false, reason: "kv_read_failed_fail_open" };
  }
  if (count >= maxPerMinute) return { ok: false, limited: true };
  try {
    await store.binding.put(kvKey, String(count + 1), { expirationTtl: 180 });
  } catch (_) { /* best-effort: never fail a legitimate request on a KV write error */ }
  return { ok: true, limited: false };
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
// the count); this KV-backed per-IP counter is the authoritative gate.
async function gahSecAdminLoginBlocked(env, request) {
  const store = phangStore(env);
  if (!store) return false; // fail open: the sealed-cookie mechanism still applies
  try {
    const raw = await store.binding.get(`${GAH_SEC_ADMIN_LOGIN_PREFIX}${gahSecClientIp(request)}`);
    if (!raw) return false;
    const rec = JSON.parse(raw);
    const windowStart = Date.now() - GAH_SEC_ADMIN_LOGIN_WINDOW_SECONDS * 1000;
    return rec.firstAt > windowStart && Number(rec.failures || 0) >= GAH_SEC_ADMIN_LOGIN_MAX_FAILURES;
  } catch (_) {
    return false;
  }
}

async function gahSecAdminLoginRecord(env, request, failed) {
  const store = phangStore(env);
  if (!store) return;
  const key = `${GAH_SEC_ADMIN_LOGIN_PREFIX}${gahSecClientIp(request)}`;
  try {
    if (!failed) { await store.binding.delete(key); return; }
    const raw = await store.binding.get(key);
    const rec = raw ? JSON.parse(raw) : { firstAt: 0, failures: 0 };
    const windowStart = Date.now() - GAH_SEC_ADMIN_LOGIN_WINDOW_SECONDS * 1000;
    const inWindow = rec.firstAt > windowStart;
    await store.binding.put(key, JSON.stringify({
      firstAt: inWindow ? rec.firstAt : Date.now(),
      failures: inWindow ? Number(rec.failures || 0) + 1 : 1
    }), { expirationTtl: GAH_SEC_ADMIN_LOGIN_WINDOW_SECONDS + 60 });
  } catch (_) { /* best-effort */ }
}


// ---- test harness ----
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
  headers: { "CF-Connecting-IP": "203.0.113.7", "Cookie": "gah_member_session=abc", "Authorization": "Bearer x" },
});

let pass = 0, fail = 0;
const t = (name, cond) => { cond ? pass++ : fail++; console.log((cond ? "PASS" : "FAIL") + " " + name); };

// 1. rate limit: 3/min test scope allows 3, blocks 4th
for (let i = 0; i < 3; i++) await gahSecRateLimit(envWithKv, "t", req, 3);
t("allows up to max", !(await gahSecRateLimit(envWithKv, "t", req, 3)).limited === false);
const blocked = await gahSecRateLimit(envWithKv, "t", req, 3);
t("blocks over max", blocked.limited === true);
t("429 response shape", (await (async () => { const r = gahSecRateLimitedJson(); return r.status === 429 && (await r.json()).error === "rate_limited"; })()));

// 2. fail-open without KV
const fo = await gahSecRateLimit(envNoKv, "t", req, 1);
t("fail-open without KV", fo.ok && !fo.limited);

// 3. per-IP isolation
const req2 = new Request("https://grokarchivehub.com/api/search", { headers: { "CF-Connecting-IP": "198.51.100.9" } });
const other = await gahSecRateLimit(envWithKv, "t", req2, 3);
t("different IP not affected", !other.limited);

// 4. admin login throttle: 5 failures -> blocked; success clears
for (let i = 0; i < 5; i++) await gahSecAdminLoginRecord(envWithKv, req, true);
t("admin blocked after 5 failures", await gahSecAdminLoginBlocked(envWithKv, req));
await gahSecAdminLoginRecord(envWithKv, req, false);
t("admin cleared on success", !(await gahSecAdminLoginBlocked(envWithKv, req)));
t("admin fail-open without KV", !(await gahSecAdminLoginBlocked(envNoKv, req)));

// 5. client IP extraction
t("CF-Connecting-IP preferred", gahSecClientIp(req) === "203.0.113.7");
t("unknown IP fallback", gahSecClientIp(new Request("https://x.test/")) === "unknown");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
