import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, SignJWT, exportJWK, createLocalJWKSet } from 'jose';
import { observeRequest, routeLabel, sourceLabel, trafficLabel, monitorSignature, scheduleObservation } from '../src/collector.mjs';
import { authorize } from '../src/auth.mjs';
import { queryPlan, readDashboard } from '../src/queries.mjs';
import { createHandler } from '../src/worker.mjs';

const now = Date.parse('2026-11-12T19:00:00Z');
const secret = 'local-test-only-monitor-secret-0123456789';
const req = (path = '/', headers = {}) => new Request('https://grokarchivehub.com' + path, { headers });
const html = new Response('archive', { headers: { 'content-type': 'text/html' } });

test('privacy schema discards IP, identifiers, query text, cookies, full referrer and arbitrary paths', async () => {
  const points = [], request = req('/not-published/person@example.com?token=secret&q=private-search', {
    'cf-connecting-ip': '192.0.2.5', cookie: 'session=private-cookie', authorization: 'Bearer private-auth',
    referer: 'https://reddit.com/private-source?token=private-referrer', 'user-agent': 'Personal browser with unique marker',
  });
  Object.defineProperty(request, 'cf', { value: { country: 'US', city: 'Parker', asn: 1234 } });
  await observeRequest(request, html, { GAH_INTEL_ENABLED: 'true', GAH_INTEL_EVENTS: { writeDataPoint: p => points.push(p) } }, now - 25, now);
  assert.deepEqual(points, [{ indexes: ['grokarchivehub.com'], blobs: ['gah_intel_v1', 'grokarchivehub.com', '/[other]', 'GET', 'US', 'reddit', 'unclassified'], doubles: [200, 25, 1] }]);
  assert.doesNotMatch(JSON.stringify(points), /192\.0|private|session|example\.com|Parker|1234|unique marker/);
  assert.equal(routeLabel('/investigations.html'), '/investigations');
  assert.equal(routeLabel('/api/account/secret-id'), '/api/[other]');
  assert.equal(routeLabel('/evidence-data/private-person.pdf'), '/[evidence-file]');
  assert.equal(sourceLabel('https://google.com.evil.test?q=secret'), 'other');
  assert.equal(sourceLabel('https://www.google.com/search?q=secret'), 'google');
});

test('signed monitoring is distinct, expires and binds to method and path', async () => {
  const request = req('/search?q=discarded', { 'user-agent': 'GAH-Monitor/1' });
  const signature = await monitorSignature(request, secret, now / 1000);
  const env = { GAH_MONITOR_HMAC_SECRET: secret };
  const signed = req('/search?q=anything', { 'x-gah-monitor': signature });
  assert.equal(await trafficLabel(signed, env, now), 'monitoring');
  assert.equal(await trafficLabel(signed, env, now + 301000), 'unclassified');
  assert.equal(await trafficLabel(req('/account', { 'x-gah-monitor': signature }), env, now), 'unclassified');
  assert.equal(await trafficLabel(new Request(signed, { method: 'POST' }), env, now), 'unclassified');
  assert.equal(await trafficLabel(req('/search', { 'x-gah-monitor': signature.slice(0, -1) + (signature.endsWith('0') ? '1' : '0') }), env, now), 'unclassified');
  assert.equal(await trafficLabel(request, env, now), 'declared_automation');
  assert.equal(await trafficLabel(req('/', { 'user-agent': 'curl/8' }), env, now), 'declared_automation');
  const bot = req(); Object.defineProperty(bot, 'cf', { value: { botManagement: { verifiedBot: true } } });
  assert.equal(await trafficLabel(bot, env, now), 'verified_bot');
});

test('collector stays disabled by default, excludes preview hosts and never breaks responses', async () => {
  let writes = 0;
  const env = { GAH_INTEL_EVENTS: { writeDataPoint() { writes++; throw new Error('storage down'); } } };
  await observeRequest(req(), html, env, now, now);
  assert.equal(writes, 0);
  env.GAH_INTEL_ENABLED = 'true';
  await observeRequest(new Request('https://preview.pages.dev/'), html, env, now, now);
  assert.equal(writes, 0);
  await observeRequest(req(), html, env, now, now);
  assert.equal(writes, 1);
  assert.doesNotThrow(() => scheduleObservation({ waitUntil() { throw new Error('ctx invalid'); } }, req(), html, env, now));
  const tasks = []; scheduleObservation({ waitUntil: p => tasks.push(p) }, req(), html, env, now);
  await Promise.all(tasks); assert.equal(writes, 3);
});

test('Access verifies signature, owner, audience, issuer, expiry and dashboard hostname', async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = await exportJWK(publicKey); jwk.kid = 'local-test-key';
  const keys = createLocalJWKSet({ keys: [jwk] });
  const env = { ACCESS_TEAM_DOMAIN: 'https://test.cloudflareaccess.com', ACCESS_AUD: 'intel-only', ACCESS_OWNER_EMAIL: 'owner@example.test' };
  const issue = async (claims = {}, key = privateKey) => new SignJWT({ email: env.ACCESS_OWNER_EMAIL, ...claims }).setProtectedHeader({ alg: 'RS256', kid: jwk.kid }).setIssuer(env.ACCESS_TEAM_DOMAIN).setAudience('intel-only').setSubject('owner').setIssuedAt().setExpirationTime('5m').sign(key);
  const request = token => new Request('https://intel.grokarchivehub.com/api/dashboard', { headers: token ? { 'cf-access-jwt-assertion': token } : {} });
  const valid = await issue();
  assert.equal(await authorize(request(valid), env, keys), true);
  assert.equal(await authorize(request(), env, keys), false);
  assert.equal(await authorize(request('forged'), env, keys), false);
  assert.equal(await authorize(request(await issue({ email: 'other@example.test' })), env, keys), false);
  assert.equal(await authorize(request(valid), { ...env, ACCESS_AUD: 'other-app' }, keys), false);
  assert.equal(await authorize(request(valid), { ...env, ACCESS_TEAM_DOMAIN: 'https://other.cloudflareaccess.com' }, keys), false);
  assert.equal(await authorize(request(valid), { ...env, ACCESS_OWNER_EMAIL: '' }, keys), false);
  assert.equal(await authorize(new Request('https://gah-intel.workers.dev/', { headers: { 'cf-access-jwt-assertion': valid } }), env, keys), false);
  assert.equal(await authorize(new Request('http://intel.grokarchivehub.com/', { headers: { 'cf-access-jwt-assertion': valid } }), env, keys), false);
  const expired = await new SignJWT({ email: env.ACCESS_OWNER_EMAIL }).setProtectedHeader({ alg: 'RS256', kid: jwk.kid }).setIssuer(env.ACCESS_TEAM_DOMAIN).setAudience('intel-only').setSubject('owner').setIssuedAt().setExpirationTime(Math.floor(Date.now() / 1000) - 60).sign(privateKey);
  assert.equal(await authorize(request(expired), env, keys), false);
  const otherKey = await generateKeyPair('RS256');
  assert.equal(await authorize(request(await issue({}, otherKey.privateKey)), env, keys), false);
});

test('all dashboard surfaces fail closed, never cache publicly and reject writes', async () => {
  const closed = createHandler();
  for (const path of ['/', '/api/dashboard', '/dashboard.js', '/dashboard.css', '/robots.txt']) {
    const response = await closed(new Request('https://intel.grokarchivehub.com' + path), {});
    assert.equal(response.status, 403); assert.match(response.headers.get('cache-control'), /no-store/);
    assert.match(response.headers.get('x-robots-tag'), /noindex/);
  }
  let reads = 0;
  const handler = createHandler(async () => true, async () => { reads++; return { schema: 'test' }; });
  const api = new Request('https://intel.grokarchivehub.com/api/dashboard?hours=24&traffic=unclassified');
  await Promise.all([handler(api, {}), handler(api, {})]); assert.equal(reads, 1);
  assert.equal((await handler(new Request(api, { method: 'HEAD' }), {})).status, 200); assert.equal(reads, 1);
  assert.equal((await handler(new Request(api, { method: 'POST' }), {})).status, 405);
  assert.equal((await handler(new Request('https://intel.grokarchivehub.com/api/dashboard?hours=999'), {})).status, 400);
  assert.equal((await handler(new Request('https://intel.grokarchivehub.com/unknown'), {})).status, 404);
  const page = await handler(new Request('https://intel.grokarchivehub.com/'), {});
  assert.match(await page.text(), /Traffic, with context/); assert.doesNotMatch(page.headers.get('content-security-policy'), /unsafe/);
});

test('SQL filters are bounded, sample weights are used and raw SQL cannot be submitted', async () => {
  const p = queryPlan(new URLSearchParams('hours=24'), now);
  assert.equal(p.traffic, 'unclassified'); assert.equal(Object.keys(p.sql).length, 6);
  for (const sql of Object.values(p.sql)) { assert.match(sql, /SUM\(_sample_interval/); assert.match(sql, /FORMAT JSON$/); }
  assert.match(p.sql.summary, /blob7 = 'unclassified'/);
  assert.doesNotMatch(p.sql.traffic, /blob7 = 'unclassified'/);
  assert.throws(() => queryPlan(new URLSearchParams("traffic=x' OR 1=1")), /Invalid/);
  assert.throws(() => queryPlan(new URLSearchParams('hours=-24')), /Invalid/);
  assert.doesNotMatch(JSON.stringify(queryPlan(new URLSearchParams('sql=DROP%20TABLE%20anything'), now)), /DROP/);
  const calls = [];
  const payload = await readDashboard({ CF_ACCOUNT_ID: 'a'.repeat(32), ANALYTICS_READ_TOKEN: 'test-private-token' }, new URLSearchParams(), async (url, init) => {
    calls.push({ url, init }); return Response.json({ data: [{ requests: '2' }] });
  }, now);
  assert.equal(calls.length, 6); assert.match(calls[0].init.headers.Authorization, /Bearer/);
  assert.doesNotMatch(JSON.stringify(payload), /test-private-token|Authorization|SELECT/);
  await assert.rejects(() => readDashboard({ CF_ACCOUNT_ID: 'a'.repeat(32), ANALYTICS_READ_TOKEN: 'token' }, new URLSearchParams(), async () => new Response('secret provider detail', { status: 403 })), /Analytics query failed/);
});

test('provider failure is 503 and cannot become an empty success', async () => {
  const handler = createHandler(async () => true, async () => { throw new Error('private credential detail'); });
  const response = await handler(new Request('https://intel.grokarchivehub.com/api/dashboard'), {});
  assert.equal(response.status, 503); assert.doesNotMatch(await response.text(), /private credential detail/);
});
