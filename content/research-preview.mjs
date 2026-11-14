import MODEL from './research-preview-model.mjs';
import FEED from './research-preview-feed.mjs';
export const previewPaths=['/api/v1/research/search','/api/v1/publications/changes','/.well-known/research-preview-openapi.json'];
const norm=v=>{const n=Math.hypot(...v);return n?v.map(x=>x/n):v;};
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
export function searchPreview(q,limit=5){
 const ids=q.toUpperCase().match(/\bEFTA\d{8}\b/g)||[];
 if(ids.length){const hits=[...new Set(ids)].filter(x=>MODEL.exact_ids.includes(x));return {results:hits.map(id=>({id,url:'https://grokarchivehub.com/archive/'+id,channel:'exact',score:1})),abstained:!hits.length};}
 const tokens=q.toLowerCase().match(/[a-z0-9]{2,}/g)||[],counts=new Map();for(const t of tokens)if(Object.hasOwn(MODEL.vocabulary,t)){const i=MODEL.vocabulary[t];counts.set(i,(counts.get(i)||0)+1);}
 if(!counts.size)return {results:[],abstained:true};
 const weights=norm(Array.from({length:MODEL.idf.length},(_,i)=>(counts.get(i)||0)*MODEL.idf[i]));
 const query=norm(MODEL.components.map(row=>dot(row,weights)));
 const results=MODEL.documents.map((d,i)=>{const words=new Set((d.title+' '+d.description).toLowerCase().match(/[a-z0-9]{2,}/g)||[]);const lexical=tokens.filter(t=>words.has(t)).length/Math.max(tokens.length,1),semantic=Math.max(0,dot(query,MODEL.vectors[i]));return {...d,score:.65*lexical+.35*semantic,lexical,semantic,channel:'hybrid',citation_kind:'published_editorial_discovery_only'};}).filter(x=>x.score>=.18).sort((a,b)=>b.score-a.score||a.url.localeCompare(b.url)).slice(0,limit);
 return {results,abstained:!results.length};
}
export async function researchPreviewHttp(request,env,throttle){
 const u=new URL(request.url);if(!previewPaths.includes(u.pathname))return null;
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Robots-Tag':'noindex,nofollow','Content-Signal':'ai-train=no, search=no, ai-input=no'};
 const reply=(x,status=200,extra={})=>new Response(request.method==='HEAD'||status===304?null:JSON.stringify(x),{status,headers:{...headers,...extra}});
 if(String(env?.GAH_STAGING)!=='true'||!u.hostname.endsWith('.gah-staging-517b8499.pages.dev'))return reply({error:'not_found'},404);
 if(!['GET','HEAD'].includes(request.method))return reply({error:'method_not_allowed'},405,{Allow:'GET, HEAD'});
 const allowed=new Set(['q','limit','cursor','version']);for(const k of u.searchParams.keys())if(!allowed.has(k)||u.searchParams.getAll(k).length!==1)return reply({error:'invalid_query'},400);
 const limit=u.searchParams.get('limit')||'5',cursor=u.searchParams.get('cursor')||'0';if(!/^[1-9][0-9]?$/.test(limit)||+limit>10||!/^(0|[1-9][0-9]{0,5})$/.test(cursor))return reply({error:'invalid_bounds'},400);
 const q=u.searchParams.get('q')||'';if(q.length>256)return reply({error:'query_too_long'},400);
 let rate;try{rate=await throttle();}catch{}if(!rate||typeof rate.limited!=='boolean')return reply({error:'limiter_unavailable'},503);if(rate.limited)return reply({error:'rate_limited'},429,{'Retry-After':'60'});
 const version=u.pathname.includes('publications')?FEED.version:MODEL.version;if(u.searchParams.has('version')&&u.searchParams.get('version')!==version)return reply({error:'version_changed',version},409);
 const etag='"'+version+'-'+u.search+'"';if((request.headers.get('If-None-Match')?.match(/(?:W\/)?"[^"]*"|\*/g)||[]).some(t=>t==='*'||t.replace(/^W\//,'')===etag))return reply(null,304,{ETag:etag});
 if(u.pathname.endsWith('openapi.json'))return reply({openapi:'3.1.0',info:{title:'GAH staging research preview',version:'0.1.0'},servers:[{url:u.origin}],paths:Object.fromEntries(previewPaths.slice(0,2).map(p=>[p,{get:{summary:p.includes('search')?'Public metadata hybrid search preview':'Version-pinned incremental publication metadata',responses:{200:{description:'Bounded preview response'},409:{description:'Version changed'},429:{description:'Rate limited'},503:{description:'Limiter unavailable'}}}}]))},200);
 if(u.pathname.includes('publications')){if(q)return reply({error:'invalid_query'},400);const items=FEED.items.slice(+cursor,+cursor+ +limit);return reply({schema:'gah.publications.changes.v1',version,items,next_cursor:+cursor+items.length<FEED.items.length?+cursor+items.length:null,total:FEED.items.length},200,{ETag:etag});}
 if(!q.trim())return reply({error:'query_required'},400);
 return reply({schema:MODEL.schema,version,method:MODEL.method,scope:MODEL.scope,...searchPreview(q,+limit),origin_requests:0,nas_reads:0},200,{ETag:etag});
}

export function researchPreviewEnabled(request,env){return Boolean(request)&&String(env?.GAH_STAGING)==='true'&&new URL(request.url).hostname.endsWith('.gah-staging-517b8499.pages.dev');}
export const researchPreviewTools=[
 {name:'search_research_preview',description:'Staging-only public metadata LSA/keyword pilot; verify cited publications and primary evidence.',inputSchema:{type:'object',properties:{q:{type:'string',maxLength:256},limit:{type:'integer',minimum:1,maximum:10}},required:['q'],additionalProperties:false}},
 {name:'get_publication_changes_preview',description:'Staging-only version-pinned public publication metadata and reviewed corrections.',inputSchema:{type:'object',properties:{cursor:{type:'integer',minimum:0,maximum:999999},limit:{type:'integer',minimum:1,maximum:10},version:{type:'string'}},additionalProperties:false}}
];
export async function researchPreviewTool(name,args,request,env,throttle){
 if(!researchPreviewEnabled(request,env))throw Error('Unknown MCP tool: '+name);
 const search=name==='search_research_preview',allowed=search?['q','limit']:['cursor','limit','version'];
 if(Object.keys(args).some(k=>!allowed.includes(k)))throw Error('Invalid preview arguments');
 const u=new URL(request.url);u.pathname=search?previewPaths[0]:previewPaths[1];u.search='';
 for(const [k,v] of Object.entries(args)){if(typeof v!=='string'&&typeof v!=='number')throw Error('Invalid preview arguments');u.searchParams.set(k,String(v));}
 const r=await researchPreviewHttp(new Request(u),env,throttle);if(!r.ok)throw Error('Preview temporarily unavailable');return r.json();
}
export const researchPreviewOpenApiPaths={
 '/api/v1/research/search':{get:{operationId:'searchResearchPreview',summary:'Staging-only public metadata hybrid search',parameters:[{name:'q',in:'query',required:true,schema:{type:'string',maxLength:256}},{name:'limit',in:'query',schema:{type:'integer',minimum:1,maximum:10}}],responses:{200:{description:'Bounded editorial discovery candidates'},400:{description:'Invalid arguments'},429:{description:'Rate limited'},503:{description:'Limiter unavailable'}}}},
 '/api/v1/publications/changes':{get:{operationId:'getPublicationChangesPreview',summary:'Staging-only incremental public metadata feed',parameters:[{name:'cursor',in:'query',schema:{type:'integer',minimum:0,maximum:999999}},{name:'version',in:'query',schema:{type:'string'}},{name:'limit',in:'query',schema:{type:'integer',minimum:1,maximum:10}}],responses:{200:{description:'Versioned sequence and correction records'},409:{description:'Version changed'},429:{description:'Rate limited'}}}}
};
