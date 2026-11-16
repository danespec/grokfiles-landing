// Bounded, reviewed editorial discovery. This is NOT a semantic index or a
// replacement for the archive. Exact query families only; no new factual claims.
import MODEL from './retrieval-routing-model.mjs';
const APEX='https://grokarchivehub.com';
const documents=new Map(MODEL.documents.map(d=>[new URL(d.url).pathname,d]));
const lanes=[
 {name:'payment',queries:['leon black epstein payments','leon black payments','epstein leon black payments','leon black epstein fees','leon black dechert payments'],paths:['/reels/leon-black-dechert-158-million-efta02730996']},
 {name:'flight',queries:['epstein flight logs','jeffrey epstein flight logs','epstein flight records','epstein aircraft logs'],paths:['/corrections/flight-log-count-and-aircraft-reconciliation']},
 {name:'subject',queries:['ehud barak epstein','ehud barak and epstein','jeffrey epstein ehud barak','barak epstein'],paths:['/investigations/barak-st-thomas-dec-2014']},
 {name:'timeline',queries:['epstein files timeline','epstein timeline','jeffrey epstein timeline','epstein chronology','epstein files chronology'],paths:['/timeline-reconstructions']}
];
const byQuery=new Map(lanes.flatMap(l=>l.queries.map(q=>[q,l])));
const hub={source_sha256:'b4787f8d1a7dd4bd03c764a47eaeb0cb0104c7e57a3dc87e866747bca25f0ef1',title:'Timeline Reconstructions | Grok Archive Hub',description:'Chronology work that keeps sequence, source confidence, and unresolved timing gaps separate from causation claims.'};
const allowed=new Set(['q','query','limit','tag','fast','no_ai','ai_layer']);
const normalized=q=>String(q).trim().toLowerCase().replace(/[?!.]+$/,'').replace(/\s+/g,' ');
export const editorialDiscoveryEnabled010=env=>!['false','0'].includes(String(env?.GAH_EDITORIAL_DISCOVERY_ENABLED??'true').toLowerCase());
export function editorialLead009(query,payload,classification){
 if(classification!=='text'||payload?.no_ai!==true||Object.keys(payload).some(k=>!allowed.has(k)))return null;
 if(payload.tag!==undefined&&payload.tag!=='All')return null;
 if(payload.query!==undefined&&normalized(payload.query)!==normalized(query))return null;
 const lane=byQuery.get(normalized(query));if(!lane)return null;
 const path=lane.paths[0],d=path==='/timeline-reconstructions'?hub:documents.get(path);
 if(!d)return null;
 return {lane:lane.name,row:{id:'GAH-EDITORIAL-009-'+lane.name.toUpperCase(),title:d.title,summary:d.description,description:d.description,read_url:APEX+path,url:APEX+path,result_type:'editorial_publication',verification:'public_editorial_locator',channel:'reviewed_editorial',citation_scope:'Published editorial locator; not independent verification of underlying claims.',publication_sha256:d.source_sha256,citations:[{url:APEX+path,publication_sha256:d.source_sha256,kind:'published_editorial_locator',entailment:'not_independently_verified'}]}};
}
function canonical(row){
 try{const u=new URL(row?.read_url||row?.url||'',APEX);return u.origin===APEX?u.pathname.replace(/\/$/,''):null;}catch{return null;}
}
export function mergeEditorialLead009(rows,lead,limit){
 if(!lead||!Number.isSafeInteger(limit)||limit<1||limit>50)return null;
 const archive=rows.slice(0,limit);
 // At most one editorial lead. The original requested archive page remains
 // available separately, including any result displaced by the new first slot.
 const same=canonical(lead.row);
 const combined=[lead.row,...rows.filter(r=>canonical(r)!==same)].slice(0,limit);
 return {rows:combined,archive_results:archive,editorial_matches:[lead.row],retrieval_profile:'reviewed-editorial-009',editorial_intent:lead.lane};
}
