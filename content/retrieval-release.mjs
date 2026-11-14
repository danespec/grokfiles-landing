// 008: bounded public rollout. The 007 prototype never replaces the full archive.
import FEED from './research-preview-feed.mjs';
import MODEL from './retrieval-routing-model.mjs';
const navAliases=new Map([
 ['epstein documents archive','archive'],['epstein wiki','wiki'],['jeffrey epstein files search','search'],['epstein files ai','assistant'],
 ['open the archive','archive'],['take me to the wiki','wiki'],['where is the search interface','search'],['how do i use ask gah','assistant'],
 ['grok archive hub search','search'],['gah archive','archive'],['open the ai assistant guide','assistant'],['where can i search the files','search']
]);
export const RELEASE_STAGING_HOST='ai-retrieval-008.gah-staging-517b8499.pages.dev';
export function productionResearchHost(request,env){
 return Boolean(request)&&String(env?.GAH_STAGING||'').toLowerCase()!=='true'&&new URL(request.url).hostname==='grokarchivehub.com';
}
export function releaseSurfaceEnabled(request,env){
 return productionResearchHost(request,env)||(Boolean(request)&&String(env?.GAH_STAGING||'').toLowerCase()==='true'&&new URL(request.url).hostname===RELEASE_STAGING_HOST);
}
export function releaseNavigation(query){
 const key=String(query).trim().toLowerCase().replace(/[?!.]+$/,'').replace(/\s+/g,' ');
 const kind=navAliases.get(key);if(!kind)return null;
 const d=MODEL.navigation.find(x=>x.kind===kind);if(!d)return null;
 const hit={id:'GAH-NAV-'+kind.toUpperCase(),title:d.title,url:d.url,read_url:d.url,description:d.description,summary:d.description,result_type:'navigation',verification:'public_navigation',channel:'navigation'};
 return {ok:true,intent:'navigation',hits:[hit],results:[hit],hit_count:1,primary_hit_count:1,estimatedTotalHits:1,fast:true,no_ai:true,ai_summary_used:false,answer:null};
}
export const PUBLIC_FEED_PATH='/api/v1/publications/changes';
export const publicFeedTool={name:'get_publication_changes',description:'Versioned changes to the bounded public editorial publication register, not a complete archive feed.',inputSchema:{type:'object',properties:{cursor:{type:'integer',minimum:0,maximum:999999},limit:{type:'integer',minimum:1,maximum:10},version:{type:'string',maxLength:128}},additionalProperties:false}};
export const publicFeedSpec={get:{operationId:'getPublicationChanges',summary:'Bounded public editorial publication changes, not corpus-wide coverage',parameters:[{name:'cursor',in:'query',schema:{type:'integer',minimum:0,maximum:999999}},{name:'limit',in:'query',schema:{type:'integer',minimum:1,maximum:10}},{name:'version',in:'query',schema:{type:'string',maxLength:128}}],responses:{200:{description:'Versioned public editorial changes'},304:{description:'Unchanged page'},400:{description:'Invalid arguments'},409:{description:'Version changed'},429:{description:'Rate limited'},503:{description:'Limiter unavailable'}}}};
export async function publicPublicationFeed(request,env,throttle){
 const u=new URL(request.url);
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex,follow','Content-Signal':'ai-train=no, search=yes, ai-input=yes','X-Content-Type-Options':'nosniff'};
 const reply=(b,status=200,extra={})=>new Response(request.method==='HEAD'||status===304?null:JSON.stringify(b),{status,headers:{...headers,...extra}});
 if(!releaseSurfaceEnabled(request,env)||u.pathname!==PUBLIC_FEED_PATH)return reply({error:'not_found'},404);
 if(!['GET','HEAD'].includes(request.method))return reply({error:'method_not_allowed'},405,{Allow:'GET, HEAD'});
 for(const k of u.searchParams.keys())if(!['cursor','limit','version'].includes(k)||u.searchParams.getAll(k).length!==1)return reply({error:'invalid_query'},400);
 const cursor=u.searchParams.get('cursor')??'0',limit=u.searchParams.get('limit')??'5';
 if(!/^(0|[1-9][0-9]{0,5})$/.test(cursor)||!/^(10|[1-9])$/.test(limit)||+(cursor)>FEED.items.length||(u.searchParams.get('version')||'').length>128)return reply({error:'invalid_bounds'},400);
 let rate;try{rate=await throttle();}catch{}if(!rate||typeof rate.limited!=='boolean')return reply({error:'limiter_unavailable'},503);
 if(rate.limited)return reply({error:'rate_limited'},429,{'Retry-After':'60'});
 if(u.searchParams.has('version')&&u.searchParams.get('version')!==FEED.version)return reply({error:'version_changed',version:FEED.version},409);
 // Version and validated numeric parameters only; never echo arbitrary input in headers.
 const etag='"'+FEED.version+'-'+cursor+'-'+limit+'"';
 if((request.headers.get('If-None-Match')||'').split(',').some(t=>['*',etag,'W/'+etag].includes(t.trim())))return reply(null,304,{ETag:etag});
 const items=FEED.items.slice(+cursor,+cursor+ +limit);
 return reply({schema:FEED.schema,version:FEED.version,scope:'Bounded editorial publication register; not a complete archive feed',items,next_cursor:+cursor+items.length<FEED.items.length?+cursor+items.length:null,total:FEED.items.length},200,{ETag:etag});
}
