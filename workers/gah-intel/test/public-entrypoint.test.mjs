import test from 'node:test';
import assert from 'node:assert/strict';
import publicWorker from '../../../_worker.js';

test('public entrypoint preserves body and headers while telemetry failure remains isolated', async () => {
  const request = new Request('https://grokarchivehub.com/api/intel-local-test');
  const response = new Response('{"ok":true}', { status: 202, headers: { 'Content-Type': 'application/json', 'x-fixture': 'unchanged' } });
  const instance = { ...publicWorker, async handleStagingFetch() { return response; } };
  let writes = 0;
  const tasks = [];
  const result = await instance.fetch(request, { GAH_INTEL_ENABLED: 'true', GAH_INTEL_EVENTS: { writeDataPoint() { writes++; throw new Error('analytics unavailable'); } } }, { waitUntil: p => tasks.push(p) });
  assert.equal(result, response); assert.equal(result.status, 202); assert.equal(result.headers.get('x-fixture'), 'unchanged');
  assert.equal(await result.text(), '{"ok":true}'); await Promise.all(tasks); assert.equal(writes, 1);
});

test('public errors retain the original error and emit one 500 observation', async () => {
  const original = new Error('original-handler-failure'), points = [], tasks = [];
  const instance = { ...publicWorker, async handleStagingFetch() { throw original; } };
  await assert.rejects(() => instance.fetch(new Request('https://grokarchivehub.com/'), { GAH_INTEL_ENABLED: 'true', GAH_INTEL_EVENTS: { writeDataPoint: p => points.push(p) } }, { waitUntil: p => tasks.push(p) }), e => e === original);
  await Promise.all(tasks); assert.equal(points.length, 1); assert.equal(points[0].doubles[0], 500);
});

test('existing production and staging robots retain the correct indexing boundary', async () => {
  const request = new Request('https://grokarchivehub.com/robots.txt');
  const production = await publicWorker.fetch(request, {});
  const staging = await publicWorker.fetch(request, { GAH_STAGING: 'true' });
  assert.equal(production.status, 200); assert.equal(staging.status, 200);
  assert.equal(production.headers.get('x-robots-tag'), 'index,follow');
  assert.equal(staging.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
  assert.match(await production.text(), /User-agent/);
});
