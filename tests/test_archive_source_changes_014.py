import sys,pathlib,unittest,hashlib,json,tempfile,subprocess,concurrent.futures
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'scripts'))
from archive_admission_014 import build,verify_prior
from apply_archive_source_changes_014 import reconcile,source_revocations
class Changes(unittest.TestCase):
 def setUp(self):
  self.parent='EFTA00000003';self.ids=['EFTA00000001','EFTA00000002']
  docs=[{'id':i,'parent_id':self.parent,'page':n+1,'source_sha256':'a'*64,'url':'https://grokarchivehub.com/archive/'+i} for n,i in enumerate(self.ids)]
  v=hashlib.sha256(json.dumps(docs,separators=(',',':')).encode()).hexdigest()
  self.pilot={'docs':docs,'version':v};self.report={'admitted':2,'version':v,'source_bytes_matched_in_prior_audit':1,'raw_documents_indexed':0};self.prior=verify_prior(self.pilot,self.report)
  self.entries=[{'id':d['id'],'indexable':True,'sourceDocument':d['parent_id'],'sourcePage':d['page'],'sourceSha256':d['source_sha256']} for d in docs]
  self.ledger=build(self.entries,self.prior);self.row={'id':self.ids[0],'http':'200','curl_exit':0,'pdf':True,'source_host':'www.justice.gov','bytes':100,'expected_sha256':'a'*64,'sha256':'b'*64,'matches':False}
 def run_rows(self,rows,ledger=None):return reconcile(self.entries,self.pilot,self.report,ledger or self.ledger,rows)
 def test_parent_change_withdraws_all_children(self):
  ledger,active,changed=self.run_rows([self.row]);self.assertEqual(active['records'],[]);self.assertEqual(changed,[self.parent]);self.assertEqual(ledger['counts'],{'revoked':2})
 def test_unchanged(self):
  row={**self.row,'sha256':'a'*64,'matches':True};self.assertEqual(len(self.run_rows([row])[1]['records']),2)
 def test_recovery_does_not_reinstate(self):
  ledger,_,_=self.run_rows([self.row]);self.assertEqual(self.run_rows([{**self.row,'sha256':'a'*64,'matches':True}],ledger)[1]['records'],[])
 def test_unknown_candidate_cannot_admit(self):self.assertEqual(len(self.run_rows([{**self.row,'id':'EFTA99999999'}])[1]['records']),2)
 def test_non_pdf_or_failed_request_cannot_revoke(self):
  for extra in [{'pdf':False},{'curl_exit':22},{'http':'403'}]:self.assertEqual(self.run_rows([{**self.row,**extra}])[2],[])
 def test_bad_provenance(self):
  for extra in [{'source_host':'private.invalid'},{'expected_sha256':'c'*64},{'bytes':0},{'matches':True}]:
   with self.assertRaises(ValueError):self.run_rows([{**self.row,**extra}])
 def test_conflicting_observation(self):
  with self.assertRaises(ValueError):self.run_rows([self.row,{**self.row,'sha256':'c'*64}])
 def test_tampered_ledger(self):
  ledger={**self.ledger,'version':'altered'}
  with self.assertRaises(ValueError):self.run_rows([self.row],ledger)
 def test_serialized_read_modify_write(self):
  with tempfile.TemporaryDirectory() as folder:
   target=pathlib.Path(folder)/'state.json';target.write_text('[]')
   code="import sys,json;from pathlib import Path;from archive_admission_014 import locked_evidence,write_private;"+chr(10)+"with locked_evidence(Path(sys.argv[1])):"+chr(10)+" p=Path(sys.argv[1])/'state.json';v=json.loads(p.read_text());v.append(sys.argv[2]);write_private(p,v)"
   def execute(value):return subprocess.run([sys.executable,'-c',code,folder,value],cwd=pathlib.Path(__file__).resolve().parents[1]/'scripts',capture_output=True,text=True)
   with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(execute,['a','b']))
   for result in results:self.assertEqual(result.returncode,0,result.stderr)
   self.assertEqual(set(json.loads(target.read_text())),{'a','b'})
if __name__=='__main__':unittest.main()
