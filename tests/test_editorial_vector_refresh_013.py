"""Offline release test: use a disposable synthetic encoder, never actual credentials."""
import hashlib,json,os,pathlib,shutil,subprocess,tempfile,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class IncrementalVectors(unittest.TestCase):
 def test_incremental_and_fail_closed(self):
  with tempfile.TemporaryDirectory() as t:
   base=pathlib.Path(t);repo=base/'repo';(repo/'scripts').mkdir(parents=True);(repo/'content').mkdir()
   script=repo/'scripts/build_editorial_vectors_013.py';shutil.copy2(ROOT/'scripts'/script.name,script)
   out=base/'vectors.mjs';encoder=base/'encoder';log=base/'calls'
   encoder.write_text('#!/usr/bin/env python3\nimport json,sys,os\nx=json.load(sys.stdin)\nwith open(os.environ["ENCODER_LOG"],"a") as f:f.write(json.dumps(x["texts"])+"\\n")\nprint(json.dumps({"vectors":[[1.0]+[0.0]*383 for t in x["texts"]]}))\n');encoder.chmod(0o700)
   env={**os.environ,'ENCODER_LOG':str(log)}
   def doc(n,revision='a'):
    return {'url':'https://grokarchivehub.com/news/'+n,'source_sha256':hashlib.sha256(revision.encode()).hexdigest(),'title':n,'description':'public description '+revision}
   def corpus(ds,version):
    (repo/'content/research-corpus-010.mjs').write_text('export default '+json.dumps({'documents':ds,'version':version})+';')
   def run(*extra,ok=True):
    r=subprocess.run(['python3',str(script),'--output',str(out),*extra],env=env,capture_output=True,text=True)
    self.assertEqual(r.returncode==0,ok,r.stderr);return json.loads(r.stdout) if ok else r
   def snapshot():return json.loads(out.read_text().removeprefix('export default ').strip().removesuffix(';'))
   a,b,c=doc('a'),doc('b'),doc('c')
   corpus([a,b],'v1');self.assertEqual(run('--encoder',str(encoder))['new_embeddings'],2)
   original=snapshot();self.assertEqual(run('--encoder',str(encoder))['new_embeddings'],0);self.assertEqual(snapshot(),original)
   corpus([a,doc('b','changed'),c],'v2');self.assertEqual(run('--encoder',str(encoder))['new_embeddings'],2);self.assertEqual(snapshot()['documents'][0],original['documents'][0])
   corpus([a,c],'v3');self.assertEqual(run('--encoder',str(encoder))['new_embeddings'],0);self.assertEqual([d['url'] for d in snapshot()['documents']],[a['url'],c['url']]);run('--check')
   self.assertEqual(len(log.read_text().splitlines()),2)
   broken=snapshot();broken['documents'][0]['vector'][0]=0.99;out.write_text('export default '+json.dumps(broken)+';')
   run('--encoder',str(encoder),ok=False);self.assertEqual(len(log.read_text().splitlines()),2)
   out.unlink();run('--contract-fixture');run('--check',ok=False);run('--encoder',str(encoder),ok=False)
if __name__=='__main__':unittest.main()
