import MODEL from '../../../content/research-corpus-010.mjs';
import {reviewHash016,certifyAnswer016,certifyArchive016} from '../../../content/review-certification-016.mjs';

export const REVIEW_SCHEMA=`
CREATE TABLE IF NOT EXISTS gah_review_items (item_id TEXT PRIMARY KEY,kind TEXT NOT NULL,title TEXT NOT NULL,content_hash TEXT NOT NULL,payload_json TEXT NOT NULL,question_hash TEXT,state TEXT NOT NULL DEFAULT 'pending',revision INTEGER NOT NULL DEFAULT 0,last_event_id TEXT,approved_json TEXT,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS gah_review_events (event_id TEXT PRIMARY KEY,item_id TEXT NOT NULL,content_hash TEXT NOT NULL,decision TEXT NOT NULL,actor_email TEXT NOT NULL,assertions_json TEXT NOT NULL,note TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS gah_review_question ON gah_review_items(question_hash,state);
CREATE INDEX IF NOT EXISTS gah_review_event_item ON gah_review_events(item_id,created_at);
`;
export const ASSERTIONS={archive:['human','independent','source','privacy','redactions','scope'],answer:['human','independent','source','privacy','entailment','uncertainty']};
const JSON_TYPE='application/json; charset=utf-8';
const response=(body,status=200)=>({body:JSON.stringify(body),status,type:JSON_TYPE});
function db(env){if(!env.REVIEW_DB)throw Error('review_store_unavailable');return env.REVIEW_DB.withSession?env.REVIEW_DB.withSession('first-primary'):env.REVIEW_DB}
async function body(request){const reader=request.body?.getReader();if(!reader)throw Error('invalid_request');const chunks=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>16384){await reader.cancel();throw Error('request_too_large')}chunks.push(value)}const bytes=new Uint8Array(size);let pos=0;for(const c of chunks){bytes.set(c,pos);pos+=c.length}return JSON.parse(new TextDecoder().decode(bytes))}

export async function reviewRoute(request,env,identity){
 const u=new URL(request.url),store=db(env);
 if(request.method==='GET'&&u.pathname==='/api/reviews'){
  const r=await store.prepare('SELECT item_id,kind,title,content_hash,state,revision,updated_at FROM gah_review_items ORDER BY kind,item_id').all();
  return response({schema:'gah.review.queue.v1',identity:identity.email,items:r.results,counts:r.results.reduce((n,r)=>(n[r.kind]=(n[r.kind]||0)+1,n),{})});
 }
 const match=u.pathname.match(/^\/api\/reviews\/(archive:EFTA\d{8}|answer:r010-\d{3})$/);if(!match)return response({error:'not_found'},404);
 const item=await store.prepare('SELECT * FROM gah_review_items WHERE item_id=?').bind(match[1]).first();if(!item)return response({error:'not_found'},404);
 if(request.method==='GET'){
  const events=await store.prepare('SELECT event_id,content_hash,decision,actor_email,assertions_json,note,created_at FROM gah_review_events WHERE item_id=? ORDER BY created_at,event_id').bind(item.item_id).all();
  return response({...item,payload:JSON.parse(item.payload_json),payload_json:undefined,approved_json:undefined,events:events.results,required_assertions:ASSERTIONS[item.kind]});
 }
 if(request.method!=='POST')return response({error:'method_not_allowed'},405);
 if(request.headers.get('origin')!==u.origin||request.headers.get('x-gah-review')!=='1'||!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||'')||!['same-origin',null].includes(request.headers.get('sec-fetch-site')))return response({error:'invalid_origin'},403);
 let input;try{input=await body(request)}catch{return response({error:'invalid_request'},400)}
 const p=JSON.parse(item.payload_json),options=item.kind==='archive'?['approve','hold','exclude','revoke']:['approve','revise','reject','revoke'];
 if(!input||!options.includes(input.decision)||!Number.isSafeInteger(input.revision)||input.content_hash!==item.content_hash||input.revision!==item.revision)return response({error:'stale_item_reload_required'},409);
 if(!/^[a-f0-9-]{36}$/.test(input.event_id||'')||typeof input.note!=='string'||input.note.length>2000||!input.note.trim())return response({error:'a_review_note_and_event_id_are_required'},400);
 const duplicate=await store.prepare('SELECT * FROM gah_review_events WHERE event_id=?').bind(input.event_id).first();if(duplicate)return response({error:'event_already_recorded_reload_required'},409);
 const assertions=input.assertions||{};
 if(assertions.human!==true)return response({error:'human_decision_required'},422);
 let approved=null,state={hold:'held',exclude:'excluded',revise:'revise',reject:'rejected',revoke:'revoked'}[input.decision]||'released';
 if(input.decision==='approve'){
  if(item.state==='revoked')return response({error:'revocation_is_sticky_new_admission_required'},422);
  if(ASSERTIONS[item.kind].some(k=>assertions[k]!==true)||identity.email.toLowerCase()===String(p.draft_author).toLowerCase())return response({error:'independent_human_checks_required'},422);
  try{approved=item.kind==='answer'?await certifyAnswer016(p,MODEL,identity.email,new Date().toISOString().slice(0,10)):certifyArchive016(p)}catch{return response({error:'automated_source_gate_incomplete',requirements:p.outstanding_requirements},422)}
 }
 const date=new Date().toISOString(),checkJSON=JSON.stringify(Object.fromEntries(ASSERTIONS[item.kind].map(k=>[k,assertions[k]===true])));
 const results=await store.batch([
  store.prepare('INSERT INTO gah_review_events(event_id,item_id,content_hash,decision,actor_email,assertions_json,note,created_at) SELECT ?,item_id,content_hash,?,?,?,?,? FROM gah_review_items WHERE item_id=? AND content_hash=? AND revision=?').bind(input.event_id,input.decision,identity.email,checkJSON,input.note.trim(),date,item.item_id,item.content_hash,item.revision),
  store.prepare('UPDATE gah_review_items SET state=?,revision=revision+1,last_event_id=?,approved_json=?,updated_at=? WHERE item_id=? AND content_hash=? AND revision=? AND EXISTS(SELECT 1 FROM gah_review_events WHERE event_id=? AND item_id=?)').bind(state,input.event_id,approved?JSON.stringify(approved):null,date,item.item_id,item.content_hash,item.revision,input.event_id,item.item_id)
 ]);
 if(results[1].meta.changes!==1)return response({error:'concurrent_decision_reload_required'},409);
 return response({item_id:item.item_id,state,revision:item.revision+1,event_id:input.event_id,activated_scope:approved?.scope||approved?.result?.generation||null,independent_human_recorded:input.decision==='approve'});
}
