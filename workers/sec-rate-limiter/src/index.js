// gah-sec-rate-limiter — standalone Cloudflare Worker hosting the
// GahSecRateLimiterDO Durable Object.
//
// WHY A SEPARATE WORKER: GAH runs on Cloudflare Pages. Durable Objects used
// by a Pages project must live in a separately deployed Worker; the Pages
// project binds to them via `script_name` (see README.md and
// wrangler.example.toml in the repo root).
//
// The DO is single-threaded per instance: check-and-increment inside one
// fetch() cannot interleave, so throttles are exact under concurrency.
// (The KV read-modify-write approach this replaces is NOT atomic — review
// reproduced 25 simultaneous requests passing a limit of 3.)

export class GahSecRateLimiterDO {
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

// This worker exists to host the Durable Object. Direct HTTP access is not
// part of the design; every operation goes through the DO binding.
export default {
  async fetch() {
    return new Response("gah-sec-rate-limiter: use the GahSecRateLimiterDO binding", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  },
};
