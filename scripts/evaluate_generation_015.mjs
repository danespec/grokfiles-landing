// Private bounded real-provider evaluation. The broker is an owner-supplied local client.
import fs from 'node:fs';import path from 'node:path';import {spawn} from 'node:child_process';import {createInterface} from 'node:readline';import {pathToFileURL} from 'node:url';import {performance} from 'node:perf_hooks';
import MODEL from '../content/research-corpus-010.mjs';
import {createNeuralHybrid013} from '../content/neural-hybrid-013.mjs';
import {evidenceCandidates015,modelText015} from '../content/evidence-candidates-015.mjs';
const repo=fs.realpathSync(new URL('..',import.meta.url)),previous=path.resolve(process.argv[2]||''),out=fs.realpathSync(process.argv[3]||''),broker=fs.realpathSync(process.argv[4]||'');
if(!process.argv[4]||out===repo||out.startsWith(repo+path.sep)||broker===repo||broker.startsWith(repo+path.sep))throw Error('Private evidence and broker paths required');
const moduleRoot=path.join(previous,'node-embedding/node_modules/@huggingface/transformers'),pkg=JSON.parse(fs.readFileSync(path.join(moduleRoot,'package.json')));if(pkg.version!=='4.3.2')throw Error('Unpinned model loader');
const {pipeline,env}=await import(pathToFileURL(path.join(moduleRoot,pkg.exports.node.import.default)).href),revision='751bff37182d3f1213fa05d7196b954e230abad9';
env.allowRemoteModels=false;env.allowLocalModels=true;env.useBrowserCache=false;env.localModelPath=path.join(previous,'node-embedding/model-cache/Xenova/all-MiniLM-L6-v2')+path.sep;
const oldFetch=globalThis.fetch;globalThis.fetch=async()=>{throw Error('Direct network disabled; only bounded owner broker permitted')};
const child=spawn('python3',[broker],{stdio:['pipe','pipe','pipe']});child.stderr.on('data',()=>{});child.stdin.on('error',()=>{});const lines=createInterface({input:child.stdout})[Symbol.asyncIterator]();
const ready=JSON.parse((await lines.next()).value);if(!ready.ready)throw Error('Provider quota preflight failed');
const selectionOnly=process.argv[5]==='selection';
let blocked=false,calls=0,spent=0;const rows=[];const begin=performance.now();
try{
 const extractor=await pipeline('feature-extraction',revision,{local_files_only:true,dtype:'q8',device:'cpu',session_options:{intraOpNumThreads:2,interOpNumThreads:1}});
 const encode=async text=>(await extractor(text,{pooling:'mean',normalize:true})).tolist(),vectors=[];
 for(let i=0;i<MODEL.documents.length;i+=16)vectors.push(...await encode(MODEL.documents.slice(i,i+16).map(d=>d.title+' '+d.description)));
 const runtime=createNeuralHybrid013({encode:async q=>(await encode([q]))[0],vectors,corpusVersion:MODEL.version,modelRevision:revision,allowExpansion:true});
 const docs=new Map(MODEL.documents.map(d=>[d.url,d])),queries=JSON.parse(fs.readFileSync(new URL('../tests/fixtures/retrieval-010-queries.json',import.meta.url)));
 const groups=[...new Set(queries.map(q=>q.category))].map(category=>queries.filter(q=>q.category===category)),ordered=[];
 for(let i=0;groups.some(g=>i<g.length);i++)for(const g of groups)if(g[i])ordered.push(g[i]);
 for(const q of ordered){
  const t=performance.now(),retrieved=await runtime(q.query,3);let called=false,provider=null;
  const sources=retrieved.results.map(r=>docs.get(r.url)).filter(Boolean).slice(0,3).map(d=>({url:d.url,text:d.description,publication_sha256:d.source_sha256}));
  let result;
  if(blocked||calls>=50)result={abstained:true,reason:blocked?'provider_unavailable':'bounded_generation_sample_complete',candidates:[]};
  else result=await evidenceCandidates015({question:q.query,version:retrieved.version,sources,selectionOnly,generate:async prompt=>{
   called=true;calls++;child.stdin.write(JSON.stringify(prompt)+'\n');const line=await lines.next();if(line.done){blocked=true;throw Error('Provider stopped');}provider=JSON.parse(line.value);
   if(!provider.success){blocked=true;throw Error('Provider unavailable');}spent=provider.spent_neurons;return modelText015(provider.result);
  }});
  rows.push({id:q.id,category:q.category,split:q.split,generation_executed:called,abstained:result.abstained,reason:result.reason??null,accepted_source_quotations:result.candidates.length,source_urls:result.candidates.map(c=>c.source_url),wall_ms:performance.now()-t,provider_ms:provider?.elapsed_ms??null,neurons:provider?.neurons??0,public_answer:null,independent_review_completed:false});
  if(called&&calls%5===0)console.log(JSON.stringify({provider_calls:calls,accepted_quotations:rows.reduce((n,r)=>n+r.accepted_source_quotations,0),spent_neurons:spent}));
  fs.writeFileSync(path.join(out,selectionOnly?'generation-selection-evaluation-015.json':'generation-evaluation-015.json'),JSON.stringify({scope:'Private real-provider proposals; no independent relevance/entailment grades or public answers',model:'@cf/ibm-granite/granite-4.0-h-micro',provider_calls:calls,spent_neurons:spent,rows},null,2),{mode:0o600});
 }
 const inference=rows.filter(r=>r.generation_executed&&r.provider_ms!==null).map(r=>r.provider_ms).sort((a,b)=>a-b);
 const summary={selection_only:selectionOnly,cases:rows.length,provider_calls:calls,spent_neurons:spent,accepted_source_quotations:rows.reduce((n,r)=>n+r.accepted_source_quotations,0),model_abstentions_or_rejections:rows.filter(r=>r.generation_executed&&r.abstained).length,provider_blocked:blocked,public_answers:0,independent_reviews:0,provider_median_ms:inference[Math.floor(inference.length/2)]??null,provider_p95_ms:inference[Math.ceil(inference.length*.95)-1]??null,total_wall_ms:performance.now()-begin};
 fs.writeFileSync(path.join(out,selectionOnly?'generation-selection-summary-015.json':'generation-evaluation-summary-015.json'),JSON.stringify(summary,null,2),{mode:0o600});console.log(JSON.stringify(summary));
}finally{child.stdin.end();child.kill('SIGTERM');globalThis.fetch=oldFetch;}
