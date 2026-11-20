#!/usr/bin/env python3
"""Read-only inventory and live SEO audit for the two GAH hosts."""
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[2]
APEX = "https://grokarchivehub.com"
WIKI = "https://wiki.grokarchivehub.com"
SITEMAPS = (APEX + "/sitemap.xml", APEX + "/sitemap-efta.xml", WIKI + "/sitemap.xml")


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonicals = []
        self.robots = []
        self.links = set()

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        href = attributes.get("href")
        if tag == "a" and href:
            self.links.add(href)
        if tag == "link" and href and "canonical" in (attributes.get("rel") or "").lower().split():
            self.canonicals.append(href)
        if tag == "meta" and (attributes.get("name") or "").lower() in {"robots", "googlebot"}:
            self.robots.append(attributes.get("content") or "")


def fetch(url):
    with urlopen(Request(url, headers={"User-Agent": "GAH-SEO-Audit"}), timeout=20) as response:
        return response.geturl(), response.status, response.headers, response.read().decode("utf-8", errors="replace")


def inspect(url):
    started = time.monotonic()
    try:
        final, status, headers, body = fetch(url)
        page = Page()
        page.feed(body)
        robots = page.robots + (headers.get_all("X-Robots-Tag") or [])
        return {"url": url, "final": final, "status": status,
                "canonical": page.canonicals, "noindex": any("noindex" in value.lower() for value in robots),
                "elapsed_ms": round((time.monotonic() - started) * 1000),
                "links": sorted({urljoin(final, href).split("#", 1)[0] for href in page.links})}
    except (HTTPError, URLError, TimeoutError) as error:
        return {"url": url, "status": getattr(error, "code", None), "error": str(error)}


def main():
    listed = {}
    for sitemap in SITEMAPS:
        _, _, _, content = fetch(sitemap)
        listed[sitemap] = [node.text for node in ElementTree.fromstring(content).findall(".//{*}loc")]
    counts = Counter(url for urls in listed.values() for url in urls)
    urls = {url for url in counts if urlsplit(url).scheme == "https"
            and urlsplit(url).netloc in {"grokarchivehub.com", "wiki.grokarchivehub.com"}}
    inventory = sorted(path.stem for path in (ROOT / "archive").glob("EFTA*.html")
                       if re.fullmatch(r"EFTA\d{8}", path.stem))
    with ThreadPoolExecutor(max_workers=6) as executor:
        pages = list(executor.map(inspect, sorted(urls)))
    inbound = Counter(link for page in pages for link in page.pop("links", [])
                      if link != page["url"] and link in urls)
    for page in pages:
        page["sitemap_inbound_links"] = inbound[page["url"]]
    print(json.dumps({"sitemap_counts": {url: len(rows) for url, rows in listed.items()},
                      "duplicate_sitemap_urls": sorted(url for url, count in counts.items() if count > 1),
                      "archive_inventory": inventory,
                      "archive_files_outside_sitemap": [item for item in inventory
                          if APEX + "/archive/" + item not in listed[SITEMAPS[1]]],
                      "entity_files": sorted(str(path.relative_to(ROOT)) for path in (ROOT / "entities").glob("*.html")),
                      "pages": pages}, indent=2))


if __name__ == "__main__":
    main()
