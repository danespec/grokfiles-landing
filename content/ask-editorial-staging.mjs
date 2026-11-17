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
 receipts:[receipt('EFTA00356456',barak+'#source-EFTA00356456'),receipt('leak id 18414',barak+'#source-18414'),receipt('leak id 18310',barak+'#source-18310'),receipt('leak id 19004',barak+'#source-19004')]},
{"url": "https://grokarchivehub.com/research/epstein-final-48-hours-mcc", "sha": "99e23cfc663849d5e55778f0892e5237cc111028698eb35d985709fea882470a", "claims": [{"text": "The published chronology identifies August 9 evening movement pointers and August 9–10 CH0080 file windows in EFTA00039416.", "limitation": "This is a discovery-response file list, not an authenticated review of continuous footage.", "sources": ["EFTA00039416"]}, {"text": "The OIG report describes the August 9 cellmate transfer without a replacement, failures to conduct required rounds and counts, and falsified records. The medical examiner determined suicide; OIG reported no evidence contradicting the FBI no-criminality determination.", "limitation": "These are attributed official findings, not a newly reconstructed incident. Exact discovery-clock and EMS chronology remain source gaps in the published ledger.", "sources": ["EFTA00039025"]}], "receipts": [{"id": "EFTA00039416", "source_id": "EFTA00039416", "title": "EFTA00039416", "url": "https://grokarchivehub.com/archive/EFTA00039416"}, {"id": "EFTA00039025", "source_id": "EFTA00039025", "title": "EFTA00039025", "url": "https://grokarchivehub.com/archive/EFTA00039025"}]},
{"url": "https://grokarchivehub.com/investigations/gratitude-america-money-trail-2015-2019", "sha": "bbcdcce0eb86c84a6e64a582fdea08df4236cdda8a46d97d1416dcddeedd9962", "claims": [{"text": "The published account reconstruction identifies an October 14, 2015 $10 million BV70 LLC credit to Gratitude America’s money-market account, using the bank-derived Exhibits A and E.", "limitation": "The exhibit covers the tracked account rather than every account or the charity’s full finances.", "sources": ["EFTA00080260"]}, {"text": "The reported 2016 outflows from that account include $8.45 million in transfers to other accounts held by the same charity and $325,000 in external charitable payments.", "limitation": "Internal transfers are not external grants. Receiving-account ledgers are needed to establish later uses.", "sources": ["EFTA00080260"]}], "receipts": [{"id": "EFTA00080260", "source_id": "EFTA00080260", "title": "EFTA00080260", "url": "https://grokarchivehub.com/archive/EFTA00080260"}]},
{"url": "https://grokarchivehub.com/investigations/hold-the-letter", "sha": "af724432bc6ea0b6e05f982cfb69a7b3cd67c6c7a64cba5ab57d5988f8fcf225", "claims": [{"text": "The December 7, 2007 email records a request to send the notification letter at 17:05:56 EST and Jeffrey Sloman’s instruction “Hold the letter” at 17:08:19 EST, an interval of two minutes 23 seconds.", "limitation": "The email establishes the operational instruction, not the identity of the later-recalled consulted person or the reason for the hold.", "sources": ["EFTA00013764"]}], "receipts": [{"id": "EFTA00013764", "source_id": "EFTA00013764", "title": "EFTA00013764", "url": "https://grokarchivehub.com/archive/EFTA00013764"}]},
{"url": "https://grokarchivehub.com/evidence-briefs/efta02810827-amador-jpmorgan-forensic-report", "sha": "37e8dc963f5a8f6dd8109f16c1e7f7d42f88354cb47f1cbb07264f7bd07a0c59", "claims": [{"text": "EFTA02810827 is the June 16, 2023 expert report of forensic accountant Jorge Amador prepared for the US Virgin Islands litigation against JPMorgan. It analyzes Epstein-related accounts, transactions and entities.", "limitation": "The expert’s interpretation is not a criminal finding, a SAR or a judicial determination. Do not attribute the later Senate nine-SAR totals to this report without separate support.", "sources": ["EFTA02810827"]}], "receipts": [{"id": "EFTA02810827", "source_id": "EFTA02810827", "title": "EFTA02810827", "url": "https://grokarchivehub.com/archive/EFTA02810827"}]}
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
 const mcc=/\b(?:mcc|jail|custody|detention|prison)\b/i.test(question)&&/\b(?:final\s+48\s+hours|last\s+(?:48\s+hours|two days)|timeline|chronology|oig findings|inspector general)\b/i.test(question);
 const gratitude=/\bgratitude\s+america\b/i.test(question)&&/\b(?:account|transfer|deposit|credit|money|payment|grant|million|outflow)s?\b/i.test(question);
 const hold=/\bhold\s+the\s+letter\b/i.test(question)&&/\b(?:email|instruction|date|time|when|what|sequence|timeline|document|record)\b/i.test(question);
 const amador=/\b(?:jorge\s+amador|amador)\b/i.test(question)&&/\b(?:report|forensic|accounting|expert)\b/i.test(question);
 const packet=payment?packets[0]:visit?packets[1]:mcc?packets[2]:gratitude?packets[3]:hold?packets[4]:amador?packets[5]:null;
 if(!packet)return null;
 const candidates=researchPipeline010(question,10);
 const row=candidates.results.find(r=>r.url===packet.url&&r.source_sha256===packet.sha);
 if(!row||MODEL.publication_hashes[packet.url]!==packet.sha)return abstain('source_version_or_retrieval_mismatch');
 const allowed=new Map(packet.receipts.map(r=>[r.id,r]));
 if(packet.claims.some(c=>!c.sources.length||c.sources.some(id=>!allowed.has(id))))return abstain('citation_mismatch');
 const claims=packet.claims.map(c=>({text:c.text,citations:c.sources.map(id=>allowed.get(id)),publication_url:packet.url,publication_sha256:packet.sha,limitation:c.limitation||"Bound to the cited published research; primary-source entailment requires independent review."}));
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
