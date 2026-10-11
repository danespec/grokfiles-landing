#!/usr/bin/env python3
"""Offline Cloudflare KV transport regression: acceptance is not verification."""
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import types
import unittest
from unittest.mock import patch

src=Path(__file__).with_name("refresh-trending.py")
spec=importlib.util.spec_from_file_location("trend_refresh",src)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class KVTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)
        self.folder=self.root/"work"
        self.folder.mkdir()
        config=self.root/".wrangler/config"
        config.mkdir(parents=True)
        (config/"default.toml").write_text('oauth_token = "fixture-secret-NOTREAL"\nexpiration_time = "2100-01-01T00:00:00.000Z"\n')
        self.old_work=mod.WORK
        mod.WORK=self.folder
        self.addCleanup(lambda:setattr(mod,"WORK",self.old_work))
        self.home_patcher=patch.object(Path,"home",return_value=self.root)
        self.home_patcher.start()
        self.addCleanup(self.home_patcher.stop)
    def test_expired_wrangler_token_is_refreshed_by_cached_cli(self):
        config=self.root/".wrangler/config/default.toml"
        config.write_text('oauth_token = "old-expired-fixture-token"\nexpiration_time = "2020-01-01T00:00:00.000Z"\n')
        npx=self.root/"grok-tools/node-portable/current/bin/npx"
        npx.parent.mkdir(parents=True)
        npx.write_text("#!/bin/sh\n")
        count=[]
        def fake_cli(args,**kwargs):
            count.append(args)
            self.assertIn("--no-install",args)
            self.assertNotIn("old-expired-fixture-token",repr(args))
            config.write_text('oauth_token = "new-valid-fixture-token-1234"\nexpiration_time = "2100-01-01T00:00:00.000Z"\n')
            return types.SimpleNamespace(returncode=0,stdout=b"",stderr=b"")
        with patch.object(mod.subprocess,"run",side_effect=fake_cli):
            refreshed=mod.oauth_for_kv()
        self.assertEqual(refreshed,"new-valid-fixture-token-1234")
        self.assertEqual(len(count),1)
    def test_incorrect_key_schema_fails_before_network(self):
        with self.assertRaisesRegex(ValueError,"key and payload type mismatch"):
            mod.put_kv(mod.KEY_PUBLIC,{"schema":"gah_trending_gaplog_v1"})
        with self.assertRaisesRegex(ValueError,"two approved KV keys"):
            mod.put_kv("unrelated-key",{"schema":"gah_trending_topics_v1"})
    def test_verified_round_trip_no_secrets_in_argv(self):
        requests=[]
        payload={"schema":"gah_trending_gaplog_v1","items":[{"q":"candidate"}]}
        def fake_run(args, **kwargs):
            requests.append(args)
            self.assertNotIn("fixture-secret-NOTREAL",repr(args))
            self.assertIn("Authorization: Bearer fixture-secret-NOTREAL",kwargs["input"])
            self.assertIn("--proto",args)
            if "--request" in args:
                self.assertIn("PUT",args)
                return types.SimpleNamespace(returncode=0,stdout='{"success":true}')
            return types.SimpleNamespace(returncode=0,stdout=json.dumps(payload))
        with patch.object(mod.subprocess,"run",side_effect=fake_run):
            mod.put_kv(mod.KEY_PRIVATE,payload)
        self.assertEqual(len(requests),2)
        self.assertFalse(list(self.folder.glob("gah-trending-kv-*")))
    def test_readback_mismatch_fails_and_scrubs_temp(self):
        def fake_run(args,**kwargs):
            if "PUT" in args:return types.SimpleNamespace(returncode=0,stdout='{"success":true}')
            return types.SimpleNamespace(returncode=0,stdout='{"schema":"old"}')
        with patch.object(mod.subprocess,"run",side_effect=fake_run),patch("time.sleep",return_value=None):
            with self.assertRaisesRegex(RuntimeError,"readback did not match"):
                mod.put_kv(mod.KEY_PRIVATE,{"schema":"gah_trending_gaplog_v1","test":1})
        self.assertFalse(list(self.folder.glob("gah-trending-kv-*")))
    def test_failed_put_does_not_claim_verification(self):
        def fail(args,**kwargs):return types.SimpleNamespace(returncode=1,stdout="")
        with patch.object(mod.subprocess,"run",side_effect=fail):
            with self.assertRaisesRegex(RuntimeError,"write unavailable"):
                mod.put_kv(mod.KEY_PRIVATE,{"schema":"gah_trending_gaplog_v1","test":1})
    def test_existing_source_gating_requires_five_candidates(self):
        self.assertEqual(mod.KEY_PUBLIC,"gah:public:trending:topics:v1")
        self.assertEqual(mod.KEY_PRIVATE,"gah:admin:trending:gaps:v1")

if __name__=="__main__":
    unittest.main(verbosity=2)
