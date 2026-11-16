import { readReconciliation } from './reconciliation.mjs';
import { authorizeIdentity } from './auth.mjs';
import {reviewRoute} from './reviews.mjs';
import {REVIEW_HTML,REVIEW_CSS,REVIEW_JS} from './review-ui.mjs';
import { queryPlan, readDashboard } from './queries.mjs';
import { HTML, CSS, JS } from './dashboard.mjs';

const HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  'Strict-Transport-Security': 'max-age=31536000',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
function reply(body, status = 200, type = 'text/plain; charset=utf-8') {
  return new Response(body, { status, headers: { ...HEADERS, 'Content-Type': type } });
}

// Exported injection points are for local tests; no deployment flag bypasses auth.
export function createHandler(auth = authorizeIdentity, read = readDashboard) {
  const cache = new Map();
  return async function handle(request, env) {
    const identity=await auth(request,env);
    if(!identity)return reply('Forbidden',403);
    const reviewURL=new URL(request.url);
    if(reviewURL.pathname.startsWith('/api/reviews')){try{const r=await reviewRoute(request,env,identity);return reply(request.method==='HEAD'?null:r.body,r.status,r.type)}catch{return reply(JSON.stringify({error:'review_service_unavailable'}),503,'application/json')}}
    if (!['GET', 'HEAD'].includes(request.method)) return reply('Method not allowed', 405);
    const url = new URL(request.url);
    if (url.pathname === '/robots.txt') return reply('User-agent: *\nDisallow: /\n');
    const assets = { '/reviews':[REVIEW_HTML,'text/html; charset=utf-8'], '/reviews.css':[REVIEW_CSS,'text/css; charset=utf-8'], '/reviews.js':[REVIEW_JS,'application/javascript; charset=utf-8'], '/': [HTML, 'text/html; charset=utf-8'], '/dashboard.css': [CSS, 'text/css; charset=utf-8'], '/dashboard.js': [JS, 'application/javascript; charset=utf-8'] };
    if (Object.hasOwn(assets, url.pathname)) {
      const [body, type] = assets[url.pathname];
      return reply(request.method === 'HEAD' ? null : body, 200, type);
    }
    if (url.pathname === '/api/reconciliation') return reply(request.method === 'HEAD' ? null : JSON.stringify(await readReconciliation(env)), 200, 'application/json');
    if (url.pathname !== '/api/dashboard') return reply('Not found', 404);
    let plan;
    try { plan = queryPlan(url.searchParams); } catch { return reply('Invalid dashboard filter', 400); }
    if (request.method === 'HEAD') return reply(null, 200, 'application/json');
    const key = `${env.CF_ACCOUNT_ID}:${env.ACCESS_AUD}:${plan.hours}:${plan.traffic}`;
    let entry = cache.get(key);
    if (!entry || entry.expires <= Date.now()) {
      if (cache.size >= 32) cache.delete(cache.keys().next().value);
      entry = { expires: Date.now() + 60000, promise: read(env, url.searchParams) };
      cache.set(key, entry);
    }
    try { return reply(JSON.stringify(await entry.promise), 200, 'application/json'); }
    catch {
      cache.delete(key);
      return reply(JSON.stringify({ error: 'Analytics unavailable. Check dataset ingestion and the server-side read credential.' }), 503, 'application/json');
    }
  };
}

export default { fetch: createHandler() };
