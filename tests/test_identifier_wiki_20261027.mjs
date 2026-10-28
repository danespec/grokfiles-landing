import {publicationRule} from '../reader-quality.mjs';
import { RESEARCH_ROUTES } from '../content/research-route-policy.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=new URL('../backend/identifier-release-20261027/',import.meta.url);
let s=await fs.readFile(new URL('identifier-host-policy.mjs',base),'utf8');
const files=new Map([['/app/identifier-dossiers.json',await fs.readFile(new URL('content/identifier-dossiers.json',new URL('../',import.meta.url)),'utf8')]]);
// Bind only fixture paths. The production handler still reads container-local files.
s=s.replace("import fs from 'node:fs';",'const fs={readFileSync(path){return globalThis.__wikiFixture(path)}};');
const registry=JSON.parse(await fs.readFile(new URL('content/identifier-dossiers.json',new URL('../',import.meta.url)),'utf8'));
files.set('/app/black-book-source-guide.html',await fs.readFile(new URL('black-book-source-guide.html',base),'utf8'));
files.set('/app/wiki-home-identifiers.html',await fs.readFile(new URL('wiki-home.html',base),'utf8'));
files.set('/app/research-index.html','<html><head><link rel="canonical" href="https://grokarchivehub.com/research-index"><meta name="robots" content="noindex,nofollow"></head><body><main><h1>Research index</h1></main></body></html>');
for(const e of registry.entries)files.set('/app/identifier-receipts/'+e.id+'.html',await fs.readFile(new URL('receipts/'+e.id+'.html',base),'utf8'));
globalThis.__wikiFixture=path=>{assert.ok(files.has(path),path);return files.get(path)};
s=s.replace("'./content/research-route-policy.mjs'",JSON.stringify(new URL('../content/research-route-policy.mjs',import.meta.url).href));
for(const route of RESEARCH_ROUTES)files.set('/app/'+route.file,await fs.readFile(new URL(route.file,base),'utf8'));
s=s.replace("'./reader-quality.mjs'",JSON.stringify(new URL('../reader-quality.mjs',import.meta.url).href));
const {identifierHostPolicy}=await import('data:text/javascript;base64,'+Buffer.from(s).toString('base64'));
function request(path,method='GET',headers={}){const res={status:0,headers:{},body:'',writeHead(s,h){this.status=s;this.headers=h},end(b){this.body=b||''}};const handled=identifierHostPolicy({method,url:path,headers:{host:'wiki.grokarchivehub.com',...headers}},res);return{handled,...res};}
for(const path of ['/','/archive','/research-index']){const r=request(path);assert.equal(r.status,200);assert.equal(r.headers['X-Robots-Tag'],'noindex,follow');assert.ok(r.body.includes('href="https://wiki.grokarchivehub.com'+(path==='/'?'/':path)+'"'));}
for(const path of ['/archive/efta13764','/archive/EFTA00013764','/archive/efta00013764.html']){const r=request(path);assert.equal(r.status,301);assert.equal(r.headers.Location,'https://grokarchivehub.com/archive/EFTA00013764');}
assert.equal(request('/wiki').headers.Location,'https://wiki.grokarchivehub.com/');assert.equal(request('/methodology').headers.Location,'https://grokarchivehub.com/methodology');
for(const e of registry.entries){const r=request('/receipts/'+e.id);assert.equal(r.status,200);assert.ok(r.body.includes('https://grokarchivehub.com/archive/'+e.id));assert.equal(r.headers['X-Robots-Tag'],'noindex,follow');}
assert.ok(request('/archive').body.includes('property="og:url" content="https://wiki.grokarchivehub.com/archive"'));
const xml=request('/sitemap.xml').body;assert.equal((xml.match(/<loc>/g)||[]).length,RESEARCH_ROUTES.filter(r=>r.owner==='wiki'&&r.indexable&&!publicationRule('https://wiki.grokarchivehub.com'+r.path)?.noindex).length);assert.doesNotMatch(xml,/<loc>https:\/\/grokarchivehub.com/);assert.match(request('/robots.txt').body,/Sitemap: https:\/\/wiki.grokarchivehub.com\/sitemap.xml/);
assert.equal(request('/receipts/EFTA09999999').status,404);assert.equal(request('/','HEAD').body,'');assert.equal(request('/','POST').handled,false);assert.equal(request('/','GET',{'x-gah-internal-wiki-proxy':'apex-proof-layer'}).handled,false);
console.log('PASS wiki home/archive/research canonicals, '+registry.entries.length+' reciprocal receipt cards, own sitemap, aliases, HEAD and internal proxy isolation');

const black=request('/research/evidence/black-book-epstein');assert.equal(black.status,200);assert.equal(black.headers['X-Robots-Tag'],'noindex,follow');assert.match(black.body,/<meta name="robots" content="noindex,follow">/);assert.doesNotMatch(black.body,/href="[^"]*\/archive\/EFTA|ASCEND|Meili status|Audit Metadata/);assert.equal((black.body.match(/Official DOJ PDF/g)||[]).length,80);
for(const path of ['/','/archive','/research-index']) {const b=request(path).body;assert.match(b,/application\/ld\+json/);assert.match(b,/property="og:image"/);assert.doesNotMatch(b,/href="\/grok-command-v4"/);}
console.log('PASS black-book source gaps, consistent noindex, wiki hub schemas and share images');

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
