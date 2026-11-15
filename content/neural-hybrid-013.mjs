// Private experimental runtime: injected local encoder; no network/model loader.
import {deepSearch012,expansionGuard012} from './editorial-search-012.mjs';
import {researchPipeline010} from './research-pipeline-010.mjs';
import MODEL from './research-corpus-010.mjs';
export function createNeuralHybrid013({encode,vectors,corpusVersion,modelRevision,allowExpansion=false}){
 if(typeof encode!=='function'||corpusVersion!==MODEL.version||modelRevision!=='751bff37182d3f1213fa05d7196b954e230abad9')throw Error('Unbound encoder');
 const valid=v=>Array.isArray(v)&&v.length===384&&v.every(Number.isFinite)&&Math.abs(v.reduce((n,x)=>n+x*x,0)-1)<.02;
 if(!Array.isArray(vectors)||vectors.length!==MODEL.documents.length||!vectors.every(valid))throw Error('Invalid vectors');
 const docs=new Map(MODEL.documents.map((d,i)=>[d.url,{...d,vector:Object.freeze([...vectors[i]])}]));
 return async(q,limit=5,options={})=>{
  limit=Number.isInteger(limit)?Math.max(1,Math.min(10,limit)):5;
  const passage=deepSearch012(q,limit,options);
  if(expansionGuard012(q)||passage.abstained||['identifier','navigation','unanswerable','ambiguous_entity'].includes(passage.intent))return {...passage,neural_executed:false};
  let vector;try{vector=await encode(q);}catch{return {...passage,neural_executed:false,neural_degraded:true,degradation:'encoder_unavailable'};}if(!valid(vector))return {...passage,neural_executed:false,neural_degraded:true,degradation:'invalid_encoder_output'};
  const dense=[...docs.values()].filter(d=>(!options.document_type||d.document_type===options.document_type)&&(!(options.published_after||options.published_before)||(d.publication_date&&(!options.published_after||d.publication_date>=options.published_after)&&(!options.published_before||d.publication_date<=options.published_before)))).map(d=>({url:d.url,score:d.vector.reduce((n,x,i)=>n+x*vector[i],0)})).filter(d=>d.score>=.35).sort((a,b)=>b.score-a.score||a.url.localeCompare(b.url)).slice(0,10);
  const metadata=researchPipeline010(q,10,options),scores=new Map(),eligible=new Set(passage.results.map(r=>r.url));
  for(const [list,w] of [[metadata.results,1],[passage.results,1.2],[dense,1.2]])for(const [rank,row] of list.entries())if(docs.has(row.url)&&(allowExpansion||eligible.has(row.url)))scores.set(row.url,(scores.get(row.url)||0)+w/(21+rank));
  const results=[...scores].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,limit).map(([url,score])=>{const d=docs.get(url);return {url,title:d.title,description:d.description,source_sha256:d.source_sha256,score,channel:'private_neural_hybrid_013',citations:[{url,publication_sha256:d.source_sha256}],citation_entailment:'not_independently_verified'}});
  return {...passage,results,abstained:!results.length,answer:null,generated_claims:0,neural_executed:true,model_revision:modelRevision,neural_dimensions:384,independent_acceptance:false,scope:'Private experimental metadata/passage/dense candidates; not production certified'};
 };
}
