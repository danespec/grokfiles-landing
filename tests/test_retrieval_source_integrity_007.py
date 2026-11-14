from pathlib import Path
from html.parser import HTMLParser
import json,hashlib,re,importlib.util
root=Path(__file__).resolve().parents[1]
raw=(root/'content/retrieval-routing-model.mjs').read_text();model=json.loads(raw.removeprefix('export default ').strip().removesuffix(';'));version=model.pop('version');assert hashlib.sha256(json.dumps(model,sort_keys=True).encode()).hexdigest()==version
source=json.loads((root/'content/retrieval-routing-public-input.json').read_text());assert model['documents']==source['documents'];assert model['navigation']==source['navigation']
class Parser(HTMLParser):
 def __init__(self):super().__init__();self.metadata={};self.title='';self.t=False;self.p=None;self.paragraphs=[]
 def handle_starttag(self,t,a):
  a=dict(a)
  if t=='meta':self.metadata[a.get('name',a.get('property',''))]=a.get('content','')
  if t=='title':self.t=True
  if t=='p':self.p=''
 def handle_data(self,s):
  if self.t:self.title+=s
  if self.p is not None:self.p+=s
 def handle_endtag(self,t):
  if t=='title':self.t=False
  if t=='p' and self.p is not None:self.paragraphs.append(self.p);self.p=None
norm=lambda s:' '.join(s.split())
for d in source['documents']:
 assert re.fullmatch(r'https://grokarchivehub.com/(investigations|reels|corrections|dispatches)/[a-z0-9-]+',d['url']);path=d['url'].split('.com',1)[1].lstrip('/');f=next((p for p in [root/path,root/(path+'.html'),root/path/'index.html'] if p.is_file()),None);assert f;data=f.read_bytes();assert hashlib.sha256(data).hexdigest()==d['source_sha256'],'Publication changed: review/rebuild model and feed'
 x=Parser();x.feed(data.decode());assert x.title==d['title'];assert x.metadata.get('description','')==d['description'];assert d['publication_date']==(x.metadata.get('article:published_time','')[:10] or None)
 assert 'noindex' not in x.metadata.get('robots','').lower();assert not re.search(r'/Users/|/volume[0-9]/|/mnt/|Authorization: Bearer',json.dumps(d))
 if d.get('index_text'):
  pieces=d['index_text'].split(' The payment record',1);pieces=[pieces[0],'The payment record'+pieces[1]];assert all(norm(t) in [norm(p) for p in x.paragraphs] for t in pieces),'Indexing passage must be exact approved-public paragraphs'
spec=importlib.util.spec_from_file_location('scorer',root/'scripts/score_retrieval_review_007.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);blocked=module.score({'cases':[{'approved':False,'results':[]}]});assert blocked['status']=='blocked_missing_human_judgments' and blocked['MRR'] is None and not blocked['acceptance_passed']
print('PASS model fingerprint, 17 publication byte hashes, unchanged original titles/descriptions/dates, exact published passage, privacy fields and fail-closed human review gate')
