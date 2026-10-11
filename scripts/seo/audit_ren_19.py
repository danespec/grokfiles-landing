#!/usr/bin/env python3
"""Recheck Ren's nineteen keyword-intent mappings against the public GAH site.

This audits PUBLISHED pages and their HTML signals. It does NOT claim search
rank, Google index inclusion, query volume, conversion, or source completeness.
The original literal mailbox phrase (rank 17) is stored only in a private,
mode-0600 source snapshot, not copied to public Git or web pages.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
import datetime as dt
from html import unescape
from pathlib import Path
import json
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from urllib.parse import urlsplit

BASE="https://grokarchivehub.com"
ROOT=Path(__file__).resolve().parents[2]
COVERAGE=ROOT/"docs/ren-19-coverage-20261011.json"

def curl(path):
    if path.startswith("/"):
        url=BASE+path
    else:
        raise ValueError("Unexpected external fetch destination")
    args=["/usr/bin/curl","-sS","--location","--max-time","20",
          "--proto","=https","--proto-redir","=https","-w","\nGAH_AUDIT_CODE:%{http_code}",url]
    r=subprocess.run(args,capture_output=True,text=True,timeout=27)
    if r.returncode or "GAH_AUDIT_CODE:" not in r.stdout:
        return {"http":0,"error":"fetch_failed","body":""}
    html,code=r.stdout.rsplit("GAH_AUDIT_CODE:",1)
    try:status=int(code.strip())
    except ValueError:status=0
    return {"http":status,"body":html}

def extract_html(page):
    def text(pattern):
        m=re.search(pattern,page,re.I|re.S)
        return re.sub(r"\s+"," ",re.sub(r"<[^>]+>"," ",unescape(m.group(1)))).strip() if m else ""
    canonical=""
    for tag in re.findall(r"<link\b[^>]*>",page,re.I):
        if re.search(r"\brel\s*=\s*['\"]canonical['\"]",tag,re.I):
            match=re.search(r"\bhref\s*=\s*['\"]([^'\"]+)",tag,re.I)
            if match:canonical=unescape(match.group(1))
            break
    robots=""
    r=re.search(r'<meta\s+name\s*=\s*["\']robots["\'][^>]*content\s*=\s*["\']([^"\']+)',page,re.I)
    if r:robots=r.group(1)
    return {
        "title":text(r"<title\b[^>]*>(.*?)</title>"),
        "h1":text(r"<h1\b[^>]*>(.*?)</h1>"),
        "canonical":canonical,
        "robots_meta":robots,
        "jsonld_blocks":len(re.findall(r'<script\b[^>]*type\s*=\s*["\']application/ld\+json["\']',page,re.I)),
        "official_doj_links":len(re.findall(r'href\s*=\s*["\']https://www\.justice\.gov/epstein',page,re.I))
    }

def main():
    a=argparse.ArgumentParser()
    a.add_argument("--output",default=str(ROOT/"docs/ren-19-live-audit-20261011.json"))
    args=a.parse_args()
    spec=json.loads(COVERAGE.read_text())
    assert spec["schema"]=="gah.ren_seo_19_coverage.v1"
    assert [k["rank"] for k in spec["items"]]==list(range(1,20))
    paths=sorted(set(path for item in spec["items"] for path in item["routes"]))
    assert all(p.startswith("/") and ".." not in p for p in paths)
    sitemap=curl("/sitemap.xml")
    if sitemap["http"]!=200:raise RuntimeError("sitemap_http_non200")
    root=ET.fromstring(sitemap["body"])
    locs={x.text for x in root.iter() if x.tag.endswith("loc") and x.text}
    def check(route):
        r=curl(route)
        meta=extract_html(r["body"])
        return route,{"http":r["http"],"sitemap":BASE+route in locs,
                      "self_canonical":meta["canonical"]==BASE+route,
                      **meta}
    with ThreadPoolExecutor(max_workers=7) as workers:
        routes=dict(workers.map(check,paths))
    unexpected=[
        route for route,item in routes.items()
        if item["http"]!=200 or not item["sitemap"] or not item["self_canonical"]
        or not item["title"] or not item["h1"] or "noindex" in item["robots_meta"].lower()
    ]
    report={
      "schema":"gah.ren_seo_19_live_audit.v1",
      "checked_at_utc":dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
      "source":"Ren’s 2026-10-11 Epstein Keyword Strategy.html (19 exact rows; rank 17 mailbox redacted in public matrix)",
      "status":"public_route_metadata_only",
      "google_indexed":None,
      "search_rankings":None,
      "keyword_volumes":None,
      "total_keywords":len(spec["items"]),
      "counts":{status:sum(x["status"]==status for x in spec["items"]) for status in ("strong","partial","gap")},
      "sitemap_http":sitemap["http"],
      "sitemap_urls":len(locs),
      "mapped_routes":len(paths),
      "mapped_routes_all_pass":not unexpected,
      "unexpected_route_results":unexpected,
      "routes":routes
    }
    Path(args.output).write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
    print(json.dumps({k:v for k,v in report.items() if k!="routes"},ensure_ascii=False,indent=2))
    return 0 if not unexpected else 2

if __name__=="__main__":sys.exit(main())
