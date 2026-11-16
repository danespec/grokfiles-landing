"""Resubmit only corrected versions, preserving every previous human decision/event."""
import argparse,datetime,hashlib,json,pathlib,sys
from urllib.parse import urlsplit

def digest(x):return hashlib.sha256(json.dumps(x,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()
Q={
'r010-050':([('/investigations/barak-epstein-putin-qatar-carbyne','Carbyne/Qatar record only. The January 1, 2019 pitch and February 3 contact do not prove acceptance, payment, procurement or illegality. The promised second email and anti-drone supplier identification remain missing. Do not substitute a Reporty/Carbyne joint-project framing.')]),
'r010-051':([('/investigations/leon-black-2023-sdny-referral-status','2023 referral record only. The June 12 no-open-investigation statement is not a declination or proof of the allegations. The Black v. Garcia defamation suit is not covered by this referral page and is not part of this answer. A separate News Desk page requires its corrected publication pack and current docket check.')]),
'r010-052':([
('/investigations/black-family-partners-18m-to-5-5m-repricing','The $18M draft and $5.5M closing are separate stages; the intra-package allocations changed. The records do not establish why, or prove laundering, tax fraud or concealment.'),
('/evidence-briefs/financial-trust-black-family-partners-2012','The closing price and bank credit are distinct amounts. Do not combine the closing package with unrelated loans.'),
('/investigations/black-family-partners-source-of-funds-gap','The immediate source of the closing balance remains unresolved. The chart’s attribution of BV70 control to Bloomberg is reporting, not independently established control.'),
('/reels/leon-black-dechert-158-million-efta02730996','Source the separate $30.5M BV70 loans to the Dechert record, not the BFP sale pages. The Deutsche Bank chart (EFTA00080250, Exhibit E) attributes control to Bloomberg reporting; that attribution is not documentary proof of control.')]),
'r010-102':([('/corrections/flight-log-count-and-aircraft-reconciliation','This is a counts reconciliation, not the raw logs. Clinton: 25 passenger rows; Maxwell: 520. N474 assertions are quarantined within the reviewed 116-page source scope, not disproved across FAA or wider records. Primary flight-log PDF: https://www.justice.gov/ag/media/1391276/dl')]),
'r010-103':([
('/corrections/flight-log-count-and-aircraft-reconciliation','The correction packet is not the raw logs. Do not assert an unsourced ~4,800-row total. Primary flight-log PDF: https://www.justice.gov/ag/media/1391276/dl'),
('/reels/indyke-kahn-civil-complaint-flight-records','Absence of a name in the reviewed passenger logs is not proof the person never traveled. Do not adopt “They weren’t passengers” as a universal travel finding. A corporate role or travel-coordination email does not prove passenger travel, knowledge of abuse or criminal participation.')]),
'r010-121':([('/investigations/trump-acosta-epstein-doj-timeline','The specific dated Acosta/DOJ chronology is this article. The general architecture hub is https://grokarchivehub.com/timeline-reconstructions; it is not itself the Acosta timeline. Hub cards now link to the specific article. This correction does not claim the previously documented ranking gap is solved.')]),
'r010-122':([('/guides/epstein-chronological-source-guide','This new guide extends the dated-source method across the published legal, financial, travel and custody lanes. It distinguishes source/event dates from publication dates, preserves undated and composite records, and does not claim a complete chronology of every raw archive document.')]),
'r010-128':([
('/investigations/trump-acosta-epstein-doj-timeline','An ordered analytical frame, not a complete ordered exhibit set. “This article links them as research paths; it does not announce a fresh verification of every underlying exhibit.” No new witness interviews were conducted; this is not a complete search of every Trump, Epstein or Russia record.'),
('/investigations/epstein-december-6-7-2007-decision-gap','A separate July/December 2007 source trail; use its dated receipts without treating adjacent decisions as causal proof.'),
('/investigations/epstein-npa-defense-access-victim-notification','A related victim-notification research path; unresolved identities and missing records remain unresolved.')]),
'r010-176':([('/investigations/black-phaidon-2015-tax-model-house-oversight','The gain-rate assumption changed from 28% to 20%; the revised overall assumed rate was 35.8%. No final revised transaction-specific dollar total or completed sale is proven. The sender’s assumptions are not independently established basis or proceeds; the 2021 Dechert review does not authenticate realization of this modeled tax benefit.')])}

def main():
 p=argparse.ArgumentParser();p.add_argument('--root',type=pathlib.Path,required=True);p.add_argument('--ops',type=pathlib.Path,required=True);p.add_argument('--output',type=pathlib.Path,required=True);p.add_argument('--apply',action='store_true');a=p.parse_args();sys.path.insert(0,str(a.ops));from cf_ops import api,ACCOUNT
 route='/accounts/'+ACCOUNT+'/d1/database/f9b07e6b-1c35-4468-9420-60b37aa3b8bf/query'
 model=json.loads((a.root/'content/research-corpus-010.mjs').read_text().removeprefix('export default ').strip().removesuffix(';'));docs={urlsplit(d['url']).path:d for d in model['documents']}
 reg={r['id']:r for r in json.loads((a.root/'content/identifier-dossiers.json').read_text())['entries']}
 rows=api(route,'POST',{'sql':'SELECT * FROM gah_review_items','params':[]})[0]['results'];targets=[];refresh=[]
 archive_ids={'EFTA00000468','EFTA00016622','EFTA00034221','EFTA00088020','EFTA00176507','EFTA00224262','EFTA01972778','EFTA02213201','EFTA02240144','EFTA02262778','EFTA02332402','EFTA02656769','EFTA02662212'}
 for row in rows:
  payload=json.loads(row['payload_json']);changed=False;why=None
  if payload.get('fix_pack')=='2026-11-16':continue # A repeat run must preserve completed verification and later human decisions.
  if row['kind']=='archive' and row['item_id'].split(':')[1] in archive_ids:
   i=payload['id'];payload['title']=reg[i]['title'];payload['fix_pack']='2026-11-16';payload['draft_author']='GAH automated fix-pack preparation'
   payload['outstanding_requirements']=['Human: inspect the corrected archive and wiki title, source-specific context and retained provenance.','Human: confirm redactions, protected identities and locator-only scope before approving this new version.'];payload['recommended_disposition']='approve' if payload['release_gate'] else 'hold';payload['recommendation_reason']='Requested title/context correction is published; independent human review of the changed version remains required.';changed=True;why='Fix-pack archive correction; prior hold retained in history.'
   if i=='EFTA00224262':
    proof=json.loads((a.output/'koni-browser-source-verification.private.json').read_text());assert proof['id']==i and proof['url']==payload['primary_locator'] and proof['pdf'] is True and proof['pages']==177 and proof['bytes']>0 and len(proof['sha256'])==64
    payload['source_sha256']=proof['sha256'];payload['source_verification']=proof;payload['fingerprint_status']=proof['status'];payload['automated_checks']['source_fingerprint_verified']=True;payload['conflicting_copies']=False;payload['release_gate']=True;payload['recommended_disposition']='approve';payload['recommendation_reason']='Browser verified the 177-page primary PDF on the existing Data Set 9 path; its actual size exceeds the earlier 25 MB acquisition cap. Exact source hash is recorded. Human privacy/scope review is still required.';why='Koni primary-source fingerprint resolved through the normal browser age-confirmation flow; prior transport failure did not establish unavailability.'
  elif row['kind']=='answer' and row['item_id'].split(':')[1] in Q:
   key=row['item_id'].split(':')[1];sources=[];claims=[]
   for path,limitation in Q[key]:
    if path not in docs:raise ValueError('Required source is not an eligible current publication: '+path)
    d=docs[path];sid=hashlib.sha256(d['url'].encode()).hexdigest();s={'id':sid,'url':d['url'],'text':d['description'],'text_sha256':hashlib.sha256(d['description'].encode()).hexdigest(),'publication_sha256':d['source_sha256'],'current_publication_sha256':d['source_sha256'],'privacy_approved':False,'classification':'unresolved','limitation':limitation};assert len(limitation)<=600 and len(s['text'])<=600;sources.append(s);claims.append({'source_id':sid,'quote':s['text'],'classification':'unresolved'})
   packet={'question':payload['question'],'claims':claims,'sources':sources};packet['version']=digest(packet);payload.update(packet=packet,answer_format='scoped_extraction_v2',fix_pack='2026-11-16',draft_author='GAH automated fix-pack preparation',corpus_version=model['version'],release_gate=True)
   payload['claims']=[{'claim':c['quote'],'classification':c['classification'],'citation':s['url'],'source_id':s['id'],'source_excerpt':s['text'],'verbatim_support':True,'entailment':'Human review required for both quoted publication summary and the explicit source-bound scope note.','uncertainty':s['limitation']} for c,s in zip(claims,sources)]
   payload['source_checks']=[{'source_id':s['id'],'current_publication':True,'excerpt_hash_matches':True,'quote_is_current_public_editorial_metadata':True} for s in sources]
   payload['proposed_answer']='\n'.join('“'+s['text']+'” [unresolved]\nScope and limits: '+s['limitation'] for s in sources)
   payload['outstanding_requirements']=['Human: verify the revised source selection, every quotation, and each explicit scope/limitation note against its cited publication.','Human: confirm privacy, uncertainty and claim entailment before approving this new version.'];payload['recommended_disposition']='approve';payload['recommendation_reason']='Requested source and scope corrections are prepared; they do not constitute independent certification.';why='Fix-pack answer revision; prior reviewer notes retained in history.';changed=True
  elif row['kind']=='answer' and row['state']=='released':
   stale=[]
   for s in payload.get('packet',{}).get('sources',[]):
    d=docs.get(urlsplit(s['url']).path)
    if not d or d['source_sha256']!=s['publication_sha256']:stale.append(s['url'])
   if stale:
    for s in payload['packet']['sources']:
     d=docs[urlsplit(s['url']).path];assert d['description']==s['text'],'Unexpected substantive metadata change';s['publication_sha256']=s['current_publication_sha256']=d['source_sha256'];s['privacy_approved']=False
    payload['packet']['version']=digest({k:v for k,v in payload['packet'].items() if k!='version'});payload['source_version_refresh']=stale;payload['fix_pack']='2026-11-16';payload['outstanding_requirements']=['The quoted metadata is unchanged, but requested cross-links changed source publication bytes. Human confirmation of the new source version is required; the prior approval remains in history.'];payload['recommended_disposition']='approve';payload['recommendation_reason']='Source-version refresh after the owner-requested BFP cross-links.';why='Publication source bytes changed; old certification must not silently carry to new source versions.';changed=True;refresh.append(row['item_id'])
  if not changed:continue
  if row['item_id'].startswith('archive:'):title=payload['id']+' — '+payload['title']
  else:title=payload['question']
  targets.append({'item_id':row['item_id'],'kind':row['kind'],'title':title,'payload':payload,'old_hash':row['content_hash'],'old_revision':row['revision'],'content_hash':digest(payload),'why':why})
 a.output.mkdir(mode=0o700,parents=True,exist_ok=True);snapshot=a.output/'corrected-review-items.private.json';snapshot.write_text(json.dumps(targets,ensure_ascii=False,indent=2));snapshot.chmod(0o600)
 if a.apply:
  now=datetime.datetime.now(datetime.timezone.utc).isoformat()
  for x in targets:
   state='pending' if x['payload'].get('release_gate') else 'held';sql='UPDATE gah_review_items SET title=?,content_hash=?,payload_json=?,state=?,revision=revision+1,last_event_id=NULL,approved_json=NULL,updated_at=? WHERE item_id=? AND content_hash=? AND revision=? AND state<>\'revoked\''
   result=api(route,'POST',{'sql':sql,'params':[x['title'],x['content_hash'],json.dumps(x['payload'],ensure_ascii=False,separators=(',',':')),state,now,x['item_id'],x['old_hash'],x['old_revision']]})
   # D1 changes includes the existing audit trigger. Verify the exact row instead.
   current=api(route,'POST',{'sql':'SELECT content_hash,revision,state FROM gah_review_items WHERE item_id=?','params':[x['item_id']]})[0]['results'][0]
   if current['content_hash']!=x['content_hash'] or current['revision']!=x['old_revision']+1 or current['state']!=state:raise ValueError('Concurrent decision; do not overwrite: '+x['item_id'])
 print(json.dumps({'fix_pack_items':sum(x['item_id'] not in refresh for x in targets),'source_version_refreshes':refresh,'prepared':len(targets),'applied':a.apply,'new_human_approvals':0}))

if __name__=='__main__':main()
