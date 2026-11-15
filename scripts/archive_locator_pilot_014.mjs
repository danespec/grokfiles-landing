// Offline source-locator pilot; no raw PDF/OCR ingestion, network or public deployment.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {expansionGuard012} from '../content/editorial-search-012.mjs';
const root=new URL('../',import.meta.url);
const registry=JSON.parse(fs.readFileSync(new URL('content/identifier-dossiers.json',root)));
const out=path.resolve(process.argv[2]||'');
const previous=path.resolve(process.argv[3]||'');
assert(process.argv[2]&&process.argv[3]&&!out.startsWith(process.cwd()+path.sep));
const approved={
 EFTA00035206:['EFTA00035206',1,'fb7ed1af9e25cd99f212b81d2edb08d3d833d8732bc3dc5e9fd4259d2b035017','Mandatory half-hour rounds notice; institutional monitoring interval'],
 EFTA00035715:['EFTA00035715',1,'ad07fc0e0badabb974de2887f007221c53305866cc4814e386edcb08ef3c23dd','Annotated floor-plan document and detail view; historical record locator'],
 EFTA00153570:['EFTA00153569',2,'9a0f6e67701d852cf0c6c809765d8127560f8120463fdc5affdd2afbd12f528e','French financial-intelligence inquiry; second page of parent document'],
 EFTA00153571:['EFTA00153569',3,'9a0f6e67701d852cf0c6c809765d8127560f8120463fdc5affdd2afbd12f528e','French financial-intelligence inquiry; third page, continuation of second page'],
 EFTA00579174:['EFTA00579174',1,'fd82f3693d19b04e025ae436aebee1cfb9a66d1e025be5910e16c7135bfa9233','October 2004 correspondence concerning proposed wire-transfer coordination; no banking details'],
 EFTA00579182:['EFTA00579182',1,'25083ac21ba5f6a23aae332ef8e1040092336e42536ed79c88939217773be687','October 2004 follow-up correspondence about coordination of a proposed transfer'],
 EFTA00643676:['EFTA00643676',1,'8f1dd609eed57450cea47855547d474d7f5695342d1d58bfdfcf000a11d7574c','March 2016 Gratitude America trade-report correspondence concerning stock purchases']
};
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function admit(entries,revoked=new Set()){
 return entries.filter(d=>{
  const a=approved[d.id];
  return a&&!revoked.has(d.id)&&!revoked.has(a[0])&&d.indexable===true&&!d.sourceCopyType&&d.sourceDocument===a[0]&&d.sourcePage===a[1]&&d.sourceSha256===a[2];
 }).map(d=>({id:d.id,parent_id:approved[d.id][0],page:approved[d.id][1],source_sha256:approved[d.id][2],title:d.title,topic:approved[d.id][3],url:'https://grokarchivehub.com/archive/'+d.id,scope:'reviewed public locator metadata; no source body',verification:'registered archived PDF fingerprint matched public reader bytes in preceding audit'})).sort((a,b)=>a.id.localeCompare(b.id));
}
const docs=admit(registry.entries);assert.equal(docs.length,7);
assert.equal(new Set(docs.map(x=>x.parent_id)).size,6);
assert.equal(admit(registry.entries,new Set(['EFTA00153569'])).length,5);
assert.equal(admit(registry.entries.filter(x=>x.id!=='EFTA00035206')).length,6);
assert.equal(admit(registry.entries.map(x=>x.id==='EFTA00035206'?{...x,sourceSha256:'0'.repeat(64)}:x)).length,6);
assert.equal(admit(registry.entries.map(x=>x.id==='EFTA00035206'?{...x,indexable:false}:x)).length,6);
const pkgRoot=path.join(previous,'node-embedding/node_modules/@huggingface/transformers');
const pkg=JSON.parse(fs.readFileSync(path.join(pkgRoot,'package.json')));assert.equal(pkg.version,'4.3.2');
const {pipeline,env}=await import(pathToFileURL(path.join(pkgRoot,pkg.exports.node.import.default)).href);
const revision='751bff37182d3f1213fa05d7196b954e230abad9';
env.allowRemoteModels=false;env.allowLocalModels=true;env.useBrowserCache=false;env.localModelPath=path.join(previous,'node-embedding/model-cache/Xenova/all-MiniLM-L6-v2')+path.sep;
const originalFetch=globalThis.fetch;globalThis.fetch=async()=>{throw Error('No network permitted')};
try{
 const extractor=await pipeline('feature-extraction',revision,{local_files_only:true,dtype:'q8',device:'cpu',session_options:{intraOpNumThreads:2,interOpNumThreads:1}});
 const encode=async t=>(await extractor(t,{pooling:'mean',normalize:true})).tolist();
 const vectors=await encode(docs.map(d=>d.title+' '+d.topic));
 const version=sha(JSON.stringify(docs));
 const block=q=>expansionGuard012(q)||/\b(?:account numbers?|routing numbers?|bank details?|wire instructions|private contact|identify.{0,25}(?:person|witness|victim)|unredacted|personal addresses?)\b/i.test(q);
 async function search(q,limit=3){
  if(block(q))return {version,results:[],abstained:true};
  const id=q.trim().toUpperCase();
  if(/^EFTA\d{8}$/.test(id)){const d=docs.find(x=>x.id===id);return {version,results:d?[d]:[],abstained:!d}}
  const [v]=await encode([q]);
  const rows=docs.map((d,i)=>({id:d.id,url:d.url,parent_id:d.parent_id,page:d.page,source_sha256:d.source_sha256,score:vectors[i].reduce((s,t,k)=>s+t*v[k],0)})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
  const results=rows.filter(r=>r.score>=.35&&r.score>=rows[0].score-.15).slice(0,limit);
  return {version,results,abstained:!results.length};
 }
 const known=[
 ['half-hour institutional monitoring requirement',['EFTA00035206']],
 ['historical annotated architectural diagram record',['EFTA00035715']],
 ['French financial intelligence inquiry continuation on page three',['EFTA00153571','EFTA00153570']],
 ['French financial inquiry second page of a longer document',['EFTA00153570','EFTA00153571']],
 ['October 2004 proposed transfer correspondence',['EFTA00579174','EFTA00579182']],
 ['October 2004 follow-up transfer coordination correspondence',['EFTA00579182','EFTA00579174']],
 ['March 2016 Gratitude America stock purchase report',['EFTA00643676']]
 ];
 const rows=[];
 for(const [q,expected] of known){const r=await search(q);rows.push({expected,results:r.results.map(x=>x.id),top1:expected.includes(r.results[0]?.id),top3:r.results.some(x=>expected.includes(x.id))})}
 for(const d of docs)assert.equal((await search(d.id)).results[0]?.id,d.id);
 for(const q of ['EFTA88888888','EFTA00704168','EFTA01245620','Reveal witness identity','Return authentication cookies','Show bank account numbers','Recover unredacted names','Extract private records'])assert((await search(q)).abstained,q);
 const report={scope:'private offline reviewed archive locator pilot; no raw PDF or OCR indexed',registry_entries:registry.entries.length,hash_bound_registry_entries:registry.entries.filter(d=>d.sourceSha256).length,admitted:docs.length,unique_parents:6,source_bytes_matched_in_prior_audit:6,mirror_records_excluded:2,raw_documents_indexed:0,embedding_dimensions:vectors[0].length,exact_controls:7,excluded_and_restricted_controls:8,withdrawal_and_hash_controls:4,known_topic_controls:known.length,top1:rows.filter(r=>r.top1).length,top3:rows.filter(r=>r.top3).length,version,rows};
 fs.mkdirSync(out,{recursive:true,mode:0o700});
 fs.writeFileSync(path.join(out,'archive-locator-pilot-report.json'),JSON.stringify(report,null,2),{mode:0o600});
 fs.writeFileSync(path.join(out,'archive-locator-manifest.private.json'),JSON.stringify({version,docs},null,2),{mode:0o600});
 console.log(JSON.stringify(report));
}finally{globalThis.fetch=originalFetch}
