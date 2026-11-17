// Staging-only extractive answers over the existing private passage/hybrid index.
import MODEL from './research-corpus-010.mjs';
import {askEditorialCandidate} from './ask-editorial-staging.mjs';
import {editorialGuard} from './research-evidence-closeout.mjs';
export const ASK_VERSION='GAH_ASK_EDITORIAL_STAGING_V2';
const hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),x=>x.toString(16).padStart(2,'0')).join('');
const stop=new Set('what which who how why when where does did do has have was were the a an of in to and or for from with by on as at it is are can could would please tell me about explain summarize according say saying reporting separate establish evidence records record epstein jeffrey gah published'.split(' '));
const aliases={paid:'payment',payments:'payment',fees:'payment',visited:'visit',visiting:'visit',went:'visit',go:'visit',flights:'flight',emails:'email',reports:'report',letters:'letter',loans:'loan'};
const terms=s=>[...new Set((String(s).toLowerCase().match(/[a-z0-9]{2,}/g)||[]).filter(t=>!stop.has(t)).map(t=>aliases[t]||t))];
const sensitive=/\b\d{9,}\b|\b(?:bank|routing|account|IBAN|SWIFT)\s*(?:number|no\.?|#|:)?\s*[A-Z0-9]{6,}\b|\b(?:victims?|survivors?|witness(?:es)?|minors?|underage|juveniles?|children|child|redact\w*|unredact\w*|sexual|rape|molest\w*|abuse[dr]?|pseudonym|anonymous|anonymized|private|confidential|password|credential\w*|home address|phone number|date of birth|passport|social security|doe)\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\/(?:Users|Volumes|mnt|volume\d+|home)\/|\b\d{3}[-. ]\d{2}[-. ]\d{4}\b|\b(?:\+?1[-. ]?)?\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b/i;
const decode=s=>s.replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):+n)).replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g,m=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '}[m]));
const text=s=>decode(s.replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
const abstain=(reason,extra={})=>({ok:true,mode:'editorial_answer_staging',intent:'archive',answer:'The published evidence does not establish a sufficiently supported answer.',answer_abstained:true,answer_reason:reason,answer_claims:[],citations:[],hits:[],generated_claims:0,review_status:'pending_independent_review',...extra});
export function askSourceWithdrawn(env,url,ids=[]){
 // Invalid controls fail closed; supports immediate environment-based withdrawal without re-indexing.
 for(const key of ['GAH_ASK_WITHDRAWN_PUBLICATIONS','GAH_ASK_WITHDRAWN_SOURCES']){
  let list;try{list=JSON.parse(env[key]||'[]')}catch{return true}
  if(!Array.isArray(list)||list.some(x=>typeof x!=='string'))return true;
  if(list.includes(url)||ids.some(id=>list.includes(id)))return true;
 }
 return false;
}
export function extractCitedBlocks(html,url){
 const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||'';
 const stack=[];let clean='';
 const voids=new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
 for(const token of main.match(/<[^>]*>|[^<]+/g)||[]){
  const tag=token.match(/^<(\/?)([a-z0-9]+)\b/i);
  if(!tag){if(!stack.some(x=>x.blocked))clean+=token;continue}
  const name=tag[2].toLowerCase();
  if(tag[1]){const blocked=stack.some(x=>x.blocked);for(let i=stack.length-1;i>=0;i--)if(stack[i].name===name){stack.splice(i);break}if(!blocked)clean+=token;continue}
  const blocked=stack.some(x=>x.blocked)||/^(script|style|nav|aside|footer|form|blockquote|details|pre|code|template|iframe|button)$/.test(name)||/\bhidden\b|aria-hidden=["']true|display\s*:\s*none|visibility\s*:\s*hidden|(?:class|id)=["'][^"']*\b(?:private|internal|sensitive|redacted|raw|transcript)\b/i.test(token);
  if(!blocked)clean+=token;if(!voids.has(name))stack.push({name,blocked});
 }
 const ids=new Set([...main.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]));
 const linkedIds=new Map(),references=new Map();
 const directLinks=fragment=>{
  const result=[];
  for(const a of fragment.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
   let target;try{target=new URL(decode(a[1]),url)}catch{continue}
   const id=(text(a[2])+' '+a[1]).match(/\bEFTA\d{8}\b/i)?.[0]?.toUpperCase();
   const locator=target.href.match(/\bEFTA\d{8}\b/i)?.[0]?.toUpperCase();
   if(id&&target.protocol==='https:'&&['grokarchivehub.com','www.justice.gov','justice.gov'].includes(target.hostname)&&(!locator||id===locator)&&(!target.hash||target.pathname!==new URL(url).pathname||ids.has(target.hash.slice(1))))result.push({id,source_id:id,title:id,url:target.href});
  }return result;
 };
 for(const citation of directLinks(clean))linkedIds.set(citation.id,citation);
 // Only explicit numbered footnotes can attach the source-register support.
 for(const entry of clean.matchAll(/<(li|p|tr|div)\b[^>]*\bid=["']([^"']+)["'][^>]*>([\s\S]*?)<\/\1>/gi)){
  const refs=directLinks(entry[3]);if(refs.length)references.set('#'+entry[2],refs);
 }
 const blocks=[],limitations=[];
 for(const m of clean.matchAll(/<(p|li|tr|td)\b([^>]*)>([\s\S]*?)<\/\1>/gi)){
  if(/\bhidden\b|aria-hidden=["']true|display\s*:\s*none|\b(?:private|internal|sensitive|redacted|raw|transcript)\b/i.test(m[2]))continue;
  const body=m[3],quote=text(body);
  if(quote.length<40||quote.length>1400||sensitive.test(quote))continue;
  if(/\b(?:does not|do not|not establish|not prove|unresolved|unknown|unproven|cannot|limitation|missing)\b/i.test(quote)&&quote.length<=900)limitations.push(quote);
  const citations=[];
  // A citation must occur in this same block and resolve to an actual link/anchor.
  for(const a of body.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
   const label=text(a[2]),id=(label+' '+a[1]).match(/\bEFTA\d{8}\b/i)?.[0]?.toUpperCase()||(/leak\s*(?:id|#|:)?\s*(\d+)/i.exec(label)?.[1]? 'leak id '+/leak\s*(?:id|#|:)?\s*(\d+)/i.exec(label)[1]:null);
   if(!id){if(a[1].startsWith('#')&&references.has(a[1]))citations.push(...references.get(a[1]));continue}
   let target;try{target=new URL(decode(a[1]),url)}catch{continue}
   if(target.protocol!=='https:'||!['grokarchivehub.com','www.justice.gov','justice.gov'].includes(target.hostname))continue;
   if(target.origin===new URL(url).origin&&target.pathname===new URL(url).pathname&&target.hash&&!ids.has(target.hash.slice(1)))continue;
   const locatorId=target.href.match(/\bEFTA\d{8}\b/i)?.[0]?.toUpperCase();
   if(id.startsWith('EFTA')&&locatorId&&locatorId!==id)continue;
   if(id.startsWith('leak')&&(target.hash!=='#source-'+id.replace('leak id ','')||target.pathname!==new URL(url).pathname))continue;
   citations.push({id,source_id:id,title:id,url:target.href});
  }
  for(const id of quote.match(/\bEFTA\d{8}\b/g)||[]){
   if(citations.some(c=>c.id===id))continue;
   const target=linkedIds.get(id)?.url||(ids.has('source-'+id)?url+'#source-'+id:ids.has(id)?url+'#'+id:null);
   if(target)citations.push({id,source_id:id,title:id,url:target});
  }
  if(!citations.length)continue;
  blocks.push({text:quote,citations:[...new Map(citations.map(c=>[c.id,c])).values()],classification:/\b(?:unresolved|unknown|not establish|not prove|not evidence|missing|unproven)\b/i.test(quote)?'unresolved':/\b(?:alleged|allegation|claims?|reportedly)\b/i.test(quote)?'attributed':/\b(?:proposed|proposal|invited|invitation|draft)\b/i.test(quote)?'proposal':'published_finding'});
 }
 return blocks.map(block=>({...block,publication_limitations:limitations.slice(0,2)}));
}
export async function askEditorialExtract(question,env,request,budget=async()=>false){
 if(String(env?.GAH_STAGING).toLowerCase()!=='true')return null;
 if(/\bEFTA\d{8}\b/i.test(question))return null; // Exact-ID archive routing remains untouched.
 const {expansionGuard012}=await import('./editorial-search-012.mjs');
 if(editorialGuard(question)||expansionGuard012(question)||(/\bblack\b/i.test(question)&&/\b(?:namesakes?|unrelated|family versus|different black|which black entity)\b/i.test(question)))return abstain('insufficient_or_restricted_evidence');
 const q=terms(question);if(q.length<2)return abstain('question_requires_more_detail');
 const {practicalRetrieval}=await import('./practical-retrieval.mjs');
 let retrieval;try{retrieval=await practicalRetrieval({q:question,limit:5,strategy:'hybrid',env,budget})}catch{return abstain('editorial_retrieval_unavailable')}
 const candidates=retrieval.results.filter(r=>MODEL.publication_hashes[r.url]===r.source_sha256&&!askSourceWithdrawn(env,r.url));
 const extra={answer_generation:'verbatim_cited_publication_extraction',review_status:'pending_independent_review',corpus_publications:MODEL.documents.length,retrieval_strategy:retrieval.strategy,neural_executed:retrieval.neural_executed,neural_degraded:retrieval.neural_degraded||false,editorial_candidates:candidates.map(r=>({title:r.title,url:r.url,publication_sha256:r.source_sha256})),evidentiary_limitations:['Source-bound staging candidates are not independently certified primary-source findings.','An inline EFTA/leak citation identifies the publication’s claimed support; Ren must verify entailment before production release.','Allegations, proposals and unresolved questions retain their wording. Association alone does not establish wrongdoing.']};
 if(!candidates.length)return abstain('insufficient_evidence',extra);
 if(!env.ASSETS?.fetch)return abstain('publication_assets_unavailable',extra);
 const boundPacket=askEditorialCandidate(question,env);
 const ranked=[];
 for(const row of candidates.slice(0,3)){
  const source=new URL(row.url),local=new URL(request.url);local.pathname=source.pathname+'.html';local.search='';local.hash='';
  let response;try{response=await env.ASSETS.fetch(new Request(local))}catch{continue}
  if(!response.ok)continue;
  const html=await response.text();if(await hash(html)!==row.source_sha256)continue;
  if(boundPacket?.answer_abstained===false&&boundPacket.answer_claims.every(c=>c.publication_url===row.url&&!askSourceWithdrawn(env,row.url,c.citations.map(x=>x.id)))){
   return {...boundPacket,...extra,answer_generation:'source_bound_staging_candidate',publication_bytes_verified:true};
  }
  for(const block of extractCitedBlocks(html,row.url)){
   if(askSourceWithdrawn(env,row.url,block.citations.map(c=>c.id)))continue;
   const t=terms(block.text),context=terms(row.title+' '+row.description),matched=q.filter(w=>t.includes(w)).length,coverage=q.filter(w=>t.includes(w)||context.includes(w)).length/q.length;
   if(matched<2||coverage<.5)continue;
   ranked.push({...block,publication_url:row.url,publication_sha256:row.source_sha256,score:coverage+matched*.02});
  }
 }
 ranked.sort((a,b)=>b.score-a.score||a.text.length-b.text.length);
 const unique=[...new Map(ranked.map(c=>[c.text,c])).values()].slice(0,3);
 if(!unique.length)return abstain('no_current_claim_level_cited_support',extra);
 const claims=await Promise.all(unique.map(async({score,...c})=>({...c,excerpt_sha256:await hash(c.text),limitation:'Verbatim published block with same-block source citations; underlying primary-source entailment awaits independent review. '+(c.publication_limitations||[]).join(' ')})));
 const citations=[...new Map(claims.flatMap(c=>c.citations).map(c=>[c.url,c])).values()];
 return {ok:true,mode:'editorial_answer_staging',intent:'archive',answer_abstained:false,answer:claims.map(c=>'“'+c.text+'” ['+c.citations.map(x=>x.id).join('; ')+']').join('\n\n'),answer_claims:claims,citations,hits:claims.map(c=>({title:MODEL.documents.find(d=>d.url===c.publication_url)?.title,url:c.publication_url,description:c.limitation})),generated_claims:0,...extra};
}
