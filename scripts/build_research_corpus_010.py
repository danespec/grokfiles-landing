"""Immutable public metadata indexing; new publications require explicit privacy review.
Private review inventories never become public routes or semantic input automatically.
"""
import argparse,hashlib,json,re,os,sys
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
 candidates=[]
 for section in ['investigations','evidence-briefs','dispatches','corrections','guides','document-autopsies','timeline-reconstructions','reels']:
  folder=ROOT/section
  for f in sorted(folder.glob('*.html')) if folder.is_dir() else []:
   assert not f.is_symlink();raw=f.read_bytes();p=Meta();p.feed(raw.decode('utf-8'));url=p.canonical;path='/'+str(f.relative_to(ROOT)).removesuffix('.html')
   if not url or urlsplit(url).netloc!='grokarchivehub.com' or urlsplit(url).path.rstrip('/')!=path.rstrip('/'):continue
   if policy.get(url,{}).get('noindex') or 'noindex' in p.tags.get('robots','').lower():continue
   if not p.title.strip():continue
   d={'url':url,'title':p.title.strip(),'description':p.tags.get('description',''),'source_sha256':sha(raw),'publication_date':None,'document_type':{'investigations':'investigation','dispatches':'dispatch','corrections':'correction','reels':'reel','guides':'guide','evidence-briefs':'evidence_brief','document-autopsies':'document_autopsy','timeline-reconstructions':'timeline'}[section]}
   candidates.append(d)
 # Preserve previously approved metadata and passage exactly, including dates.
 for d in approved:
  f=ROOT/(urlsplit(d['url']).path.lstrip('/')+'.html');assert f.is_file() and sha(f.read_bytes())==d['source_sha256'],'Approved publication changed: review and rebuild required'
  candidates=[x for x in candidates if x['url']!=d['url']];candidates.append(d)
 return sorted(candidates,key=lambda d:d['url']),prior

def prepare(attestation=None):
 candidates,prior=rows();reviews={}
 if attestation:
  a=json.loads(Path(attestation).read_text());assert a.get('schema')=='gah.corpus.privacy-review.v1';assert isinstance(a.get('reviewer'),str) and a['reviewer'].strip();assert re.fullmatch(r'\d{4}-\d{2}-\d{2}',a.get('reviewed_at',''));reviews={d['url']:d for d in a['publications']};assert len(reviews)==len(a['publications']) and set(reviews).issubset({d['url'] for d in candidates}),'Unknown or duplicate publication review';assert all(set(d).issubset({'url','source_sha256','approved','privacy_reviewed','public_editorial'}) for d in a['publications']),'Unexpected review fields'
 selected=[]
 for d in candidates:
  review=reviews.get(d['url'],{})
  if d['url'] in prior:selected.append(prior[d['url']]);continue
  if review.get('approved') is True:
   assert review.get('source_sha256')==d['source_sha256'] and review.get('privacy_reviewed') is True and review.get('public_editorial') is True,'Hash-bound privacy/publication approval required'
   selected.append(d)
 base=json.loads((ROOT/'content/retrieval-routing-model.mjs').read_text().split('export default ',1)[1].strip().rstrip(';'))
 if selected!=base['documents']:
  # Train only after publication review. Never send private material to an API.
  if {d['url'] for d in selected}=={d['url'] for d in base['documents']}:selected=base['documents']
  else:
   from sklearn.feature_extraction.text import TfidfVectorizer
   from sklearn.decomposition import TruncatedSVD
   import numpy as np
   v=TfidfVectorizer(lowercase=True,token_pattern=r'(?u)\b[a-zA-Z0-9]{2,}\b',stop_words='english');x=v.fit_transform([d['title']+' '+d['description']+' '+d.get('index_text','') for d in selected]);svd=TruncatedSVD(n_components=min(32,len(selected)-1,x.shape[1]-1),random_state=10);z=svd.fit_transform(x);z/=np.maximum(np.linalg.norm(z,axis=1,keepdims=True),1e-12);base.update(vocabulary={k:int(value) for k,value in v.vocabulary_.items()},idf=v.idf_.tolist(),components=svd.components_.tolist(),vectors=z.tolist(),documents=selected)
 base['schema']='gah.research.corpus.v1';base['review_scope']='Explicit prior approved metadata plus source-hash-bound privacy approvals; not human relevance judgments';base['publication_hashes']={d['url']:d['source_sha256'] for d in base['documents']};base.pop('version',None);base['version']=sha(json.dumps(base,sort_keys=True,separators=(',',':')).encode());return candidates,prior,base

def main():
 p=argparse.ArgumentParser();p.add_argument('--inventory');p.add_argument('--attestation');p.add_argument('--check',action='store_true');a=p.parse_args();c,prior,model=prepare(a.attestation)
 if a.inventory:
  target=Path(a.inventory).resolve();assert not target.is_relative_to(ROOT),'Private review inventory must be outside checkout';fd=os.open(target,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
  with os.fdopen(fd,'w') as f:json.dump({'schema':'gah.corpus.review-inventory.v1','status':'review_required','publications':[{**d,'privacy_status':'inherited_approved_metadata' if d['url'] in prior else 'pending_not_indexed'} for d in c],'review_fields':['url','source_sha256','approved','privacy_reviewed','public_editorial'],'limitations':'Local review record is not a cryptographic proof of reviewer identity. Do not index pending rows.'},f,indent=2)
 out=ROOT/'content/research-corpus-010.mjs';serialized='export default '+json.dumps(model,separators=(',',':'),ensure_ascii=True)+';\n'
 if a.check:assert out.read_text()==serialized,'Rebuild privacy-approved corpus after publication changes'
 else:out.write_text(serialized)
 print(json.dumps({'eligible_published_candidates':len(c),'privacy_approved_indexed':len(model['documents']),'pending_not_indexed':sum(d['url'] not in prior for d in c),'index_version':model['version'],'runtime_source_fetches':0}))
if __name__=='__main__':main()
