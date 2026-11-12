// Loopback-only visual QA server. Fixture data is clearly labeled and never deployed.
import { createServer } from 'node:http';
import { HTML, CSS, JS } from '../src/dashboard.mjs';

createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:8791');
  if (url.pathname === '/api/dashboard') {
    if (url.searchParams.get('traffic') === 'monitoring') {
      res.writeHead(503, { 'Content-Type': 'application/json' }); res.end('{"error":"Local QA failure state"}'); return;
    }
    const now = Date.now(), hours = Number(url.searchParams.get('hours') || 24), start = now - hours * 3600000;
    const empty = hours === 1;
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ schema: 'gah_intel_dashboard_v1', generated_at: new Date(now).toISOString(), since: new Date(start).toISOString(), until: new Date(now).toISOString(), hours,
      summary: [{ requests: empty ? 0 : 1248, html_responses: empty ? 0 : 694, server_errors: 2, client_errors: 34, mean_ms: 143 }],
      traffic: empty ? [] : [{ label: 'unclassified', requests: 1248 }, { label: 'monitoring', requests: 426 }, { label: 'verified_bot', requests: 318 }, { label: 'declared_automation', requests: 207 }],
      routes: empty ? [] : [{ label: '/', requests: 286 }, { label: '/investigations', requests: 194 }, { label: '/research/evidence/epstein-death', requests: 158 }, { label: '/atlas', requests: 126 }, { label: '/api/search', requests: 104 }, { label: '/news', requests: 88 }],
      sources: empty ? [] : [{ label: 'direct_or_unknown', requests: 635 }, { label: 'google', requests: 318 }, { label: 'reddit', requests: 146 }, { label: 'x', requests: 92 }, { label: 'chatgpt', requests: 57 }],
      countries: empty ? [] : [{ label: 'US', requests: 921 }, { label: 'GB', requests: 117 }, { label: 'CA', requests: 98 }, { label: 'DE', requests: 64 }, { label: 'unknown', requests: 48 }],
      timeline: empty ? [] : Array.from({ length: hours > 168 ? 30 : hours }, (_, i) => ({ bucket: new Date(Math.floor(start / 3600000) * 3600000 + i * (hours > 168 ? 24 : 1) * 3600000).toISOString(), requests: 19 + (i * 17 % 70) })),
    })); return;
  }
  const routes = { '/': [HTML.replace('Connecting</div>', 'LOCAL QA · SAMPLE DATA</div>').replace('GROK ARCHIVE HUB / OPERATIONS', 'LOCAL PREVIEW / SAMPLE DATA'), 'text/html'], '/dashboard.css': [CSS, 'text/css'], '/dashboard.js': [JS, 'application/javascript'] };
  if (!routes[url.pathname]) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': routes[url.pathname][1] }); res.end(routes[url.pathname][0]);
}).listen(8791, '127.0.0.1', () => console.log('Visual QA preview on http://127.0.0.1:8791 (sample data only)'));
