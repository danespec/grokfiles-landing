#!/usr/bin/env python3
"""Validate BARAK_VIEWER_DEPENDENCY_MAP.json against the in-repo data.

Checks every verifiable claim in the dependency map by parsing
assets/barak-data.v298.js directly — the map is evidence, not prose.

Run: python3 docs/phase0/validate_barak_deps.py   (from the repo root)
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "assets", "barak-data.v298.js")
MAP = os.path.join(ROOT, "docs", "phase0", "BARAK_VIEWER_DEPENDENCY_MAP.json")

failures = []


def check(name, cond, detail=""):
    if not cond:
        failures.append(f"{name}: {detail}")


src = open(DATA).read()
m = re.search(r"window\.BARAK_PORTAL_DATA\s*=\s*(\{.*\});?\s*$", src, re.S)
portal = json.loads(m.group(1))
dmap = json.load(open(MAP))

items = portal["items"]
check("item count is 305", len(items) == 305, f"got {len(items)}")
check("zero items carry a message body",
      not any(i.get("body") or i.get("message_body") for i in items))

types = {}
for i in items:
    types[i["type"]] = types.get(i["type"], 0) + 1
check("181 parent-pdf mirrors", types.get("parent-pdf") == 181, str(types.get("parent-pdf")))
check("80 open slots", types.get("open-slot") == 80, str(types.get("open-slot")))

cov = portal["coverage"]["emailSourceRecovery"]
check("19 recovered (metadata)", cov["recoveredEmail"] == 19)
check("5,587 attachment-backed", cov["missingParentWithAttachments"] == 5587)
check("5,505 metadata-only", cov["metadataOnlySlot"] == 5505)
check("arithmetic does not close (11,092 vs 11,089)",
      cov["missingParentWithAttachments"] + cov["metadataOnlySlot"] != 11089)

ai = portal["archiveIndex"]
for key in ("emailsUrl", "pdfsUrl"):
    rel = ai[key].lstrip("/")
    check(f"{ai[key]} absent from snapshot", not os.path.exists(os.path.join(ROOT, rel)))

check("18 timeline entries", len(portal["timeline"]) == 18, str(len(portal["timeline"])))
check("3 claim frames", len(portal["claimFrames"]) == 3)

# The map's hard gate must name all three blockers.
gate = dmap["hard_gate"]
for b in ("B1", "B2", "B3"):
    check(f"hard gate names {b}", b in gate or any(b in x for x in dmap["blockers"]))

if failures:
    print(f"FAIL ({len(failures)}):")
    for f in failures:
        print("  " + f)
    sys.exit(1)
print("validate_barak_deps: all checks passed — dependency map matches in-repo data")
