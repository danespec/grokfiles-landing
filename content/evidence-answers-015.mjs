// Private extractive answer assembler. No generative model, paraphrase or network.
import {createHash} from 'node:crypto';
import MODEL from './research-corpus-010.mjs';
export const evidenceHash015=s=>createHash('sha256').update(s).digest('hex');
const unsafe=/\b(?:passwords?|credentials?|unredact\w*|victim.{0,20}(?:name|identity)|witness.{0,20}(?:name|identity))\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b\d{3}-\d{2}-\d{4}\b/i;
export function assembleEvidenceAnswer015({question,claims,sources,review,version,revoked=[],now=new Date().toISOString().slice(0,10),production=true}){
 const abstain=reason=>({schema:'gah.evidence.answer.v1',version,answer:null,claims:[],abstained:true,reason});
 if(typeof question!=='string'||question.trim().length<3||question.length>256||unsafe.test(question)||typeof version!=='string'||version.length<1||version.length>128||!Array.isArray(revoked))return abstain('restricted_or_invalid_query');
 if(!review||review.approved!==true||review.independent!==true||review.privacy_approved!==true||typeof review.reviewer!=='string'||typeof review.author!=='string'||!review.reviewer.trim()||!review.author.trim()||review.reviewer.trim().toLowerCase()===review.author.trim().toLowerCase()||!/^\d{4}-\d{2}-\d{2}$/.test(review.date||'')||(!Number.isFinite(Date.parse(review.date))||new Date(review.date).toISOString().slice(0,10)!==review.date)||review.date>now||review.version!==version||(production&&review.fixture_only))return abstain('independent_review_required');
 if(!Array.isArray(claims)||claims.length<1||claims.length>8||!Array.isArray(sources)||sources.length>16)return abstain('invalid_packet');
 if(sources.some(s=>!s||typeof s!=='object'||typeof s.id!=='string'||!/^[-a-zA-Z0-9_]{1,80}$/.test(s.id))||claims.some(c=>!c||typeof c!=='object'))return abstain('invalid_packet');
 const bound=evidenceHash015(JSON.stringify({question,claims,sources,version}));if(review.packet_sha256!==bound)return abstain('review_packet_changed');
 const map=new Map(sources.map(s=>[s.id,s]));if(map.size!==sources.length)return abstain('duplicate_sources');
 const result=[];
 for(const c of claims){
  const s=map.get(c.source_id);
  if(production&&(!s||MODEL.publication_hashes[s.url]!==s.publication_sha256))return abstain('publication_not_current');
  if(!s||revoked.includes(s.id)||s.withdrawn||s.privacy_approved!==true||s.publication_sha256!==s.current_publication_sha256||!/^https:\/\/grokarchivehub\.com\//.test(s.url)||! /^[a-f0-9]{64}$/.test(s.publication_sha256||'')||typeof s.text!=='string'||s.text.length>12000||s.text_sha256!==evidenceHash015(s.text))return abstain('source_unavailable_changed_or_withdrawn');
  if(typeof c.quote!=='string'||c.quote.length<1||c.quote.length>600||!s.text.includes(c.quote)||unsafe.test(c.quote)||!['finding','allegation','proposal','unresolved'].includes(c.classification)||c.classification!==s.classification)return abstain('unsupported_claim');
  if(s.limitation!==undefined&&(typeof s.limitation!=='string'||s.limitation.length>600||unsafe.test(s.limitation)))return abstain('invalid_limitation');
  result.push({quote:c.quote,classification:c.classification,citation:{url:s.url,source_id:s.id,publication_sha256:s.publication_sha256,text_sha256:s.text_sha256},limitation:s.limitation||'Quoted publication text is not independent verification of its underlying claims.'});
 }
 return {schema:'gah.evidence.answer.v1',version,answer:result.map(c=>'“'+c.quote+'” ['+c.classification+']').join('\n'),claims:result,abstained:false,generation:'verbatim_reviewed_extraction_only',unsupported_synthesis:false,uncertainty:'Allegations, proposals and unresolved questions retain their source classifications. Association alone does not establish wrongdoing.'};
}
