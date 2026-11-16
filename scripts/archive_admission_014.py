"""Private, metadata-only archive admission/revocation ledger.

This program does not read source PDF bodies, OCR, private source stores,
or network endpoints. A prior source-byte audit is not a new privacy review.
Unknown or altered records fail closed.
"""
import argparse, datetime as dt, hashlib, json, os, re, tempfile, fcntl
from contextlib import contextmanager
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ID=re.compile(r'EFTA[0-9]{8}\Z')
SHA=re.compile(r'[a-f0-9]{64}\Z')
def digest(obj):
    return hashlib.sha256(json.dumps(obj,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def canonical_id(v):return isinstance(v,str) and ID.fullmatch(v) is not None
def canonical_hash(v):return isinstance(v,str) and SHA.fullmatch(v) is not None
def verify_prior(pilot,report):
    docs=pilot.get('docs')
    if not isinstance(docs,list) or not docs or len(docs)!=report.get('admitted'):raise ValueError('Prior audit count mismatch')
    if pilot.get('version')!=report.get('version') or hashlib.sha256(json.dumps(docs,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()!=pilot.get('version'):raise ValueError('Prior audit version mismatch')
    if report.get('source_bytes_matched_in_prior_audit')!=len({d.get('parent_id') for d in docs}):raise ValueError('Prior audit parent count mismatch')
    if report.get('raw_documents_indexed')!=0:raise ValueError('Unexpected raw-text scope')
    result={}
    for d in docs:
        i,p,n,h=(d.get(k) for k in ('id','parent_id','page','source_sha256'))
        if not canonical_id(i) or not canonical_id(p) or type(n) is not int or n<1 or not canonical_hash(h) or i in result:raise ValueError('Invalid prior audit record')
        if d.get('url')!='https://grokarchivehub.com/archive/'+i:raise ValueError('Unexpected locator')
        result[i]={'id':i,'parent_id':p,'page':n,'source_sha256':h,'url':d['url']}
    return result
def build(entries,prior,revoked=()):
    revoked=set(revoked)
    if any(not canonical_id(i) for i in revoked):raise ValueError('Invalid revocation identifier')
    ids=[d.get('id') for d in entries]
    if any(not canonical_id(i) for i in ids) or len(ids)!=len(set(ids)):raise ValueError('Invalid or duplicate registry ID')
    rows=[]
    for d in sorted(entries,key=lambda d:d['id']):
        i=d['id'];p=d.get('sourceDocument');page=d.get('sourcePage');h=d.get('sourceSha256');a=prior.get(i)
        row={'id':i,'status':None}
        if i in revoked or p in revoked:status='revoked'
        elif d.get('indexable') is not True:status='not_indexable'
        elif d.get('sourceCopyType'):status='mirror_or_alternate_copy_hold'
        elif not canonical_hash(h):status='missing_registered_fingerprint'
        elif not canonical_id(p) or type(page) is not int or page<1:status='invalid_parent_mapping'
        elif not a:status='awaiting_source_and_scope_validation'
        elif (p,page,h)!=(a['parent_id'],a['page'],a['source_sha256']):status='changed_source_requires_revalidation'
        else:
            status='prior_audit_locator_eligible'
            row.update(a)
        row['status']=status
        rows.append(row)
    for i in sorted(set(prior)-set(ids)):
        rows.append({'id':i,'status':'removed_from_registry'})
    counts=dict(sorted(Counter(r['status'] for r in rows).items()))
    # Fingerprint includes registry bytes logically, prior audit scope, and tombstones.
    payload={'schema':'gah.archive.admission-ledger.v1','scope':'private reviewed locator admission only; no raw OCR or PDF text; no independent privacy attestation','registry_digest':digest(entries),'prior_audit_digest':digest(prior),'revoked':sorted(revoked),'counts':counts,'records':rows}
    payload['version']=digest(payload)
    return payload
def write_private(target,obj):
    target=Path(target);target.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
    fd,name=tempfile.mkstemp(prefix='.ledger-',dir=target.parent)
    try:
        with os.fdopen(fd,'w') as f:json.dump(obj,f,indent=2);f.write('\n')
        os.chmod(name,0o600);os.replace(name,target)
    finally:
        if os.path.exists(name):os.unlink(name)
@contextmanager
def locked_evidence(ev):
    ev=Path(ev);ev.mkdir(mode=0o700,parents=True,exist_ok=True)
    fd=os.open(ev/'.archive-admission.lock',os.O_CREAT|os.O_RDWR|os.O_NOFOLLOW,0o600)
    try:
        fcntl.flock(fd,fcntl.LOCK_EX)
        yield
    finally:
        fcntl.flock(fd,fcntl.LOCK_UN);os.close(fd)

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--evidence',type=Path,required=True);p.add_argument('--revoke',action='append',default=[])
    p.add_argument('--check',action='store_true');a=p.parse_args()
    ev=a.evidence.resolve()
    if ev==ROOT or ROOT in ev.parents:raise ValueError('Evidence must be outside checkout')
    with locked_evidence(ev):
        pilot=json.loads((ev/'archive-locator-manifest.private.json').read_text())
        report=json.loads((ev/'archive-locator-pilot-report.json').read_text())
        prior=verify_prior(pilot,report)
        entries=json.loads((ROOT/'content/identifier-dossiers.json').read_text())['entries']
        state=ev/'archive-admission-ledger.private.json'
        existing=json.loads(state.read_text()) if state.exists() else {}
        # Revocation is sticky. Reinstatement is deliberately not implemented.
        revoked=set(existing.get('revoked',[]))|set(a.revoke)
        result=build(entries,prior,revoked)
        if a.check:
            if existing!=result:raise ValueError('Ledger stale; rebuild before using')
        else:write_private(state,result)
        print(json.dumps({'registry_records':len(entries),'counts':result['counts'],'version':result['version'],'raw_documents_indexed':0,'public_deployment':False}))
if __name__=='__main__':main()
