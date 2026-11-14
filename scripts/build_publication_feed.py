"""Deterministic, review-required incremental public-metadata publication feed."""
import hashlib,json

def build_feed(documents,previous=None,corrections=None):
 corrections=corrections or {};previous=previous or {'items':[]};items=list(previous['items']);latest={x['url']:x for x in items};seen=set()
 for d in sorted(documents,key=lambda x:x['url']):
  u=d['url'];assert u.startswith('https://grokarchivehub.com/');assert u not in seen;seen.add(u)
  h=hashlib.sha256(json.dumps(d,sort_keys=True).encode()).hexdigest();old=latest.get(u)
  if old and old['metadata_sha256']==h and old['operation']!='withdrawn':continue
  correction=corrections.get(u)
  if old and not correction:raise ValueError('Changed publication requires reviewed correction: '+u)
  items.append({'sequence':len(items)+1,'operation':'corrected' if old else 'published','url':u,'title':d['title'],'publication_sha256':d['source_sha256'],'metadata_sha256':h,'previous_metadata_sha256':old['metadata_sha256'] if old else None,'correction':correction})
 for u,old in sorted(latest.items()):
  if u not in seen and old['operation']!='withdrawn':
   if not corrections.get(u):raise ValueError('Withdrawal requires reviewed reason: '+u)
   items.append({**old,'sequence':len(items)+1,'operation':'withdrawn','previous_metadata_sha256':old['metadata_sha256'],'correction':corrections[u]})
 feed={'schema':'gah.publications.changes.v1','items':items};feed['version']=hashlib.sha256(json.dumps(feed,sort_keys=True).encode()).hexdigest();return feed
if __name__=='__main__':
 import argparse
 from pathlib import Path
 a=argparse.ArgumentParser();a.add_argument('--current',required=True);a.add_argument('--previous');a.add_argument('--corrections');a.add_argument('--output',required=True);x=a.parse_args()
 read=lambda p:json.loads(Path(p).read_text()) if p else None
 f=build_feed(read(x.current),read(x.previous),read(x.corrections));Path(x.output).write_text(json.dumps(f,indent=2))
