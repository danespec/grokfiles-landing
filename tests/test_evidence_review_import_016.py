import pathlib,sys,sqlite3,unittest,json
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from import_evidence_review_016 import statements
class Import(unittest.TestCase):
 def setUp(self):
  self.db=sqlite3.connect(':memory:');schema=(ROOT/'workers/gah-intel/src/reviews.mjs').read_text().split('export const REVIEW_SCHEMA=`',1)[1].split('`;',1)[0];self.db.executescript(schema)
  self.item={'item_id':'answer:r010-001','kind':'answer','title':"Quoted ' title; DROP TABLE example",'content_hash':'a'*64,'question_hash':'b'*64,'payload':{'release_gate':True,'question':'Public question','value':"Literal ' text; not SQL"}}
 def load(self):
  for statement in statements({'items':[self.item]}):self.db.executescript(statement)
 def test_import_idempotently_preserves_human_approval_and_audit_reference(self):
  self.load();self.db.execute("UPDATE gah_review_items SET state='released',approved_json='approved',last_event_id='event1',revision=1");self.load()
  self.assertEqual(self.db.execute('SELECT state,revision,approved_json,last_event_id FROM gah_review_items').fetchone(),('released',1,'approved','event1'))
  self.assertEqual(json.loads(self.db.execute('SELECT payload_json FROM gah_review_items').fetchone()[0]),self.item['payload'])
 def test_changed_content_invalidates_previous_approval(self):
  self.load();self.db.execute("UPDATE gah_review_items SET state='released',approved_json='approved',last_event_id='event1',revision=1");self.item['content_hash']='c'*64;self.load()
  self.assertEqual(self.db.execute('SELECT state,revision,approved_json,last_event_id FROM gah_review_items').fetchone(),('pending',2,None,None))
 def test_revocation_stays_sticky_when_sources_change(self):
  self.load();self.db.execute("UPDATE gah_review_items SET state='revoked',revision=1");self.item['content_hash']='c'*64;self.load();self.assertEqual(self.db.execute('SELECT state FROM gah_review_items').fetchone()[0],'revoked')
if __name__=='__main__':unittest.main()
