"""Private incremental index for explicitly privacy-cleared public archive passages.
No discovery of private files, OCR, network fetches or automatic privacy approval.
"""
import argparse, hashlib, json, math, os, re, subprocess
from pathlib import Path
from archive_admission_014 import ROOT, digest, write_private, locked_evidence
MODEL='@cf/baai/bge-small-en-v1.5'
POLICY='gah.public-archive-passages.v1'
UNSAFE=re.compile(r'[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b\d{3}-\d{2}-\d{4}\b',re.I)
def sha(b):return hashlib.sha256(b).hexdigest()
def build(manifest, previous, encoder, source_root):
    source_root=source_root.resolve()
    if manifest.get('schema')!=POLICY or not isinstance(manifest.get('records'),list):
        raise ValueError('Explicit public passage manifest required')
    records=manifest['records']; ids=[r.get('id') for r in records]
    if any(not isinstance(i,str) or not re.fullmatch(r'EFTA\d{8}',i) for i in ids) or len(set(ids))!=len(ids):
        raise ValueError('Invalid or duplicate identifiers')
    withdrawn=set(previous.get('withdrawn',[]))|set(manifest.get('withdrawn',[]))
    old={r['id']:r for r in previous.get('records',[])} if previous.get('model')==MODEL else {}
    if previous:
        check=dict(previous);version=check.pop('version',None)
        if digest(check)!=version:raise ValueError('Previous index integrity failure')
    out=[];excluded=[];encoded=0;read_bytes=0
    for r in sorted(records,key=lambda x:x['id']):
        i=r['id']; reason=None
        if i in withdrawn or r.get('withdrawn') is True:
            withdrawn.add(i);reason='withdrawn'
        elif r.get('publication_status')!='public' or r.get('privacy_approved') is not True or r.get('redactions_preserved') is not True or r.get('policy')!=POLICY:
            reason='publication_or_privacy_not_cleared'
        elif not re.fullmatch(r'[a-f0-9]{64}',r.get('source_sha256','')) or not re.fullmatch(r'[a-f0-9]{64}',r.get('passages_sha256','')):
            reason='missing_fingerprint'
        if reason:excluded.append({'id':i,'reason':reason});continue
        # Source bytes and privacy-reviewed passage bytes are separately bound.
        paths=[]
        for k in ('source_file','passages_file'):
            p=(source_root/r[k]).resolve()
            if source_root not in p.parents or not p.is_file():raise ValueError('Source outside authorized root or unavailable')
            paths.append(p)
        h=hashlib.sha256()
        with paths[0].open('rb') as f:
            while True:
                b=f.read(1024*1024)
                if not b:break
                read_bytes+=len(b);h.update(b)
        payload=paths[1].read_bytes();read_bytes+=len(payload)
        if h.hexdigest()!=r['source_sha256'] or sha(payload)!=r['passages_sha256']:
            excluded.append({'id':i,'reason':'source_or_passages_changed'});continue
        passages=json.loads(payload)
        if not isinstance(passages,list) or not 1<=len(passages)<=10000:raise ValueError('Invalid passages')
        if any(not isinstance(p,str) or not 1<=len(p)<=4000 or UNSAFE.search(p) for p in passages):
            excluded.append({'id':i,'reason':'unsafe_passage'});continue
        key=digest({'source':r['source_sha256'],'passages':r['passages_sha256'],'policy':POLICY,'model':MODEL})
        prior=old.get(i)
        if prior and prior.get('content_key')==key:vectors=prior['vectors']
        else:
            vectors=[]
            for text in passages:
                v=encoder(text);encoded+=1
                if len(v)!=384 or any(type(x) not in (int,float) or not math.isfinite(x) for x in v):raise ValueError('Invalid embedding')
                norm=sum(x*x for x in v)**.5
                if norm<=0:raise ValueError('Zero embedding')
                vectors.append([x/norm for x in v])
        if len(vectors)!=len(passages):raise ValueError('Stale vector count')
        # Do not copy source bodies or passages into the vector index.
        if len(vectors)!=len(passages) or any(len(v)!=384 or any(type(x) not in (int,float) or not math.isfinite(x) for x in v) or abs(sum(x*x for x in v)-1)>.03 for v in vectors):raise ValueError('Invalid encoder vectors')
        out.append({'id':i,'url':'https://grokarchivehub.com/archive/'+i,'source_sha256':r['source_sha256'],'passages_sha256':r['passages_sha256'],'content_key':key,'vectors':vectors})
    result={'schema':'gah.private.archive.vectors.v1','model':MODEL,'policy':POLICY,'manifest_version':digest(manifest),'withdrawn':sorted(withdrawn),'records':out,'excluded':excluded}
    result['version']=digest(result)
    return result,{'indexed_records':len(out),'indexed_passages':sum(len(r['vectors']) for r in out),'excluded':len(excluded),'new_embeddings':encoded,'source_bytes_read':read_bytes,'version':result['version']}
def main():
    p=argparse.ArgumentParser();p.add_argument('--manifest',type=Path,required=True);p.add_argument('--source-root',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--encoder',type=Path,required=True);a=p.parse_args()
    output=a.output.resolve();source=a.source_root.resolve()
    if output==ROOT or ROOT in output.parents or source==ROOT or ROOT in source.parents:raise ValueError('Private paths outside checkout required')
    def encode(text):
        r=subprocess.run([str(a.encoder.resolve())],input=json.dumps({'model':MODEL,'texts':[text]}),text=True,capture_output=True,check=True,timeout=30)
        return json.loads(r.stdout)['vectors'][0]
    with locked_evidence(output.parent):
        previous=json.loads(output.read_text()) if output.exists() else {}
        result,receipt=build(json.loads(a.manifest.read_text()),previous,encode,source)
        write_private(output,result);write_private(output.with_suffix('.receipt.json'),receipt);print(json.dumps(receipt))
if __name__=='__main__':main()
