"""Offline tests: exact docket, source 403/429, baseline watermark, no judicial-order inference."""
import copy
import importlib.util
import json
import sys
import unittest
from pathlib import Path
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
spec=importlib.util.spec_from_file_location("gah_recap_watch",HERE/"watch.py")
watch=importlib.util.module_from_spec(spec)
spec.loader.exec_module(watch)
SRC={"id":"phang-courtlistener","mode":"recap_v4_search","docket_id":73246595,
 "url":"https://www.courtlistener.com/api/rest/v4/search/?type=rd&q=docket_id%3A73246595&order_by=entry_date_filed+desc"}
def doc(n=58,a=None,docket=73246595,date="2026-10-13",description="",url=None):
    part=f"/{a}" if a is not None else ""
    return {"id":497142989+(a or 0),"docket_id":docket,"document_number":n,"attachment_number":a,
            "entry_date_filed":date, "description":description,
            "absolute_url":url if url is not None else f"/docket/{docket}/{n}{part}/phang-v-blanche/"}
def payload(*items):
    return json.dumps({"count":151,"results":list(items),"next":"https://www.courtlistener.com/api/rest/v4/search/?cursor=next"}).encode()
BASE=payload(doc(),doc(a=1),doc(n=57,date="2026-10-09",description="ORDER about in-camera review"))
class RecapV4Tests(unittest.TestCase):
    def test_case_and_attachment_stay_distinct(self):
        v=watch.parse_recap_v4_search(SRC,BASE)
        self.assertEqual(len(v["links"]),3)
        self.assertEqual(v["mode"],"recap_v4_search")
        self.assertTrue(v["truncated"])
        self.assertEqual(v["result_count"],151)
        self.assertIn("Filing ECF 58",v["links"]["https://www.courtlistener.com/docket/73246595/58/phang-v-blanche/"])
        self.assertIn("Attachment 1 to ECF 58",v["links"]["https://www.courtlistener.com/docket/73246595/58/1/phang-v-blanche/"])
        self.assertNotIn("granted",str(v).lower())
    def test_cross_court_docket_number_cannot_join(self):
        with self.assertRaisesRegex(RuntimeError,"foreign_docket"):
            watch.parse_recap_v4_search(SRC,payload(doc(docket=9999)))
    def test_mixed_dockets_fail_closed(self):
        with self.assertRaisesRegex(RuntimeError,"foreign_docket"):
            watch.parse_recap_v4_search(SRC,payload(doc(),doc(docket=9999)))
    def test_unsafe_or_mismatched_url_fails_closed(self):
        for u in ["https://evil.example/docket/73246595/58/","/docket/73246595/59/phang-v-blanche/",
                  "/docket/73246595/58/2/phang-v-blanche/", "/docket/73246595/58/1/phang-v-blanche/"]:
            with self.subTest(url=u), self.assertRaisesRegex(RuntimeError,"invalid_document_link"):
                watch.parse_recap_v4_search(SRC,payload(doc(url=u)))
    def test_broken_schema_rejected_not_zero_filings(self):
        for raw in [b"<html>Blocked</html>",b"{}",b'{"results":[],"count":0}',
                    b'{"results":"garbage","count":9}', payload(doc(n=None))]:
            with self.subTest(raw=raw[:70]), self.assertRaises(RuntimeError):
                watch.parse_recap_v4_search(SRC,raw)
    def test_unknown_unnumbered_docket_events_ignored(self):
        unnumbered=doc(n=None); unnumbered["absolute_url"]=""
        v=watch.parse_recap_v4_search(SRC,payload(unnumbered,doc()))
        self.assertEqual(len(v["links"]),1)
    def test_first_watermark_silent_58_not_realerted(self):
        previous={}
        report,history=watch.build_report({"sources":[SRC],"coverage_gaps":[]},previous,transport=lambda _:BASE)
        self.assertEqual(report["baseline_count"],1)
        self.assertEqual(report["review_events"],[])
        self.assertIn("phang-courtlistener",history)
        again,_=watch.build_report({"sources":[SRC],"coverage_gaps":[]},history,transport=lambda _:BASE)
        self.assertEqual(again["review_events"],[])
    def test_new_59_alerts_parent_only(self):
        old=watch.parse_recap_v4_search(SRC,BASE)
        newer=watch.parse_recap_v4_search(SRC,payload(doc(n=59,date="2026-10-14"),doc(),doc(a=1)))
        events,_=watch.compare(old,newer,SRC["id"])
        self.assertEqual(len(events),1)
        self.assertIn("/59/",events[0]["url"])
        self.assertTrue(events[0]["review_required"])
        self.assertNotIn("ruling",events[0]["kind"])
    def test_window_rollout_is_not_deletion(self):
        old=watch.parse_recap_v4_search(SRC,BASE)
        new=watch.parse_recap_v4_search(SRC,payload(doc(),doc(a=1)))
        ev,_=watch.compare(old,new,SRC["id"])
        self.assertEqual(ev,[])
        report,h=watch.build_report({"sources":[SRC],"coverage_gaps":[]},
            {SRC["id"]:{"mode":old["mode"],"links":old["links"],"digest":old["digest"]}},
            transport=lambda _:payload(doc(),doc(a=1)))
        self.assertEqual(len(h[SRC["id"]]["links"]),3)
    def test_error_preserves_prior_baseline(self):
        old=watch.parse_recap_v4_search(SRC,BASE)
        state={SRC["id"]:{"mode":old["mode"],"links":old["links"],"digest":old["digest"],"last_success":"2026-10-13T00:00:00Z"}}
        for code in (403,429,500):
            def failed(_):raise RuntimeError("source_unavailable_http_"+str(code))
            report,next_state=watch.build_report({"sources":[SRC],"coverage_gaps":[]},state,transport=failed)
            self.assertEqual(next_state,state)
            self.assertEqual(report["unavailable"][SRC["id"]],"source_unavailable_http_"+str(code))
            self.assertEqual(report["review_events"],[])
    def test_catalog_is_exact_endpoint_and_no_docket_detail_access(self):
        cat=json.loads((HERE/"sources.json").read_text())
        entries=[s for s in cat["sources"] if s["id"]==SRC["id"]]
        self.assertEqual(len(entries),1)
        self.assertEqual(entries[0]["mode"],"recap_v4_search")
        self.assertEqual(entries[0]["docket_id"],73246595)
        self.assertIn("/api/rest/v4/search/",entries[0]["url"])
        self.assertNotIn("/api/rest/v3/",entries[0]["url"])
        self.assertNotIn("/dockets/",entries[0]["url"])
        self.assertEqual(len(cat["sources"]),42)
if __name__=="__main__":
    unittest.main()
