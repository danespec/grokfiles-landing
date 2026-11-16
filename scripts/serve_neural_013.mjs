// Offline comparison: pinned cached public model, no remote inference or data transfers.
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import crypto from 'node:crypto';import {performance} from 'node:perf_hooks';
import MODEL from '../content/research-corpus-010.mjs';
import {deepSearch012} from '../content/editorial-search-012.mjs';
import {researchPipeline010} from '../content/research-pipeline-010.mjs';
const repoRoot=fs.realpathSync(new URL('..',import.meta.url));
const previous=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);
if(!process.argv[2]||!process.argv[3]||out===repoRoot||out.startsWith(repoRoot+path.sep))throw Error('Private evidence paths required');
const root=path.join(previous,'node-embedding/node_modules/@huggingface/transformers');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json')));
if(pkg.version!=='4.3.2')throw Error('Unexpected dependency version');
const {pipeline,env}=await import(pathToFileURL(path.join(root,pkg.exports.node.import.default)).href);
const revision='751bff37182d3f1213fa05d7196b954e230abad9',model='Xenova/all-MiniLM-L6-v2',cache=path.join(previous,'node-embedding/model-cache');
env.allowRemoteModels=false;env.allowLocalModels=true;env.useBrowserCache=false;env.localModelPath=path.join(cache,model)+path.sep;
const originalFetch=globalThis.fetch;globalThis.fetch=async()=>{throw Error('Network forbidden in offline benchmark')};

const {createNeuralHybrid013}=await import('../content/neural-hybrid-013.mjs');
const {privateNeuralServer013}=await import('./private_neural_service_013.mjs');
 const extractor=await pipeline('feature-extraction',revision,{local_files_only:true,dtype:'q8',device:'cpu',cache_dir:cache,session_options:{intraOpNumThreads:2,interOpNumThreads:1}});
 const encode=async text=>(await extractor(text,{pooling:'mean',normalize:true})).tolist();
 const vectors=[];for(let i=0;i<MODEL.documents.length;i+=16)vectors.push(...await encode(MODEL.documents.slice(i,i+16).map(d=>d.title+' '+d.description)));
 const runtime=createNeuralHybrid013({encode:async q=>(await encode([q]))[0],vectors,corpusVersion:MODEL.version,modelRevision:revision,allowExpansion:true});

const service=privateNeuralServer013(runtime);
const address=await service.listen();
const receipt={scope:'private loopback only; no public exposure',port:address.port,corpus:MODEL.version,publications:MODEL.documents.length,model_revision:revision,dimensions:384};
fs.mkdirSync(out,{recursive:true,mode:0o700});if(fs.realpathSync(out)===repoRoot||fs.realpathSync(out).startsWith(repoRoot+path.sep))throw Error('Private evidence outside checkout required');fs.writeFileSync(path.join(out,'neural-service.private.json'),JSON.stringify(receipt),{mode:0o600});
console.log(JSON.stringify({ready:true,loopback_only:true,publications:MODEL.documents.length}));
process.once('SIGTERM',async()=>{await service.close();process.exit(0);});
