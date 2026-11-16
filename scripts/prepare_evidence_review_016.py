"""Prepare private, version-bound review items; never manufacture human decisions."""
import argparse, concurrent.futures, datetime, hashlib, json, pathlib, subprocess, tempfile, sys
from urllib.parse import urlsplit

def sha(value):
    return hashlib.sha256(value if isinstance(value, bytes) else json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()

def prepare(root, archive, answers, output, verify=False, adult_confirmed=False):
    sys.path.insert(0,str(root/'scripts'))
    from verify_archive_sources_014 import approved_url
    from archive_admission_014 import write_private
    registry={r['id']:r for r in json.loads((root/'content/identifier-dossiers.json').read_text())['entries']}
    pending=json.loads((archive/'archive-fingerprint-reconciliation.private.json').read_text())['records']
    inventory=json.loads((archive/'authorized-full-inventory.private.json').read_text())['records']
    copies={r['id']:r['copies'] for r in inventory}
    model=json.loads(subprocess.run(['node','--input-type=module','-e',"import M from './content/research-corpus-010.mjs';console.log(JSON.stringify({version:M.version,documents:M.documents.map(({url,description,source_sha256})=>({url,description,source_sha256}))}))"],cwd=root,capture_output=True,text=True,check=True).stdout)
    docs={d['url']:d for d in model['documents']}
    checks_file=output/'primary-source-observations.private.json'
    observations=json.loads(checks_file.read_text()) if checks_file.exists() else {}
    def probe(row):
        i=row['id'];url=registry[i]['source']
        if i in observations and observations[i].get('url')==url:
            if observations[i].get('status')=='primary_pdf_bytes_verified' or not adult_confirmed:return i,observations[i]
        local_hashes={c['sha256'] for c in copies.get(i,[])}
        if len(local_hashes)==1 and local_hashes & {v['sha256'] for v in row['fingerprints']}:return i,observations.get(i,{'url':url,'status':'primary_fetch_redundant_existing_manifest_and_fresh_local_bytes'})
        result={'url':url,'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'http':None,'pdf':False,'sha256':None,'status':'not_checked'}
        if not approved_url(url):result['status']='not_allowlisted';return i,result
        with tempfile.NamedTemporaryFile(dir=output) as f:
            cookies=['--cookie','justiceGovAgeVerified=true'] if adult_confirmed and pathlib.PurePosixPath(urlsplit(url).path).suffix=='.pdf' and urlsplit(url).hostname in ['www.justice.gov','justice.gov'] else []
            result['normal_doj_adult_confirmation']=bool(cookies)
            r=subprocess.run(['curl','-sS','--max-time','8','--max-filesize','25000000','--proto','=https','--max-redirs','0','-w','%{http_code}','-o',f.name,*cookies,url],capture_output=True,text=True)
            b=pathlib.Path(f.name).read_bytes();result.update(http=r.stdout[-3:],bytes=len(b),pdf=b.startswith(b'%PDF-'),transport_exit=r.returncode)
            if r.returncode==0 and r.stdout.endswith('200') and result['pdf']:result.update(sha256=hashlib.sha256(b).hexdigest(),status='primary_pdf_bytes_verified')
            else:result['status']='primary_not_available_without_redirect_or_access_challenge'
        return i,result
    if verify:
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
            for i,result in pool.map(probe,pending):observations[i]=result
        write_private(checks_file,observations)
    items=[]
    for row in pending:
        i=row['id'];entry=registry[i];local=copies.get(i,[]);hashes=sorted({c['sha256'] for c in local});primary=observations.get(i,{'url':entry['source'],'status':'not_checked'});h=primary.get('sha256')
        conflict=len(hashes)>1 or bool(h and hashes and h not in hashes)
        manifest_matches=sorted({v['sha256'] for v in row['fingerprints']} & set(hashes))
        if not h and len(manifest_matches)==1 and not conflict:
            h=manifest_matches[0];primary={'url':entry['source'],'status':'fresh_local_bytes_match_recorded_source_manifest','sha256':h,'primary_http_observation':primary,'manifest_references':row['fingerprints']}
        source_ok=bool(h and primary.get('status') in ['primary_pdf_bytes_verified','fresh_local_bytes_match_recorded_source_manifest'] and not conflict)
        requirements=[]
        if not source_ok:requirements.append('Resolve primary PDF byte verification'+(' and conflicting local copies' if conflict else '')+'; historical availability is not proof of the primary edition.')
        requirements.extend(['Human: confirm the exact document/edition and approved public locator.','Human: inspect visible redactions and confirm no protected victim/witness/minor identity or private contact information will be exposed.','Human: confirm locator-only admission is appropriate; raw text and semantic passages require a separately reviewed passage manifest.'])
        payload={'id':i,'title':entry['title'],'primary_locator':entry['source'],'public_locator':'https://grokarchivehub.com/archive/'+i,'source_sha256':h,'local_sha256':hashes,'fingerprint_status':primary['status'],'source_verification':primary,'historical_manifest_fingerprints':row['fingerprints'],'local_copy_count':len(local),'conflicting_copies':conflict,'automated_checks':{'source_fingerprint_verified':source_ok,'registry_indexable':entry.get('indexable') is True,'no_mirror_hold':not bool(entry.get('sourceCopyType')),'no_raw_text_export':True},'privacy_checklist':{'correct_document_and_edition':'human_required','redactions_preserved':'human_required','protected_identities_absent':'human_required','no_private_contact_details':'human_required','approved_public_locator':'human_required'},'scope':'verified_locator_only','outstanding_requirements':requirements,'recommended_disposition':'approve' if source_ok else 'hold','recommendation_reason':'Source fingerprint corroborated; approve only after the remaining human document, scope and privacy checks.' if source_ok else 'Automated source gate incomplete; approval is blocked until source evidence is repaired.','options':['approve','hold','exclude'],'release_gate':source_ok and entry.get('indexable') is True and not entry.get('sourceCopyType'),'draft_author':'GAH automated draft preparation'}
        # Observation time is evidence, not document identity; unchanged bytes retain decisions.
        identity={k:v for k,v in payload.items() if k!='source_verification'};identity['primary_evidence']={k:v for k,v in primary.items() if k!='checked_at'}
        items.append({'item_id':'archive:'+i,'kind':'archive','title':i+' — '+entry['title'],'payload':payload,'content_hash':sha(identity)})
    for file in sorted(answers.glob('*.json')):
        packet=json.loads(file.read_text());packet.pop('review',None)
        checks=[]
        for s in packet['sources']:
            d=docs.get(s['url']);checks.append({'source_id':s['id'],'current_publication':bool(d and d['source_sha256']==s['publication_sha256'] and d['description']==s['text']),'excerpt_hash_matches':hashlib.sha256(s['text'].encode()).hexdigest()==s['text_sha256'],'quote_is_current_public_editorial_metadata':True})
        source_map={s['id']:s for s in packet['sources']}
        claims=[{'claim':c['quote'],'classification':c['classification'],'citation':source_map[c['source_id']]['url'],'source_id':c['source_id'],'source_excerpt':source_map[c['source_id']]['text'],'verbatim_support':source_map[c['source_id']]['text']==c['quote'],'entailment':'Human must determine whether this excerpt answers the question; exact quotation alone is not entailment.','uncertainty':source_map[c['source_id']]['limitation']} for c in packet['claims']]
        payload={'question':packet['question'],'proposed_answer':'\n'.join('“'+c['quote']+'” ['+c['classification']+']' for c in packet['claims']),'claims':claims,'packet':packet,'source_checks':checks,'automated_checks':{'sources_current':all(c['current_publication'] and c['excerpt_hash_matches'] for c in checks),'all_claims_verbatim':all(c['verbatim_support'] for c in claims),'no_synthesized_claims':True},'privacy_checklist':{'public_excerpt_eligible':'human_required','protected_identities_absent':'human_required','no_private_contact_details':'human_required'},'entailment_check':'human_required','uncertainty_check':'human_required','outstanding_requirements':['Human: each cited excerpt must support the claim AND be responsive to this exact research question.','Human: confirm the unresolved classifications and limitations are accurate; reject or revise insufficient summaries.','Human: inspect all excerpts for privacy and protected identities.'],'recommended_disposition':'revise','recommendation_reason':'Source-bound editorial-summary extraction only. It must not be accepted as primary-evidence synthesis without a human relevance and entailment judgment.','options':['approve','revise','reject'],'release_gate':all(c['current_publication'] and c['excerpt_hash_matches'] for c in checks) and all(c['verbatim_support'] for c in claims),'scope':'verbatim_reviewed_extraction_only','draft_author':'GAH automated draft preparation','corpus_version':model['version']}
        items.append({'item_id':'answer:'+file.stem,'kind':'answer','title':packet['question'],'payload':payload,'content_hash':sha(payload),'question_hash':hashlib.sha256(packet['question'].encode()).hexdigest()})
    if len(pending)!=60 or len(items)!=84:raise ValueError('Expected exactly 60 archive and 24 answer items')
    result={'schema':'gah.evidence.review.package.v1','generated_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'items':items,'counts':{'archive':60,'answer':24,'source_fingerprints_corroborated':sum(x['payload']['release_gate'] for x in items if x['kind']=='archive'),'human_approvals':0}}
    write_private(output/'review-packages.private.json',result)
    print(json.dumps(result['counts']))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--root',type=pathlib.Path,required=True);p.add_argument('--archive',type=pathlib.Path,required=True);p.add_argument('--answers',type=pathlib.Path,required=True);p.add_argument('--output',type=pathlib.Path,required=True);p.add_argument('--verify-primary',action='store_true');p.add_argument('--adult-confirmed',action='store_true',help='Authorized source operator is confirmed age 18+; use the normal DOJ age-confirmation preference.');a=p.parse_args();a.output.mkdir(mode=0o700,parents=True,exist_ok=True)
    if a.root.resolve() in a.output.resolve().parents:raise ValueError('Private output must be outside checkout')
    prepare(a.root,a.archive,a.answers,a.output,a.verify_primary,a.adult_confirmed)
