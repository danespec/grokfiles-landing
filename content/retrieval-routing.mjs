import M from './retrieval-routing-model.mjs';
const stop=new Set('the and for from with this that into about record records document documents source sources epstein jeffrey files file how what which who where when is are was were do does did a an of in on to me i use open take get give can has had by between before after'.split(' '));
const aliases=new Map(Object.entries({payments:'payment',paid:'payment',pay:'payment',fees:'payment',fee:'payment',flights:'flight',travel:'flight',aviation:'flight',passengers:'flight',aircraft:'aircraft',logs:'log',timelines:'timeline',chronological:'timeline',chronology:'timeline',transactions:'transaction',projections:'projection',records:'record'}));
const words=s=>(String(s).toLowerCase().match(/[a-z0-9]{2,}/g)||[]).filter(t=>!stop.has(t)).map(t=>aliases.get(t)||t);
const hay=d=>(d.title+' '+d.description+' '+(d.index_text||'')+' '+new URL(d.url).pathname).toLowerCase();
const subjectOf=q=>[...(/\bbarak\b/i.test(q)?['barak']:[]),...(/\b(?:leon\s+black|black\s+family|black\s+epstein|black.*phaidon)\b/i.test(q)?['leon_black']:[])];
const hasSubject=(d,s)=>s==='barak'?/\bbarak\b/.test(hay(d)):/\bblack\b/.test(hay(d));
const financial=/\b(payments?|paid|pay|fees?|funds?|funded|funding|financial|finance|transaction|tax|money|wire|repricing|sale|loan|equity|million|financing)\b/i;
const flight=/\b(flights?|logs?|travel|aviation|aircraft|passengers?)\b/i;
const timeline=/\b(timeline|chronolog\w*|schedul\w*|before.*after)\b/i;
export function classifyRetrieval(q){
 if(/\b(password|credentials?|private\s+nas|unredact|redacted.*identity|victim.*identit|witness.*identit)\b/i.test(q))return {intent:'unanswerable',subjects:[],requires_multiple_sources:false,reason:'restricted_request'};
 if([...String(q).matchAll(/\b(20[0-9]{2})\b/g)].some(m=>Number(m[1])>M.publication_cutoff_year)&&/\b(cause|happen|predict|will|future)\b/i.test(q))return {intent:'unanswerable',subjects:[],requires_multiple_sources:false,reason:'outside_publication_time_scope'};
 const ids=[...String(q).toUpperCase().matchAll(/\bEFTA[\s_.-]*([0-9]{1,8})\b/g)].map(m=>'EFTA'+m[1].padStart(8,'0'));
 for(const m of String(q).toUpperCase().matchAll(/\bHOUSE[\s_-]*OVERSIGHT[\s_.-]*([0-9]{1,8})\b/g))ids.push('HOUSE_OVERSIGHT_'+m[1].padStart(6,'0'));
 if(ids.length)return {intent:'identifier',ids:[...new Set(ids)],subjects:[],requires_multiple_sources:false};
 const subjects=subjectOf(q),multi=/\b(compare|distinguish|multiple|before.+after|what evidence)\b/i.test(q);
 if(/\b(password|credentials?|private\s+nas|redacted.*identity|victim.*identit|prove.*committed|prove.*guilt|future)\b/i.test(q))return {intent:'unanswerable',subjects,requires_multiple_sources:false,reason:'unsupported_or_restricted_request'};
 if(!subjects.length){let nav=/\bwiki\b/i.test(q)?'wiki':/\b(ask\s+gah|assistant|ai)\b/i.test(q)?'assistant':/\bsearch\b/i.test(q)?'search':/\barchive\b/i.test(q)?'archive':null;if(nav)return {intent:'navigation',destination:nav,subjects,requires_multiple_sources:false};}
 return {intent:multi?'multi_source':flight.test(q)?'flight':timeline.test(q)?'timeline':financial.test(q)?'financial':subjects.length?'subject':/^\s*(what|how|why|which)\b/i.test(q)?'multi_source':'subject',subjects,requires_multiple_sources:multi||/^\s*(what|how|why|which)\b/i.test(q)};
}
const norm=v=>{const n=Math.hypot(...v);return n?v.map(x=>x/n):v;};const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const docWords=M.documents.map(d=>words(d.title+' '+d.title+' '+d.title+' '+d.description+' '+(d.index_text||'')));const avg=docWords.reduce((n,x)=>n+x.length,0)/docWords.length;
const df=new Map();for(const row of docWords)for(const t of new Set(row))df.set(t,(df.get(t)||0)+1);
const membership={};
export function attachReviewedGraph(review,publicationHash,registryHash){
 // Caller binds the existing reviewed projection to the bundled publication.
 for(const k of Object.keys(membership))delete membership[k];
 if(!review||review.published_registry_sha256!==registryHash||review.published_data_sha256!==publicationHash||publicationHash!==M.atlas_publication_sha256)return;
 for(const [id,path] of Object.entries(review.editorial_paths||{})){const url='https://grokarchivehub.com'+path;const stories=(review.stories||[]).filter(s=>s.document_ids.includes(id)).map(s=>s.id);(membership[url]??=[]).push({document_id:id,story_ids:stories,relation:'reviewed_citation_membership_only'});}
}
export function routeSearch(q,limit=5,options={}){
 const route=classifyRetrieval(q),base={schema:M.schema,model_version:M.version,intent:route.intent,strategy:options.fusion||'lexical_guarded',method:M.method,scope:M.documents.length+' approved public editorial publications; metadata and one bounded passage; no claim-level synthesis',answer:null,uncertainty:['Discovery candidates only; verify original evidence.','Association is not proof of wrongdoing.'],origin_requests:0,nas_reads:0};
 const done=(rows,reason)=>({...base,results:rows,abstained:rows.length===0,insufficient_evidence:route.requires_multiple_sources||rows.length===0,claim_verification:'not_performed',coverage_reason:reason||'editorial_discovery_only'});
 if(route.intent==='unanswerable')return done([],route.reason);
 if(route.intent==='identifier'){const rows=route.ids.filter(id=>M.exact_ids.includes(id)).slice(0,limit).map(id=>({id,title:id,url:'https://grokarchivehub.com/archive/'+id,channel:'exact',score:1,citations:[{url:'https://grokarchivehub.com/archive/'+id,kind:'verified_public_reader_locator'}]}));return done(rows,rows.length?'deterministic_reader_locator':'identifier_not_in_preview_allowlist; use existing exact archive search');}
 if(route.intent==='navigation'){const d=M.navigation.find(x=>x.kind===route.destination);return done([{...d,channel:'navigation',score:1,citations:[]}],'navigation_destination');}
 const qt=words(q),meaningful=qt.filter(t=>!['ehud','leon','black','barak','gah'].includes(t));
 if(!qt.length)return done([],'insufficient_query_specificity');
 const original=q.toLowerCase().match(/[a-z0-9]{2,}/g)||[],count=new Map();for(const t of original)if(!stop.has(t)&&Object.hasOwn(M.vocabulary,t)){const i=M.vocabulary[t];count.set(i,(count.get(i)||0)+1);}
 const w=norm(M.idf.map((v,i)=>v*(count.get(i)||0))),vector=norm(M.components.map(c=>dot(c,w)));
 let rows=M.documents.map((d,i)=>{const ws=docWords[i];let bm25=0;for(const t of new Set(qt)){const f=ws.filter(x=>x===t).length;if(f)bm25+=Math.log(1+(M.documents.length-(df.get(t)||0)+.5)/((df.get(t)||0)+.5))*f*2.2/(f+1.2*(.25+.75*ws.length/avg));}return {...d,index:i,bm25,semantic:Math.max(0,dot(vector,M.vectors[i])),graph:membership[d.url]||[]};});
 rows=rows.filter(d=>d.bm25>0&&(!route.subjects.length||route.subjects.some(s=>hasSubject(d,s))));
 const specific=meaningful.filter(t=>!['compare','public','evidence','guide','explains','proven','proof','completed','proposed','happened','read','works','question'].includes(t));
 if(route.subjects.length&&specific.length)rows=rows.filter(d=>specific.some(t=>docWords[d.index].includes(t))); 
 if(route.intent==='financial')rows=rows.filter(d=>financial.test(hay(d)));
 if(route.intent==='flight')rows=rows.filter(d=>flight.test(hay(d)));
 if(route.intent==='timeline')rows=rows.filter(d=>timeline.test(hay(d)));
 if(options.subject)rows=rows.filter(d=>hasSubject(d,options.subject));
 if(options.document_type)rows=rows.filter(d=>d.document_type===options.document_type);
 if(options.published_after||options.published_before)rows=rows.filter(d=>d.publication_date&&(!options.published_after||d.publication_date>=options.published_after)&&(!options.published_before||d.publication_date<=options.published_before));
 const lexical=[...rows].sort((a,b)=>b.bm25-a.bm25||a.url.localeCompare(b.url)),semantic=[...rows].sort((a,b)=>b.semantic-a.semantic||a.url.localeCompare(b.url));const lr=new Map(lexical.map((d,i)=>[d.url,i+1])),sr=new Map(semantic.map((d,i)=>[d.url,i+1]));const max=Math.max(...rows.map(d=>d.bm25),1);
 rows=rows.map(d=>({...d,score:!options.fusion||options.fusion==='lexical_guarded'?d.bm25+1e-6*d.semantic:options.fusion==='lexical'?d.bm25:options.fusion==='weighted'?.65*d.bm25/max+.35*d.semantic+.025*(d.graph.length>0):1/(60+lr.get(d.url))+1/(60+sr.get(d.url))+.001*(d.graph.length>0)})).sort((a,b)=>b.score-a.score||a.url.localeCompare(b.url));
 rows=rows.slice(0,limit).map(({index,graph,index_text,...d})=>({...d,channel:'intent_hybrid',related_atlas:graph,citations:[{url:d.url,kind:'published_editorial',publication_sha256:d.source_sha256}],date_semantics:'publication date only; unknown dates excluded by date filters'}));
 return done(rows,rows.length?'editorial_discovery_only':'insufficient_evidence_in_preview_corpus');
}
export const routingModelVersion=M.version;
