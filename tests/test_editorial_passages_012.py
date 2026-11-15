import sys, unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from build_editorial_passages_012 import Body
class Extraction(unittest.TestCase):
 def test_visible_main_only(self):
  p=Body();p.feed('''<html><head><title>headmarker</title></head><body><p>outsidemarker outside body text</p><main><h1>Visible research title</h1><p>visiblemarker public financial transaction.</p><div hidden><p>hiddenmarker hidden secret text</p></div><p aria-hidden="true">ariamarker hidden text</p><p style="display: none">stylemarker hidden text</p><nav><p>navmarker extra terms</p></nav><blockquote><p>quotedmarker quote text</p></blockquote><p>victim name sensitivemarker here</p><p>person@example.invalid contactmarker public details</p><script>scriptmarker raw text</script><p>closingmarker additional financial chronology</p></main></body></html>''');p.close();p.flush()
  terms={t for b in p.blocks for t in b}
  self.assertIn('visiblemarker',terms);self.assertIn('closingmarker',terms)
  for t in ['headmarker','outsidemarker','hiddenmarker','ariamarker','stylemarker','navmarker','quotedmarker','sensitivemarker','contactmarker','scriptmarker']:self.assertNotIn(t,terms)
  self.assertEqual(p.excluded,2);self.assertEqual(p.main_count,1)
if __name__=='__main__':unittest.main()
