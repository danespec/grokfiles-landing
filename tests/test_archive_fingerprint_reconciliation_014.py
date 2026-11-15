import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from reconcile_archive_fingerprints_014 import reconcile
A='EFTA00000001';B='EFTA00000002';H='1'*64
class Reconciliation(unittest.TestCase):
 def run_case(self,manifests=(),local=(),bytes_rows=(),prior=()):
  return reconcile([{'id':A,'indexable':True},{'id':B,'indexable':True}],manifests,local,bytes_rows,prior)
 def test_exact(self):
  x=self.run_case([('m',{'id':A,'sha256':H})]);self.assertEqual(x['counts'],{'fingerprint_not_located':1,'manifest_fingerprint_candidate':1})
 def test_no_prose_matching(self):
  x=self.run_case([('m',{'description':A,'sha256':H})]);self.assertEqual(x['counts'],{'fingerprint_not_located':2})
 def test_range_parent_only(self):
  x=self.run_case([('m',{'id':A+'–2','sha256':H})]);self.assertEqual(x['records'][1]['status'],'fingerprint_not_located')
 def test_conflict(self):
  x=self.run_case([('m',[{'id':A,'sha256':H},{'id':A,'sha256':'2'*64}])]);self.assertEqual(x['records'][0]['status'],'conflicting_manifest_hashes')
 def test_prior_corroboration(self):
  x=self.run_case([('m',{'id':A,'sha256':H})],[],[{'id':A,'sha256':H,'status':200,'localSourceHashMatches':True}],[{'parent_id':A,'source_sha256':H}]);self.assertEqual(x['records'][0]['status'],'prior_parent_bytes_corroborated');self.assertIn('hold',x['records'][0]['admission'])
 def test_presence_not_hash(self):
  x=self.run_case(local=[{'id':A,'resolvable':True,'hasPdf':True}]);self.assertTrue(x['records'][0]['prior_local_pdf_available']);self.assertEqual(x['records'][0]['status'],'fingerprint_not_located')
if __name__=='__main__':unittest.main()
