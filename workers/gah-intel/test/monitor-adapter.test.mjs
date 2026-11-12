import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { monitorSignature } from '../src/collector.mjs';

test('scheduled monitor Python adapter and Worker agree on signed GET, range and POST probes', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'gah-intel-test-'));
  const file = join(dir, 'monitor.secret'), secret = 'local-monitor-test-secret-0123456789', timestamp = 1794510000;
  writeFileSync(file, secret, { mode: 0o600 });
  const run = args => execFileSync('python3', ['-c', `import importlib.util,json,sys\ns=importlib.util.spec_from_file_location('adapter','scripts/gah_intel_curl.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)\nprint(m.curl_config(json.loads(sys.argv[1]),sys.argv[2],int(sys.argv[3])),end='')`, JSON.stringify(args), file, String(timestamp)], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  try {
    for (const [method, args, path] of [
      ['GET', ['-sS', '-L', 'https://grokarchivehub.com/robots.txt'], '/robots.txt'],
      ['GET', ['-H', 'Range: bytes=0-0', 'https://grokarchivehub.com/file.pdf'], '/file.pdf'],
      ['POST', ['-X', 'POST', '-d', '{"q":"private-search"}', 'https://grokarchivehub.com/api/search'], '/api/search'],
    ]) {
      const signature = await monitorSignature(new Request('https://grokarchivehub.com' + path, { method }), secret, timestamp);
      const output = run(args);
      assert.match(output, /GAH-Monitor\/1.0/); assert.ok(output.includes(signature));
      assert.ok(!output.includes(secret)); assert.doesNotMatch(output, /private-search/);
    }
    assert.doesNotMatch(run(['https://evil.test/']), /X-GAH-Monitor/);
    chmodSync(file, 0o644);
    assert.throws(() => run(['https://grokarchivehub.com/']), /private/);
  } finally { rmSync(dir, { recursive: true }); }
});
