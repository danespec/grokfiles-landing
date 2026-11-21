#!/usr/bin/env python3
"""Build private, source-provenanced offline transcription work queue. Never publishes media."""
import argparse,json,os,pathlib,hashlib
p=argparse.ArgumentParser()
p.add_argument('--media-probe-json',type=pathlib.Path,required=True)
p.add_argument('--output',type=pathlib.Path,required=True)
a=p.parse_args()
raw=json.loads(a.media_probe_json.read_text())
selected={}
for row in raw['files']:
 key=(row['efta'],row['media_kind'])
 if key not in selected: selected[key]=row
records=[]
for (id,kind),row in sorted(selected.items()):
 if row.get('audio_track') is not True:continue
 file=pathlib.Path(row['path'])
 # Track source path privately. Do not place this queue in a public repository or static assets.
 records.append({
  'efta':id,
  'media_kind':kind,
  'source_file':str(file),
  'original_size_bytes':row['bytes'],
  'audio_duration_seconds':row.get('duration_seconds'),
  'status':'queued_private_review',
  'transcript_file':None,
  'publication_status':'not_approved',
  'identity_review_required':True,
  'provenance_review_required':True
 })
out={'schema':'gah.private.media.transcription-queue.v1','source_probe':'media-probe-private-20261120.json','source_count':len(records),'known_audio_hours':round(sum(r['audio_duration_seconds'] or 0 for r in records)/3600,2),'notes':'Read-only private OCR/media work queue; source media and results are not publicly released.','records':records}
a.output.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
a.output.write_text(json.dumps(out,indent=2))
os.chmod(a.output,0o600)
print(json.dumps({'queued_audio_source_ids':len(records),'hours':out['known_audio_hours'],'not_published':True}))
