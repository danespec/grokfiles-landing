// Offline comparison: pinned cached public model, no remote inference or data transfers.
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import crypto from 'node:crypto';import {performance} from 'node:perf_hooks';
import MODEL from '../content/research-corpus-010.mjs';
import {deepSearch012} from '../content/editorial-search-012.mjs';
import {researchPipeline010} from '../content/research-pipeline-010.mjs';
const previous=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);
if(!process.argv[2]||!process.argv[3]||out.startsWith(process.cwd()+path.sep))throw Error('Private evidence paths required');
const root=path.join(previous,'node-embedding/node_modules/@huggingface/transformers');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json')));
if(pkg.version!=='4.3.2')throw Error('Unexpected dependency version');
const {pipeline,env}=await import(pathToFileURL(path.join(root,pkg.exports.node.import.default)).href);
const revision='751bff37182d3f1213fa05d7196b954e230abad9',model='Xenova/all-MiniLM-L6-v2',cache=path.join(previous,'node-embedding/model-cache');
env.allowRemoteModels=false;env.allowLocalModels=true;env.useBrowserCache=false;env.localModelPath=path.join(cache,model)+path.sep;
const originalFetch=globalThis.fetch;globalThis.fetch=async()=>{throw Error('Network forbidden in offline benchmark')};
const start=performance.now();
try{
 const extractor=await pipeline('feature-extraction',revision,{local_files_only:true,dtype:'q8',device:'cpu',cache_dir:cache,session_options:{intraOpNumThreads:2,interOpNumThreads:1}});
 const modelLoadMs=performance.now()-start;
 const encode=async texts=>(await extractor(texts,{pooling:'mean',normalize:true})).tolist();
 const t=performance.now(),vectors=[];
 for(let i=0;i<MODEL.documents.length;i+=16)vectors.push(...await encode(MODEL.documents.slice(i,i+16).map(d=>d.title+' '+d.description)));
 const docMs=performance.now()-t;
 const fixture=fs.readFileSync(new URL('../tests/fixtures/editorial-012-paraphrase-controls.json',import.meta.url)),fixtureHash=crypto.createHash('sha256').update(fixture).digest('hex');
 const known=JSON.parse(fixture);
 if(fs.readFileSync(path.join(out,'paraphrase-fixture.sha256'),'utf8').split(/\s/)[0]!==fixtureHash)throw Error('Fixture mismatch');
 const lookup=new Map(MODEL.documents.map((d,i)=>[d.url,vectors[i]]));
 const rows=[];
 for(const [q,slug] of known){
  const s=performance.now(),[v]=await encode([q]),queryMs=performance.now()-s;
  const a=researchPipeline010(q,10),b=deepSearch012(q,10);
  // Rerank only lexical-admitted candidates; no widening or abstention override.
  const max=b.results[0]?.score||1;
  const neural=b.results.filter(r=>lookup.has(r.url)).map(r=>({url:r.url,score:.8*r.score/max+.2*Math.max(0,lookup.get(r.url).reduce((n,x,i)=>n+x*v[i],0))})).sort((a,b)=>b.score-a.score||a.url.localeCompare(b.url));
  // Exploratory candidate expansion: compare dense metadata to both existing
  // lexical lanes. This is NOT a production policy or a calibrated threshold.
  const dense=MODEL.documents.map(d=>({url:d.url,cosine:lookup.get(d.url).reduce((n,x,i)=>n+x*v[i],0)})).sort((a,b)=>b.cosine-a.cosine||a.url.localeCompare(b.url));
  const blocked=['identifier','navigation','unanswerable','ambiguous_entity'].includes(b.intent);
  const scores=new Map();
  if(!blocked){
   for(const [list,weight] of [[a.results,1],[b.results,1.2],[dense.filter(d=>d.cosine>=.35).slice(0,10),1.2]])for(const [i,r] of list.entries())scores.set(r.url,(scores.get(r.url)||0)+weight/(20+i+1));
  }
  const expanded=[...scores].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,10).map(x=>x[0]);
  rows.push({q,slug,baseline:a.results.map(x=>x.url),passage:b.results.map(x=>x.url),neural:neural.map(x=>x.url),dense:dense.slice(0,10).map(x=>x.url),expanded,queryMs});
 }
 const metrics=Object.fromEntries(['baseline','passage','neural','dense','expanded'].map(k=>[k,{top1:rows.filter(r=>r[k][0]?.endsWith('/'+r.slug)).length,top3:rows.filter(r=>r[k].slice(0,3).some(u=>u.endsWith('/'+r.slug))).length,top10:rows.filter(r=>r[k].some(u=>u.endsWith('/'+r.slug))).length}]));
 const frozenRaw=fs.readFileSync(new URL('../tests/fixtures/retrieval-010-queries.json',import.meta.url));
 const freeze=JSON.parse(fs.readFileSync(new URL('../tests/fixtures/benchmark-freeze.json',import.meta.url)));
 if(crypto.createHash('sha256').update(frozenRaw).digest('hex')!==freeze.sha256)throw Error('Frozen benchmark changed');
 const qs=JSON.parse(frozenRaw),frozenRows=[];
 for(let i=0;i<qs.length;i+=16){
  const batch=qs.slice(i,i+16),encoded=await encode(batch.map(x=>x.query));
  for(const [j,item] of batch.entries()){
   const a=researchPipeline010(item.query,10),b=deepSearch012(item.query,10),v=encoded[j];
   // Never broaden explicit abstention for privacy, ambiguity or unsupported intent.
   // An insufficient-evidence abstention may be eligible for investigation, NOT public release.
   const canExpand=!['identifier','navigation','unanswerable','ambiguous_entity'].includes(b.intent)&&(!b.abstained||b.coverage_reason==='insufficient_evidence_in_filtered_editorial_index');
   const scores=new Map();
   if(canExpand){
    const dense=MODEL.documents.map(d=>({url:d.url,cosine:lookup.get(d.url).reduce((n,x,k)=>n+x*v[k],0)})).sort((a,b)=>b.cosine-a.cosine||a.url.localeCompare(b.url));
    for(const [list,weight] of [[a.results,1],[b.results,1.2],[dense.filter(d=>d.cosine>=.35).slice(0,10),1.2]])for(const [k,r] of list.entries())if(lookup.has(r.url))scores.set(r.url,(scores.get(r.url)||0)+weight/(20+k+1));
   }
   const expanded=canExpand?[...scores].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,10).map(x=>x[0]):b.results.map(x=>x.url);
   frozenRows.push({id:item.id,category:item.category,split:item.split,baseline_abstained:a.abstained,passage_abstained:b.abstained,expanded_abstained:!expanded.length,expanded,scope:'offline exploratory candidate expansion'});
  }
 }
 const categorySummary=Object.fromEntries([...new Set(frozenRows.map(r=>r.category))].map(c=>{const a=frozenRows.filter(r=>r.category===c);return [c,{cases:a.length,baseline_abstentions:a.filter(r=>r.baseline_abstained).length,passage_abstentions:a.filter(r=>r.passage_abstained).length,expanded_abstentions:a.filter(r=>r.expanded_abstained).length}]}));
 fs.writeFileSync(path.join(out,'neural-expansion-frozen-250.json'),JSON.stringify({fixture_sha256:freeze.sha256,categorySummary,rows:frozenRows,scope:'Offline diagnostic; no independent relevance scores; no public activation'},null,2));
 console.log(JSON.stringify({frozen_cases:frozenRows.length,categorySummary}));
 const result={model,revision,documents:vectors.length,dimensions:vectors[0].length,modelLoadMs,docMs,fixtureHash,queries:known.length,metrics,scope:'Author-selected paraphrase known-item controls; metadata neural reranker and exploratory offline expansion; no independent quality grades; no network inference',rows};
 fs.writeFileSync(path.join(out,'neural-paraphrase-comparison.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({...result,rows:undefined}));
}finally{globalThis.fetch=originalFetch}
