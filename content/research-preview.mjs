import { RELEASE_STAGING_HOST } from './retrieval-release.mjs';
import { routeSearch, routingModelVersion } from './retrieval-routing.mjs';
import MODEL from './research-preview-model.mjs';
import FEED from './research-preview-feed.mjs';
export const previewPaths=['/api/v1/research/search','/api/v1/publications/changes','/.well-known/research-preview-openapi.json'];
export function searchPreview(q,limit=5,options={}){return routeSearch(q,limit,options);}
export async function researchPreviewHttp(request,env,throttle){
 const u=new URL(request.url);if(!previewPaths.includes(u.pathname))return null;
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Robots-Tag':'noindex,nofollow','Content-Signal':'ai-train=no, search=no, ai-input=no'};
 const reply=(x,status=200,extra={})=>new Response(request.method==='HEAD'||status===304?null:JSON.stringify(x),{status,headers:{...headers,...extra}});
 if(!researchPreviewEnabled(request,env))return reply({error:'not_found'},404);
 if(!['GET','HEAD'].includes(request.method))return reply({error:'method_not_allowed'},405,{Allow:'GET, HEAD'});
 const allowed=new Set(['q','limit','cursor','version','subject','document_type','published_after','published_before','fusion']);for(const k of u.searchParams.keys())if(!allowed.has(k)||u.searchParams.getAll(k).length!==1)return reply({error:'invalid_query'},400);
 const limit=u.searchParams.get('limit')||'5',cursor=u.searchParams.get('cursor')||'0';if(!/^[1-9][0-9]?$/.test(limit)||+limit>10||!/^(0|[1-9][0-9]{0,5})$/.test(cursor))return reply({error:'invalid_bounds'},400);
 const q=u.searchParams.get('q')||'';
 const options=Object.fromEntries(['subject','document_type','published_after','published_before','fusion'].filter(k=>u.searchParams.has(k)).map(k=>[k,u.searchParams.get(k)]));
 if(options.subject&&!['barak','leon_black'].includes(options.subject)||options.document_type&&!['investigation','reel','correction','dispatch'].includes(options.document_type)||options.fusion&&!['lexical_guarded','rrf','weighted','lexical'].includes(options.fusion))return reply({error:'invalid_filter'},400);
 for(const k of ['published_after','published_before'])if(options[k]&&(!/^\d{4}-\d{2}-\d{2}$/.test(options[k])||!Number.isFinite(Date.parse(options[k]))||new Date(options[k]).toISOString().slice(0,10)!==options[k]))return reply({error:'invalid_date'},400);
 if(options.published_after&&options.published_before&&options.published_after>options.published_before)return reply({error:'invalid_date_range'},400);
 if(u.pathname.includes('publications')&&Object.keys(options).length)return reply({error:'invalid_query'},400);if(q.length>256)return reply({error:'query_too_long'},400);
 let rate;try{rate=await throttle();}catch{}if(!rate||typeof rate.limited!=='boolean')return reply({error:'limiter_unavailable'},503);if(rate.limited)return reply({error:'rate_limited'},429,{'Retry-After':'60'});
 const version=u.pathname.includes('publications')?FEED.version:routingModelVersion;if(u.searchParams.has('version')&&u.searchParams.get('version')!==version)return reply({error:'version_changed',version},409);
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(u.pathname+u.search));const etag='"'+version+'-'+Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('')+'"';if((request.headers.get('If-None-Match')?.match(/(?:W\/)?"[^"]*"|\*/g)||[]).some(t=>t==='*'||t.replace(/^W\//,'')===etag))return reply(null,304,{ETag:etag});
 if(u.pathname.endsWith('openapi.json'))return reply({openapi:'3.1.0',info:{title:'GAH staging research preview',version:'0.2.0'},servers:[{url:u.origin}],paths:researchPreviewOpenApiPaths},200);
 if(u.pathname.includes('publications')){if(q)return reply({error:'invalid_query'},400);const items=FEED.items.slice(+cursor,+cursor+ +limit);return reply({schema:'gah.publications.changes.v1',version,items,next_cursor:+cursor+items.length<FEED.items.length?+cursor+items.length:null,total:FEED.items.length},200,{ETag:etag});}
 if(!q.trim())return reply({error:'query_required'},400);
 return reply({schema:MODEL.schema,version,method:MODEL.method,scope:MODEL.scope,...searchPreview(q,+limit,options),origin_requests:0,nas_reads:0},200,{ETag:etag});
}

export function researchPreviewEnabled(request,env){return Boolean(request)&&String(env?.GAH_STAGING)==='true'&&new URL(request.url).hostname.endsWith('.gah-staging-517b8499.pages.dev')&&new URL(request.url).hostname!==RELEASE_STAGING_HOST;}
export const researchPreviewTools=[
 {name:'search_research_preview',description:'Staging-only public metadata LSA/keyword pilot; verify cited publications and primary evidence.',inputSchema:{type:'object',properties:{q:{type:'string',maxLength:256},limit:{type:'integer',minimum:1,maximum:10}},required:['q'],additionalProperties:false}},
 {name:'get_publication_changes_preview',description:'Staging-only version-pinned public publication metadata and reviewed corrections.',inputSchema:{type:'object',properties:{cursor:{type:'integer',minimum:0,maximum:999999},limit:{type:'integer',minimum:1,maximum:10},version:{type:'string'}},additionalProperties:false}}
];
export async function researchPreviewTool(name,args,request,env,throttle){
 if(!researchPreviewEnabled(request,env))throw Error('Unknown MCP tool: '+name);
 const search=name==='search_research_preview',allowed=search?['q','limit','subject','document_type','published_after','published_before','fusion']:['cursor','limit','version'];
 if(Object.keys(args).some(k=>!allowed.includes(k)))throw Error('Invalid preview arguments');
 const u=new URL(request.url);u.pathname=search?previewPaths[0]:previewPaths[1];u.search='';
 for(const [k,v] of Object.entries(args)){if(typeof v!=='string'&&typeof v!=='number')throw Error('Invalid preview arguments');u.searchParams.set(k,String(v));}
 const r=await researchPreviewHttp(new Request(u),env,throttle);if(!r.ok)throw Error('Preview temporarily unavailable');return r.json();
}
export const researchPreviewOpenApiPaths={
 '/api/v1/research/search':{get:{operationId:'searchResearchPreview',summary:'Staging-only public metadata hybrid search',parameters:[{name:'q',in:'query',required:true,schema:{type:'string',maxLength:256}},{name:'limit',in:'query',schema:{type:'integer',minimum:1,maximum:10}}],responses:{200:{description:'Bounded editorial discovery candidates'},400:{description:'Invalid arguments'},429:{description:'Rate limited'},503:{description:'Limiter unavailable'}}}},
 '/api/v1/publications/changes':{get:{operationId:'getPublicationChangesPreview',summary:'Staging-only incremental public metadata feed',parameters:[{name:'cursor',in:'query',schema:{type:'integer',minimum:0,maximum:999999}},{name:'version',in:'query',schema:{type:'string'}},{name:'limit',in:'query',schema:{type:'integer',minimum:1,maximum:10}}],responses:{200:{description:'Versioned sequence and correction records'},409:{description:'Version changed'},429:{description:'Rate limited'}}}}
};

Object.assign(researchPreviewTools[0].inputSchema.properties,{subject:{type:'string',enum:['barak','leon_black']},document_type:{type:'string',enum:['investigation','reel','correction','dispatch']},published_after:{type:'string',format:'date'},published_before:{type:'string',format:'date'},fusion:{type:'string',enum:['lexical_guarded','rrf','weighted','lexical']}});
for(const name of ['subject','document_type','published_after','published_before','fusion'])researchPreviewOpenApiPaths['/api/v1/research/search'].get.parameters.push({name,in:'query',schema:researchPreviewTools[0].inputSchema.properties[name]});
