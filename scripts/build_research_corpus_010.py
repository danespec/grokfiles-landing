"""Publisher-authorized public metadata indexing; no raw or private documents.
Private review inventories never become public routes or semantic input automatically.
"""
import argparse,hashlib,json,re,os,sys,subprocess,datetime,math
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parents[1]
sha=lambda b:hashlib.sha256(b).hexdigest()
class Meta(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.title='';self.in_title=False;self.tags={};self.canonical=None
 def handle_starttag(self,t,a):
  a=dict(a)
  if t=='title':self.in_title=True
  if t=='meta' and a.get('name'):self.tags[a['name'].lower()]=a.get('content','')
  if t=='link' and a.get('rel')=='canonical':self.canonical=a.get('href')
 def handle_endtag(self,t):
  if t=='title':self.in_title=False
 def handle_data(self,d):
  if self.in_title:self.title+=d

def rows():
 policy=json.loads((ROOT/'content/publication-policy.mjs').read_text().split('=',1)[1].strip().rstrip(';'))
 approved=json.loads((ROOT/'content/retrieval-routing-public-input.json').read_text())['documents'];prior={d['url']:d for d in approved}
 tracked=set(subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode().split('\0'))
 candidates=[]
 for section in ['investigations','evidence-briefs','dispatches','corrections','guides','document-autopsies','timeline-reconstructions','reels','news','research','methodology','book-of-black']:
  folder=ROOT/section
  for f in sorted(folder.rglob('*.html')) if folder.is_dir() else []:
   if section=='research' and f.parent!=folder:continue # evidence readers are not editorial articles
   if section=='book-of-black' and f!=folder/'methodology.html':continue
   if any(x.lower() in {'draft','drafts','private','internal','intel'} for x in f.relative_to(ROOT).parts):continue
   if str(f.relative_to(ROOT)) not in tracked:continue
   assert not f.is_symlink();raw=f.read_bytes();p=Meta();p.feed(raw.decode('utf-8'));url=p.canonical;path='/'+str(f.relative_to(ROOT)).removesuffix('.html')
   if not url or urlsplit(url).scheme!='https' or urlsplit(url).netloc!='grokarchivehub.com' or urlsplit(url).path.rstrip('/')!=path.rstrip('/'):continue
   if policy.get(url,{}).get('noindex') or 'noindex' in p.tags.get('robots','').lower():continue
   if not p.title.strip() or not p.tags.get('description','').strip():continue
   d={'url':url,'title':p.title.strip(),'description':p.tags.get('description',''),'source_sha256':sha(raw),'publication_date':None,'document_type':{'investigations':'investigation','dispatches':'dispatch','corrections':'correction','reels':'reel','guides':'guide','evidence-briefs':'evidence_brief','document-autopsies':'document_autopsy','timeline-reconstructions':'timeline','news':'news','research':'investigation','methodology':'guide','book-of-black':'guide'}[section]}
   candidates.append(d)
 # Static HTML alone does not reflect the Worker canonical/noindex overrides.
 urls=sorted({d['url'] for d in candidates}|set(prior))
 check=subprocess.run(['node','--input-type=module','-e',
  "import fs from 'node:fs';import worker,{gahResearchIndexablePublication as ok} from './_worker.js';const r=await worker.fetch(new Request('https://grokarchivehub.com/sitemap.xml'),{ASSETS:{fetch:async()=>new Response('missing',{status:404})}});if(r.status!==200)throw Error('Sitemap unavailable');const xml=await r.text();const published=new Set([...xml.matchAll(/<loc>(.*?)<\\/loc>/g)].map(m=>m[1]));console.log(JSON.stringify(JSON.parse(fs.readFileSync(0,'utf8')).filter(u=>published.has(u)&&ok(u))));"],
  input=json.dumps(urls),text=True,capture_output=True,check=True,cwd=ROOT)
 eligible=set(json.loads(check.stdout));assert eligible.issubset(set(urls))
 candidates=[d for d in candidates if d['url'] in eligible]
 # Only existing public metadata, not extracted body prose, receipts or raw records.
 for d in candidates:
  meta=d['title']+' '+d['description']
  assert not re.search(r'/(?:Users|Volumes|mnt|volume\d+|home)/|\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|\b\d{3}-\d{2}-\d{4}\b',meta,re.I),'Unsafe public metadata; correct before indexing: '+d['url']
 # Retain the inherited bounded passage only while the exact source bytes
 # are unchanged and the publication remains eligible. Corrections and
 # removals automatically replace or revoke old indexed data.
 for i,d in enumerate(candidates):
  old=prior.get(d['url'])
  if old and old['source_sha256']==d['source_sha256']:candidates[i]=old
 return sorted(candidates,key=lambda d:d['url']),prior

def prepare(attestation=None,check=False):
 candidates,prior=rows()
 # Existing attestation validation remains available for backward compatibility.
 if attestation:
  a=json.loads(Path(attestation).read_text())
  assert a.get('schema')=='gah.corpus.privacy-review.v1'
  assert isinstance(a.get('reviewer'),str) and a['reviewer'].strip()
  datetime.date.fromisoformat(a['reviewed_at'])
  by={d['url']:d for d in candidates}
  reviews={d['url']:d for d in a['publications']}
  assert len(reviews)==len(a['publications']) and set(reviews).issubset(by),'Unknown or duplicate publication review'
  for url,d in reviews.items():
   assert set(d).issubset({'url','source_sha256','approved','privacy_reviewed','public_editorial'})
   if d.get('approved') is True:assert d.get('source_sha256')==by[url]['source_sha256'] and d.get('privacy_reviewed') is True and d.get('public_editorial') is True,'Hash-bound approval required'
 selected=candidates
 base=json.loads((ROOT/'content/retrieval-routing-model.mjs').read_text().split('export default ',1)[1].strip().rstrip(';'))
 out=ROOT/'content/research-corpus-010.mjs'
 policy='Publisher-authorized eligible public editorial metadata; no independent human relevance or claim verification'
 if check:
  # Cross-platform CI validates the exact publication input and artifact integrity;
  # floating-point SVD need not reproduce bit-for-bit across BLAS platforms.
  model=json.loads(out.read_text().split('export default ',1)[1].strip().rstrip(';'))
  assert model['documents']==selected,'Corpus stale: rebuild before publishing'
  assert model['publication_hashes']=={d['url']:d['source_sha256'] for d in selected}
  assert model['review_scope']==policy
  assert model['schema']=='gah.research.corpus.v1'
  v=model.pop('version')
  assert v==sha(json.dumps(model,sort_keys=True,separators=(',',':')).encode()),'Corpus fingerprint mismatch'
  model['version']=v
  assert len(model['vectors'])==len(selected) and all(len(x)==len(model['components']) for x in model['vectors'])
  assert len(model['idf'])==len(model['vocabulary']) and sorted(model['vocabulary'].values())==list(range(len(model['idf'])))
  assert all(len(x)==len(model['idf']) for x in model['components'])
  assert all(math.isfinite(x) for x in model['idf']) and all(math.isfinite(x) for row in model['components']+model['vectors'] for x in row)
  return candidates,prior,model
 from sklearn.feature_extraction.text import TfidfVectorizer
 from sklearn.decomposition import TruncatedSVD
 import numpy as np
 v=TfidfVectorizer(lowercase=True,token_pattern=r'(?u)\b[a-zA-Z0-9]{2,}\b',stop_words='english')
 x=v.fit_transform([d['title']+' '+d['description']+' '+d.get('index_text','') for d in selected])
 svd=TruncatedSVD(n_components=min(32,len(selected)-1,x.shape[1]-1),random_state=10)
 z=svd.fit_transform(x);z/=np.maximum(np.linalg.norm(z,axis=1,keepdims=True),1e-12)
 base.update(vocabulary={k:int(value) for k,value in v.vocabulary_.items()},idf=v.idf_.round(10).tolist(),components=svd.components_.round(10).tolist(),vectors=z.round(10).tolist(),documents=selected)
 base['schema']='gah.research.corpus.v1';base['review_scope']=policy
 base['publication_hashes']={d['url']:d['source_sha256'] for d in selected};base.pop('version',None)
 base['version']=sha(json.dumps(base,sort_keys=True,separators=(',',':')).encode())
 return candidates,prior,base

def main():
 p=argparse.ArgumentParser();p.add_argument('--inventory');p.add_argument('--attestation');p.add_argument('--check',action='store_true');a=p.parse_args();c,prior,model=prepare(a.attestation,a.check)
 if a.inventory:
  target=Path(a.inventory).resolve();assert not target.is_relative_to(ROOT),'Private review inventory must be outside checkout';fd=os.open(target,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
  with os.fdopen(fd,'w') as f:json.dump({'schema':'gah.corpus.review-inventory.v1','status':'publisher_authorized_public_metadata','publications':[{**d,'privacy_status':'inherited_approved_metadata' if d['url'] in prior else 'publisher_authorized_public_metadata'} for d in c],'review_fields':['url','source_sha256','approved','privacy_reviewed','public_editorial'],'limitations':'Local review record is not a cryptographic proof of reviewer identity. Only eligible published metadata is indexed; this is not a relevance judgment.'},f,indent=2)
 out=ROOT/'content/research-corpus-010.mjs';serialized='export default '+json.dumps(model,separators=(',',':'),ensure_ascii=True)+';\n'
 if a.check:pass
 else:out.write_text(serialized)
 print(json.dumps({'eligible_published_candidates':len(c),'publisher_authorized_indexed':len(model['documents']),'pending_not_indexed':len(c)-len(model['documents']),'index_version':model['version'],'runtime_source_fetches':0}))
if __name__=='__main__':main()
