import importlib.util,json,pathlib,subprocess,tempfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='gah010-review-test-') as td:
 d=pathlib.Path(td);r=subprocess.run(['node',str(ROOT/'scripts/benchmark_research_010.mjs'),str(d)],capture_output=True,text=True);assert r.returncode==0,r.stderr
 review=d/'human-review-250.json';experiment=d/'benchmark-250.json';output=d/'score.json'
 def run(r=review,e=experiment):return subprocess.run(['python3',str(ROOT/'scripts/score_research_010.py'),'--review',str(r),'--experiment',str(e),'--output',str(output)],capture_output=True,text=True)
 result=run();assert result.returncode==2;score=json.loads(output.read_text());assert score['reviewed']==0 and score['MRR'] is None and not score['acceptance_passed']
 altered=json.loads(review.read_text());next(c for c in altered['cases'] if c['result_urls'])['result_urls']=[];bad=d/'changed-review.json';bad.write_text(json.dumps(altered));assert run(bad).returncode==1
 badexp=d/'changed-experiment.json';badexp.write_bytes(experiment.read_bytes()+b'\n');assert run(review,badexp).returncode==1
 spec=importlib.util.spec_from_file_location('corpus010',ROOT/'scripts/build_research_corpus_010.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);candidates,prior=m.rows();pending=next(c for c in candidates if c['url'] not in prior)
 invalid={'schema':'gah.corpus.privacy-review.v1','reviewer':'unit test fixture; not an actual approval','reviewed_at':'2026-11-14','publications':[{'url':pending['url'],'source_sha256':'0'*64,'approved':True,'privacy_reviewed':True,'public_editorial':True}]};att=d/'invalid-approval.json';att.write_text(json.dumps(invalid))
 try:m.prepare(str(att));raise RuntimeError('Changed publication accepted')
 except AssertionError:pass
 invalid['publications'][0]['url']='https://example.invalid/restricted';att.write_text(json.dumps(invalid))
 try:m.prepare(str(att));raise RuntimeError('Unknown publication accepted')
 except AssertionError:pass
print('PASS fixture/experiment/ranking-bound independent-review guard and source-hash-bound privacy admission; no review approval manufactured')
