// Shared release checks. Human decisions are supplied by authenticated review UI only.
export async function reviewHash016(text){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
const unsafe=/\b(?:passwords?|credentials?|unredact\w*|victim.{0,20}(?:name|identity)|witness.{0,20}(?:name|identity))\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b\d{3}-\d{2}-\d{4}\b/i;
export async function certifyAnswer016(payload,model,reviewer,date){
 const p=structuredClone(payload.packet);
 if(!payload.release_gate||!p||!Array.isArray(p.claims)||!p.claims.length||p.claims.length>8||!Array.isArray(p.sources)||p.sources.length>16||typeof p.question!=='string'||p.question.length>256||unsafe.test(p.question))throw Error('answer_source_gate');
 const map=new Map(p.sources.map(s=>[s.id,s]));if(map.size!==p.sources.length)throw Error('duplicate_sources');
 const claims=[];
 for(const c of p.claims){const s=map.get(c.source_id),d=model.documents.find(d=>d.url===s?.url);
  if(!s||!d||s.withdrawn||d.source_sha256!==s.publication_sha256||s.publication_sha256!==s.current_publication_sha256||d.description!==s.text||s.text_sha256!==await reviewHash016(s.text)||c.quote!==s.text||c.quote.length>600||unsafe.test(c.quote)||!['finding','allegation','proposal','unresolved'].includes(c.classification)||c.classification!==s.classification||typeof s.limitation!=='string'||s.limitation.length>600||unsafe.test(s.limitation))throw Error('answer_source_gate');
  s.privacy_approved=true;claims.push({quote:c.quote,classification:c.classification,citation:{url:s.url,source_id:s.id,publication_sha256:s.publication_sha256,text_sha256:s.text_sha256},limitation:s.limitation});
 }
 p.review={approved:true,independent:true,privacy_approved:true,author:payload.draft_author,reviewer,date,version:p.version,packet_sha256:await reviewHash016(JSON.stringify(p))};
 return {question:p.question,packet:p,result:{schema:'gah.evidence.answer.v1',version:p.version,answer:claims.map(c=>'“'+c.quote+'” ['+c.classification+']'+(payload.answer_format==='scoped_extraction_v2'?'\nScope and limits: '+c.limitation:'')).join('\n'),claims,abstained:false,generation:payload.answer_format==='scoped_extraction_v2'?'reviewed_source_quotes_with_scope_notes':'verbatim_reviewed_extraction_only',unsupported_synthesis:false,uncertainty:'These are human-reviewed quotations of published editorial summaries, not independent verification of the underlying primary evidence. Allegations and unresolved questions retain their classifications.'}};
}
export function certifyArchive016(p){
 let u;try{u=new URL(p.primary_locator)}catch{throw Error('archive_source_gate')}
 if(!p.release_gate||!p.automated_checks?.source_fingerprint_verified||!p.automated_checks?.registry_indexable||!p.automated_checks?.no_mirror_hold||p.conflicting_copies||!/^EFTA\d{8}$/.test(p.id)||! /^[a-f0-9]{64}$/.test(p.source_sha256||'')||u.protocol!=='https:'||!['www.justice.gov','justice.gov'].includes(u.hostname)||u.username||u.password||u.port||u.hash||!u.pathname.endsWith('/'+p.id+'.pdf')||p.source_verification?.sha256!==p.source_sha256||p.scope!=='verified_locator_only'||p.public_locator!=='https://grokarchivehub.com/archive/'+p.id)throw Error('archive_source_gate');
 return {id:p.id,url:p.public_locator,primary_locator:p.primary_locator,source_sha256:p.source_sha256,scope:'verified_locator_only',raw_documents_indexed:0,semantic_passages:0};
}
