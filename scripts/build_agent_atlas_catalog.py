"""Generate a minimized catalog from the explicitly published Atlas, never private drafts."""
import argparse, hashlib, json, re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=root/'atlas/data.json'
dest=root/'atlas/agent-catalog.json'
raw=source.read_bytes()
data=json.loads(raw)
assert data.get('internal_only') is False, 'Only published Atlas allowed'
assert re.fullmatch(r'v[0-9.]+',data['version'])
assert re.fullmatch(r'\d{4}-\d{2}-\d{2}',data['date'])
rows=[]
seen=set()
for story in data['stories']:
    sid=story['id']; tier=story['tier']
    assert re.fullmatch(r'P?[1-9][0-9]{0,5}',sid) and sid not in seen
    assert tier in ('confirmed','probable')
    seen.add(sid)
    rows.append(dict(id=sid,tier=tier,canonical_url='https://grokarchivehub.com/atlas/#story-'+sid.lower()))
counts={t:sum(r['tier']==t for r in rows) for t in ('confirmed','probable')}
assert data['counts']['total_stories']==len(rows)
assert all(data['counts'][t]==n for t,n in counts.items())
out=dict(schema='gah.atlas.catalog.v1',atlas_version=data['version'],publication_date=data['date'],published_data_sha256=hashlib.sha256(raw).hexdigest(),total_stories=len(rows),counts=counts,stories=rows)
serialized=json.dumps(out,ensure_ascii=True,separators=(',',':'))+'\n'
p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');a=p.parse_args()
if a.check:
    assert dest.read_text()==serialized,'Regenerate catalog after Atlas publication'
else: dest.write_text(serialized)
print('Atlas catalog:',data['version'],len(rows),'story locators; no narrative, anchors or private fields')
