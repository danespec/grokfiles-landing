"""Incrementally build private vectors from the authorized public editorial metadata.
Encoder is an explicit owner-supplied executable; authentication stays outside Git.
"""
import argparse,hashlib,json,math,os,subprocess,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
MODEL='@cf/baai/bge-small-en-v1.5'
def corpus():return json.loads((ROOT/'content/research-corpus-010.mjs').read_text().removeprefix('export default ').strip().removesuffix(';'))
def read(p):return json.loads(p.read_text().removeprefix('export default ').strip().removesuffix(';'))
def digest(d):return hashlib.sha256(json.dumps(d,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def validate(d,m,fixture=False):
 assert d.get('embedding_batch_size')==1
 assert d.get('schema')=='gah.private.editorial.vectors.v1' and d.get('model')==MODEL and d.get('corpus_version')==m['version']
 assert fixture or d.get('fixture_only') is False,'Test vectors cannot pass a release gate'
 assert len(d['documents'])==len(m['documents'])
 for a,b in zip(d['documents'],m['documents']):
  assert a['url']==b['url'] and a['source_sha256']==b['source_sha256'];v=a['vector'];assert len(v)==384 and all(isinstance(x,(int,float)) and math.isfinite(x) for x in v) and abs(sum(x*x for x in v)-1)<.03
 copy=dict(d);version=copy.pop('version');assert digest(copy)==version
 return d
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--check',action='store_true');p.add_argument('--encoder',type=Path);p.add_argument('--contract-fixture',action='store_true');a=p.parse_args();out=a.output.resolve();assert ROOT not in out.parents and out!=ROOT,'Private output outside checkout required';m=corpus()
 if a.check:validate(read(out),m);print(json.dumps({'checked':True,'publications':len(m['documents']),'version':read(out)['version']}));raise SystemExit
 if a.contract_fixture:
  docs=[{'url':d['url'],'source_sha256':d['source_sha256'],'vector':[1.0 if j==i%384 else 0.0 for j in range(384)]} for i,d in enumerate(m['documents'])];changed=0
 else:
  assert a.encoder and a.encoder.is_file(),'Explicit private encoder executable required';old=read(out) if out.exists() else {};old_docs={d['url']:d for d in old.get('documents',[])} if old.get('model')==MODEL and old.get('embedding_batch_size')==1 and not old.get('fixture_only') else {};docs=[];pending=[]
  for d in m['documents']:
   prior=old_docs.get(d['url']);row={'url':d['url'],'source_sha256':d['source_sha256']}
   if prior and prior['source_sha256']==d['source_sha256']:row['vector']=prior['vector']
   else:pending.append((len(docs),d['title']+' '+d['description']))
   docs.append(row)
  for start in range(0,len(pending),16):
   batch=pending[start:start+16];result=subprocess.run([str(a.encoder.resolve())],input=json.dumps({'model':MODEL,'texts':[t for _,t in batch]}),text=True,capture_output=True,check=True);vectors=json.loads(result.stdout)['vectors'];assert len(vectors)==len(batch)
   for (idx,_),v in zip(batch,vectors):docs[idx]['vector']=v
  changed=len(pending)
 data={'schema':'gah.private.editorial.vectors.v1','model':MODEL,'corpus_version':m['version'],'fixture_only':a.contract_fixture,'embedding_batch_size':1,'documents':docs};data['version']=digest(data);validate(data,m,a.contract_fixture);out.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
 with tempfile.NamedTemporaryFile(mode='w',dir=out.parent,delete=False) as f:os.chmod(f.name,0o600);f.write('export default '+json.dumps(data,separators=(',',':'))+';\n');tmp=f.name
 os.replace(tmp,out);print(json.dumps({'publications':len(docs),'new_embeddings':changed,'fixture_only':a.contract_fixture,'version':data['version']}))
