import sys,unittest,copy
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from archive_admission_014 import build
A='EFTA00000001';B='EFTA00000002';P='EFTA00000003';H='1'*64
def row(i=A):return {'id':i,'indexable':True,'sourceDocument':P,'sourcePage':1 if i==A else 2,'sourceSha256':H}
def prior(i=A):return {'id':i,'parent_id':P,'page':1 if i==A else 2,'source_sha256':H,'url':'https://grokarchivehub.com/archive/'+i}
class Admission(unittest.TestCase):
 def setUp(self):self.rows=[row(A),row(B)];self.prior={i:prior(i) for i in [A,B]}
 def status(self,rows=None,revoked=()):return {r['id']:r['status'] for r in build(self.rows if rows is None else rows,self.prior,revoked)['records']}
 def test_admit(self):self.assertEqual(self.status(),{A:'prior_audit_locator_eligible',B:'prior_audit_locator_eligible'})
 def test_parent_revocation(self):self.assertEqual(set(self.status(revoked=[P]).values()),{'revoked'})
 def test_single_revocation(self):self.assertEqual(self.status(revoked=[A])[A],'revoked')
 def test_hash_changed(self):self.assertEqual(self.status([{**row(A),'sourceSha256':'2'*64},row(B)])[A],'changed_source_requires_revalidation')
 def test_page_changed(self):self.assertEqual(self.status([{**row(A),'sourcePage':3},row(B)])[A],'changed_source_requires_revalidation')
 def test_missing_hash(self):self.assertEqual(self.status([{**row(A),'sourceSha256':None}])[A],'missing_registered_fingerprint')
 def test_mirror(self):self.assertEqual(self.status([{**row(A),'sourceCopyType':'mirror'}])[A],'mirror_or_alternate_copy_hold')
 def test_noindex(self):self.assertEqual(self.status([{**row(A),'indexable':False}])[A],'not_indexable')
 def test_removed(self):self.assertEqual(self.status([row(B)])[A],'removed_from_registry')
 def test_unreviewed(self):self.assertEqual(build(self.rows,{})['counts'],{'awaiting_source_and_scope_validation':2})
 def test_duplicate(self):
  with self.assertRaises(ValueError):build([row(A),row(A)],self.prior)
 def test_fingerprint_drift(self):
  self.assertNotEqual(build(self.rows,self.prior)['version'],build(self.rows,self.prior,[A])['version'])
 def test_no_body_export(self):
  x=build([{**row(A),'description':'private test marker','ocr':'private test marker'}],self.prior)
  self.assertNotIn('private test marker',str(x))
if __name__=='__main__':unittest.main()
