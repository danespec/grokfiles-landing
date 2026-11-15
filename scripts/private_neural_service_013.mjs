// Loopback-only research service. No credentials, documents, vectors or query logs.
import http from 'node:http';
import {createHash} from 'node:crypto';
export function privateNeuralServer013(search,{maxConcurrency=2,maxCache=128,ttlMs=60000,maxRequests=30}={}){
 if(typeof search!=='function'||!Number.isInteger(maxConcurrency)||maxConcurrency<1||maxConcurrency>2||!Number.isInteger(maxCache)||maxCache<0||maxCache>128||!Number.isInteger(ttlMs)||ttlMs<1||ttlMs>60000||!Number.isInteger(maxRequests)||maxRequests<1||maxRequests>30)throw Error('Invalid private service bounds');
 const cache=new Map();let active=0,count=0,window=Date.now(),hits=0,errors=0;
 const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
 const server=http.createServer({requestTimeout:5000,headersTimeout:5000,maxHeaderSize:8192},async(req,res)=>{
  const reply=(status,data,headers={})=>{if(!res.writableEnded){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Robots-Tag':'noindex,nofollow','X-Content-Type-Options':'nosniff','Content-Signal':'ai-train=no, search=no, ai-input=no',...headers});res.end(JSON.stringify(data));}};
  const host='127.0.0.1:'+server.address().port;
  if(!['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.localAddress)||req.headers.host!==host||req.headers.origin&&req.headers.origin!=='http://'+host)return reply(403,{error:'forbidden'});
  if(req.url==='/health'&&req.method==='GET')return reply(200,{ready:true,scope:'private-loopback-experiment',active,cache_entries:cache.size,cache_hits:hits,errors});
  if(req.url!=='/search')return reply(404,{error:'not_found'});
  if(req.method!=='POST')return reply(405,{error:'method_not_allowed'},{Allow:'POST'});
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return reply(415,{error:'json_required'});
  if(Date.now()-window>=60000){window=Date.now();count=0;}if(count++>=maxRequests)return reply(429,{error:'rate_limited'},{'Retry-After':'60'});
  let size=0,parts=[];try{for await(const chunk of req){size+=chunk.length;if(size>2048){parts=null;continue;}if(parts)parts.push(chunk);}}catch{return reply(400,{error:'invalid_body'});}
  if(!parts)return reply(413,{error:'body_too_large'});
  let input;try{input=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{return reply(400,{error:'invalid_json'});}
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['q','limit','document_type','published_after','published_before'].includes(k))||typeof input.q!=='string'||!input.q.trim()||input.q.length>256)return reply(400,{error:'invalid_query'});
  const limit=input.limit??5;if(!Number.isInteger(limit)||limit<1||limit>10)return reply(400,{error:'invalid_limit'});
  if('document_type' in input&&!['investigation','reel','correction','dispatch','guide','evidence_brief','document_autopsy','timeline','news'].includes(input.document_type))return reply(400,{error:'invalid_filter'});
  for(const k of ['published_after','published_before'])if(k in input&&!date(input[k]))return reply(400,{error:'invalid_date'});
  if(input.published_after&&input.published_before&&input.published_after>input.published_before)return reply(400,{error:'invalid_date_range'});
  const key=createHash('sha256').update(JSON.stringify(input)).digest('hex'),old=cache.get(key);
  if(old&&old.expires>Date.now()){hits++;return reply(200,{...old.result,cache_hit:true});}cache.delete(key);
  if(active>=maxConcurrency)return reply(503,{error:'capacity_limited'},{'Retry-After':'1'});
  active++;try{
   const {q,...options}=input;delete options.limit;const x=await search(q,limit,options);
   const result={schema:'gah.private-neural.response.v1',version:x.version,citation_packet:x.citation_packet,intent:x.intent,abstained:x.abstained,results:x.results,answer:null,generated_claims:0,neural_executed:!!x.neural_executed,neural_degraded:!!x.neural_degraded,scope:'Private experiment; independent acceptance incomplete'};
   if(maxCache&&!x.abstained&&!x.neural_degraded){if(cache.size>=maxCache)cache.delete(cache.keys().next().value);cache.set(key,{expires:Date.now()+ttlMs,result});}
   return reply(200,{...result,cache_hit:false});
  }catch{errors++;return reply(503,{error:'research_unavailable'},{'Retry-After':'1'});}finally{active--;}
 });
 server.maxConnections=8;server.keepAliveTimeout=1000;
 return {server,listen:()=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>resolve(server.address()));}),close:()=>new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()))};
}
