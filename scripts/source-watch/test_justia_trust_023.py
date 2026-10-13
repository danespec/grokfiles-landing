#!/usr/bin/env python3
"""Offline Justia trust-bundle scoping and fail-closed checks."""
import importlib.util
import os
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest import TestCase, main
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("gah_trust_watch", HERE / "watch.py")
watch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(watch)

class TrustTests(TestCase):
    def make_bundle(self, parent):
        p = Path(parent) / "mozilla.pem"
        p.write_bytes(b"## Bundle of CA Root Certificates\n" + b"x" * 15000)
        p.chmod(0o600)
        return p

    def test_default_tls_verification_unchanged(self):
        with patch.dict(os.environ, {watch.JUSTIA_CA_ENV:""}, clear=False):
            self.assertEqual(watch.curl_justia_ca(watch.JUSTIA_DOCKET_URL), [])
            self.assertEqual(watch.curl_justia_ca("https://vault.fbi.gov/"), [])

    def test_exact_url_only_and_safe_owner_bundle(self):
        with TemporaryDirectory() as td:
            p = self.make_bundle(td)
            with patch.dict(os.environ,{watch.JUSTIA_CA_ENV:str(p)}):
                self.assertEqual(watch.curl_justia_ca(watch.JUSTIA_DOCKET_URL), ["--cacert",str(p)])
                self.assertEqual(watch.curl_justia_ca("https://www.justice.gov/epstein/doj-disclosures"),[])
                self.assertEqual(watch.curl_justia_ca(watch.JUSTIA_DOCKET_URL+"?x=y"),[])

    def test_bad_ca_symlinks_and_permissions_fail_closed(self):
        with TemporaryDirectory() as td:
            p = self.make_bundle(td)
            alias = Path(td)/"alias.pem"
            alias.symlink_to(p)
            for value in (str(alias),str(Path(td)/"missing"),"relative.pem"):
                with patch.dict(os.environ,{watch.JUSTIA_CA_ENV:value}):
                    with self.assertRaisesRegex(RuntimeError,"justia_ca_bundle_invalid"):
                        watch.curl_justia_ca(watch.JUSTIA_DOCKET_URL)
            p.chmod(0o644)
            with patch.dict(os.environ,{watch.JUSTIA_CA_ENV:str(p)}):
                with self.assertRaisesRegex(RuntimeError,"justia_ca_bundle_unsafe"):
                    watch.curl_justia_ca(watch.JUSTIA_DOCKET_URL)

    def test_http_403_stays_unavailable_not_silent_success(self):
        with TemporaryDirectory() as td:
            p = self.make_bundle(td)
            url=watch.JUSTIA_DOCKET_URL
            sample=b"forbidden\n__GAH_FETCH__403 "+url.encode()
            with patch.dict(os.environ,{watch.JUSTIA_CA_ENV:str(p)}):
                with patch.object(watch.subprocess,"run",return_value=SimpleNamespace(stdout=sample,returncode=0)) as fake:
                    with self.assertRaisesRegex(RuntimeError,"source_unavailable_http_403"):
                        watch.fetch(url)
                argv=fake.call_args.args[0]
                self.assertEqual(argv[argv.index("--cacert")+1],str(p))
                self.assertNotIn("--insecure",argv)
                self.assertNotIn("-k",argv)
                self.assertEqual(argv[-1],url)

if __name__=="__main__":
    main(verbosity=2)
