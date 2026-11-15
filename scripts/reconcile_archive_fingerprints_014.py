"""Reconcile previously recorded source metadata only. Never read PDF/OCR bodies."""
import argparse, hashlib, json, re, sys
from collections import Counter
from pathlib import Path
from archive_admission_014 import ROOT, write_private, canonical_hash, digest
ID=re.compile(r'EFTA[0-9]{8}\Z')
RANGE=re.compile(r'(EFTA[0-9]{8})[–-]([0-9]{1,8})\Z')
def objects(v):
    if isinstance(v,dict):
        yield v
        for x in v.values():
            yield from objects(x)
    elif isinstance(v,list):
        for x in v:
            yield from objects(x)
def source_parent(value):
    if not isinstance(value,str):return None
    if ID.fullmatch(value):return value
    m=RANGE.fullmatch(value)
    # A range identifies its parent; it does not prove a child/page mapping.
    return m.group(1) if m else None
def reconcile(entries,manifests,local_rows,previous_byte_rows,prior_docs):
    if len({r['id'] for r in entries})!=len(entries):raise ValueError('Duplicate registry IDs')
    local={r['id']:r for r in local_rows}
    candidates={r['id']:[] for r in entries if not r.get('sourceSha256')}
    for name,data in manifests:
        for row in objects(data):
            parent=source_parent(row.get('id'))
            h=row.get('sha256')
            if parent in candidates and canonical_hash(h):
                item={'sha256':h,'manifest':name,'source_id':row['id']}
                if item not in candidates[parent]:candidates[parent].append(item)
    prior_parents={}
    for d in prior_docs:
        prior_parents.setdefault(d['parent_id'],set()).add(d['source_sha256'])
    byte_records={}
    for row in objects(previous_byte_rows):
        if ID.fullmatch(str(row.get('id',''))) and canonical_hash(row.get('sha256')) and row.get('status')==200 and row.get('localSourceHashMatches') is True:
            byte_records.setdefault(row['id'],set()).add(row['sha256'])
    records=[]
    for d in sorted(entries,key=lambda d:d['id']):
        i=d['id']
        if d.get('sourceSha256'):continue
        refs=sorted(candidates[i],key=lambda x:(x['manifest'],x['source_id'],x['sha256']))
        hs={x['sha256'] for x in refs}
        l=local.get(i,{})
        same_prior=len(hs)==1 and hs==prior_parents.get(i,set()) and hs==byte_records.get(i,set())
        status=('conflicting_manifest_hashes' if len(hs)>1 else
                'prior_parent_bytes_corroborated' if same_prior else
                'manifest_fingerprint_candidate' if hs else 'fingerprint_not_located')
        records.append({'id':i,'status':status,'prior_local_pdf_available':l.get('hasPdf') is True and l.get('resolvable') is True,
                        'fingerprints':refs,'admission':'hold_pending_registry_and_scope_validation'})
    payload={'schema':'gah.archive.fingerprint-reconciliation.v1','scope':'historical structured metadata reconciliation only; no fresh PDF reads, no raw source text or new admissions','registry_digest':digest(entries),'records':records,'counts':dict(sorted(Counter(r['status'] for r in records).items()))}
    payload['version']=digest(payload)
    return payload
def main():
    p=argparse.ArgumentParser();p.add_argument('--evidence',type=Path,required=True);p.add_argument('--check',action='store_true');a=p.parse_args()
    ev=a.evidence.resolve()
    if ev==ROOT or ROOT in ev.parents:raise ValueError('Evidence must remain outside checkout')
    read=lambda f:json.loads(f.read_text())
    entries=read(ROOT/'content/identifier-dossiers.json')['entries']
    manifest_paths=sorted(ROOT.glob('evidence-data/*/source-manifest.json'))
    local=ROOT/'docs/identifier-release-20261027'
    result=reconcile(entries,[(str(x.relative_to(ROOT)),read(x)) for x in manifest_paths],read(local/'local-source-registry.json'),read(local/'source-holds-public-pdfs.json'),read(ev/'archive-locator-manifest.private.json')['docs'])
    target=ev/'archive-fingerprint-reconciliation.private.json'
    if a.check:
        if read(target)!=result:raise ValueError('Reconciliation stale')
    else:write_private(target,result)
    print(json.dumps({'manifest_count':len(manifest_paths),'remaining_dossiers':len(result['records']),'prior_local_pdf_available':sum(r['prior_local_pdf_available'] for r in result['records']),'counts':result['counts'],'new_admissions':0,'version':result['version']}))
if __name__=='__main__':main()
