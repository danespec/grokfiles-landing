"""Verify generated inputs cannot be written or resolved from the public checkout."""
import os,pathlib,subprocess,tempfile,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class PrivateBuild(unittest.TestCase):
 def test_public_output_rejected(self):
  r=subprocess.run(['python3','scripts/build_editorial_passages_012.py','--output',str(ROOT/'forbidden-private-index.mjs')],cwd=ROOT,capture_output=True,text=True)
  self.assertNotEqual(r.returncode,0);self.assertIn('Private generation output outside checkout required',r.stderr);self.assertFalse((ROOT/'forbidden-private-index.mjs').exists())
 def test_loader_requires_external_input(self):
  env=dict(os.environ);env.pop('GAH_PRIVATE_PASSAGE_INDEX',None)
  code="await import('./content/editorial-passages-012.mjs')"
  for configured in [None,str(ROOT/'content/research-corpus-010.mjs')]:
   if configured:env['GAH_PRIVATE_PASSAGE_INDEX']=configured
   r=subprocess.run(['node','--experimental-loader','./scripts/private_passage_loader_012.mjs','--input-type=module','-e',code],cwd=ROOT,env=env,capture_output=True,text=True)
   self.assertNotEqual(r.returncode,0)
 def test_worker_public_output_and_symlink_rejected(self):
  with tempfile.TemporaryDirectory() as t:
   base=pathlib.Path(t);index=base/'input.mjs';index.write_text('export default {"schema":"gah.editorial.passages.v1"};')
   (base/'public-link').symlink_to(ROOT,target_is_directory=True)
   for output in [ROOT/'forbidden-worker.mjs',base/'public-link'/'forbidden-worker.mjs']:
    r=subprocess.run(['node','scripts/build_private_research_012.mjs',str(index),str(output),'unused-esbuild-path'],cwd=ROOT,capture_output=True,text=True)
    self.assertNotEqual(r.returncode,0);self.assertIn('checkout',r.stderr);self.assertFalse(output.exists())
if __name__=='__main__':unittest.main()
