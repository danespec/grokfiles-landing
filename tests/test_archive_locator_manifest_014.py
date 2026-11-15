import hashlib,json,sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from archive_admission_014 import build,verify_prior
from prepare_archive_locator_014 import active_manifest
class Manifest(unittest.TestCase):
 def setUp(self):
  self.i='EFTA00000001';self.p='EFTA00000002'
  self.entries=[{'id':self.i,'indexable':True,'sourceDocument':self.p,'sourcePage':1,'sourceSha256':'a'*64}]
  docs=[{'id':self.i,'parent_id':self.p,'page':1,'source_sha256':'a'*64,'url':'https://grokarchivehub.com/archive/'+self.i,'topic':'test marker'}]
  v=hashlib.sha256(json.dumps(docs,separators=(',',':')).encode()).hexdigest()
  self.pilot={'docs':docs,'version':v};self.report={'admitted':1,'version':v,'source_bytes_matched_in_prior_audit':1,'raw_documents_indexed':0}
  self.prior=verify_prior(self.pilot,self.report)
 def test_active(self):
  m=active_manifest(self.entries,self.pilot,self.report,build(self.entries,self.prior));self.assertEqual(len(m['records']),1);self.assertNotIn('test marker',str(m))
 def test_parent_revoked(self):self.assertEqual(active_manifest(self.entries,self.pilot,self.report,build(self.entries,self.prior,[self.p]))['records'],[])
 def test_stale_registry(self):
  with self.assertRaises(ValueError):active_manifest([],self.pilot,self.report,build(self.entries,self.prior))
 def test_tampered_ledger(self):
  l=build(self.entries,self.prior);l['counts']={}
  with self.assertRaises(ValueError):active_manifest(self.entries,self.pilot,self.report,l)
 def test_tampered_prior(self):
  self.pilot['docs'][0]['topic']='changed'
  with self.assertRaises(ValueError):verify_prior(self.pilot,self.report)
if __name__=='__main__':unittest.main()
