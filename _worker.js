const FRONTDOOR_PATHS = new Set([
  "/",
  "/start",
  "/dispatches",
  "/dispatches/epstein-death",
  "/dispatches/barak-archive",
  "/archive",
  "/search",
  "/membership",
  "/login",
  "/account",
  "/forum",
  "/live",
  "/donate",
  "/faq",
  "/contact",
  "/support"
]);

function cleanPath(pathname) {
  return pathname.replace(/\/+$/, "") || "/";
}

function withHeader(response, name, value) {
  const headers = new Headers(response.headers);
  headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function serveFrontdoor(request, env) {
  const response = await env.ASSETS.fetch(request);
  return withHeader(response, "X-Grok-Frontdoor", "GAH-FRONTDOOR-001");
}

async function proxyProofLayer(request) {
  const target = new URL(request.url);
  target.protocol = "https:";
  target.hostname = "wiki.grokarchivehub.com";
  target.port = "";

  const upstream = await fetch(new Request(target.toString(), request));
  return withHeader(upstream, "X-GAH-Apex-Proxy", "wiki.grokarchivehub.com");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = cleanPath(url.pathname);

    if ((request.method === "GET" || request.method === "HEAD") && path === "/wiki") {
      return new Response(null, {
        status: 302,
        headers: {
          "Location": "/grok-command-v4",
          "Cache-Control": "no-store",
          "X-Grok-Frontdoor": "GAH-FRONTDOOR-001"
        }
      });
    }

    if (
      FRONTDOOR_PATHS.has(path) ||
      url.pathname.startsWith("/frontdoor/") ||
      path === "/ads.txt" ||
      path === "/app-ads.txt"
    ) {
      return serveFrontdoor(request, env);
    }

    return proxyProofLayer(request);
  }
};
