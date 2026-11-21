#!/usr/bin/env python3
"""On-demand, local-only STT worker for approved EFTA media; never fetches network models."""
import argparse,pathlib,json,hashlib,os
p=argparse.ArgumentParser()
p.add_argument('--queue',type=pathlib.Path,required=True)
p.add_argument('--efta',required=True)
p.add_argument('--model-dir',type=pathlib.Path,required=True)
p.add_argument('--output-dir',type=pathlib.Path,required=True)
a=p.parse_args()
assert a.efta.startswith('EFTA') and len(a.efta)==12 and a.efta[4:].isdigit(),'Exact EFTA ID required'
assert a.model_dir.exists() and a.model_dir.is_dir(),'An offline STT model directory is required; no downloading is attempted'
try:
 from faster_whisper import WhisperModel
except ImportError as e:
 raise SystemExit('Offline transcription dependency faster_whisper not installed; no transcription attempted') from e
source=json.loads(a.queue.read_text())
matching=[x for x in source['records'] if x['efta']==a.efta]
assert len(matching)==1,'Identifier not uniquely present in private queue'
entry=matching[0]
assert entry['status']=='queued_private_review' and entry['publication_status']=='not_approved'
path=pathlib.Path(entry['source_file']);assert path.is_file()
assert path.stat().st_size==entry['original_size_bytes'],'Source changed; require re-verification'
h=hashlib.sha256()
with path.open('rb') as f:
 for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
a.output_dir.mkdir(parents=True,exist_ok=True,mode=0o700)
assert (a.output_dir.stat().st_mode & 0o077)==0,'Private transcript directory must be inaccessible to other users'
output=a.output_dir/(a.efta+'.private-stt.json')
assert not output.exists(),'Never silently overwrite an existing private transcript'
model=WhisperModel(str(a.model_dir),device='cpu',compute_type='int8',local_files_only=True)
segments,meta=model.transcribe(str(path),vad_filter=True,beam_size=5)
rows=[{'start_seconds':round(s.start,2),'end_seconds':round(s.end,2),'text':s.text,'avg_logprob':round(s.avg_logprob,4)} for s in segments]
payload={'schema':'gah.private.media.transcript.v1','efta':a.efta,'source_sha256':h.hexdigest(),'speech_model_local':str(a.model_dir.name),'language':meta.language,'status':'unreviewed_private_transcript','publication_status':'not_approved','segments':rows}
tmp=output.with_suffix('.tmp');tmp.write_text(json.dumps(payload,ensure_ascii=False,indent=2));os.chmod(tmp,0o600);tmp.replace(output)
print(json.dumps({'efta':a.efta,'segments':len(rows),'private_transcript_created':True,'published':False}))
