#!/usr/bin/env python3
"""Bounded, resumable digest census for public Barak PDF attachment inventory.
No PDF bytes are persisted; caller supplies a private, owner-only ledger path.
A syntactically complete PDF is not independently validated parent provenance.
"""
import argparse
from collections import Counter
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import time
from urllib.parse import urlsplit, parse_qsl

BASE = "https://grokarchivehub.com"
ALLOWED_PATH = re.compile(r"^/barak/source/pdf$")
ALLOWED_SID = re.compile(r"^barak-src-[0-9a-f]{12}$")

def permitted(raw):
    if not isinstance(raw, str) or len(raw) > 200:
        return False
    u = urlsplit(raw)
    if u.scheme or u.netloc or u.fragment or not ALLOWED_PATH.fullmatch(u.path):
        return False
    params = parse_qsl(u.query, keep_blank_values=True)
    return len(params) == 1 and params[0][0] == "sid" and bool(ALLOWED_SID.fullmatch(params[0][1]))

def audit_source(raw, timeout, byte_limit):
    if not permitted(raw):
        return {"status": "rejected_url"}
    proc = subprocess.Popen(
        ["curl", "--silent", "--show-error", "--fail", "--max-time", str(timeout),
         "--connect-timeout", "6", "--proto", "=https", BASE + raw],
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    h = hashlib.sha256()
    size = 0
    signature = b""
    tail = b""
    oversize = False
    try:
        while True:
            chunk = proc.stdout.read(65536)
            if not chunk:
                break
            if not signature:
                signature = chunk[:5]
            size += len(chunk)
            if size > byte_limit:
                oversize = True
                proc.kill()
                break
            h.update(chunk)
            tail = (tail + chunk)[-1024:]
        rc = proc.wait(timeout=6)
    except (Exception, KeyboardInterrupt):
        proc.kill()
        proc.wait()
        raise
    if oversize:
        return {"status": "size_limit", "bytes_at_stop": size}
    if rc != 0:
        return {"status": "transport_or_http_failure"}
    if signature != b"%PDF-":
        return {"status": "non_pdf_response", "bytes": size}
    if b"%%EOF" not in tail:
        return {"status": "pdf_missing_eof", "bytes": size}
    return {"status": "pdf_verified", "bytes": size, "sha256": h.hexdigest()}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--inventory", required=True)
    ap.add_argument("--ledger", required=True)
    ap.add_argument("--limit", type=int, default=24)
    ap.add_argument("--timeout", type=int, default=18)
    ap.add_argument("--max-mb", type=int, default=25)
    args = ap.parse_args()
    if not 1 <= args.limit <= 100 or not 5 <= args.timeout <= 90 or not 1 <= args.max_mb <= 100:
        raise SystemExit("Unsafe limits")
    inventory = Path(args.inventory)
    ledger = Path(args.ledger)
    assert inventory.exists() and inventory.is_file()
    assert not ledger.is_symlink()
    assert ledger.parent.exists() and not ledger.parent.is_symlink()
    ledger.parent.chmod(0o700)
    records = json.loads(inventory.read_bytes())["items"]
    if not isinstance(records, list):
        raise SystemExit("Missing inventory array")
    ids = [str(x.get("id") or "") for x in records]
    if len(set(ids)) != len(ids) or not all(ids):
        raise SystemExit("PDF row IDs not unique")
    completed = set()
    if ledger.exists():
        for line in ledger.read_text().splitlines():
            if line.strip():
                completed.add(json.loads(line)["record_id"])
    items = sorted(records, key=lambda x: hashlib.sha256(str(x["id"]).encode()).hexdigest())
    to_run = [row for row in items if row["id"] not in completed][:args.limit]
    statuses = Counter()
    os.umask(0o077)
    with ledger.open("a", encoding="utf-8") as stream:
        for row in to_run:
            result = audit_source(row.get("sourceFile"), args.timeout, args.max_mb * 1024 * 1024)
            result.update({"record_id": row["id"], "checked_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})
            stream.write(json.dumps(result, sort_keys=True, separators=(",",":")) + "\n")
            stream.flush()
            statuses[result["status"]] += 1
    os.chmod(ledger,0o600)
    print(json.dumps({"inventory_total":len(records),"processed_this_run":len(to_run),
                      "previously_checked":len(completed),"status_counts":dict(statuses),
                      "checked_total":len(completed)+len(to_run),
                      "publication_gate":"blocked_pending_full_source_review"},sort_keys=True))

if __name__ == "__main__":
    main()
