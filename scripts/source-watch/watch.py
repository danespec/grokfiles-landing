#!/usr/bin/env python3
"""GAH-SIGNALS-004: read-only, fail-closed public-source change ledger.

No publishing, checkout, identity inference, removal accusation, or public data writes.
A successful page fetch can prove what was *observed*, never what was never released.
"""
import argparse
import concurrent.futures
import datetime as dt
import fcntl
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse

HERE = Path(__file__).resolve().parent
DEFAULT_PRIVATE = Path.home() / "_gah_builds" / "GAH-SIGNALS-004-private"
ALLOWED = {"vault.fbi.gov", "www.justice.gov", "finance.senate.gov",
           "www.federalregister.gov", "www.finance.senate.gov", "www.courtlistener.com",
           "dockets.justia.com", "www.stortinget.no", "stortinget.no"}
UA = "GAH-SourceWatch/0.1 (+https://grokarchivehub.com/methodology)"
UTC = dt.timezone.utc

def utcnow():
    return dt.datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")

def digest(value):
    if isinstance(value, str):
        value = value.encode("utf-8")
    return hashlib.sha256(value).hexdigest()

def safe_url(url):
    p = urlparse(url)
    return p.scheme == "https" and p.hostname in ALLOWED and not p.username and not p.password

def normalize(value):
    return re.sub(r"\s+", " ", value).strip()

class Extract(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.anchors = []
        self.text = []
        self.href = None
        self.label = []
        self.skip = 0
        self.excluded = {"script", "style", "noscript", "svg"}
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in self.excluded:
            self.skip += 1
        if tag == "a" and not self.skip:
            self.href = attrs.get("href")
            self.label = []
    def handle_endtag(self, tag):
        if tag == "a" and self.href is not None:
            self.anchors.append((self.href, normalize(" ".join(self.label))))
            self.href = None
            self.label = []
        if tag in self.excluded and self.skip:
            self.skip -= 1
    def handle_data(self, value):
        if self.skip:
            return
        value = normalize(value)
        if value:
            self.text.append(value)
            if self.href is not None:
                self.label.append(value)

def fetch(url, timeout=18):
    if not safe_url(url):
        raise ValueError("disallowed source URL")
    cmd = ["curl", "--silent", "--show-error", "--location",
           "--max-redirs", "3", "--max-time", str(timeout),
           "--proto", "=https", "--proto-redir", "=https",
           "--max-filesize", "3500000", "--compressed",
           "--user-agent", UA, "--write-out", "\\n__GAH_FETCH__%{http_code} %{url_effective}", url]
    proc = subprocess.run(cmd, capture_output=True, timeout=timeout+5)
    marker = b"\n__GAH_FETCH__"
    if marker not in proc.stdout:
        raise RuntimeError("fetch_transport_failure")
    data, tail = proc.stdout.rsplit(marker, 1)
    fields = tail.decode("utf-8", errors="replace").strip().split(maxsplit=1)
    status = int(fields[0])
    target = fields[1] if len(fields)>1 else ""
    if not safe_url(target):
        raise RuntimeError("redirect_to_unapproved_host")
    if proc.returncode or status != 200:
        raise RuntimeError("source_unavailable_http_"+str(status))
    if len(data) > 3500000 or not data:
        raise RuntimeError("source_empty_or_oversized")
    return data

def observe(source, transport=fetch):
    """No state mutations. HTML is untrusted, parsed as data only."""
    url = source["url"]
    raw = transport(url)
    mode = source["mode"]
    if mode == "federalregister":
        obj = json.loads(raw)
        docs = obj.get("results")
        if not isinstance(docs, list):
            raise ValueError("unexpected_federal_register_schema")
        found = {}
        for doc in docs[:100]:
            if not isinstance(doc, dict):
                continue
            link = doc.get("html_url") or doc.get("pdf_url")
            if not isinstance(link, str) or not safe_url(link):
                continue
            found[link] = normalize(str(doc.get("title", "")))[:200]
        return {"mode": mode, "links": found, "digest": digest(json.dumps(found,sort_keys=True))}
    parser = Extract()
    parser.feed(raw.decode("utf-8", errors="replace"))
    if mode == "links":
        pat = re.compile(source["pattern"], re.I)
        matches = {}
        for href, label in parser.anchors:
            link = urljoin(url, href)
            if safe_url(link) and (pat.search(link) or (source["id"] == "wyden-302-letter" and pat.search(label))):
                clean = link.split("#")[0]
                matches[clean] = label[:200]
                if len(matches) >= 1500:
                    break
        # An empty index is an error, not a proof that its records disappeared.
        if not matches:
            raise RuntimeError("index_empty_or_page_structure_changed")
        return {"mode": mode, "links": dict(sorted(matches.items())),
                "digest": digest(json.dumps(matches,sort_keys=True))}
    if mode == "document":
        body = normalize(" ".join(parser.text))
        if len(body) < 150:
            raise RuntimeError("document_empty_or_interstitial")
        return {"mode": mode, "links": {},
                "digest": digest(body)}
    raise ValueError("unknown_source_mode")

def compare(previous, current, name):
    if previous is None:
        return [], "baseline"
    events = []
    if current["mode"] in ("links", "federalregister"):
        old = previous.get("links", {})
        for url in sorted(set(current["links"]) - set(old)):
            events.append({"source": name, "kind": "new_source_link",
                           "url": url, "label": current["links"][url],
                           "review_required": True})
        missing = sorted(set(old) - set(current["links"]))
        if missing:
            events.append({"source": name, "kind": "link_absent_from_current_index",
                           "count": len(missing), "review_required": True,
                           "note": "NOT verified deletion or withholding"})
    elif previous.get("digest") != current["digest"]:
        events.append({"source": name, "kind": "page_text_changed",
                       "review_required": True,
                       "note": "Text change needs primary document/version audit; no allegation implied"})
    return events, "compared"

def build_report(catalog, previous, transport=fetch, now=utcnow):
    ids = [x["id"] for x in catalog["sources"]]
    if len(ids) != len(set(ids)):
        raise ValueError("duplicate_source_id")
    observations = {}
    errors = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(observe, s, transport): s["id"] for s in catalog["sources"]}
        for future in concurrent.futures.as_completed(futures):
            key = futures[future]
            try:
                observations[key] = future.result()
            except Exception as e:
                # Do not put arbitrary remote HTML/errors in a persisted report.
                label = str(e)
                errors[key] = label if re.fullmatch(r"[a-z_0-9]{4,64}", label) else type(e).__name__
    snapshots = dict(previous)
    events = []
    for s in catalog["sources"]:
        name = s["id"]
        if name not in observations:
            continue
        curr = observations[name]
        new, _ = compare(previous.get(name), curr, name)
        events.extend(new)
        snapshots[name] = {"mode": curr["mode"], "links": curr["links"],
                           "digest": curr["digest"], "last_success": now(),
                           "source_url": s["url"]}
    report = {"schema": "gah.primary_source_watch.report.v1", "generated_at": now(),
              "health": "degraded" if errors else "complete_for_configured_sources",
              "observed": sorted(observations), "unavailable": errors,
              "review_events": events, "baseline_count": sum(s["id"] not in previous for s in catalog["sources"] if s["id"] in observations),
              "coverage_gaps": catalog["coverage_gaps"],
              "policy": "read_only_private_review; absence_does_not_prove_removal; no_automatic_publication"}
    return report, snapshots

def write_secure(path, data):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(path.parent, 0o700)
    fd, temp = tempfile.mkstemp(prefix=".gah-", dir=str(path.parent))
    try:
        with os.fdopen(fd,"w") as f:
            json.dump(data,f,ensure_ascii=False,sort_keys=True,indent=2)
            f.write("\n")
            f.flush()
            os.fsync(f.fileno())
        os.chmod(temp, 0o600)
        os.replace(temp,path)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)

def main(argv=None):
    cli = argparse.ArgumentParser()
    cli.add_argument("--update", action="store_true", help="Update private baseline and report; no public writes")
    cli.add_argument("--private-dir", type=Path, default=DEFAULT_PRIVATE)
    cli.add_argument("--catalog", type=Path, default=HERE/"sources.json")
    a = cli.parse_args(argv)
    catalog = json.loads(a.catalog.read_text())
    if catalog.get("schema") != "gah.primary_source_watch.catalog.v1":
        raise RuntimeError("unexpected_catalog_schema")
    a.private_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    lock = a.private_dir / ".lock"
    with open(lock,"a+") as lf:
        fcntl.flock(lf,fcntl.LOCK_EX | fcntl.LOCK_NB)
        state = a.private_dir / "state.json"
        previous = json.loads(state.read_text()) if state.exists() else {}
        if previous and previous.get("schema") != "gah.primary_source_watch.state.v1":
            raise RuntimeError("unexpected_state_schema")
        report, snapshots = build_report(catalog,previous.get("sources",{}))
        if a.update:
            write_secure(state,{"schema":"gah.primary_source_watch.state.v1","sources":snapshots})
            write_secure(a.private_dir/"latest-report.json",report)
            with (a.private_dir/"events.jsonl").open("a") as f:
                for event in report["review_events"]:
                    f.write(json.dumps({"observed_at":report["generated_at"],**event},ensure_ascii=False)+"\n")
            os.chmod(a.private_dir/"events.jsonl", 0o600)
        print(json.dumps({"updated":a.update,"health":report["health"],"seen":len(report["observed"]),
                          "unavailable":report["unavailable"],"review_events":len(report["review_events"]),
                          "baseline_count":report["baseline_count"],
                          "remaining_coverage_gaps":len(report["coverage_gaps"])},
                         ensure_ascii=False))
    return 0

if __name__ == "__main__":
    sys.exit(main())
