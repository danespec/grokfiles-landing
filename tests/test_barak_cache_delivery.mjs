import assert from 'node:assert/strict';
import fs from 'node:fs';
const worker=fs.readFileSync(new URL('../_worker.js',import.meta.url),'utf8');
const filenames=['../assets/barak-portal.js','../assets/barak-portal-027.js'];
assert.ok(worker.includes('/assets/barak-portal-027.js?v=ren-barak-cache-008-20261012'));
for(const filename of filenames){
  const s=fs.readFileSync(new URL(filename,import.meta.url),'utf8');
  assert.ok(s.includes('/assets/barak-archive-emails.json?v=ren-barak-cache-008-20261012'));
  assert.ok(s.includes('url === "/assets/barak-archive-emails.json"'));
  assert.ok(s.includes('item.type === "email" || item.slotClass === "recovered_email"'));
  assert.ok(!s.includes('Parent message recovered from a Gmail-export PDF mirror'));
}
assert.ok(worker.includes('X-GAH-Barak-Manifest-Proxy'));
console.log('PASS 10 cache-versioned Barak frontend assertions');
