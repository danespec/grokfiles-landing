import { PUBLIC_PATHS } from './public-paths.mjs';

const encoder = new TextEncoder();
const HOSTS = new Set(['grokarchivehub.com', 'www.grokarchivehub.com']);
const API_PATHS = new Set(['/api/search', '/api/archive-status', '/api/book-of-black/status', '/api/book-of-black/ledger', '/mcp', '/openapi.json', '/robots.txt', '/sitemap.xml', '/sitemap-index.xml']);
const SOURCES = [['google.com', 'google'], ['bing.com', 'bing'], ['duckduckgo.com', 'duckduckgo'], ['reddit.com', 'reddit'], ['x.com', 'x'], ['twitter.com', 'x'], ['t.co', 'x'], ['instagram.com', 'instagram'], ['facebook.com', 'facebook'], ['chatgpt.com', 'chatgpt'], ['grokarchivehub.com', 'internal']];

export function routeLabel(pathname) {
  // Only pre-existing published paths survive. No arbitrary URL segments or IDs.
  const path = pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  if (PUBLIC_PATHS.has(path) || API_PATHS.has(path)) return path;
  if (path.startsWith('/api/')) return '/api/[other]';
  if (path.startsWith('/assets/') || /\.(?:css|js|mjs|png|jpg|jpeg|webp|woff2|svg|ico)$/.test(path)) return '/[asset]';
  if (/\.(?:pdf|zip)$/i.test(path) || /^\/(?:evidence-data|source-renders)\//.test(path)) return '/[evidence-file]';
  return '/[other]';
}

export function sourceLabel(referrer) {
  if (!referrer) return 'direct_or_unknown';
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    return SOURCES.find(([domain]) => host === domain || host.endsWith('.' + domain))?.[1] || 'other';
  } catch { return 'direct_or_unknown'; }
}

export async function monitorSignature(request, secret, timestamp = Math.floor(Date.now() / 1000)) {
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('Monitoring secret must contain at least 32 characters');
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const message = `${timestamp}\n${request.method}\n${new URL(request.url).pathname}`;
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return `${timestamp}.${Array.from(new Uint8Array(mac), b => b.toString(16).padStart(2, '0')).join('')}`;
}

async function isMonitor(request, secret, now) {
  const value = request.headers.get('x-gah-monitor') || '';
  if (!/^\d{10}\.[a-f0-9]{64}$/.test(value) || typeof secret !== 'string' || secret.length < 32) return false;
  const timestamp = Number(value.split('.')[0]);
  if (Math.abs(now / 1000 - timestamp) > 300) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const mac = Uint8Array.from(value.split('.')[1].match(/../g), pair => parseInt(pair, 16));
  return crypto.subtle.verify('HMAC', key, mac, encoder.encode(`${timestamp}\n${request.method}\n${new URL(request.url).pathname}`));
}

export async function trafficLabel(request, env, now = Date.now()) {
  if (await isMonitor(request, env.GAH_MONITOR_HMAC_SECRET, now)) return 'monitoring';
  if (request.cf?.botManagement?.verifiedBot === true) return 'verified_bot';
  if (/bot\b|crawler|spider|curl\/|wget\/|python-requests|playwright|headless|GAH[- /](?:Monitor|Audit|Probe)/i.test(request.headers.get('user-agent') || '')) return 'declared_automation';
  return 'unclassified';
}

export async function observeRequest(request, response, env, started, now = Date.now()) {
  try {
    if (env.GAH_INTEL_ENABLED !== 'true' || !env.GAH_INTEL_EVENTS?.writeDataPoint) return;
    const url = new URL(request.url);
    if (!HOSTS.has(url.hostname)) return; // Preview and dashboard traffic stay out.
    const method = ['GET', 'HEAD', 'POST', 'OPTIONS'].includes(request.method) ? request.method : 'OTHER';
    const country = /^[A-Z]{2}$/.test(request.cf?.country || '') ? request.cf.country : 'unknown';
    env.GAH_INTEL_EVENTS.writeDataPoint({
      indexes: [url.hostname],
      blobs: ['gah_intel_v1', url.hostname, routeLabel(url.pathname), method, country,
        sourceLabel(request.headers.get('referer')), await trafficLabel(request, env, now)],
      doubles: [response.status, Math.max(0, Math.min(120000, now - started)),
        request.method === 'GET' && response.status >= 200 && response.status < 300 && /text\/html/i.test(response.headers.get('content-type') || '') ? 1 : 0],
    });
  } catch { /* Telemetry must never change a public response or log request data. */ }
}

export function scheduleObservation(ctx, request, response, env, started) {
  if (env.GAH_INTEL_ENABLED !== 'true' || typeof ctx?.waitUntil !== 'function') return;
  try { ctx.waitUntil(observeRequest(request, response, env, started)); } catch { /* fail open */ }
}
