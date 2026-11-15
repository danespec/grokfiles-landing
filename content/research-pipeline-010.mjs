import RUNTIME from './research-runtime-010.mjs';
import {createRetrievalRouter} from './retrieval-routing.mjs';
import MODEL from './research-corpus-010.mjs';
const engine=createRetrievalRouter(MODEL);
const {routeSearch,classifyRetrieval,routingModelVersion,reviewedGraphEpoch}=engine;
export const attachResearchGraph010=engine.attachReviewedGraph;
export const pipelineVersion=routingModelVersion+'.'+RUNTIME.version;
const restricted=/\b(?:unredact\w*|credentials?|password|private\s+(?:nas|intel)|victim.{0,24}(?:identit(?:y|ies)|name|address|contact)|witness.{0,24}(?:identit(?:y|ies)|name|address|contact))\b/i;
const stop=new Set('the a an is are was were what which who how why when where of in to and or for from with evidence documents records epstein jeffrey published public show find explain compare before after between'.split(' '));
const terms=q=>(q.toLowerCase().match(/[a-z0-9]{2,}/g)||[]).filter(t=>!stop.has(t));
function plan(q){
 const original=classifyRetrieval(q);if(restricted.test(q))return {intent:'unanswerable',parts:[],reason:'restricted_request'};
 if(original.intent==='identifier'||original.intent==='navigation'||original.intent==='unanswerable')return {intent:original.intent,parts:[q],reason:original.reason};
 if(/^\s*(?:black|who is black|tell me about black)\s*[?.!]*$/i.test(q))return {intent:'ambiguous_entity',parts:[],reason:'specify_person_or_organization'};
 const complex=/\b(compare|contradict\w*|conflict\w*|versus|changed|correction|multiple|chains?)\b/i.test(q);
 const parts=[q,...(complex?q.split(/\s+(?:versus|compared with|and then|and|vs\.?)\s+/i):[])].map(s=>s.trim()).filter(s=>terms(s).length>=1).slice(0,4);
 return {intent:complex?'multi_source':original.intent,parts:[...new Set(parts)],reason:complex?'requires_independent_evidence_review':null};
}
export function researchPipeline010(q,limit=5,options={}){
 if(typeof q!=='string'||!q.trim()||q.length>256||!Number.isSafeInteger(limit)||limit<1||limit>10)throw Error('invalid_query_bounds');
 const p=plan(q),base={schema:'gah.research.pipeline.v1',version:pipelineVersion,intent:p.intent,answer:null,generated_claims:0,claim_verification:'not_performed',scope:`${MODEL.documents.length} explicitly approved public publications; supplement to full-archive retrieval`,corpus_publications:MODEL.documents.length,stages:['intent_classification','bounded_candidate_retrieval','relevance_ranking','publication_provenance','citation_ready_results'],subquery_count:p.parts.length,origin_requests:0,nas_reads:0,uncertainty:['Publication locators and reviewed citation membership do not verify underlying claims.','Association is not proof of wrongdoing.'],archive_search:{method:'POST',path:'/api/search',supplement_only:true},limitations:['No claim synthesis.','Publication-date filters do not reconstruct event dates.','Graph membership does not assign substantive evidence roles.']};
 const finish=results=>({...base,results,abstained:results.length===0,insufficient_evidence:p.intent==='multi_source'||results.length===0,coverage_reason:p.reason||(results.length?'approved_editorial_candidates':'insufficient_evidence_in_approved_corpus')});
 if(!p.parts.length||p.intent==='unanswerable')return finish([]);
 if(['identifier','navigation'].includes(p.intent))return finish(routeSearch(q,limit,options).results);
 const candidates=new Map();
 for(const [partIndex,part] of p.parts.entries()){
  const r=routeSearch(part,10,options);
  r.results.forEach((d,rank)=>{if(d.channel!=='intent_hybrid')return;let found=candidates.get(d.url);if(!found){found={...d,matched_subqueries:[],fusion_score:0};candidates.set(d.url,found);}found.matched_subqueries.push(partIndex);found.fusion_score+=1/(60+rank+1);});
 }
 // Retain the original lexical guard; decomposition never manufactures evidence.
 const qt=terms(q);let rows=[...candidates.values()].filter(d=>qt.some(t=>(d.title+' '+d.description).toLowerCase().includes(t)));
 rows.sort((a,b)=>b.fusion_score-a.fusion_score||b.score-a.score||a.url.localeCompare(b.url));
 return finish(rows.slice(0,limit).map(d=>({...d,publication_verification:'immutable_build_hash',citation_entailment:'human_review_required'})));
}
const cache=new Map();const TTL=30000,MAX=64;
export async function cachedResearchPipeline010(q,limit=5,options={}){
 const bytes=new TextEncoder().encode(JSON.stringify([pipelineVersion,reviewedGraphEpoch(),q,limit,options]));
 const key=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
 const now=Date.now(),old=cache.get(key);if(old&&old.expires>now)return {body:structuredClone(old.body),cache:'HIT'};
 if(old)cache.delete(key);const body=researchPipeline010(q,limit,options);
 if(cache.size>=MAX)cache.delete(cache.keys().next().value);cache.set(key,{expires:now+TTL,body:structuredClone(body)});
 return {body,cache:'MISS'};
}
