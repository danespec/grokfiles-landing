import pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'scripts'))
from verify_archive_sources_014 import approved_url
class SourceURL(unittest.TestCase):
 def test_public_https(self):
  for url in ['https://www.justice.gov/a.pdf','https://media-cdn.rollcall.com/a.pdf','https://storage.courtlistener.com/a.pdf']:self.assertTrue(approved_url(url))
 def test_network_boundaries(self):
  for url in ['http://www.justice.gov/a.pdf','https://www.justice.gov:8080/a.pdf','https://www.justice.gov@127.0.0.1/a.pdf','https://evil.invalid/a.pdf','https://www.justice.gov/a.pdf#private','https://www.justice.gov:bad/a']:self.assertFalse(approved_url(url))
if __name__=='__main__':unittest.main()
