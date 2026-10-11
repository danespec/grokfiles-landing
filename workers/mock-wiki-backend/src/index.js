// Mock wiki backend for GAH staging contract testing.
//
// Serves deterministic search fixtures so the staging Pages worker can be
// validated without touching the production wiki host. NOT for production.
//
// Contract: POST with JSON body {q, query, limit, ...} -> {hits: [...]}
// Requires the X-GAH-Internal-Wiki-Proxy header (proves the staging worker
// sends the internal proxy header).
//
// Fixtures keyed by canonical EFTA in q:
//   EFTA00000001 -> verified row (canonical route URL)
//   EFTA00000002 -> unverified row (identifier match, no valid source URL)
//   EFTA00999999 -> empty hits (missing-record path)
//   anything else -> two generic rows

const PROXY_HEADER = "X-GAH-Internal-Wiki-Proxy";

function fixtureForQ(q) {
  const upper = String(q || "").toUpperCase();
  if (upper.includes("EFTA00000001")) {
    return [
      {
        efta_id: "EFTA00000001",
        title: "Mock verified record EFTA00000001",
        snippet: "Deterministic fixture: validated source evidence present.",
        read_url: "/archive/EFTA00000001",
        dataset: "MOCK-DS1",
      },
    ];
  }
  if (upper.includes("EFTA00000002")) {
    return [
      {
        efta_id: "EFTA00000002",
        title: "Mock unverified record EFTA00000002",
        snippet: "Deterministic fixture: identifier match without validated source.",
        dataset: "MOCK-DS1",
      },
    ];
  }
  if (upper.includes("EFTA00999999")) {
    return [];
  }
  return [
    {
      efta_id: "EFTA00000100",
      title: "Mock generic record one",
      snippet: "Deterministic fixture for text queries.",
      read_url: "/archive/EFTA00000100",
      dataset: "MOCK-DS1",
    },
    {
      efta_id: "EFTA00000101",
      title: "Mock generic record two",
      snippet: "Deterministic fixture for text queries.",
      read_url: "/archive/EFTA00000101",
      dataset: "MOCK-DS1",
    },
  ];
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/__mock/health") {
      return Response.json({ ok: true, service: "gah-mock-wiki-staging" });
    }
    if (request.method !== "POST") {
      return Response.json({ ok: false, error: "method_not_allowed" }, { status: 405 });
    }
    if (!request.headers.get(PROXY_HEADER)) {
      return Response.json({ ok: false, error: "missing_proxy_header" }, { status: 401 });
    }
    let body = {};
    try {
      body = await request.json();
    } catch (_) {
      return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }
    const q = body.q || body.query || "";
    const limit = Math.min(50, Math.max(1, Number(body.limit) || 10));
    const hits = fixtureForQ(q).slice(0, limit);
    return Response.json({ hits, mock: true, echo_q: q });
  },
};
