"""Build a bounded, server-only search index from eligible public article text.

No source PDFs, private files, body passages, protected blocks or excerpts
are emitted. Mechanical filters are not a privacy certification.
"""
import argparse, hashlib, json, math, re, collections
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
from build_research_corpus_010 import rows, ROOT
STOP=set('the a an is are was were be been being what which who how why when where of in to and or for from with by on as at it its this that these those not but have has had do does did will would can could should may might i you he she they we their his her our your them us me my public published evidence documents document records record source sources epstein jeffrey gah grok archive hub read show find explain compare before after between about page more also only than'.split())
ALIASES={'payments':'payment','paid':'payment','fees':'payment','flights':'flight','passengers':'passenger','logs':'log','timelines':'timeline','chronology':'timeline','chronological':'timeline','transactions':'transaction','corrections':'correction','reconciliation':'reconcile','reconciled':'reconcile','reconciling':'reconcile','proposals':'proposal','emails':'email','invitations':'invitation','counts':'count','questions':'question','airplanes':'aircraft'}
# Exclude entire sensitive blocks rather than attempting to infer an identity.
SENSITIVE=re.compile(r'\b(?:victims?|survivors?|witness(?:es)?|minors?|underage|juveniles?|children|child|redact\w*|unredact\w*|sexual|sex\s+traffick\w*|rape|molest\w*|abuse[dr]?|alleg(?:ation|ed|edly|ations)|pseudonym|anonymous|anonymized|private|confidential|password|credential\w*|home address|phone number|birth date|date of birth|passport|social security|doe)\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}|/(?:Users|Volumes|mnt|volume\d+|home)/|\b\d{3}[-. ]\d{2}[-. ]\d{4}\b|\b(?:\+?1[-. ]?)?\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b',re.I)
SKIP={'script','style','template','noscript','svg','nav','footer','aside','form','button','select','textarea','pre','code','blockquote','iframe','dialog','details','audio','video','figure'}
VOID={'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
BLOCKS={'p','h1','h2','h3','h4','h5','h6','li','td','th','dt','dd','figcaption'}
MARK=re.compile(r'(?:^|[\s_-])(?:private|internal|hidden|redacted|sensitive|raw|transcript|source[-_]?(?:text|raw|quote)|navigation|nav|sidebar|menu|toolbar|command|consent|adslot)(?:$|[\s_-])',re.I)
def words(s):return [ALIASES.get(t,t) for t in re.findall(r'[a-z0-9]{2,}',s.lower()) if t not in STOP and len(t)<=40 and not re.fullmatch(r'[a-f0-9]{24,}',t)]
class Body(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.stack=[];self.parts=[];self.blocks=[];self.excluded=0;self.main_count=0
 def flush(self):
  if not self.parts:return
  text=' '.join(' '.join(self.parts).split());self.parts=[]
  if not text:return
  if SENSITIVE.search(text):self.excluded+=1;return
  w=words(text)
  if len(w)>=3:self.blocks.append(w)
 def handle_starttag(self,t,a):
  a=dict(a)
  if t in BLOCKS or t in SKIP:self.flush()
  parent=self.stack[-1] if self.stack else ('',False,False)
  main=parent[1] or t=='main'
  if t=='main':self.main_count+=1
  blocked=parent[2] or t in SKIP or 'hidden' in a or a.get('aria-hidden','').lower()=='true' or bool(re.search(r'display\s*:\s*none|visibility\s*:\s*hidden',a.get('style',''),re.I)) or bool(MARK.search(' '.join([a.get('class',''),a.get('id','')])))
  if t not in VOID:self.stack.append((t,main,blocked))
 def handle_endtag(self,t):
  if t in BLOCKS or t=='main' or t in SKIP:self.flush()
  for i in range(len(self.stack)-1,-1,-1):
   if self.stack[i][0]==t:del self.stack[i:];break
 def handle_data(self,d):
  if self.stack and self.stack[-1][1] and not self.stack[-1][2] and any(t in BLOCKS for t,_,_ in self.stack):self.parts.append(d)
def build():
 docs,_=rows();manifest=[];passages=[];counts=collections.defaultdict(list)
 for i,d in enumerate(docs):
  f=ROOT/(urlsplit(d['url']).path.lstrip('/')+'.html');raw=f.read_bytes()
  assert hashlib.sha256(raw).hexdigest()==d['source_sha256']
  p=Body();p.feed(raw.decode('utf-8'));p.close();p.flush()
  assert p.main_count==1,(d['url'],p.main_count)
  start=len(passages);total=0;doc_terms=collections.Counter()
  for block in p.blocks:
   for start_token in range(0,len(block),120):
    chunk=block[start_token:start_token+120]
    if len(chunk)<3:continue
    freq=collections.Counter(chunk);idx=len(passages)
    passages.append([i,len(chunk)])
    total+=len(chunk);doc_terms.update(freq)
    for t,n in sorted(freq.items()):counts[t].append([idx,n])
  manifest.append({'url':d['url'],'source_sha256':d['source_sha256'],'passages':len(passages)-start,'tokens':total,'excluded_sensitive_blocks':p.excluded})
 # Drop unique corpus tokens and stop words? Keep rare terms for known-item retrieval,
 # but no personal contacts, fingerprints, raw passage text or source file paths.
 assert len(passages)<=25000,'Passage budget exceeded'
 assert len(counts)<=70000,'Vocabulary budget exceeded'
 data={'schema':'gah.editorial.passages.v1','scope':'filtered visible public editorial main-text tokens; no stored passages or private source content','documents':manifest,'passages':passages,'postings':dict(sorted(counts.items()))}
 data['version']=hashlib.sha256(json.dumps(data,sort_keys=True,separators=(',',':')).encode()).hexdigest()
 return data
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');p.add_argument('--output',type=Path);a=p.parse_args()
 data=build();out=a.output.resolve() if a.output else ROOT/'content/editorial-passages-012.mjs';assert a.check or (a.output and ROOT not in out.parents and out!=ROOT),'Private generation output outside checkout required';s='export default '+json.dumps(data,ensure_ascii=True,separators=(',',':'))+';\n'
 if a.check:assert out.read_text()==s,'Editorial passage index stale; rebuild'
 else:
  import tempfile,os
  out.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
  with tempfile.NamedTemporaryFile(mode='w',dir=out.parent,delete=False) as temp:
   os.chmod(temp.name,0o600);temp.write(s);temp_name=temp.name
  os.replace(temp_name,out)
 print(json.dumps({'publications':len(data['documents']),'with_passages':sum(d['passages']>0 for d in data['documents']),'passages':len(data['passages']),'tokens':sum(d['tokens'] for d in data['documents']),'excluded_sensitive_blocks':sum(d['excluded_sensitive_blocks'] for d in data['documents']),'vocabulary':len(data['postings']),'bytes':len(s.encode()),'version':data['version']}))
