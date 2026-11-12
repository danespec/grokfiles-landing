// Sign an authorized GAH probe without printing the secret or signature.
// GAH_MONITOR_HMAC_SECRET=... node scripts/monitor-fetch.mjs https://grokarchivehub.com/robots.txt
import { readFileSync } from 'node:fs';
import { monitorSignature } from '../src/collector.mjs';
const url = new URL(process.argv[2] || 'https://grokarchivehub.com/robots.txt');
if (url.protocol !== 'https:' || !['grokarchivehub.com', 'www.grokarchivehub.com'].includes(url.hostname) || url.port || url.username || url.password) throw new Error('Only the public GAH HTTPS hosts are allowed');
const secret = process.env.GAH_MONITOR_HMAC_SECRET_FILE
  ? readFileSync(process.env.GAH_MONITOR_HMAC_SECRET_FILE, 'utf8').trim()
  : process.env.GAH_MONITOR_HMAC_SECRET;
const request = new Request(url, { headers: { 'User-Agent': 'GAH-Monitor/1.0' } });
request.headers.set('X-GAH-Monitor', await monitorSignature(request, secret));
const response = await fetch(request, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
console.log(JSON.stringify({ status: response.status, route: url.pathname, monitoring_signature_attached: true }));
await response.body?.cancel();
