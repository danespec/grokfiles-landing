import assert from 'node:assert/strict';
import worker from '../_worker.js';
import {editorialLead009,mergeEditorialLead009} from '../content/editorial-ranking-009.mjs';
import {RELEASE_STAGING_HOST_009,releaseSurfaceEnabled} from '../content/retrieval-release.mjs';
const cases=[
 ['Leon Black Epstein payments','/reels/leon-black-dechert-158-million-efta02730996'],
 ['Epstein flight logs','/corrections/flight-log-count-and-aircraft-reconciliation'],
 ['Ehud Barak Epstein','/investigations/barak-st-thomas-dec-2014'],
 ['Epstein files timeline','/timeline-reconstructions']];
const nav=['Epstein documents archive','Epstein wiki','Jeffrey Epstein files search','Epstein files AI'];
const env={GAH_AGENT_METRICS_SAMPLE_RATE:'0',GAH_SEC_RATE_LIMITER:{idFromName:x=>x,get:()=>({fetch:async()=>Response.json({limited:false})})},ASSETS:{fetch:async()=>new Response('not found',{status:404})}};
const hosts=['https://grokarchivehub.com','https://'+RELEASE_STAGING_HOST_009];
const makeRows=q=>Array.from({length:5},(_,i)=>({id:'TEST-'+i,title:q+' test '+i,summary:q,url:'/archive/EFTA'+String(i+700000).padStart(8,'0')}));
let calls=[],degraded=false,upstreamStatus=200;
const original=globalThis.fetch;
const NativeRequest=globalThis.Request;
// Node requires duplex for a forwarded ReadableStream; Workers do not.
globalThis.Request=class extends NativeRequest{constructor(input,init){super(input,init?.body instanceof ReadableStream?{...init,duplex:"half"}:init);}};
globalThis.fetch=async(req)=>{
 const u=new URL(req.url||req);calls.push(u.hostname+u.pathname);
 assert.equal(u.pathname,'/api/search','unexpected external fetch');
 const p=await req.json();return Response.json({ok:upstreamStatus===200,degraded,hits:makeRows(p.q),ai_summary_used:false},{status:upstreamStatus});
};
try{
 for(const host of hosts){
  const e=host===hosts[0]?env:{...env,GAH_STAGING:'true',GAH_WIKI_HOST:'mock.example.org'};
  const post=async(q,extra={})=>worker.fetch(new Request(host+'/api/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q,limit:5,no_ai:true,fast:true,...extra})}),e);
  assert(releaseSurfaceEnabled(new Request(host),e));
  for(const [q,path] of cases){
   const baseline=await(await post(q,{no_ai:false})).json();const r=await post(q);assert.equal(r.status,200);const d=await r.json();
   assert.equal(d.hits[0].url,'https://grokarchivehub.com'+path);
   assert.equal(d.hits.length,5);assert.equal(d.archive_results.length,5);assert.deepEqual(d.archive_results,baseline.hits);assert.equal(d.editorial_matches.length,1);
   assert.equal(d.retrieval_profile,'reviewed-editorial-009');assert.equal(d.ai_summary_used,false);
   const single=await(await post(q,{limit:1})).json();assert.equal(single.hits.length,1);assert.equal(single.archive_results.length,1);
  }
  for(const q of nav){const n=await(await post(q)).json();assert.equal(n.intent,'navigation');assert.equal(n.degraded,false);assert(!n.editorial_matches);}
  for(const q of ['EFTA00035053','EFTA00080250','Barak-174-001','Epstein wiki flight logs','Leon Black Epstein payments EFTA00155032','Epstein flight logs 2014','unrelated query']){
   const d=await(await post(q)).json();assert(!d.editorial_matches,q);
  }
  for(const extra of [{tag:'News'},{filter:'2026'},{no_ai:false},{query:'different query'}]){const d=await(await post(cases[0][0],extra)).json();assert(!d.editorial_matches,JSON.stringify(extra));}
  degraded=true;assert(!(await(await post(cases[0][0])).json()).editorial_matches);degraded=false;
  upstreamStatus=503;const fail=await post(cases[0][0]);assert.equal(fail.status,503);assert(!(await fail.json()).editorial_matches);upstreamStatus=200;
  assert.equal((await worker.fetch(new Request(host+'/api/v1/research/search?q=Barak'),e)).status,404);
  const spec=await(await worker.fetch(new Request(host+'/openapi.json'),e)).json();assert(!spec.paths['/api/v1/research/search']);
 }
 for(const [q,p] of cases){
  const lead=editorialLead009(q,{no_ai:true},'text');
  const raw=[{id:'a',url:p},{id:'b',url:'/archive/EFTA00035053'}];
  const x=mergeEditorialLead009(raw,lead,2);assert.deepEqual(x.archive_results,raw);assert.equal(x.rows.length,2);assert.equal(x.rows[1].id,'b');
 }
 assert(calls.every(x=>x==='wiki.grokarchivehub.com/api/search'||x==='mock.example.org/api/search'));
 console.log('PASS four reviewed lanes, all six original controls, full legacy page preservation, dedupe, bounds, filtered/AI/error exclusions, staging mock isolation, experimental endpoint exclusion');
}finally{globalThis.fetch=original;globalThis.Request=NativeRequest;}
