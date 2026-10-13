import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker=fs.readFileSync(new URL('../_worker.js',import.meta.url),'utf8');
const start=worker.indexOf('    html = html\n      .replace(/\\/assets\\/site');
const stop=worker.indexOf('      .replace(/\\/assets\\/images\\/barak-archive-hero',start);
assert.ok(start>0 && stop>start,'worker has expected Barak runtime rewriting block');
const expression=worker.slice(start,stop);
const rewrite=new Function('html',expression+'; return html;');
const src='<script src="/assets/barak-data.v298.js?v=old?v=older"></script>'+
  '<script src="/assets/barak-portal-027.js?v=old?v=older"></script>';
const result=rewrite(src);
const data='/assets/barak-data-050.js?v=ren-barak-count-012-20261012';
const viewer='/assets/barak-portal-027.js?v=ren-barak-count-012-20261012';
assert.ok(result.includes(data),'current data file linked');
assert.ok(result.includes(viewer),'current viewer file linked');
assert.equal(result.split(data).length-1,1);
assert.equal(result.split(viewer).length-1,1);
assert.ok(!result.includes('?v=old'),'no stale query remains');
assert.ok(!result.includes('?v=ren-barak-count-012-20261012?'),'no stacked query');
const again=rewrite(result);
assert.equal(again,result,'normalization is idempotent');
const dataSource=fs.readFileSync(new URL('../assets/barak-data-050.js',import.meta.url),'utf8');
assert.ok(dataSource.includes('"Metadata-only slots":5483'));
assert.ok(dataSource.includes('"metadataOnlySlot":5483'));
assert.ok(dataSource.includes('"archiveEmailSlots":11089'));
for(const alias of ['barak-portal.js','barak-portal-027.js']){
  const s=fs.readFileSync(new URL('../assets/'+alias,import.meta.url),'utf8');
  assert.ok(s.includes('Archive-labeled recovered slots (unverified)'));
}
console.log('PASS 12 Barak row counts and normalized active asset assertions');
