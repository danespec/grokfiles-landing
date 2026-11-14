import {HeadHtmlRewriterFixture as Rewriter} from './fixtures/html-rewriter-head.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import worker from '../_worker.js';
import {ATLAS_PREPARED_READER as manifest} from '../content/atlas-prepared-reader.mjs';
const root=new URL('../',import.meta.url),html=await fs.readFile(new URL('atlas/prepared-reader.html',root),'utf8'),md=await fs.readFile(new URL('atlas/prepared-reader.md',root),'utf8');
const hash=x=>createHash('sha256').update(x).digest('hex');
assert.equal(hash(html),manifest.html_sha256);assert.equal(hash(md),manifest.markdown_sha256);assert.equal(hash(await fs.readFile(new URL('atlas.html',root))),manifest.source_html_sha256);
assert(!html.includes('window.GAH_CONSENT_BOOT='));assert(!html.includes('/frontdoor/analytics.js'));assert(md.includes('Story Atlas'));
const originalRewriter=globalThis.HTMLRewriter;
globalThis.HTMLRewriter=Rewriter;
const env={GAH_STAGING:'true',GAH_GOOGLE_TAG_ENABLED:'false',GAH_AGENT_METRICS_SAMPLE_RATE:'0',ASSETS:{fetch:async input=>{const path=new URL(typeof input==='string'?input:input.url).pathname;assert(['/atlas/prepared-reader.html','/atlas/prepared-reader.md'].includes(path));return new Response(path.endsWith('.md')?md:html,{headers:{'Content-Type':path.endsWith('.md')?'text/markdown':'text/html','Cache-Control':'public, max-age=0, must-revalidate'}});}}};
const get=(path,options={},e=env)=>worker.fetch(new Request('https://grokarchivehub.com'+path,options),e);
try{
 const response=await get('/atlas/');assert.equal(response.status,200);assert.equal(response.headers.get('X-GAH-Prepared-Atlas'),'v1');assert.equal(response.headers.get('Cache-Control'),'no-store');assert.match(response.headers.get('X-Robots-Tag'),/noindex/);assert(response.headers.get('Content-Security-Policy'));
 const body=await response.text();assert.equal((body.match(/window.GAH_CONSENT_BOOT=/g)||[]).length,1);assert.equal((body.match(/src="\/frontdoor\/analytics.js/g)||[]).length,1);assert.equal((body.match(/src="\/frontdoor\/consent.js/g)||[]).length,1);assert(body.includes('https://grokarchivehub.com/atlas/'));
 const h=await get('/atlas/',{method:'HEAD'});assert.equal(await h.text(),'');assert.equal(h.status,200);
 const markdown=await get('/atlas/',{headers:{Accept:'text/markdown'}});assert.match(markdown.headers.get('Content-Type'),/text\/markdown/);assert.equal(await markdown.text(),md);
 for(const path of ['/atlas/prepared-reader.html','/atlas/prepared-reader.md','/atlas/prepared-reader'])assert.equal((await get(path)).status,404);
 const missing=await get('/atlas/',{}, {...env,ASSETS:{fetch:async()=>{throw Error('asset service must not be called');}}});assert.equal(missing.status,200);assert.equal((await missing.text()).includes('Story Atlas'),true);
}finally{globalThis.HTMLRewriter=originalRewriter;}
console.log('PASS prepared Atlas hash integrity, private asset guards, streaming consent insertion, CSP/noindex, HEAD/Markdown parity and asset-service independence');
