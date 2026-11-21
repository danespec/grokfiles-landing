#!/usr/bin/env python3
"""Private NAS media probe. Does not transcribe, redistribute, extract frames or read full content."""
import os, pathlib, re, json, collections, subprocess, concurrent.futures, datetime, sys
ROOTS={
 'all_data': '/volume1/homes/admin/DOJ_Epstein/All Data',
 'data8': '/volume1/homes/admin/DOJ_Epstein/Data 8'
}
EXT_AUDIO={'.m4a','.mp3','.wav','.flac','.aac','.ogg','.wma','.aiff'}
EXT_VIDEO={'.mp4','.mov','.m4v','.mkv','.avi','.webm','.mpeg','.mpg','.wmv','.3gp','.ts','.vob'}
OUTDIR=pathlib.Path('/volume1/homes/admin/gah-unified-efta-private-20261120')
OUTDIR.mkdir(mode=0o700,exist_ok=True)
files=[]
for area,root in ROOTS.items():
 for dirpath,dirnames,names in os.walk(root, followlinks=False):
  dirnames[:]=[n for n in dirnames if n!='@eaDir']
  for name in names:
   ext=pathlib.Path(name).suffix.lower()
   if ext not in EXT_AUDIO|EXT_VIDEO:continue
   match=re.match(r'^(EFTA\d{8})(?:\.|$)',name,re.I)
   if not match:continue
   p=os.path.join(dirpath,name)
   try:st=os.stat(p)
   except OSError:continue
   files.append({'efta':match[1].upper(),'media_kind':'audio' if ext in EXT_AUDIO else 'video','ext':ext,'bytes':st.st_size,'source_area':area,'path':p})
print('FOUND',len(files),'MEDIA_FILES',len({x['efta'] for x in files}),'IDS',flush=True)
def probe(row):
 out=dict(row)  # Full paths are retained only in the chmod-600 private NAS report.
 try:
  p=subprocess.run(['/usr/bin/ffmpeg','-hide_banner','-i',row['path']],capture_output=True,timeout=9)
  txt=p.stderr.decode(errors='replace')[:25000]
  m=re.search(r'Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)',txt)
  out['duration_seconds']=round(int(m[1])*3600+int(m[2])*60+float(m[3]),2) if m else None
  out['video_track']=bool(re.search(r'Stream #[^\r\n]*Video:',txt))
  out['audio_track']=bool(re.search(r'Stream #[^\r\n]*Audio:',txt))
  out['codec_probe_status']='ok' if m or out['video_track'] or out['audio_track'] else 'unrecognized'
 except subprocess.TimeoutExpired:
  out['duration_seconds']=None;out['video_track']=None;out['audio_track']=None;out['codec_probe_status']='timeout'
 except OSError:
  out['duration_seconds']=None;out['video_track']=None;out['audio_track']=None;out['codec_probe_status']='ffmpeg_unavailable'
 return out
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 rows=list(pool.map(probe,files))
stats=collections.Counter(row['codec_probe_status'] for row in rows)
formats=collections.Counter(row['ext'] for row in rows)
audio_track=sum(row['audio_track'] is True for row in rows)
video_track=sum(row['video_track'] is True for row in rows)
duration=sum(row['duration_seconds'] or 0 for row in rows)
duration_covered=sum(row['duration_seconds'] is not None for row in rows)
sums=sorted(row['bytes'] for row in rows)
agg={'schema':'gah.media.probe.v1','timestamp':'2026-11-20','media_files':len(rows),'unique_efta_ids':len({x['efta'] for x in rows}),'audio_media_files':sum(x['media_kind']=='audio' for x in rows),'video_media_files':sum(x['media_kind']=='video' for x in rows),'file_format_counts':dict(formats),'known_audio_tracks':audio_track,'known_video_tracks':video_track,'duration_probed':duration_covered,'total_probe_seconds':round(duration,2),'total_known_hours':round(duration/3600,2),'probe_states':dict(stats),'total_file_bytes':sum(x['bytes'] for x in rows),'median_file_bytes':sums[len(sums)//2] if sums else 0,'limitations':'Repeated source assets and missing stream metadata are not equivalent to distinct recordings or transcriptions'}
path=OUTDIR/'media-probe-private-20261120.json'
path.write_text(json.dumps({'summary':agg,'files':rows},indent=2))
os.chmod(path,0o600)
safe=OUTDIR/'media-probe-summary-20261120.json'
safe.write_text(json.dumps(agg,indent=2))
os.chmod(safe,0o600)
print('MEDIA_PROBE_COMPLETE',json.dumps(agg),flush=True)
