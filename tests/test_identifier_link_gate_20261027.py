from pathlib import Path
import json,re
root=Path(__file__).resolve().parents[1]
entries={e['id']:e for e in json.loads((root/'content/identifier-dossiers.json').read_text())['entries']}
problems=[];count=0
for f in root.glob('**/*.html'):
 if any(x in f.parts for x in ['evidence-data','frozen-assets','staging','.git','node_modules']):continue
 s=f.read_text(errors='replace')
 for ident in re.findall(r'href=["\'](?:https://grokarchivehub\.com)?/archive/(EFTA\d{8})["\']',s,re.I):
  count+=1
  if ident.upper() not in entries:problems.append((str(f.relative_to(root)),ident,'missing dossier'))
 for ident in re.findall('efta\\d{8}',f.stem,re.I):
  if f.parent.name in ['reels','videos','evidence-briefs','investigations','news','internet-vs-receipts'] and not entries.get(ident.upper(),{}).get('indexable'):problems.append((str(f.relative_to(root)),ident,'slug target not indexable'))
assert not problems,problems
print('PASS',count,'internal identifier links and every EFTA-bearing editorial slug pass the dossier gate')
