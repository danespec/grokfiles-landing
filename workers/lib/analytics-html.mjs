// Public instrumentation only. This module does not change advertising or SEO policy.
export function normalizeAnalyticsHtml(html, scripts) {
  if (!/<\/head>/i.test(html)) return html;
  return html
    .replace(/<script\b[^>]*>\s*window\.GAH_CONSENT_BOOT=[\s\S]*?<\/script>/gi, '')
    .replace(/<script\b[^>]*src=["'][^"']*\/frontdoor\/(?:analytics|consent)\.js[^"']*["'][^>]*>\s*<\/script>/gi, '')
    .replace(/<\/head>/i, scripts + '\n</head>');
}

export async function instrumentHtmlResponse(response, request, scripts) {
  if (request.method !== 'GET' || response.status !== 200 || !/text\/html/i.test(response.headers.get('Content-Type') || '')) return response;
  const url = new URL(request.url);
  if (!['grokarchivehub.com', 'www.grokarchivehub.com', 'wiki.grokarchivehub.com'].includes(url.hostname) && !url.hostname.endsWith('.pages.dev')) return response;
  if (/^\/(?:api|admin|login|account|cdn-cgi)(?:\/|$)/.test(url.pathname)) return response;
  const body = normalizeAnalyticsHtml(await response.text(), scripts);
  const headers = new Headers(response.headers);
  for (const name of ['Content-Length', 'Content-Encoding', 'ETag']) headers.delete(name);
  headers.set('X-GAH-Analytics-Instrumentation', 'GAH-ANALYTICS-PARITY-001');
  return new Response(body, {status: response.status, statusText: response.statusText, headers});
}
