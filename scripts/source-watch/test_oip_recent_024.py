#!/usr/bin/env python3
"""Offline regression for targeted DOJ OIP FOIA index and two independent PDFs."""
import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace
from unittest import TestCase, main
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("gah_oip_index_024",ROOT/"watch.py")
watch=importlib.util.module_from_spec(spec)
spec.loader.exec_module(watch)

OLD="https://www.justice.gov/oip/media/1465356/dl?inline"
COMMS="https://www.justice.gov/oip/media/1462251/dl?inline"
NEW="https://www.justice.gov/oip/media/9999999/dl?inline"

def html(release_links=True,new=False,foreign=False):
    if not release_links:
        release="<div>Page is being updated</div>"
    else:
        release=('<p><strong>Review of Investigative Holdings Relating to Jeffrey Epstein'
                 ' [Posted October 9, 2026]</strong></p><ul>'
                 '<li><a href="/oip/media/1465356/dl?inline">Interim</a></li></ul>'
                 '<p><strong>Communications about Epstein memorandum '
                 '[Posted September 23, 2026]</strong></p><ul>'
                 '<li><a href="/oip/media/1462251/dl?inline">Final response</a></li>'
                 + ('<li><a href="/oip/media/9999999/dl?inline">New part</a></li>' if new else "")
                 + ('<li><a href="https://outside.example/foo.pdf">External</a></li>' if foreign else "")
                 + '</ul>'
                 '<p><strong>Unrelated political records</strong></p><ul>'
                 '<li><a href="/oip/media/1111111/dl?inline">Unrelated</a></li></ul>')
    return ('<html><h2><a id="recent"></a>Recent Releases</h2>'+release+
            '<h2><a id="processed"></a>FOIA-Processed Documents</h2>'
            '<p><strong>Historical Epstein</strong></p><ul>'
            '<li><a href="/oip/media/2222222/dl?inline">Historical</a></li></ul>'
            '</html>').encode()

class OIPIndexTests(TestCase):
    def setUp(self):
        self.catalog=json.loads((ROOT/"sources.json").read_text())
        self.byid={s["id"]:s for s in self.catalog["sources"]}

    def test_new_sources_exact_and_different_record_types(self):
        self.assertEqual(len(self.catalog["sources"]),42)
        self.assertEqual(self.byid["doj-oip-epstein-recent-index"]["mode"],"oip_recent_epstein")
        self.assertEqual(self.byid["doj-oip-epstein-recent-index"]["url"],watch.OIP_FOIA_INDEX_URL)
        self.assertEqual(self.byid["doj-oip-axios-memo-comms-20260923"]["url"],"https://www.justice.gov/oip/media/1462251/dl?inline=")
        self.assertEqual(self.byid["doj-opa-epstein-memo-20250707"]["url"],"https://www.justice.gov/opa/media/1407001/dl?inline")
        self.assertTrue(all(self.byid[k]["mode"]=="official_pdf" for k in ("doj-opa-epstein-memo-20250707","doj-oip-axios-memo-comms-20260923")))
        self.assertTrue(any("three different official record sets" in s for s in self.catalog["coverage_gaps"]))

    def test_recent_only_not_historical_other_topics_or_external(self):
        result=watch.oip_epstein_recent_links(html(foreign=True),watch.OIP_FOIA_INDEX_URL)
        self.assertEqual(result["mode"],"links")
        self.assertEqual(set(result["links"]),{OLD,COMMS})
        self.assertTrue(all("Epstein" in t for t in result["links"].values()))
        self.assertFalse(any("outside" in x for x in result["links"]))

    def test_new_source_link_only_review_requires_human(self):
        prev=watch.oip_epstein_recent_links(html(),watch.OIP_FOIA_INDEX_URL)
        current=watch.oip_epstein_recent_links(html(new=True),watch.OIP_FOIA_INDEX_URL)
        events,_=watch.compare(prev,current,"doj-oip-epstein-recent-index")
        self.assertEqual(len(events),1)
        self.assertEqual(events[0]["kind"],"new_source_link")
        self.assertEqual(events[0]["url"],NEW)
        self.assertTrue(events[0]["review_required"])

    def test_absent_entry_is_not_verified_deletion(self):
        prev=watch.oip_epstein_recent_links(html(),watch.OIP_FOIA_INDEX_URL)
        now=watch.oip_epstein_recent_links(html().replace(b'<li><a href="/oip/media/1462251/dl?inline">Final response</a></li>',b''),watch.OIP_FOIA_INDEX_URL)
        events,_=watch.compare(prev,now,"doj-oip-epstein-recent-index")
        self.assertEqual(len(events),1)
        self.assertEqual(events[0]["kind"],"link_absent_from_current_index")
        self.assertIn("NOT verified deletion",events[0]["note"])

    def test_empty_recent_html_fails_closed(self):
        for page in (html(release_links=False),b"<html>403 Forbidden</html>",
                     html().replace(b"FOIA-Processed Documents",b"Other heading")):
            with self.assertRaisesRegex(RuntimeError,"oip_"):
                watch.oip_epstein_recent_links(page,watch.OIP_FOIA_INDEX_URL)

    def test_cannot_reassign_to_other_host(self):
        with self.assertRaisesRegex(ValueError,"url_mismatch"):
            watch.oip_epstein_recent_links(html(),"https://www.courtlistener.com/")

    def test_observer_uses_same_gated_parser_and_unmodified_global_size_limit(self):
        source=self.byid["doj-oip-epstein-recent-index"]
        r=watch.observe(source,lambda url:html())
        self.assertEqual(set(r["links"]),{OLD,COMMS})
        self.assertEqual(watch.DEFAULT_FETCH_MAX_BYTES,3500000)
        for id in ("doj-oip-axios-memo-comms-20260923","doj-opa-epstein-memo-20250707"):
            u=self.byid[id]["url"]
            fake=b"%PDF-1.7\n"+b"z"*800+b"%%EOF"
            resp=fake+b"\n__GAH_FETCH__200 "+u.encode()
            with patch.object(watch.subprocess,"run",return_value=SimpleNamespace(stdout=resp,returncode=0)) as proc:
                self.assertEqual(watch.fetch(u),fake)
            args=proc.call_args.args[0]
            self.assertEqual(args[args.index("--max-filesize")+1],"3500000")
            self.assertNotIn("--insecure",args)
            self.assertEqual(args[-1],u)

if __name__=="__main__":
    main(verbosity=2)
