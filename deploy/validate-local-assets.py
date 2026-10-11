#!/usr/bin/env python3
from pathlib import Path
import re, sys, json

root = Path(__file__).resolve().parents[1]
owned_prefixes = ("/assets/", "/frontdoor/", "/source-renders/", "/research-heroes/")
missing = []
checked = set()

def add_ref(ref, owner):
    ref = ref.strip().split("#",1)[0].split("?",1)[0]
    if not ref.startswith(owned_prefixes):
        return
    checked.add(ref)
    p = root / ref.lstrip("/")
    if not p.is_file():
        missing.append((ref, owner))

for p in root.rglob("*.html"):
    rel = str(p.relative_to(root))
    if rel.startswith("evidence-data/"):
        continue
    try:
        s = p.read_text(errors="ignore")
    except Exception:
        continue
    for attr in ("src","href","poster"):
        for m in re.finditer(rf'\b{attr}=["\']([^"\']+)["\']', s, re.I):
            add_ref(m.group(1), rel)
    for m in re.finditer(r'\bsrcset=["\']([^"\']+)["\']', s, re.I):
        for part in m.group(1).split(","):
            add_ref(part.strip().split()[0], rel)

for p in root.rglob("*.css"):
    rel = str(p.relative_to(root))
    try:
        s = p.read_text(errors="ignore")
    except Exception:
        continue
    for m in re.finditer(r'url\((?:["\']?)(/[^)"\']+)(?:["\']?)\)', s, re.I):
        add_ref(m.group(1), rel)

report = {
    "schema": "gah.asset-integrity.v1",
    "checked_local_asset_refs": len(checked),
    "missing_count": len(missing),
    "missing": [{"asset": a, "owner": o} for a,o in missing],
}
out = root / "deploy" / "asset-integrity-report.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(report, indent=2) + "\n")
print(f"CHECKED={len(checked)} MISSING={len(missing)} REPORT={out}")
for asset, owner in missing:
    print(f"MISSING\t{asset}\t{owner}")
sys.exit(1 if missing else 0)
