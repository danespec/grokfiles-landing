#!/usr/bin/env python3
"""Analytics release guard. Source checks are offline; --live reads public HTML/JS only."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
from urllib.parse import urljoin

ROOT = Path(__file__).resolve().parents[1]
ID = "G-XHE84C8D1V"
SOURCE = (ROOT / "frontdoor/analytics.js").read_bytes()
WORKER = (ROOT / "_worker.js").read_text()
WIKI = (ROOT / "workers/wiki-analytics/gateway-analytics.mjs").read_text()

def verify_source():
    assert b"https://www.googletagmanager.com/gtag/js?id=" in SOURCE, "GA4 must use supported direct loader"
    assert b"googletagmanager.com/gtm.js" not in SOURCE, "GTM loader is not the GA4 measurement loader"
    assert b"window['ga-disable-' + id]" in SOURCE, "consent gate missing"
    assert b"analytics_storage === 'granted'" in SOURCE, "consent gate missing"
    assert ID in WORKER and ID in WIKI, "measurement ID drift"
    versions = [re.findall(r"analytics\.js\?v=(GAH-ANALYTICS-[A-Z0-9-]+)", s) for s in (WORKER, WIKI)]
    assert len(set(versions[0])) == 1 and len(set(versions[1])) == 1 and versions[0][0] == versions[1][0], f"asset version drift: {versions}"
    print("PASS source: one direct GA4 loader, common stream/version, consent guard")

def fetch(url):
    return subprocess.check_output(["curl", "--fail", "--silent", "--show-error", "--location", "--max-time", "20", "--user-agent", "GAH Analytics-Audit/1.0", url])

def verify_live():
    for url in ("https://grokarchivehub.com/", "https://grokarchivehub.com/search", "https://wiki.grokarchivehub.com/"):
        html = fetch(url).decode()
        boot = re.findall(r"window\.GAH_CONSENT_BOOT\s*=\s*(\{[^;]+\});", html)
        assert len(boot) == 1, f"{url}: missing or duplicate bootstrap"
        cfg = json.loads(boot[0])
        assert cfg.get("ga4MeasurementId") == ID and cfg.get("googleTagEnabled") is True, f"{url}: wrong or disabled GA4 destination"
        scripts = re.findall(r'<script\b[^>]*\bsrc=["\']([^"\']+)["\']', html, re.I)
        loaders = [s for s in scripts if re.match(r"/(?:frontdoor|__gah-analytics)/analytics\.js(?:\?|$)", s)]
        assert len(loaders) == 1, f"{url}: missing or duplicate GAH analytics runtime"
        assert not any(re.search(r"googletagmanager\.com/(?:gtm\.js|gtag/js)|/zrth/|/cdn-cgi/zaraz/", s, re.I) for s in scripts), f"{url}: competing injected tag"
        data = fetch(urljoin(url, loaders[0]))
        assert data == SOURCE, f"{url}: stale live analytics bytes (sha256 {hashlib.sha256(data).hexdigest()})"
        print(f"PASS {url}: {hashlib.sha256(data).hexdigest()}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--live", action="store_true", help="Verify exact published asset on both hosts without executing scripts")
    args = parser.parse_args()
    verify_source()
    if args.live:
        verify_live()
