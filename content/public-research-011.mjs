import {cachedResearchPipeline010,pipelineVersion} from './research-pipeline-010.mjs';
import MODEL from './research-corpus-010.mjs';
export const SEARCH_011='/api/v1/research/editorial-search';
export const CORPUS_011='/api/v1/research/editorial-corpus';
export const STAGE_011='ai-retrieval-011.gah-staging-517b8499.pages.dev';
export const publicResearchPaths011=[SEARCH_011,CORPUS_011];
export function publicResearchEnabled011(request,env){
 const host=new URL(request.url).hostname,stage=String(env?.GAH_STAGING||'').toLowerCase()==='true';
 return !['0','false'].includes(String(env?.GAH_PUBLIC_RESEARCH_ENABLED??'true').toLowerCase())&&((!stage&&host==='grokarchivehub.com')||(stage&&[STAGE_011,'research-closeout.gah-staging-517b8499.pages.dev','ai-retrieval-012.gah-staging-517b8499.pages.dev'].includes(host)));
}
const types=['investigation','reel','correction','dispatch','guide','evidence_brief','document_autopsy','timeline','news'];
const props={q:{type:'string',minLength:1,maxLength:256},limit:{type:'integer',minimum:1,maximum:10},document_type:{type:'string',enum:types},published_after:{type:'string',format:'date'},published_before:{type:'string',format:'date'},version:{type:'string',maxLength:160}};
export const publicResearchTool011={name:'search_editorial_research',description:'Publisher-authorized public editorial metadata hybrid retrieval; citation candidates with publication-fingerprinted citation packets; not verified conclusions or complete archive coverage.',inputSchema:{type:'object',properties:props,required:['q'],additionalProperties:false}};
const responses={200:{description:'Versioned citation candidates or corpus snapshot'},400:{description:'Invalid input'},404:{description:'Disabled or unavailable'},409:{description:'Corpus version changed'},429:{description:'Rate limited'},503:{description:'Limiter or research unavailable'}};
export const publicResearchSpec011={
 [SEARCH_011]:{get:{operationId:'searchEditorialResearch',summary:'Hybrid public editorial metadata search with citation packets; no generated answer',parameters:Object.entries(props).map(([name,schema])=>({name,in:'query',required:name==='q',schema})),responses}},
 [CORPUS_011]:{get:{operationId:'getEditorialCorpus',summary:'Versioned publisher-authorized editorial corpus snapshot',parameters:[{name:'cursor',in:'query',schema:{type:'integer',minimum:0,maximum:999999}},{name:'limit',in:'query',schema:{type:'integer',minimum:1,maximum:25}},{name:'version',in:'query',schema:props.version}],responses}}
};
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
export async function publicResearchHttp011(request,env,throttle){
 const u=new URL(request.url),path=u.pathname;
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex,follow','Content-Signal':'ai-train=no, search=yes, ai-input=yes','X-Content-Type-Options':'nosniff'};
 const reply=(x,status=200,extra={})=>new Response(request.method==='HEAD'?null:JSON.stringify(x),{status,headers:{...headers,...extra}});
 if(!publicResearchEnabled011(request,env)||!publicResearchPaths011.includes(path))return reply({error:'not_found'},404);
 if(!['GET','HEAD'].includes(request.method))return reply({error:'method_not_allowed'},405,{Allow:'GET, HEAD'});
 const catalog=path===CORPUS_011,allowed=catalog?['cursor','limit','version']:Object.keys(props);
 for(const k of u.searchParams.keys())if(!allowed.includes(k)||u.searchParams.getAll(k).length!==1)return reply({error:'invalid_query'},400);
 const limit=u.searchParams.get('limit')??(catalog?'25':'5'),cursor=u.searchParams.get('cursor')??'0',q=u.searchParams.get('q')??'';
 if(!/^[1-9][0-9]?$/.test(limit)||+limit>(catalog?25:10)||! /^(0|[1-9][0-9]{0,5})$/.test(cursor)||+cursor>MODEL.documents.length||(!catalog&&(!q.trim()||q.length>256)))return reply({error:'invalid_bounds'},400);
 const version=u.searchParams.get('version');if(version!==null&&version.length>160)return reply({error:'invalid_version'},400);
 const options={};for(const k of ['document_type','published_after','published_before'])if(u.searchParams.has(k))options[k]=u.searchParams.get(k);
 if(options.document_type!==undefined&&!types.includes(options.document_type))return reply({error:'invalid_filter'},400);
 for(const k of ['published_after','published_before'])if(k in options&&!validDate(options[k]))return reply({error:'invalid_date'},400);
 if(options.published_after&&options.published_before&&options.published_after>options.published_before)return reply({error:'invalid_date_range'},400);
 let rate;try{rate=await throttle()}catch{}
 if(!rate||typeof rate.limited!=='boolean')return reply({error:'limiter_unavailable'},503);
 if(rate.limited)return reply({error:'rate_limited'},429,{'Retry-After':'60'});
 if(version!==null&&version!==pipelineVersion)return reply({error:'version_changed',version:pipelineVersion},409);
 if(catalog){
  const items=MODEL.documents.slice(+cursor,+cursor+ +limit).map(d=>({url:d.url,title:d.title,description:d.description,document_type:d.document_type,publication_date:d.publication_date,publication_sha256:d.source_sha256}));
  return reply({schema:'gah.research.editorial-corpus.v1',version:pipelineVersion,total:MODEL.documents.length,items,next_cursor:+cursor+items.length<MODEL.documents.length?+cursor+items.length:null,scope:'Publisher-authorized eligible editorial metadata; not the complete archive'});
 }
 try{
  const result=await cachedResearchPipeline010(q,+limit,options);
  return reply({...result.body,release:'public_editorial_beta',relevance_validation:'independent_human_review_not_completed'},200,{'X-GAH-Research-Cache':result.cache});
 }catch{return reply({error:'research_unavailable'},503)}
}
export async function publicResearchMcp011(args,request,env,throttle){
 if(!publicResearchEnabled011(request,env)||!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).some(k=>!Object.hasOwn(props,k)))throw Error('Invalid editorial research arguments');
 const u=new URL(request.url);u.pathname=SEARCH_011;u.search='';
 for(const [k,v] of Object.entries(args)){if(k==='limit'?typeof v!=='number'||!Number.isSafeInteger(v):typeof v!=='string')throw Error('Invalid editorial research argument');u.searchParams.set(k,String(v))}
 const r=await publicResearchHttp011(new Request(u),env,throttle);if(!r.ok)throw Error('Editorial research unavailable');return r.json();
}
