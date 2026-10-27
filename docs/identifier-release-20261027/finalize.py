from pathlib import Path
import json,re,html,hashlib,shutil
root=Path(__file__).parent;repo=root/'repository'
f=repo/'content/identifier-dossiers.json';reg=json.loads(f.read_text());id='EFTA00035828';entry=next(e for e in reg['entries'] if e['id']==id);entry['indexable']=True;entry['reviewBasis']='October 26 visual review in content/mcc-source-guide-updates-20261026.json; October 27 one-page mirror capture, SHA-256 33d8e9ed15a5463ce35044dfcdc8fe5ef06a674862b6e2bbf223d500ddd3dbe4. No original-DOJ-byte match claimed.';f.write_text(json.dumps(reg,ensure_ascii=False,indent=2)+'\n')
for f in [repo/'archive'/f'{id}.html',root/'backend/identifier-receipts'/f'{id}.html']:
 s=f.read_text().replace('content="noindex,follow','content="index,follow');s=s.replace('</main>','<section id="mirror-provenance"><h2>Reviewed access copy</h2><p>The October 26 visual review identified an undated one-page diagram and checked its visible EFTA00035828 footer. A fresh one-page mirror was captured on October 27. SHA-256 of that mirror: <code>33d8e9ed15a5463ce35044dfcdc8fe5ef06a674862b6e2bbf223d500ddd3dbe4</code>. This is a mirror fingerprint, not a byte match to DOJ. The drawing does not independently establish dated occupancy, movements or camera coverage.</p></section></main>',1);f.write_text(s)
f=repo/'_worker.js';s=f.read_text();a=s.index('const GAH_IDENTIFIER_DOSSIERS = new Map(');b=s.index(';',a);s=s[:a]+'const GAH_IDENTIFIER_DOSSIERS = new Map('+json.dumps([[e['id'],e] for e in reg['entries']],ensure_ascii=False)+')'+s[b:];f.write_text(s)
# Existing source gaps still have a reader-access page, but stories link the original source while review is pending.
known={e['id']:e for e in reg['entries']};sources=json.loads((repo/'content/identifier-source-links.json').read_text());pending=[]
for f in repo.glob('**/*.html'):
 if any(part in f.parts for part in ['evidence-data','frozen-assets','staging','.git','node_modules']):continue
 if f.parent.name=='archive' or f.name=='archive.html':continue
 s=f.read_text(errors='replace')
 def replacement(m):
  ident=m.group(1).upper();e=known.get(ident)
  if e and e['indexable']:return m.group(0)
  pending.append((str(f.relative_to(repo)),ident));url=sources.get(ident)
  return '<span class="identifier-pending">'+m.group(2)+'</span> — Identifier page pending'+(' · <a href="'+html.escape(url,quote=True)+'">DOJ PDF</a>' if url else ' · <a href="https://www.justice.gov/epstein/search">Find '+ident+' in the DOJ library</a>')
 s=re.sub(r'<a\b[^>]*href=["\'](?:https://grokarchivehub\.com)?/archive/(EFTA\d{8})["\'][^>]*>([\s\S]*?)</a>',replacement,s,flags=re.I);f.write_text(s)
# Refresh the index's status split after the specific diagram source review.
for f in [repo/'archive/ids.html',root/'backend/wiki-home.html']:
 s=f.read_text();s=s.replace('Source verification pending</a>','Published source note</a>');f.write_text(s)
# Persist complete, sanitized release source inputs in the repository.
d=repo/'docs/identifier-release-20261027';d.mkdir(parents=True,exist_ok=True)
for name in ['source-registry.json','local-source-registry.json','build-result.json']:
 shutil.copy2(root/name,d/name)
for name in ['build.py','patch-routes.py','finalize.py','cards.py']:
 src=root/name
 if src.exists():shutil.copy2(src,d/name)
backend=repo/'backend/identifier-release-20261027';backend.mkdir(parents=True,exist_ok=True)
shutil.copy2(root/'backend/identifier-host-policy.mjs',backend/'identifier-host-policy.mjs')
shutil.copy2(root/'backend/wiki-home.html',backend/'wiki-home.html')
shutil.copy2(repo/'content/identifier-dossiers.json',root/'backend/identifier-dossiers.json')
(root/'pending-link-repairs.json').write_text(json.dumps(pending,indent=2)+'\n')
print('Source gate cleared only for visually reviewed EFTA00035828; other nine source holds preserved. Replaced',len(pending),'unready story links with source access and pending labels.')
