import {publicationRule} from '../reader-quality.mjs';
import { RESEARCH_ROUTES } from '../content/research-route-policy.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const base=new URL('../backend/identifier-release-20261027/',import.meta.url);
let s=await fs.readFile(new URL('identifier-host-policy.mjs',base),'utf8');
const files=new Map([['/app/identifier-dossiers.json',await fs.readFile(new URL('content/identifier-dossiers.json',new URL('../',import.meta.url)),'utf8')]]);
// Bind only fixture paths. The production handler still reads container-local files.
s=s.replace("import fs from 'node:fs';",'const fs={readFileSync(path){return globalThis.__wikiFixture(path)}};');
const registry=JSON.parse(await fs.readFile(new URL('content/identifier-dossiers.json',new URL('../',import.meta.url)),'utf8'));
files.set('/app/black-book-source-guide.html',await fs.readFile(new URL('black-book-source-guide.html',base),'utf8'));
const EFTA_CATALOG=JSON.parse(await fs.readFile(new URL('../backend/wiki-efta-open-20261120/efta-index-eligible.json',import.meta.url),'utf8'));
files.set('/app/efta-index-eligible-20261120.json',JSON.stringify(EFTA_CATALOG));
const sampleId=EFTA_CATALOG.ids[0], mediaId='EFTA00040012';
const demoIds=[sampleId,mediaId].sort();
const catalogFixtureBin=Buffer.alloc(demoIds.length*5);
for(const [idx,id] of demoIds.entries()){catalogFixtureBin.writeUInt32BE(Number(id.slice(4)),idx*5);catalogFixtureBin.writeUInt8(id===sampleId?7:57,idx*5+4);}
const catalogFixtureSummary={schema:'gah.efta.unified.source-index.v1',as_of:'2026-11-20',records:demoIds.length,source_ids:2,ocr_ids:1,pdf_ids:1,video_ids:1,audio_ids:1,visual_indexed_ids:1,visual_entries:2,redaction_entries:1,bin_sha256:crypto.createHash('sha256').update(catalogFixtureBin).digest('hex')};
files.set('/app/efta-unified-ids-v1.bin',catalogFixtureBin);
files.set('/app/efta-unified-summary-v1.json',JSON.stringify(catalogFixtureSummary));

files.set('/app/wiki-home-identifiers.html',await fs.readFile(new URL('wiki-home.html',base),'utf8'));
files.set('/app/research-index.html','<html><head><link rel="canonical" href="https://grokarchivehub.com/research-index"><meta name="robots" content="noindex,nofollow"></head><body><main><h1>Research index</h1></main></body></html>');
for(const e of registry.entries)files.set('/app/identifier-receipts/'+e.id+'.html',await fs.readFile(new URL('receipts/'+e.id+'.html',base),'utf8'));
globalThis.__wikiFixture=path=>{assert.ok(files.has(path),path);return files.get(path)};
s=s.replace("'./content/research-route-policy.mjs'",JSON.stringify(new URL('../content/research-route-policy.mjs',import.meta.url).href));
for(const route of RESEARCH_ROUTES)files.set('/app/'+route.file,await fs.readFile(new URL(route.file,base),'utf8'));
for(const slug of ['maxwell-prosecution','epstein-victim-services-doj-coordination','epstein-victim-notification-vns-sdny-outreach','sdny-epstein-maxwell-court-filings'])files.set('/app/topic-pages/'+slug+'.html',await fs.readFile(new URL('topic-pages/'+slug+'.html',base),'utf8'));
s=s.replace("'./reader-quality.mjs'",JSON.stringify(new URL('../reader-quality.mjs',import.meta.url).href));
const {identifierHostPolicy}=await import('data:text/javascript;base64,'+Buffer.from(s).toString('base64'));
function request(path,method='GET',headers={}){const res={status:0,headers:{},body:'',writeHead(s,h){this.status=s;this.headers=h},end(b){this.body=b||''}};const handled=identifierHostPolicy({method,url:path,headers:{host:'wiki.grokarchivehub.com',...headers}},res);return{handled,...res};}
for(const path of ['/','/archive','/research-index','/catalog','/catalog/media']){const r=request(path);assert.equal(r.status,200);assert.equal(r.headers['X-Robots-Tag'],'index,follow');assert.ok(r.body.includes('href="https://wiki.grokarchivehub.com'+(path==='/'?'/':path)+'"'));}
for(const path of ['/archive/efta13764','/archive/EFTA00013764','/archive/efta00013764.html']){const r=request(path);assert.equal(r.status,301);assert.equal(r.headers.Location,'https://grokarchivehub.com/archive/EFTA00013764');}
const approvedEfta=EFTA_CATALOG.ids[0];
assert.equal(request('/archive/'+approvedEfta).handled,false,'Approved canonical wiki EFTA must reach the real source route');
assert.equal(request('/archive/'+approvedEfta.toLowerCase()).headers.Location,'https://wiki.grokarchivehub.com/archive/'+approvedEfta,'normalized source alias returns to wiki');
assert.equal(request('/archive/EFTA00013764').headers.Location,'https://grokarchivehub.com/archive/EFTA00013764','main article still owns its original EFTA');
assert.equal(request('/archive/EFTA09999999').headers.Location,'https://grokarchivehub.com/archive/EFTA09999999','unreviewed or nonexistent document stays on former route');
const fullCatalog=request('/catalog');
assert.match(fullCatalog.body,/action="\/catalog\/search"/);
assert.equal(fullCatalog.status,200);
assert.equal(fullCatalog.headers['X-Robots-Tag'],'index,follow');
assert.match(fullCatalog.body,/EFTA document inventory and source lookup/);
const mediaCatalog=request('/catalog/media');
assert.equal(mediaCatalog.status,200);
assert.equal(mediaCatalog.headers['X-Robots-Tag'],'index,follow');
assert.match(mediaCatalog.body,/Media-aware EFTA source catalog/);
assert.match(mediaCatalog.body,/Browse media source identifiers/);
assert.match(mediaCatalog.body,/Video source IDs \(1\)/);
assert.match(mediaCatalog.body,/Audio source IDs \(1\)/);
assert((mediaCatalog.body.match(/EFTA00040012/g)||[]).length>=2);
const record=request('/catalog/'+sampleId);
assert.equal(record.status,200);
assert.equal(record.headers['X-Robots-Tag'],'noindex,follow','Metadata-only exact-ID lookup never becomes a search result');
assert.match(record.body,/PDF source/);
assert.match(record.body,/Open the published EFTA source page/);
const sourceMedia=request('/catalog/'+mediaId);
assert.equal(sourceMedia.status,200);
assert.match(sourceMedia.body,/Video/);
assert.match(sourceMedia.body,/Audio/);assert.match(sourceMedia.body,/Indexed visual-artifact reference/);
assert.doesNotMatch(sourceMedia.body,/video src|audio src|<iframe/);
assert.equal(request('/catalog/EFTA99999999').status,404);
assert.equal(request('/catalog/lookup?id='+sampleId).headers.Location,'https://wiki.grokarchivehub.com/catalog/'+sampleId);
assert.equal(request('/catalog/lookup?id=../../../etc/passwd').status,400);
assert.equal(request('/catalog/lookup?id='+sampleId,'POST').handled,false);
assert.equal(request('/wiki').headers.Location,'https://wiki.grokarchivehub.com/');assert.equal(request('/methodology').headers.Location,'https://grokarchivehub.com/methodology');
for(const e of registry.entries){const r=request('/receipts/'+e.id);assert.equal(r.status,200);assert.ok(r.body.includes('https://grokarchivehub.com/archive/'+e.id));assert.equal(r.headers['X-Robots-Tag'],'index,follow');}
assert.ok(request('/archive').body.includes('property="og:url" content="https://wiki.grokarchivehub.com/archive"'));
const xml=request('/sitemap.xml').body;
const indexXml=request('/sitemap-index.xml').body;
assert.match(indexXml,/<sitemapindex/);
assert.match(indexXml,/https:\/\/wiki\.grokarchivehub\.com\/sitemap\.xml/);
assert.match(indexXml,/https:\/\/wiki\.grokarchivehub\.com\/sitemap-efta-1\.xml/);
const eftaXml=request('/sitemap-efta-1.xml').body;
const actualEftaUrls=[...eftaXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
assert.equal(actualEftaUrls.length,12100);
assert.equal(new Set(actualEftaUrls).size,12100);
assert.equal(actualEftaUrls[0],'https://wiki.grokarchivehub.com/archive/'+EFTA_CATALOG.ids[0]);
assert.equal(request('/sitemap-archive-1.xml').headers.Location,'https://wiki.grokarchivehub.com/sitemap-efta-1.xml');
assert.match(request('/robots.txt').body,/Sitemap: https:\/\/wiki\.grokarchivehub\.com\/sitemap-index\.xml/);

const homeUrls=['/','/archive','/research-index','/catalog','/catalog/media'];
const eligibleResearch=RESEARCH_ROUTES.filter(r=>r.owner==='wiki'&&r.indexable&&!publicationRule('https://wiki.grokarchivehub.com'+r.path)?.noindex).map(r=>r.path);
const eligibleReceipts=registry.entries.filter(e=>e.indexable).map(e=>'/receipts/'+e.id).filter(p=>{const url='https://wiki.grokarchivehub.com'+p,rule=publicationRule(url);return !rule?.noindex&&(!rule?.canonical||rule.canonical===url)});
const eligibleTopics=['/topics/maxwell-prosecution','/topics/epstein-victim-services-doj-coordination','/topics/epstein-victim-notification-vns-sdny-outreach','/topics/sdny-epstein-maxwell-court-filings'];
const expected=new Set([...homeUrls,...eligibleResearch,...eligibleReceipts,...eligibleTopics].map(p=>'https://wiki.grokarchivehub.com'+p));
assert.equal(eligibleResearch.length,66,'64 newly opened research routes plus two existing');
assert.equal(eligibleReceipts.length,14,'standalone source receipts, no duplicate canonical homes');
assert.equal(expected.size,89);
const actual=new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]));
assert.deepEqual(actual,expected,'Only self-canonical, published wiki routes enter XML discovery');assert.doesNotMatch(xml,/<loc>https:\/\/grokarchivehub.com/);assert.match(request('/robots.txt').body,/Sitemap: https:\/\/wiki.grokarchivehub.com\/sitemap-index.xml/);
assert.equal(request('/receipts/EFTA09999999').status,404);assert.equal(request('/','HEAD').body,'');assert.equal(request('/','POST').handled,false);assert.equal(request('/','GET',{'x-gah-internal-wiki-proxy':'apex-proof-layer'}).handled,false);
console.log('PASS wiki home/archive/research canonicals, '+registry.entries.length+' reciprocal receipt cards, own sitemap, aliases, HEAD and internal proxy isolation');

const black=request('/research/evidence/black-book-epstein');assert.equal(black.status,200);assert.equal(black.headers['X-Robots-Tag'],'index,follow');assert.match(black.body,/<meta name="robots" content="index,follow">/);assert.doesNotMatch(black.body,/href="[^"]*\/archive\/EFTA|ASCEND|Meili status|Audit Metadata/);assert.equal((black.body.match(/Official DOJ PDF/g)||[]).length,80);
for(const path of ['/','/archive','/research-index']) {const b=request(path).body;assert.match(b,/application\/ld\+json/);assert.match(b,/property="og:image"/);assert.doesNotMatch(b,/href="\/grok-command-v4"/);}
console.log('PASS black-book research discovery, preserved source gaps, wiki hub schemas and share images');

for(const p of ['/research/evidence/alias-passenger-epstein','/research/evidence/missing-names-phonebook-epstein','/research/evidence/phonebook-alias-epstein','/research/evidence/redacted-names-epstein','/research/evidence/unredacted-flight-log-epstein']) {
 assert.equal(request(p).headers['X-Robots-Tag'],'noindex,follow',p+' reidentification-sensitive route');
 assert(!actual.has('https://wiki.grokarchivehub.com'+p),'protected route omitted from sitemap');
}
for(const p of eligibleTopics) {
 const r=request(p);assert.equal(r.status,200);assert.equal(r.headers['X-Robots-Tag'],'index,follow',p);
 assert.match(r.body,/<meta name="robots" content="index,follow">/,p);
}
const directory=request('/research-index').body;
assert(directory.includes('Public research topics and source guides (66)'), 'Full wiki research directory');
assert(directory.includes('Standalone verified receipt records (14)'),'Standalone receipt discovery');
for(const p of eligibleResearch)assert(directory.includes('https://wiki.grokarchivehub.com'+p),p+' linked from wiki directory');
for(const route of RESEARCH_ROUTES){
 const r=request(route.path+'?source=nav');
 if(route.owner==='main'){assert.equal(r.status,301,route.path);assert.equal(r.headers.Location,'https://grokarchivehub.com'+route.path+'?source=nav');continue;}
 assert.equal(r.status,200,route.path);assert.equal(r.headers['X-Robots-Tag'],route.indexable?'index,follow':'noindex,follow');
 assert.ok(r.body.includes('href="https://wiki.grokarchivehub.com'+route.path+'"'),route.path+' canonical');
 assert.ok(r.body.includes('<meta name="robots" content="'+(route.indexable?'index,follow':'noindex,follow')+'"'),route.path+' robots metadata');
 const visible=r.body.replace(/<!--[\s\S]*?-->|<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi,'').replace(/<[^>]+>/g,' ');
 assert.doesNotMatch(visible,/GAH-SEO|DOMINANCE-\d|REPAIR-\d|TASK-TRUMP|ASCEND|Build marker|Build: GAH/i,route.path);
 assert.equal(request(route.path,'HEAD').body,'',route.path+' HEAD');
 assert.equal(xml.includes('<loc>https://wiki.grokarchivehub.com'+route.path+'</loc>'),route.indexable,route.path+' sitemap decision');
}
console.log('PASS all '+RESEARCH_ROUTES.length+' research route owners, redirects, canonicals, HEAD responses, robots and sitemap eligibility');

for(const route of RESEARCH_ROUTES){
 const source=await fs.readFile(new URL(route.file,base),'utf8');
 for(const m of source.matchAll(/href=["'](?:https:\/\/grokarchivehub\.com)?\/archive\/(EFTA\d{8})["']/g))assert.ok(registry.entries.some(e=>e.indexable&&e.id===m[1]),route.path+' links only published dossiers');
}
console.log('PASS research source IDs remain searchable without inventing unpublished dossier targets');
