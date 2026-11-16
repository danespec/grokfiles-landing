import sys, unittest, tempfile, json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from build_archive_vectors_014 import build,sha,POLICY
class ArchiveVectors(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
  (self.root/'source.pdf').write_bytes(b'%PDF-test-redacted')
  self.text=json.dumps(['Public chronology with an explicit unresolved endpoint.']).encode()
  (self.root/'passages.json').write_bytes(self.text)
  self.row={'id':'EFTA00000001','publication_status':'public','privacy_approved':True,'redactions_preserved':True,'policy':POLICY,'source_file':'source.pdf','passages_file':'passages.json','source_sha256':sha((self.root/'source.pdf').read_bytes()),'passages_sha256':sha(self.text)}
  self.manifest={'schema':POLICY,'records':[self.row]};self.calls=0
 def tearDown(self):self.tmp.cleanup()
 def encode(self,text):self.calls+=1;return [1.0]+[0.0]*383
 def runbuild(self,old=None):return build(self.manifest,old or {},self.encode,self.root)[0]
 def test_incremental(self):
  a=self.runbuild();b=self.runbuild(a);self.assertEqual(self.calls,1);self.assertEqual(a['version'],b['version'])
 def test_changed_source_removes(self):
  a=self.runbuild();(self.root/'source.pdf').write_bytes(b'changed');b=self.runbuild(a);self.assertEqual(b['records'],[]);self.assertEqual(b['excluded'][0]['reason'],'source_or_passages_changed')
 def test_sticky_withdrawal(self):
  a=self.runbuild();self.manifest['withdrawn']=[self.row['id']];b=self.runbuild(a);del self.manifest['withdrawn'];self.assertEqual(self.runbuild(b)['records'],[])
 def test_not_privacy_approved(self):
  self.row['privacy_approved']=False;self.assertEqual(self.runbuild()['records'],[]);self.assertEqual(self.calls,0)
 def test_removed_record(self):
  a=self.runbuild();self.manifest['records']=[];self.assertEqual(self.runbuild(a)['records'],[])
 def test_changed_passage(self):
  (self.root/'passages.json').write_text('["changed"]');self.assertEqual(self.runbuild()['records'],[])
 def test_duplicate(self):
  self.manifest['records'].append(self.row)
  with self.assertRaises(ValueError):self.runbuild()
 def test_path_escape(self):
  self.row['source_file']='../not-authorized'
  with self.assertRaises(ValueError):self.runbuild()
 def test_invalid_vector(self):
  with self.assertRaises(ValueError):build(self.manifest,{},lambda t:[float('nan')]*384,self.root)
if __name__=='__main__':unittest.main()
