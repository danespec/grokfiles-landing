import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PUBLICATION_POLICY} from '../content/publication-policy.mjs';
import {qualityHtml,readerQualityResponse} from '../reader-quality.mjs';
const sample='<html><head><title>Source</title><meta name="robots" content="index,follow"><link rel="canonical" href="https://grokarchivehub.com/example"></head><body><main><h1>Source</h1><p>Source preserved.</p></main></body></html>';
let receipts=0;
for(const [url,rule] of Object.entries(PUBLICATION_POLICY)){
 const html=qualityHtml(sample,url);assert.match(html,/<meta name="robots" content="noindex,follow">/);if(url!=='https://grokarchivehub.com/barak')assert.match(html,/Source preserved/);
 if(rule.canonical){assert.equal((html.match(/rel="canonical"/g)||[]).length,1);assert.ok(html.includes('href="'+rule.canonical+'"'));}
 for(const method of ['GET','HEAD']){const response=await readerQualityResponse(new Response(method==='HEAD'?null:sample,{headers:{'Content-Type':'text/html','X-Robots-Tag':'index,follow'}}),new Request(url,{method}));assert.equal(response.status,200);assert.equal(response.headers.get('X-Robots-Tag'),'noindex,follow');}
 if(url.startsWith('https://wiki.grokarchivehub.com/receipts/EFTA'))receipts++;
}
assert.equal(receipts,69);
const reg=JSON.parse(await fs.readFile(new URL('../content/identifier-dossiers.json',import.meta.url),'utf8'));
assert.equal(PUBLICATION_POLICY['https://grokarchivehub.com/archive/EFTA02300238'].canonical,'https://grokarchivehub.com/reels/reid-hoffman-island-logistics-efta02300238');assert.match(reg.entries.find(e=>e.id==='EFTA02300238').title,/Hoffman/);
console.log('PASS explicit noindex GET/HEAD and canonical decisions, all 69 wiki receipt twins, source preservation and Hoffman classification');

// Final review: source-only cards may self-canonicalize, but a duplicate must
// point directly at its selected indexable article, never another noindex URL.
for (const [url,rule] of Object.entries(PUBLICATION_POLICY)) {
 if (!url.includes('/receipts/') || !rule.canonical || rule.canonical===url) continue;
 assert.ok(!PUBLICATION_POLICY[rule.canonical]?.noindex, url+' canonical target must remain indexable');
}
for (const path of ['/latest','/forum','/topics','/barak/receipts','/barak/entities','/barak/source-map']) {
 assert.ok(PUBLICATION_POLICY['https://grokarchivehub.com'+path]?.noindex,path+' is a reader directory');
}
console.log('PASS receipt canonicals have no noindex destination chains; six listing hubs consistently excluded');
