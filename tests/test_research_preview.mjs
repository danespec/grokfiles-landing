import MODEL from '../content/research-preview-model.mjs';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {searchPreview,researchPreviewHttp,previewPaths} from '../content/research-preview.mjs';
const base='https://pilot.gah-staging-517b8499.pages.dev',env={GAH_STAGING:'true'},allow=async()=>({limited:false});
const get=(p,e=env,t=allow,o={})=>researchPreviewHttp(new Request(base+p,o),e,t);
for(const p of previewPaths){assert.equal((await get(p,{})).status,404);assert.equal((await researchPreviewHttp(new Request('https://grokarchivehub.com'+p),env,allow)).status,404);}
assert.equal((await get('/api/v1/research/search?q=Barak',env,async()=>null)).status,503);
assert.equal((await get('/api/v1/research/search?q=Barak',env,async()=>({limited:true}))).status,429);
for(const q of ['?q=x&limit=99','?q=x&q=y','?q=x&limit=0','?q=x&unexpected=1','?q='+ 'x'.repeat(257)])assert.equal((await get('/api/v1/research/search'+q)).status,400);
assert.equal((await get('/api/v1/research/search?q=Barak&version=old')).status,409);
assert(searchPreview('EFTA00022062').results[0].url.endsWith('/EFTA00022062'));assert(searchPreview('EFTA99999999').abstained);assert(searchPreview('GAHZZZNORESULT006').abstained);
const schema=await get(previewPaths[2]);assert.equal(schema.status,200);assert.equal((await schema.json()).openapi,'3.1.0');
const r=await get('/api/v1/research/search?q=Barak');assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('x-robots-tag'),'noindex,nofollow');const j=await r.json();assert(j.results.length<=5);assert.equal(j.nas_reads,0);
assert.equal((await get('/api/v1/research/search?q=Barak',env,allow,{headers:{'If-None-Match':r.headers.get('etag')}})).status,304);assert.equal(await(await get('/api/v1/research/search?q=Barak',env,allow,{method:'HEAD'})).text(),'');
let cursor=0,items=[],version;do{const f=await(await get('/api/v1/publications/changes?limit=10&cursor='+cursor)).json();version=f.version;items.push(...f.items);cursor=f.next_cursor;}while(cursor!==null);assert.equal(items.length,16);assert.equal(new Set(items.map(i=>i.sequence)).size,16);
console.log('PASS production exclusion, no-state isolation, throttles, bounds, versions, exact/OOV abstention, schema, validators and 16 incremental feed entries');
const cases=[['Barak St Thomas December 2014','barak-st-thomas-dec-2014'],['Leon Black 2023 SDNY referral','leon-black-2023-sdny-referral-status'],['flight log count aircraft reconciliation','flight-log-count-and-aircraft-reconciliation'],['Acosta Epstein Trump timeline','trump-acosta-epstein-doj-timeline'],['Barak GADECO fee','barak-gadeco-fee-2014'],['aircraft reconciliation','flight-log-count-and-aircraft-reconciliation']];
let recall=0,mrr=0;const rows=[];for(const [query,target] of cases){const t=performance.now(),results=searchPreview(query).results,rank=results.findIndex(r=>r.url.endsWith(target))+1;recall+=rank>0?1:0;mrr+=rank?1/rank:0;rows.push({query,target,rank,latency_ms:performance.now()-t});}console.log(JSON.stringify({benchmark:'development smoke set; not held-out evidence',cases:rows,recall_at_5:recall/cases.length,mrr:mrr/cases.length}));

for(const d of MODEL.documents){const path=new URL(d.url).pathname;let raw;for(const suffix of [path,path+".html",path+"/index.html"]){try{raw=await fs.readFile(new URL(".."+suffix,import.meta.url));break;}catch{}}assert(raw,"published source exists");assert.equal(crypto.createHash("sha256").update(raw).digest("hex"),d.source_sha256,"Publication changed: invalidate/review metadata model and feed");}

const {default:worker}=await import('../_worker.js');
const fullEnv={GAH_STAGING:'true',GAH_AGENT_METRICS_SAMPLE_RATE:'0',GAH_SEC_RATE_LIMITER:{idFromName:x=>x,get:()=>({fetch:async()=>Response.json({limited:false})})},ASSETS:{fetch:async()=>new Response(null,{status:404})}};
const rpc=async(host,method,params={})=>(await worker.fetch(new Request('https://'+host+'/mcp',{method:'POST',headers:{'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}),fullEnv)).json();
const hostname='pilot.gah-staging-517b8499.pages.dev';
assert((await rpc(hostname,'tools/list')).result.tools.some(t=>t.name==='get_publication_changes_preview'));
assert(!(await rpc('grokarchivehub.com','tools/list')).result.tools.some(t=>t.name==='get_publication_changes_preview'));
assert.equal((await rpc(hostname,'tools/call',{name:'search_research_preview',arguments:{q:'Barak'}})).result.structuredContent.results[0].channel,'hybrid');
assert.equal((await rpc('grokarchivehub.com','tools/call',{name:'search_research_preview',arguments:{q:'Barak'}})).result.isError,true);
for(const [host,expected] of [[hostname,true],['grokarchivehub.com',false]]){const r=await worker.fetch(new Request('https://'+host+'/openapi.json'),fullEnv);assert.equal(Boolean((await r.json()).paths['/api/v1/research/search']),expected);}
console.log('PASS existing MCP and OpenAPI preview integration, with production tool/schema exclusion');
