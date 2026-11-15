import INDEX from './editorial-passages-012.mjs';
import MODEL from './research-corpus-010.mjs';
import {researchPipeline010,pipelineVersion} from './research-pipeline-010.mjs';
export const STAGE_012='ai-retrieval-012.gah-staging-517b8499.pages.dev';
export const PATH_012='/api/v1/research/editorial-search-preview';
export const deepVersion=INDEX.version+'.'+pipelineVersion;
const stop=new Set('the a an is are was were be been being what which who how why when where of in to and or for from with by on as at it its this that these those not but have has had do does did will would can could should may might i you he she they we their his her our your them us me my public published evidence documents document records record source sources epstein jeffrey gah grok archive hub read show find explain compare before after between about page more also only than'.split(' '));
const aliases={payments:'payment',paid:'payment',fees:'payment',flights:'flight',passengers:'passenger',logs:'log',timelines:'timeline',chronology:'timeline',chronological:'timeline',transactions:'transaction',corrections:'correction',reconciliation:'reconcile',reconciled:'reconcile',reconciling:'reconcile',proposals:'proposal',emails:'email',invitations:'invitation',counts:'count',questions:'question',airplanes:'aircraft'};
const words=s=>(String(s).toLowerCase().match(/[a-z0-9]{2,}/g)||[]).filter(t=>!stop.has(t)&&t.length<=40&&!/^[a-f0-9]{24,}$/.test(t)).map(t=>Object.hasOwn(aliases,t)?aliases[t]:t);
const privateQuery=/\b(?:unredact\w*|passwords?|credentials?|private\s+(?:nas|intel|files?)|(?:victims?|survivors?|witness(?:es)?|minors?|children).{0,40}(?:identit\w*|names?|addresses?|contact|phone|email|locat\w*)|(?:identif\w*|name|locate|dox\w*|reveal).{0,40}(?:victims?|survivors?|witness(?:es)?|minors?|children)|social security|home address|phone number|passport number|date of birth)\b/i;
const unsafeInference=/\b(?:authentication cookies?|session tokens?|ignore.{0,30}(?:safeguards|instructions|restrictions)|bypass.{0,30}(?:safeguards|security|redactions)|(?:prove|confirm|establish|assume|treat).{0,50}(?:guilt|wrongdoing|criminality).{0,35}(?:alone|only|based)|(?:association|flight.log|passenger entry).{0,30}(?:alone|only|proof).{0,30}(?:guilt|wrongdoing)|(?:guilt|wrongdoing).{0,30}(?:alone|only).{0,30}(?:association|flight.log|passenger)|without (?:review|evidence|a document)|no published evidence|imaginary|interplanetary|blank passenger entry)\b/i;
// Shared pre-retrieval boundary. Scope and input checks apply before any
// optional dense expansion, not just after lexical ranking.
const prohibitedExpansion=/\b(?:restricted (?:evidence|records?|files?)|(?:extract|retrieve|publish|access|show|return).{0,30}(?:private|unpublished|nonpublic) (?:records?|files?|data|evidence)|(?:reverse|undo|remove|defeat|reconstruct|recover|bypass).{0,24}redact\w*|(?:identify|find|name|owner of).{0,30}unattributed|(?:conviction|guilt).{0,30}(?:from|based on).{0,20}(?:civil )?allegation|(?:resolve|determine|establish|prove|reconstruct|answer).{0,30}(?:without|absent|missing).{0,24}(?:source|evidence|document|record)|(?:definitive|certain|conclusive) answer.{0,32}(?:incomplete|absent|missing|unavailable)|(?:currency|amount|date|parties).{0,70}(?:are absent|unknown or absent)|non[- ]existent publication|fictional record|permanently unavailable source)\b/i;
export function expansionGuard012(q){
 if(typeof q!=='string'||q.length>256||!q.trim())return 'invalid_query';
 if(privateQuery.test(q)||unsafeInference.test(q)||prohibitedExpansion.test(q)||/<\/?[a-z][^>]*>/i.test(q)||/\b(?:drop|alter|truncate|delete)\s+(?:table|database|from)\b/i.test(q))return 'restricted_or_unsupported_request';
 if(/\bBARAK[-_][0-9]+(?:[-_][0-9]+)?\b/i.test(q))return 'unsupported_identifier_namespace';
 if(/\b(?:versus|vs\.?|distinguish)\b.{0,40}\b(?:document )?namespace\b/i.test(q))return 'specify_entity_or_document';
 return null;
}
const ambiguous=/^\s*(?:black(?: records)?|smith(?: in the records)?|[a-z]{2,3}\s+initials|unknown initials|(?:a person )?identified only as [a-z]{2,3}|(?:a|an) (?:date|organization|person) without (?:a )?(?:source|document|identifier))\s*[?.!]*$/i;
// Administrative navigation is separate from evidence claims.
const adminRoutes=[
 [/^(?:open|find|show|browse|locate|take me to) (?:the )?corrections(?: page| hub)?$/i,'/corrections','Corrections'],
 [/^(?:open|find|show|browse|locate) (?:the )?(?:editorial )?methodology(?: page)?$/i,'/methodology','Editorial methodology'],
 [/^(?:open|find|show|browse|locate) (?:the )?investigation(?:s| index)?$/i,'/investigations','Published investigations'],
 [/^(?:(?:open|find|show|locate) (?:the )?(?:versioned publication changes|publication feed|latest bounded editorial register)|which publication hashes changed)$/i,'/api/v1/publications/changes','Versioned publication changes'],
 [/^(?:what atlas revision is actually published|(?:open|show|find|locate) (?:the )?(?:published )?atlas (?:release )?(?:status|version))$/i,'/api/v1/atlas/status','Published Atlas release status'],
 [/^(?:open|find|show|locate) (?:the )?(?:machine )?api documentation$/i,'/openapi.json','Public API documentation']
];
const metadata=MODEL.documents.map(d=>new Set(words(d.title+' '+d.description)));
const matched=INDEX.documents.length===MODEL.documents.length&&INDEX.documents.every((d,i)=>d.url===MODEL.documents[i].url&&d.source_sha256===MODEL.documents[i].source_sha256);
const avg=INDEX.passages.reduce((n,p)=>n+p[1],0)/Math.max(INDEX.passages.length,1);
const positive=(d,o)=>(!o.document_type||d.document_type===o.document_type)&&(!(o.published_after||o.published_before)||(d.publication_date&&(!o.published_after||d.publication_date>=o.published_after)&&(!o.published_before||d.publication_date<=o.published_before)));
function idf(t){const list=Object.hasOwn(INDEX.postings,t)?INDEX.postings[t]:[];return Math.log(1+(INDEX.passages.length-list.length+.5)/(list.length+.5))}
export function deepSearch012(q,limit=5,options={}){
 if(!matched)throw Error('passage_index_mismatch');
 if(typeof q!=='string'||!q.trim()||q.length>256||!Number.isSafeInteger(limit)||limit<1||limit>10)throw Error('invalid_bounds');
 const original=researchPipeline010(q,10,options);
 const base={...original,version:deepVersion,scope:'Filtered public editorial article text and metadata; citation candidates only; not full raw archive',retrieval_profile:'passage_rerank_012_preview',passage_index_version:INDEX.version,passage_count:INDEX.passages.length,corpus_publications:MODEL.documents.length};
 const finish=(results,reason)=>({...base,results,abstained:!results.length,insufficient_evidence:original.insufficient_evidence||!results.length,coverage_reason:reason});
 const blocked=expansionGuard012(q);if(blocked)return {...finish([],blocked),intent:'unanswerable'};
 if(ambiguous.test(q)||/\b(?:unknown initials|identified only as [a-z]{2,3}|ambiguous acronym|person or location|which black entity)\b/i.test(q))return {...finish([],'specify_entity_or_document'),intent:'ambiguous_entity'};
 const admin=adminRoutes.find(([pattern])=>pattern.test(q.trim().replace(/[?!.]+$/,'')));
 if(admin&&!Object.keys(options).length)return {...finish([{url:'https://grokarchivehub.com'+admin[1],title:admin[2],channel:'navigation',score:1,citations:[]}],'administrative_navigation_only'),intent:'navigation'};
 if(['identifier','navigation','unanswerable','ambiguous_entity'].includes(original.intent))return finish(original.results.slice(0,limit),original.coverage_reason);
 const qt=[...new Set(words(q))].slice(0,24);
 if(!qt.length)return finish([],'insufficient_query_specificity');
 const docFreq=new Map(qt.map(t=>[t,new Set((Object.hasOwn(INDEX.postings,t)?INDEX.postings[t]:[]).map(([pi])=>INDEX.passages[pi][0])).size]));
 const anchors=qt.filter(t=>docFreq.get(t)>0&&docFreq.get(t)<=10&&metadata.some(m=>m.has(t))&&!/^\d+$/.test(t)&&!['proposal','question','count','date','timeline','reconcile','correction','record','source','identify','specific','unknown'].includes(t));
 const weights=new Map(qt.map(t=>[t,idf(t)])),totalWeight=[...weights.values()].reduce((a,b)=>a+b,0);
 const byPassage=new Map(),byDocument=new Map();
 for(const t of qt){
  const list=Object.hasOwn(INDEX.postings,t)?INDEX.postings[t]:[];
  for(const [pi,tf] of list){
   const [di,length]=INDEX.passages[pi];
   let p=byPassage.get(pi);if(!p)byPassage.set(pi,p={di,score:0,matched:0});
   p.matched++;p.score+=weights.get(t)*tf*2.2/(tf+1.2*(.25+.75*length/avg));
   let d=byDocument.get(di);if(!d)byDocument.set(di,d={terms:new Set(),best:0,bestCount:0});d.terms.add(t);
  }
 }
 for(const p of byPassage.values()){
  const d=byDocument.get(p.di),score=p.score*(.5+.5*p.matched/qt.length);
  if(score>d.best){d.best=score;d.bestCount=p.matched}
 }
 const legacy=new Map(original.results.map((r,i)=>[r.url,{row:r,rank:i+1}]));
 const results=[];
 for(let i=0;i<MODEL.documents.length;i++){
  const d=MODEL.documents[i];if(!positive(d,options))continue;
  const body=byDocument.get(i),old=legacy.get(d.url),metaTerms=qt.filter(t=>metadata[i].has(t));
  const covered=qt.filter(t=>metadata[i].has(t)||body?.terms.has(t));
  if(anchors.length&&!anchors.some(t=>covered.includes(t)))continue;
  const coverage=covered.length/qt.length,weightedCoverage=covered.reduce((n,t)=>n+weights.get(t),0)/totalWeight;
  const metaCoverage=metaTerms.reduce((n,t)=>n+weights.get(t),0)/totalWeight;
  // The known subject anchors must appear in this same publication.
  if(qt.includes('barak')&&!metadata[i].has('barak')&&!body?.terms.has('barak'))continue;
  if(qt.includes('leon')&&qt.includes('black')&&!(metadata[i].has('leon')&&metadata[i].has('black')||body?.terms.has('leon')&&body?.terms.has('black')))continue;
  if(qt.length===1&&!old&&(!body||weights.get(qt[0])<2.5))continue;
  if(qt.length>1&&(covered.length<2||coverage<(old?.rank===1&&metaTerms.length>=2?.45:.60)))continue;
  if(!old&&(!body||body.bestCount<Math.min(2,qt.length)&&!anchors.some(t=>metadata[i].has(t))))continue;
  const passageStrength=Math.min(1,(body?.best||0)/Math.max(totalWeight,1));
  const score=3*weightedCoverage+3*metaCoverage+1.5*passageStrength+(.45*(body?.bestCount||0)/qt.length)+(old?.rank===1?.8:old?.rank?.2:0);
  const {index_text,...safe}=d;
  results.push({...safe,channel:'editorial_passage_rerank',score:Math.round(score*10000)/10000,related_atlas:old?.row?.related_atlas||[],citations:[{url:d.url,kind:'published_editorial',publication_sha256:d.source_sha256}],publication_verification:'immutable_build_hash',citation_entailment:'human_review_required'});
 }
 results.sort((a,b)=>b.score-a.score||a.url.localeCompare(b.url));
 // Avoid padding the response with substantially weaker secondary hits.
 const cutoff=results.length?results[0].score*.72:0;
 return finish(results.filter(r=>r.score>=cutoff).slice(0,limit),results.length?'filtered_editorial_passage_candidates':'insufficient_evidence_in_filtered_editorial_index');
}
export function deepEnabled012(request,env){return String(env?.GAH_STAGING)==='true'&&new URL(request.url).hostname===STAGE_012&&String(env?.GAH_RESEARCH_012_ENABLED??'true')!=='false'}
export async function deepHttp012(request,env,throttle){
 const u=new URL(request.url),headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex,nofollow','Content-Signal':'ai-train=no, search=no, ai-input=no','X-Content-Type-Options':'nosniff'};
 const reply=(x,status=200,extra={})=>new Response(request.method==='HEAD'?null:JSON.stringify(x),{status,headers:{...headers,...extra}});
 if(!deepEnabled012(request,env)||u.pathname!==PATH_012)return reply({error:'not_found'},404);
 if(!['GET','HEAD'].includes(request.method))return reply({error:'method_not_allowed'},405,{Allow:'GET, HEAD'});
 const allowed=['q','limit','document_type','published_after','published_before','version'];
 for(const k of u.searchParams.keys())if(!allowed.includes(k)||u.searchParams.getAll(k).length!==1)return reply({error:'invalid_query'},400);
 const q=u.searchParams.get('q')||'',limit=u.searchParams.get('limit')??'5',version=u.searchParams.get('version');
 if(!q.trim()||q.length>256||!/^[1-9][0-9]?$/.test(limit)||+limit>10||version?.length>256)return reply({error:'invalid_bounds'},400);
 const options=Object.fromEntries(['document_type','published_after','published_before'].filter(k=>u.searchParams.has(k)).map(k=>[k,u.searchParams.get(k)]));
 if(options.document_type&&!['investigation','reel','correction','dispatch','guide','evidence_brief','document_autopsy','timeline','news'].includes(options.document_type))return reply({error:'invalid_filter'},400);
 for(const k of ['published_after','published_before'])if(k in options&&(!/^\d{4}-\d{2}-\d{2}$/.test(options[k])||!Number.isFinite(Date.parse(options[k]))||new Date(options[k]).toISOString().slice(0,10)!==options[k]))return reply({error:'invalid_date'},400);
 if(options.published_after&&options.published_before&&options.published_after>options.published_before)return reply({error:'invalid_date_range'},400);
 let rate;try{rate=await throttle()}catch{}
 if(!rate||typeof rate.limited!=='boolean')return reply({error:'limiter_unavailable'},503);
 if(rate.limited)return reply({error:'rate_limited'},429,{'Retry-After':'60'});
 if(version!==null&&version!==deepVersion)return reply({error:'version_changed',version:deepVersion},409);
 try{return reply({...deepSearch012(q,+limit,options),release:'protected_editorial_preview',relevance_validation:'independent_human_review_not_completed'})}catch{return reply({error:'research_unavailable'},503)}
}
