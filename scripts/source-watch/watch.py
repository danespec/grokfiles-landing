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
import email.utils
import xml.etree.ElementTree as ET
import os
import re
import subprocess
import sys
import tempfile
import time
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse

HERE = Path(__file__).resolve().parent
DEFAULT_PRIVATE = Path.home() / "_gah_builds" / "GAH-SIGNALS-004-private"
ALLOWED = {"vault.fbi.gov", "www.justice.gov", "finance.senate.gov",
           "www.federalregister.gov", "www.govinfo.gov", "www.finance.senate.gov",
           "ecf.dcd.uscourts.gov", "ecf.cadc.uscourts.gov", "www.courtlistener.com",
           "dockets.justia.com", "www.stortinget.no", "stortinget.no",
           "www.tribunal-de-paris.justice.fr", "www.ucl.ac.uk",
           "storage.courtlistener.com",
           "dccc.org", "www.killinforcolorado.com", "www.fec.gov", "www.judiciary.uk"}
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

class MainText(HTMLParser):
    """Canonical document text from <main>; disregard dynamic nav/script/footer."""
    EXCLUDE={"script","style","noscript","svg","nav","footer","header","aside"}
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth=0
        self.suppressed=0
        self.chunks=[]
    def handle_starttag(self, tag, attrs):
        if tag=="main":
            self.depth+=1
        elif self.depth and tag in self.EXCLUDE:
            self.suppressed+=1
    def handle_endtag(self, tag):
        if tag=="main" and self.depth:
            self.depth-=1
        elif self.depth and tag in self.EXCLUDE and self.suppressed:
            self.suppressed-=1
    def handle_data(self, data):
        if self.depth and not self.suppressed and data.strip():
            self.chunks.append(normalize(data))

def main_text_digest(raw):
    parser=MainText()
    parser.feed(raw.decode("utf-8",errors="replace"))
    body=normalize(" ".join(parser.chunks))
    if len(body)<180:
        raise RuntimeError("official_article_main_missing_or_empty")
    return {"mode":"article_main","links":{},"digest":digest(body)}

def fetch(url, timeout=28):
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
    if proc.returncode:
        raise RuntimeError("source_transport_failure")
    if status != 200:
        raise RuntimeError("source_unavailable_http_"+str(status))
    if len(data) > 3500000 or not data:
        raise RuntimeError("source_empty_or_oversized")
    return data

def parse_court_rss(source, raw, now=None):
    """Live official D.D.C. docket-activity RSS, *not* an exhaustive case docket.

    The public feed rotates. Only the matching case is retained; event IDs are
    persistent across rotations to prevent rediscovery of prior filings.
    """
    try:
        root = ET.fromstring(raw)
    except ET.ParseError as exc:
        raise RuntimeError("court_rss_invalid_xml") from exc
    channel = root.find("channel")
    if root.tag != "rss" or channel is None:
        raise RuntimeError("court_rss_invalid_schema")
    items = channel.findall("item")
    build = channel.findtext("lastBuildDate")
    if not build or (not items and not source.get("rss_allow_empty",False)):
        raise RuntimeError("court_rss_empty_or_undated")
    # D.C. Circuit emits EDT/EST abbreviations, which email.utils may parse
    # as naive/local timestamps. Normalize the offset explicitly to UTC.
    build = re.sub(r"\s+EDT$"," -0400",build)
    build = re.sub(r"\s+EST$"," -0500",build)
    try:
        when = email.utils.parsedate_to_datetime(build).astimezone(UTC)
    except (TypeError, ValueError) as exc:
        raise RuntimeError("court_rss_invalid_build_time") from exc
    current = now or dt.datetime.now(UTC)
    age = (current-when).total_seconds()
    if age < -900 or age > 72*3600:
        raise RuntimeError("court_rss_stale_or_future")
    match = re.compile(source["case_regex"], re.I)
    found = {}
    for item in items:
        title = normalize(item.findtext("title") or "")
        description = normalize(item.findtext("description") or "")
        summary = normalize(title+" "+re.sub("<[^>]*>", " ", description))
        if not match.search(summary):
            continue
        link = item.findtext("link") or ""
        if not safe_url(link):
            raise RuntimeError("court_rss_unsafe_docket_link")
        guid = item.findtext("guid") or ""
        published = item.findtext("pubDate") or ""
        # GUIDs may be reused for multiple simultaneous docket events.
        event_id = digest("|".join([title, description, guid, published]))
        key = link.split("#")[0]+"#gah-rss-"+event_id[:20]
        found[key] = normalize(published+" | "+summary)[:260]
    return {"mode": "court_rss", "links": dict(sorted(found.items())),
            "digest": digest(json.dumps(found,sort_keys=True)),
            "rss_last_build":when.isoformat(),
            "rss_items_in_window":len(items)}

def observe(source, transport=fetch):
    """No state mutations. HTML is untrusted, parsed as data only."""
    url = source["url"]
    raw = transport(url)
    mode = source["mode"]
    if mode == "court_rss":
        return parse_court_rss(source, raw)
    if mode == "article_main":
        return main_text_digest(raw)
    if mode == "official_pdf":
        if not raw.startswith(b"%PDF-") or len(raw)<500:
            raise RuntimeError("official_pdf_unexpected_content")
        return {"mode":mode,"links":{},"digest":digest(raw),"size_bytes":len(raw)}
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
        if current["mode"] == "court_rss":
            return ([{"source":name,"kind":"target_case_entry_first_observed",
                     "url":url,"label":label,"review_required":True,
                     "note":"New to GAH monitoring, not necessarily a newly filed docket entry"}
                    for url,label in current["links"].items()], "baseline")
        return [], "baseline"
    events = []
    if current["mode"] == "court_rss":
        for url in sorted(set(current["links"]) - set(previous.get("links", {}))):
            events.append({"source":name,"kind":"target_case_docket_activity",
                           "url":url,"label":current["links"][url],
                           "review_required":True,
                           "note":"Public RSS entry only; underlying filing and compliance need independent verification"})
        # RSS is a short rolling window; disappearance never means deletion.
        return events, "compared"
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
        is_pdf = current["mode"] == "official_pdf"
        events.append({"source": name, "kind": "official_pdf_hash_changed" if is_pdf else "page_text_changed",
                       "review_required": True,
                       "note": "Raw official PDF bytes differ; verify agency revision and document history" if is_pdf
                               else "Text change needs primary document/version audit; no allegation implied"})
    return events, "compared"

def observe_with_retry(source, transport=fetch, sleeper=time.sleep):
    """Retry one transient network failure; never retry 403/404 or bad source data."""
    try:
        return observe(source,transport)
    except RuntimeError as exc:
        if str(exc) not in {"source_transport_failure", "fetch_transport_failure"}:
            raise
    sleeper(1)
    return observe(source,transport)

def build_report(catalog, previous, transport=fetch, now=utcnow):
    ids = [x["id"] for x in catalog["sources"]]
    if len(ids) != len(set(ids)):
        raise ValueError("duplicate_source_id")
    observations = {}
    errors = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(observe_with_retry, s, transport): s["id"] for s in catalog["sources"]}
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
        links = curr["links"]
        if curr["mode"] == "court_rss":
            links = {**previous.get(name, {}).get("links", {}), **links}
            # Guard against uncontrolled private state growth.
            if len(links) > 5000:
                raise RuntimeError("court_rss_history_limit_reached")
        snapshots[name] = {"mode": curr["mode"], "links": links,
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
            # Persist review events before updating their source baseline.
            # Identifiers are content-based, so retrying a failed run is safe.
            from notify import event_id, deliver, deliver_court_health
            from court_review import due_reviews, current_status
            as_of=dt.datetime.fromisoformat(report["generated_at"].replace("Z","+00:00"))
            report["phang_compliance_review"]=current_status(as_of)
            event_path=a.private_dir/"events.jsonl"
            known=set()
            if event_path.exists():
                for line in event_path.read_text(encoding="utf-8").splitlines():
                    if line.strip():
                        prior=json.loads(line)
                        known.add(prior.get("event_id") or event_id(prior))
            milestones=[m for m in due_reviews(as_of) if m["event_id"] not in known]
            report["scheduled_review_milestones"]=len(milestones)
            report["review_events"].extend(milestones)
            with event_path.open("a",encoding="utf-8") as f:
                for event in report["review_events"]:
                    item={"observed_at":report["generated_at"],**event,
                          "observed_digest":snapshots.get(event["source"],{}).get("digest","scheduled_review_not_source_observation")}
                    item["event_id"]=event.get("event_id") or event_id(item)
                    if item["event_id"] not in known:
                        f.write(json.dumps(item,ensure_ascii=False)+"\n")
                        known.add(item["event_id"])
                f.flush()
                os.fsync(f.fileno())
            os.chmod(event_path,0o600)
            write_secure(state,{"schema":"gah.primary_source_watch.state.v1","sources":snapshots})
            report["desktop_notification"]=deliver(a.private_dir)
            report["court_health_notification"]=deliver_court_health(a.private_dir,report)
            # Current verification state is refreshed every run; one-time
            # milestone emails do not determine or freeze legal compliance.
            write_secure(a.private_dir/"phang-compliance-review.json",report["phang_compliance_review"])
            write_secure(a.private_dir/"latest-report.json",report)
        print(json.dumps({"updated":a.update,"health":report["health"],"seen":len(report["observed"]),
                          "unavailable":report["unavailable"],"review_events":len(report["review_events"]),
                          "baseline_count":report["baseline_count"],
                          "remaining_coverage_gaps":len(report["coverage_gaps"])},
                         ensure_ascii=False))
    return 0

if __name__ == "__main__":
    sys.exit(main())
