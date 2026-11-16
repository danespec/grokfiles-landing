import {researchFeatureEnabled} from './research-features.mjs';
import MODEL from './research-corpus-010.mjs';
import BANK from './reviewed-answers-015.mjs';
import {editorialGuard} from './research-evidence-closeout.mjs';
// No inference, paraphrase or review fabrication at request time.
export function reviewedAnswer015(question,env){
 const stop=reason=>({answer:null,answer_claims:[],answer_abstained:true,answer_reason:reason,answer_version:BANK.version});
 if(!researchFeatureEnabled(env,'reviewed_answers'))return stop('reviewed_answers_disabled');
 if(editorialGuard(question))return stop('restricted_or_unsupported_request');
 if(BANK.corpus_version!==MODEL.version)return stop('answer_sources_changed');
 const packet=BANK.packets.find(p=>p.question===question);if(!packet)return stop('independent_review_required');
 const result=packet.result;if(result.abstained||result.generation!=='verbatim_reviewed_extraction_only'||!result.claims?.length||result.claims.some(c=>MODEL.publication_hashes[c.citation.url]!==c.citation.publication_sha256||MODEL.documents.find(d=>d.url===c.citation.url)?.description!==c.quote))return stop('answer_sources_changed');
 return {answer:result.answer,answer_claims:result.claims,answer_abstained:false,answer_version:BANK.version,answer_generation:result.generation,uncertainty:result.uncertainty,generated_claims:0};
}

export async function reviewedAnswerLive016(question,env){
 const base=reviewedAnswer015(question,env);if(!base.answer_abstained||!researchFeatureEnabled(env,'reviewed_answers')||editorialGuard(question))return base;
 return await (await import('./reviewed-live-016.mjs')).liveReviewedAnswer016(question,env)||base;
}
