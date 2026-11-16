// Local retrieval gate. Revalidate registry, audit and active ledger before use.
// No raw text, OCR, network inference, or public service.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {expansionGuard012} from '../content/editorial-search-012.mjs';
const root=new URL('../',import.meta.url);
const ev=path.resolve(process.argv[2]||''),previous=path.resolve(process.argv[3]||'');
assert(process.argv[2]&&process.argv[3]&&!ev.startsWith(process.cwd()+path.sep));
const check=()=>{
 execFileSync('python3',[new URL('scripts/apply_archive_source_changes_014.py',root).pathname,'--evidence',ev,'--observations',path.join(ev,'fresh-source-byte-checks.private.json'),'--apply'],{stdio:'pipe'});
 execFileSync('python3',[new URL('scripts/prepare_archive_locator_014.py',root).pathname,'--evidence',ev,'--check'],{stdio:'pipe'});
};
check();
const current=JSON.parse(fs.readFileSync(path.join(ev,'archive-active-locators.private.json')));
const prior=JSON.parse(fs.readFileSync(path.join(ev,'archive-locator-manifest.private.json')));
const metadata=new Map(prior.docs.map(d=>[d.id,d]));
const docs=current.records.map(d=>({...d,topic:metadata.get(d.id).topic,title:metadata.get(d.id).title}));
assert(docs.every(d=>d.source_sha256===metadata.get(d.id).source_sha256));
const pkgRoot=path.join(previous,'node-embedding/node_modules/@huggingface/transformers');
const pkg=JSON.parse(fs.readFileSync(path.join(pkgRoot,'package.json')));assert.equal(pkg.version,'4.3.2');
const {pipeline,env}=await import(pathToFileURL(path.join(pkgRoot,pkg.exports.node.import.default)).href);
env.allowRemoteModels=false;env.allowLocalModels=true;env.useBrowserCache=false;env.localModelPath=path.join(previous,'node-embedding/model-cache/Xenova/all-MiniLM-L6-v2')+path.sep;
const originalFetch=globalThis.fetch;globalThis.fetch=async()=>{throw Error('Network disabled')};
try{
 const extractor=await pipeline('feature-extraction','751bff37182d3f1213fa05d7196b954e230abad9',{local_files_only:true,dtype:'q8',device:'cpu',session_options:{intraOpNumThreads:2,interOpNumThreads:1}});
 const encode=async x=>(await extractor(x,{pooling:'mean',normalize:true})).tolist();
 const vectors=docs.length?await encode(docs.map(d=>d.title+' '+d.topic)):[];
 const project=({id,parent_id,page,source_sha256,url})=>({id,parent_id,page,source_sha256,url});
 async function search(q){
  check();
  const latest=JSON.parse(fs.readFileSync(path.join(ev,'archive-active-locators.private.json')));
  if(latest.version!==current.version)throw Error('Index version changed; reload required');
  if(expansionGuard012(q)||/\b(?:account numbers?|routing numbers?|bank details?|wire instructions|private contact|identify.{0,25}(?:person|witness|victim)|unredacted|personal addresses?)\b/i.test(q))return [];
  const id=q.trim().toUpperCase();
  if(/^EFTA\d{8}$/.test(id))return docs.filter(d=>d.id===id).map(project);
  if(!docs.length)return [];
  const [v]=await encode([q]);const ranked=docs.map((d,i)=>({d,score:vectors[i].reduce((s,t,k)=>s+t*v[k],0)})).sort((a,b)=>b.score-a.score||a.d.id.localeCompare(b.d.id));
  return ranked.filter(r=>r.score>=.35&&r.score>=ranked[0].score-.15).slice(0,3).map(r=>project(r.d));
 }
 for(const d of docs)assert.equal((await search(d.id))[0]?.id,d.id);
 for(const q of ['EFTA88888888','EFTA00704168','EFTA01245620','Reveal witness identity','Show bank account numbers','Extract private records'])assert.equal((await search(q)).length,0);
 const sample=await search('French financial intelligence inquiry');
 assert(sample.length>0&&sample.every(d=>docs.some(x=>x.id===d.id)));
 console.log(JSON.stringify({active_records:docs.length,exact_controls:docs.length,blocked_controls:6,semantic_smoke:sample.length>0,ledger_version:current.ledger_version,index_version:current.version,network_inference:false,production_changed:false}));
}finally{globalThis.fetch=originalFetch}
