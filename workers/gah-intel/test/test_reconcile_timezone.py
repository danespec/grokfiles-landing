import datetime as dt
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('reconcile', Path(__file__).parents[1] / 'scripts/reconcile.py')
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)

class ReportingCalendarTests(unittest.TestCase):
    def collect(self, reporting, actual, now, rows=None):
        config = {'reporting_timezone': reporting, 'primary_site_tag': 'primary', 'legacy_site_tag': 'legacy'}
        report = {'metadata': {'timeZone': actual}, 'rows': [], 'aggregate': {'rows': []}}
        with patch.object(r, 'web', side_effect=[rows or [], []]) as web, patch.object(r, 'raw_day', return_value=[]) as raw, patch.object(r, 'ga4', return_value=report) as ga, patch.object(r, 'health', return_value=[]):
            result = r.collect(config, 'test-token', now)
        return result, web, raw, ga

    def test_pacific_dates_and_hour_buckets_align(self):
        row = {'count': 7, 'dimensions': {'datetimeHour': '2026-11-07T07:00:00Z', 'requestHost': 'grokarchivehub.com', 'bot': 0, 'countryName': 'US', 'requestPath': '/', 'refererHost': ''}}
        result, web, raw, ga = self.collect('America/Los_Angeles', 'America/Los_Angeles', dt.datetime(2026, 11, 13, 16, tzinfo=r.UTC), [row])
        self.assertEqual((result['since'], result['until']), ('2026-11-06T08:00:00Z', '2026-11-13T08:00:00Z'))
        self.assertEqual(result['daily'][0]['cloudflare'], 7)
        self.assertTrue(all(d['comparable'] for d in result['daily']))
        self.assertEqual(ga.call_args.args[1:], ('2026-11-06', '2026-11-12'))
        self.assertEqual(web.call_args_list[0].args[2:4], (result['since'], result['until']))

    def test_dst_end_includes_the_extra_hour(self):
        result, web, raw, ga = self.collect('America/Los_Angeles', 'America/Los_Angeles', dt.datetime(2026, 11, 3, 20, tzinfo=r.UTC))
        self.assertEqual((result['since'], result['until']), ('2026-10-27T07:00:00Z', '2026-11-03T08:00:00Z'))
        self.assertEqual(raw.call_args_list[5].args[2:4], ('2026-11-01T07:00:00Z', '2026-11-02T08:00:00Z'))

    def test_timezone_mismatch_withholds_differences(self):
        result, *_ = self.collect('UTC', 'America/Los_Angeles', dt.datetime(2026, 11, 13, 16, tzinfo=r.UTC))
        self.assertFalse(any(d['comparable'] for d in result['daily']))

    def test_fractional_hour_timezone_withholds_differences(self):
        result, *_ = self.collect('Asia/Kolkata', 'Asia/Kolkata', dt.datetime(2026, 11, 13, 16, tzinfo=r.UTC))
        self.assertFalse(any(d['comparable'] for d in result['daily']))

if __name__ == '__main__':
    unittest.main()
