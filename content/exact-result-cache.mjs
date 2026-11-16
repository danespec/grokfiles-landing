// Short-lived cache of already sanitized, verified exact-ID responses only.
const stores=new WeakMap();
export function exactCacheKey(payload,classification,version){
 if(classification.kind!=='efta'||payload.no_ai!==true||payload.fast!==true||payload.tag&&payload.tag!=='All'||Object.keys(payload).some(k=>!['q','query','limit','tag','fast','no_ai'].includes(k)))return null;
 const limit=Number(payload.limit||10);if(!Number.isInteger(limit)||limit<1||limit>50)return null;
 return version+':'+classification.canonical+':'+limit;
}
export function readExactCache(env,key){
 if(String(env?.GAH_EXACT_CACHE_ENABLED)!=='true'||!key)return null;const store=stores.get(env),row=store?.get(key);if(!row)return null;
 if(row.until<=Date.now()){store.delete(key);return null;}const data=structuredClone(row.data);data.origin_processing_time_ms=data.processingTimeMs??null;delete data.processingTimeMs;data.retrieval_cache='HIT';data.cache_age_ms=Date.now()-row.at;
 return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-GAH-Exact-Cache':'HIT'}});
}
export function writeExactCache(env,key,exact,data,status){
 if(String(env?.GAH_EXACT_CACHE_ENABLED)!=='true'||!key||status!==200||!data?.ok||data.degraded||data.ai_summary_used===true||data.answer||!Array.isArray(data.hits)||!data.hits.length||!data.hits.every(r=>(r.efta_id||r.id)===exact&&r.verification==='verified'&&!r.missing))return;
 let store=stores.get(env);if(!store)stores.set(env,store=new Map());if(store.size>=64)store.delete(store.keys().next().value);store.set(key,{data:structuredClone(data),at:Date.now(),until:Date.now()+30000});
}
