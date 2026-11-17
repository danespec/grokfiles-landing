import MODEL from './research-corpus-010.mjs';
import {researchPipeline010} from './research-pipeline-010.mjs';
import {editorialGuard} from './research-evidence-closeout.mjs';
const apex='https://grokarchivehub.com';
const black=apex+'/reels/leon-black-dechert-158-million-efta02730996';
const barak=apex+'/investigations/barak-st-thomas-dec-2014';
const receipt=(id,url)=>({id,source_id:id,title:id,url});
const packets=[
 {questions:['What does the Dechert report say Leon Black paid Epstein?','How much did Leon Black pay Epstein according to Dechert?'],url:black,sha:'eee484161fa18f23726d2339a65588c65050b567230f7a281adc182dbc987159',claims:[
 {text:'Dechert reported $158 million for work performed in 2012–2017: $50 million in 2013, $70 million in 2014, $30 million in 2015 and $8 million in April 2017, paid to Epstein’s Southern Trust Company. It separately reported $30.5 million in 2017 loans from Black’s BV70 LLC.',sources:['EFTA02730996']},
 {text:'Dechert described compensation for tax and estate work and said it found no evidence tying the payments to Epstein’s criminal activity. This was a commissioned review, not a court verdict. The later $170 million Senate figure has a different scope; Wyden separately questioned the calculation and substantiation.',sources:['EFTA02730996','EFTA02731023']}],
 receipts:[receipt('EFTA02730996','https://www.justice.gov/epstein/files/DataSet%2012/EFTA02730996.pdf'),receipt('EFTA02731023','https://www.justice.gov/epstein/files/DataSet%2012/EFTA02731023.pdf')]},
 {questions:['Did Ehud Barak go to St. Thomas in December 2014?','Did Ehud Barak visit St Thomas in December 2014?'],url:barak,sha:'e29345f3761bae0fefc1bdc07b615f8dec776c67d4e3885c9eac34c38bee43c5',claims:[
 {text:'Yes. The published investigation documents Ehud and Nili Barak’s completed St. Thomas visit from December 12–15, 2014. Epstein invited them December 5–6; Nili proposed AA 1275 on December 7 and Epstein agreed.',sources:['EFTA00356456','leak id 18414','leak id 18310']},
 {text:'EFTA00356456 records the arrival, Ritz-Carlton arrangements, an island lunch arranged for December 12 and the December 15 farewell. The separate itinerary naming COHEN/RONEN MR is an unresolved anomaly, not proof that Barak traveled under that name or evidence of wrongdoing.',sources:['EFTA00356456','leak id 19004']}],
 receipts:[receipt('EFTA00356456',barak+'#source-EFTA00356456'),receipt('leak id 18414',barak+'#source-18414'),receipt('leak id 18310',barak+'#source-18310'),receipt('leak id 19004',barak+'#source-19004')]}
];
const norm=q=>q.toLowerCase().replace(/[?.!]+$/,'').replace(/\s+/g,' ').trim();
const namesakes=q=>/\bblack\b/i.test(q)&&/\b(?:namesakes?|unrelated|family versus|different black|which black entity)\b/i.test(q);
const abstain=reason=>({ok:true,degraded:false,mode:'editorial_answer_staging',intent:'archive',answer:'The published evidence does not establish a sufficiently supported answer.',answer_abstained:true,answer_reason:reason,answer_claims:[],citations:[],hits:[],generated_claims:0});
export function askEditorialCandidate(question,env){
 // Staging only: independent review and explicit production authorization required.
 if(String(env?.GAH_STAGING).toLowerCase()!=='true')return null;
 if(editorialGuard(question)||namesakes(question))return abstain('insufficient_or_restricted_evidence');
 if(question.length>256||/\bEFTA\d{8}\b/i.test(question))return null;
 const payment=/\bleon\s+black\b/i.test(question)&&/\bdechert\b/i.test(question)&&/\b(?:pay|paid|payment|payments|fee|fees|million|loans?)\b/i.test(question);
 const visit=/\bbarak\b/i.test(question)&&/\bst\.?\s+thomas\b/i.test(question)&&/\b2014\b/i.test(question)&&/\b(?:december|dec|visit|go|went|trip|travel)\b/i.test(question);
 const packet=payment?packets[0]:visit?packets[1]:null;
 if(!packet)return null;
 const candidates=researchPipeline010(question,10);
 const row=candidates.results.find(r=>r.url===packet.url&&r.source_sha256===packet.sha);
 if(!row||MODEL.publication_hashes[packet.url]!==packet.sha)return abstain('source_version_or_retrieval_mismatch');
 const allowed=new Map(packet.receipts.map(r=>[r.id,r]));
 if(packet.claims.some(c=>!c.sources.length||c.sources.some(id=>!allowed.has(id))))return abstain('citation_mismatch');
 const claims=packet.claims.map(c=>({text:c.text,citations:c.sources.map(id=>allowed.get(id)),publication_url:packet.url,publication_sha256:packet.sha}));
 return {ok:true,degraded:false,mode:'editorial_answer_staging',intent:'archive',answer:claims.map(c=>c.text+' ['+c.citations.map(r=>r.id).join('; ')+']').join('\n\n'),answer_abstained:false,answer_claims:claims,citations:packet.receipts,hits:[{title:row.title,url:packet.url,description:row.description,result_type:'editorial_publication'},...packet.receipts],editorial_candidates:candidates.results.map(r=>({title:r.title,url:r.url,publication_sha256:r.source_sha256})),answer_generation:'source_bound_staging_candidate',review_status:'pending_independent_review',generated_claims:0};
}
// Other questions receive ranked publication locators, not fabricated answers.
// The upstream archive answer/refusal is preserved verbatim.
export function askEditorialLocators(question,env){
 if(String(env?.GAH_STAGING).toLowerCase()!=='true'||question.length>256||editorialGuard(question)||namesakes(question)||/\bEFTA\d{8}\b/i.test(question))return [];
 const result=researchPipeline010(question,5);
 if(['identifier','navigation','unanswerable','ambiguous_entity'].includes(result.intent))return [];
 return result.results.filter(row=>MODEL.publication_hashes[row.url]===row.source_sha256).map(row=>({title:row.title,url:row.url,description:row.description,publication_sha256:row.source_sha256,result_type:'editorial_publication',citation_scope:'Candidate locator only; not a supported answer'}));
}
export const ASK_EDITORIAL_PACKETS=packets;
