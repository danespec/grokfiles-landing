#!/usr/bin/env python3
"""Offline test of the narrow first-party 5MB OIP PDF exception."""
import importlib.util
import json
from pathlib import Path
from unittest import TestCase, main
from unittest.mock import patch
from types import SimpleNamespace

ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("oip_watch",ROOT/"watch.py")
watch=importlib.util.module_from_spec(spec)
spec.loader.exec_module(watch)

class OIPWatchTests(TestCase):
    def setUp(self):
        self.cat=json.loads((ROOT/"sources.json").read_text())
        self.entries=[s for s in self.cat["sources"] if s["id"]=="doj-oip-investigative-holdings-20261009"]

    def test_exact_single_government_source_and_incomplete_coverage(self):
        self.assertEqual(len(self.entries),1)
        s=self.entries[0]
        self.assertEqual(s["mode"],"official_pdf")
        self.assertEqual(s["url"],watch.OIP_REVIEW_INTERIM_URL)
        self.assertTrue(watch.safe_url(s["url"]))
        self.assertEqual(watch.DEFAULT_FETCH_MAX_BYTES,3_500_000)
        self.assertEqual(watch.OIP_REVIEW_INTERIM_MAX_BYTES,5_000_000)
        self.assertTrue(any("NOT FBI Vault" in g for g in self.cat["coverage_gaps"]))

    def check_limit(self,url,expected):
        raw=b"%PDF-1.7 "+b"x"*850
        output=raw+b"\n__GAH_FETCH__200 "+url.encode()
        with patch.object(watch.subprocess,"run",return_value=SimpleNamespace(stdout=output,returncode=0)) as runner:
            self.assertEqual(watch.fetch(url),raw)
        args=runner.call_args.args[0]
        self.assertEqual(args[args.index("--max-filesize")+1],str(expected))
        self.assertIn("--proto-redir",args)
        self.assertIn("=https",args)
        self.assertEqual(args[-1],url)

    def test_exact_exception_no_hostwide_bypass(self):
        self.check_limit(watch.OIP_REVIEW_INTERIM_URL,5_000_000)
        self.check_limit("https://www.justice.gov/oip/available-documents-oip",3_500_000)
        self.check_limit(watch.OIP_REVIEW_INTERIM_URL+"1",3_500_000)
        self.check_limit("https://www.justice.gov/oip/media/1465357/dl?inline=",3_500_000)

    def test_oversize_fails_closed_and_retains_private_baseline(self):
        url=watch.OIP_REVIEW_INTERIM_URL
        huge=b"%PDF-"+b"x"*5_000_000
        output=huge+b"\n__GAH_FETCH__200 "+url.encode()
        with patch.object(watch.subprocess,"run",return_value=SimpleNamespace(stdout=output,returncode=0)):
            with self.assertRaisesRegex(RuntimeError,"source_empty_or_oversized"):
                watch.fetch(url)

    def test_pdf_digest_only_no_body_in_snapshot(self):
        raw=b"%PDF-1.7 "+b"x"*900
        observed=watch.observe(self.entries[0],lambda url:raw)
        self.assertEqual(observed["size_bytes"],len(raw))
        self.assertEqual(observed["digest"],watch.digest(raw))
        self.assertNotIn("raw",observed)
        self.assertNotIn("body",observed)
        self.assertEqual(watch.compare(None,observed,self.entries[0]["id"])[0],[])

if __name__=="__main__":
    main(verbosity=2)
