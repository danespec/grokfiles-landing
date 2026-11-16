import MODEL from './research-corpus-010.mjs';
import {reviewHash016,certifyAnswer016,certifyArchive016} from './review-certification-016.mjs';
function db(env){const d=env.MEMBERS_DB;return d?.withSession?d.withSession('first-primary'):d}
export async function liveReviewedAnswer016(question,env){
 if(!db(env))return null;
 try{const row=await db(env).prepare("SELECT i.payload_json,i.approved_json,e.actor_email,e.created_at,e.assertions_json FROM gah_review_items i JOIN gah_review_events e ON e.event_id=i.last_event_id AND e.item_id=i.item_id AND e.content_hash=i.content_hash WHERE i.kind='answer' AND i.state='released' AND e.decision='approve' AND i.question_hash=? LIMIT 1").bind(await reviewHash016(question)).first();
  if(!row)return null;const p=JSON.parse(row.payload_json),checks=JSON.parse(row.assertions_json);
  if(p.question!==question||!['human','independent','source','privacy','entailment','uncertainty'].every(k=>checks[k]===true))return null;
  const certified=await certifyAnswer016(p,MODEL,row.actor_email,row.created_at.slice(0,10));if(JSON.stringify(certified)!==row.approved_json)return null;const r=certified.result;
  return {answer:r.answer,answer_claims:r.claims,answer_abstained:false,answer_version:r.version,answer_generation:r.generation,uncertainty:r.uncertainty,generated_claims:0};
 }catch{return null}
}
export async function liveReviewedLocator016(id,env){
 if(!/^EFTA\d{8}$/.test(id)||!db(env))return null;
 try{const row=await db(env).prepare("SELECT i.payload_json,i.approved_json,e.assertions_json FROM gah_review_items i JOIN gah_review_events e ON e.event_id=i.last_event_id AND e.item_id=i.item_id AND e.content_hash=i.content_hash WHERE i.kind='archive' AND i.state='released' AND e.decision='approve' AND i.item_id=? LIMIT 1").bind('archive:'+id).first();
  if(!row||!['human','independent','source','privacy','redactions','scope'].every(k=>JSON.parse(row.assertions_json)[k]===true))return null;
  const r=certifyArchive016(JSON.parse(row.payload_json));return JSON.stringify(r)===row.approved_json?r:null;
 }catch{return null}
}
