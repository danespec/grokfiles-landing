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

const {createNeuralHybrid013}=await import('../content/neural-hybrid-013.mjs');
const begin=performance.now();
try{
 const extractor=await pipeline('feature-extraction',revision,{local_files_only:true,dtype:'q8',device:'cpu',cache_dir:cache,session_options:{intraOpNumThreads:2,interOpNumThreads:1}});
 const encode=async text=>(await extractor(text,{pooling:'mean',normalize:true})).tolist();
 const vectors=[];for(let i=0;i<MODEL.documents.length;i+=16)vectors.push(...await encode(MODEL.documents.slice(i,i+16).map(d=>d.title+' '+d.description)));
 const runtime=createNeuralHybrid013({encode:async q=>(await encode([q]))[0],vectors,corpusVersion:MODEL.version,modelRevision:revision,allowExpansion:true});
 const raw=fs.readFileSync(new URL('../tests/fixtures/retrieval-010-queries.json',import.meta.url)),qs=JSON.parse(raw),rows=[];
 for(const q of qs){const t=performance.now(),x=await runtime(q.query,10);rows.push({id:q.id,category:q.category,split:q.split,ms:performance.now()-t,abstained:x.abstained,neural_executed:x.neural_executed,claims:x.generated_claims,urls:x.results.map(r=>r.url),privacy_control_passed:q.category==='privacy'?x.abstained:null});}
 const times=rows.map(x=>x.ms).sort((a,b)=>a-b),u=process.resourceUsage();
 const report={fixture_sha256:crypto.createHash('sha256').update(raw).digest('hex'),corpus_version:MODEL.version,model_revision:revision,scope:'Actual local encoder through new hybrid runtime; execution/guard tests, no independent relevance labels or edge performance claim',cases:rows.length,median_ms:times[125],p95_ms:times[237],privacy_passed:rows.filter(x=>x.category==='privacy'&&x.abstained).length,privacy_cases:20,generated_claims:rows.reduce((n,x)=>n+x.claims,0),external_calls:0,elapsed_ms:performance.now()-begin,max_rss_kib:u.maxRSS,user_cpu_microseconds:u.userCPUTime,system_cpu_microseconds:u.systemCPUTime,rows};
 if(report.privacy_passed!==20||report.generated_claims!==0)throw Error('Safety regression');fs.writeFileSync(path.join(out,'hybrid-runtime-013.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,rows:undefined}));
 const runs=[{strategy:'metadata_010',rows:qs.map(q=>({id:q.id,results:researchPipeline010(q.query,10).results.map(r=>({url:r.url}))}))},{strategy:'passage_012',rows:qs.map(q=>({id:q.id,results:deepSearch012(q.query,10).results.map(r=>({url:r.url}))}))},{strategy:'neural_hybrid_013',rows:rows.map(r=>({id:r.id,results:r.urls.map(url=>({url}))}))}];
 const experiment={fixture_sha256:report.fixture_sha256,corpus_version:MODEL.version,model_revision:revision,runs};const experimentRaw=JSON.stringify(experiment,null,2);fs.writeFileSync(path.join(out,'review-experiment-013.json'),experimentRaw,{mode:0o600});
 const review={fixture_sha256:report.fixture_sha256,experiment_sha256:crypto.createHash('sha256').update(experimentRaw).digest('hex'),strategy:'neural_hybrid_013',scope:'Unfilled independent review; candidate pool is not corpus-wide relevance proof',cases:qs.map(q=>{const result_urls=runs[2].rows.find(r=>r.id===q.id).results.map(r=>r.url);const pool=[...new Set(runs.flatMap(run=>run.rows.find(r=>r.id===q.id).results.map(r=>r.url)))];return {...q,result_urls,approved:false,reviewer:null,reviewed_at:null,answerable_in_reviewed_corpus:null,judgment_pool_complete:false,applicable_top3:null,qrels:pool.map(url=>({url,human_grade:null,citation_verified_by_human:null}))}})};
 fs.writeFileSync(path.join(out,'independent-review-013.json'),JSON.stringify(review,null,2),{mode:0o600});

}finally{globalThis.fetch=originalFetch}
