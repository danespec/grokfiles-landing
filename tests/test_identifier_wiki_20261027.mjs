import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=new URL('../backend/identifier-release-20261027/',import.meta.url);
let s=await fs.readFile(new URL('identifier-host-policy.mjs',base),'utf8');
const files=new Map([['/app/identifier-dossiers.json',await fs.readFile(new URL('content/identifier-dossiers.json',new URL('../',import.meta.url)),'utf8')]]);
// Bind only fixture paths. The production handler still reads container-local files.
s=s.replace("import fs from 'node:fs';",'const fs={readFileSync(path){return globalThis.__wikiFixture(path)}};');
const registry=JSON.parse(await fs.readFile(new URL('content/identifier-dossiers.json',new URL('../',import.meta.url)),'utf8'));
files.set('/app/wiki-home-identifiers.html',await fs.readFile(new URL('wiki-home.html',base),'utf8'));
files.set('/app/research-index.html','<html><head><link rel="canonical" href="https://grokarchivehub.com/research-index"><meta name="robots" content="noindex,nofollow"></head><body><main><h1>Research index</h1></main></body></html>');
for(const e of registry.entries)files.set('/app/identifier-receipts/'+e.id+'.html',await fs.readFile(new URL('receipts/'+e.id+'.html',base),'utf8'));
globalThis.__wikiFixture=path=>{assert.ok(files.has(path),path);return files.get(path)};
const {identifierHostPolicy}=await import('data:text/javascript;base64,'+Buffer.from(s).toString('base64'));
function request(path,method='GET',headers={}){const res={status:0,headers:{},body:'',writeHead(s,h){this.status=s;this.headers=h},end(b){this.body=b||''}};const handled=identifierHostPolicy({method,url:path,headers:{host:'wiki.grokarchivehub.com',...headers}},res);return{handled,...res};}
for(const path of ['/','/archive','/research-index']){const r=request(path);assert.equal(r.status,200);assert.equal(r.headers['X-Robots-Tag'],'index,follow');assert.ok(r.body.includes('href="https://wiki.grokarchivehub.com'+(path==='/'?'/':path)+'"'));}
for(const path of ['/archive/efta13764','/archive/EFTA00013764','/archive/efta00013764.html']){const r=request(path);assert.equal(r.status,301);assert.equal(r.headers.Location,'https://grokarchivehub.com/archive/EFTA00013764');}
assert.equal(request('/wiki').headers.Location,'https://wiki.grokarchivehub.com/');assert.equal(request('/methodology').headers.Location,'https://grokarchivehub.com/methodology');
for(const e of registry.entries){const r=request('/receipts/'+e.id);assert.equal(r.status,200);assert.ok(r.body.includes('https://grokarchivehub.com/archive/'+e.id));assert.equal(r.headers['X-Robots-Tag'],e.indexable?'index,follow':'noindex,follow');}
assert.ok(request('/archive').body.includes('property="og:url" content="https://wiki.grokarchivehub.com/archive"'));
const xml=request('/sitemap.xml').body;assert.equal((xml.match(/<loc>/g)||[]).length,registry.entries.filter(e=>e.indexable).length+3);assert.doesNotMatch(xml,/<loc>https:\/\/grokarchivehub.com/);assert.match(request('/robots.txt').body,/Sitemap: https:\/\/wiki.grokarchivehub.com\/sitemap.xml/);
assert.equal(request('/receipts/EFTA09999999').status,404);assert.equal(request('/','HEAD').body,'');assert.equal(request('/','POST').handled,false);assert.equal(request('/','GET',{'x-gah-internal-wiki-proxy':'apex-proof-layer'}).handled,false);
console.log('PASS wiki home/archive/research canonicals, '+registry.entries.length+' reciprocal receipt cards, own sitemap, aliases, HEAD and internal proxy isolation');
