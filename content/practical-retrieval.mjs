// Public candidate retrieval over owner-authorized editorial publications only.
// Vectors/postings are injected from private build storage, never static assets.
import {deepSearch012,deepVersion,expansionGuard012} from './editorial-search-012.mjs';
import MODEL from './research-corpus-010.mjs';
import VECTORS from './editorial-vectors-013.mjs';
import {citationPacket} from './research-evidence-closeout.mjs';
const MODEL_ID='@cf/baai/bge-small-en-v1.5';
const bound=VECTORS.embedding_batch_size===1&&VECTORS.corpus_version===MODEL.version&&VECTORS.model===MODEL_ID&&VECTORS.documents.length===MODEL.documents.length&&VECTORS.documents.every((d,i)=>d.url===MODEL.documents[i].url&&d.source_sha256===MODEL.documents[i].source_sha256);
const enabled=v=>!['0','false'].includes(String(v??'true').toLowerCase());
export const practicalVersion=deepVersion+'.'+VECTORS.version;
const environments=new WeakMap();
function state(env){let s=environments.get(env);if(!s)environments.set(env,s={active:0,cache:new Map(),pending:new Map(),verifiedUntil:0});return s;}
const valid=v=>Array.isArray(v)&&v.length===384&&v.every(Number.isFinite)&&Math.abs(v.reduce((n,x)=>n+x*x,0)-1)<.03;
const filtered=(d,o)=>(!o.document_type||d.document_type===o.document_type)&&(!(o.published_after||o.published_before)||(d.publication_date&&(!o.published_after||d.publication_date>=o.published_after)&&(!o.published_before||d.publication_date<=o.published_before)));
export async function practicalRetrieval({q,limit=5,options={},strategy='passage',env={},budget=async()=>false}){
 const base=deepSearch012(q,limit,options),project=(body,extra={})=>{const version=practicalVersion,results=body.results;return {...body,...extra,version,answer:null,generated_claims:0,citation_packet:citationPacket({version,results}),release:'public_editorial_beta',scope:'Owner-authorized public editorial candidate retrieval; supplements the full archive; no source text or generated conclusion',relevance_validation:'independent_human_review_not_completed'};};
 if(!bound||VECTORS.fixture_only&&String(env.GAH_STAGING)!=='true')throw Error('vector_publication_mismatch');
 if(!enabled(env.GAH_PASSAGE_ENABLED))throw Error('passage_disabled');
 const fallback=reason=>project(base,{strategy:'passage',neural_executed:false,neural_degraded:strategy==='hybrid',degradation:reason});
 if(strategy!=='hybrid'||expansionGuard012(q)||base.abstained||['identifier','navigation','unanswerable','ambiguous_entity'].includes(base.intent))return project(base,{strategy:'passage',neural_executed:false});
 if(!enabled(env.GAH_NEURAL_ENABLED)||typeof env.GAH_AI?.run!=='function')return fallback('encoder_unavailable');
 const s=state(env),bytes=new TextEncoder().encode(JSON.stringify([practicalVersion,q,limit,options]));const key=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const old=s.cache.get(key);if(old&&old.until>Date.now())return {...structuredClone(old.body),retrieval_cache:'HIT'};if(old)s.cache.delete(key);
 if(s.pending.has(key))return structuredClone(await s.pending.get(key));
 if(s.active>=2)return fallback('encoder_capacity');
 if(!await budget())return fallback('encoder_budget');
 if(s.pending.has(key))return structuredClone(await s.pending.get(key));
 if(s.active>=2)return fallback('encoder_capacity');
 s.active++;
 const work=(async()=>{
  const checkCanary=s.verifiedUntil<=Date.now();const canary=MODEL.documents[0].title+' '+MODEL.documents[0].description;
  const normalize=v=>{if(!Array.isArray(v)||v.length!==384||!v.every(Number.isFinite))throw Error('invalid_encoder_output');const norm=Math.sqrt(v.reduce((n,x)=>n+x*x,0));if(norm<.001||norm>1000)throw Error('invalid_encoder_output');return v.map(x=>x/norm)};
  if(checkCanary){const probe=normalize((await env.GAH_AI.run(MODEL_ID,{text:[canary]}))?.data?.[0]);if(probe.reduce((sum,v,i)=>sum+v*VECTORS.documents[0].vector[i],0)<.999)throw Error('model_snapshot_changed');s.verifiedUntil=Date.now()+3600000;if(!await budget())throw Error('encoder_budget');}
  const vector=normalize((await env.GAH_AI.run(MODEL_ID,{text:[q]}))?.data?.[0]);
  const subjects=[...(/\bbarak\b/i.test(q)?[/\bbarak\b/i]:[]),...(/\bleon\s+black\b/i.test(q)?[/\bleon\s+black\b/i]:[])];
  const dense=MODEL.documents.map((d,i)=>({...d,vector:VECTORS.documents[i].vector})).filter(d=>filtered(d,options)&&(!subjects.length||subjects.some(p=>p.test(d.title+' '+d.description)))).map(d=>({url:d.url,score:d.vector.reduce((sum,v,i)=>sum+v*vector[i],0)})).filter(d=>d.score>=.35).sort((a,b)=>b.score-a.score||a.url.localeCompare(b.url)).slice(0,10);
  const scores=new Map(),docs=new Map(MODEL.documents.map(d=>[d.url,d]));
  for(const [list,weight] of [[base.results,1.2],[dense,1.2]])for(const [rank,row] of list.entries()){const d=docs.get(row.url);if(d&&(!subjects.length||subjects.some(p=>p.test(d.title+' '+d.description))))scores.set(row.url,(scores.get(row.url)||0)+weight/(21+rank));}
  const results=[...scores].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,limit).map(([url,score])=>{const d=docs.get(url);return {url,title:d.title,description:d.description,document_type:d.document_type,publication_date:d.publication_date,source_sha256:d.source_sha256,score,channel:'neural_editorial_candidate',citations:[{url,publication_sha256:d.source_sha256}],citation_entailment:'not_independently_verified'};});
  const body=project({...base,results,abstained:!results.length},{strategy:'hybrid',neural_executed:true,neural_dimensions:384,model:MODEL_ID,model_revision:'provider-managed; bound to private vector snapshot '+VECTORS.version});
  if(s.cache.size>=64)s.cache.delete(s.cache.keys().next().value);s.cache.set(key,{until:Date.now()+120000,body});return body;
 })().catch(error=>fallback(['invalid_encoder_output','model_snapshot_changed','encoder_budget'].includes(error?.message)?error.message:'encoder_failure')).finally(()=>{s.active--;s.pending.delete(key)});
 let timer;const deadline=new Promise(resolve=>{timer=setTimeout(()=>resolve(fallback('encoder_timeout')),1500)});const bounded=Promise.race([work,deadline]).finally(()=>clearTimeout(timer));s.pending.set(key,bounded);return structuredClone(await bounded);
}
