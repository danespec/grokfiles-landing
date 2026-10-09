"""Test the visual-evidence index against the contract (§4 counts, §2.3 identifiers).

Reads: ~/workspace/gah-repo/visual-evidence-index/manifest.json (+ one shard sample).
Verifies:
  - served_items + duplicate_rows_skipped == manifest_rows  (the 76,948 correction)
  - shard row ranges are contiguous and sum to served_items
  - shard keys and sample rows carry canonical EFTA identifiers
"""
import sys, os, json, re
from gah_search import repo_root
REPO = repo_root()
failures = []
def check(name, cond, detail=""):
    if not cond:
        failures.append("%s %s" % (name, detail))

m = json.load(open(os.path.join(REPO, "visual-evidence-index/manifest.json")))
s = m["source_summary"]

# §4: the reconciled count. 76,948 = manifest_rows (includes 888 dupes); 76,060 = served.
check("served + dupes == manifest_rows",
      s["served_items"] + s["duplicate_rows_skipped"] == s["manifest_rows"],
      "(%d + %d != %d)" % (s["served_items"], s["duplicate_rows_skipped"], s["manifest_rows"]))
check("served_items is 76060", s["served_items"] == 76060, "got %d" % s["served_items"])
check("no missing images", s["missing_images_skipped"] == 0)
check("schema tag", m["schema"] == "gah.visual-evidence-index.v1", m["schema"])
for f in ["efta", "name", "chunk", "pdf", "class"]:
    check("searchable field " + f, f in m["searchable_fields"])

shards = m["shards"]
check("shards non-empty", len(shards) > 0)
total = sum(x["count"] for x in shards)
check("shard counts sum to served_items", total == s["served_items"], "sum=%d" % total)
# contiguity of row ranges
prev_end = 0
for meta in shards:
    check("shard %s contiguous" % meta["key"], meta["start"] == prev_end,
          "start=%d prev_end=%d" % (meta["start"], prev_end))
    check("shard %s end=start+count" % meta["key"], meta["end"] == meta["start"] + meta["count"])
    check("shard key is EFTA prefix", re.fullmatch(r"EFTA\d{4}", meta["key"]) is not None, meta["key"])
    prev_end = meta["end"]

# sample row: identifier fields present, canonical EFTA id
rows = json.load(open(os.path.join(REPO, "visual-evidence-index/efta/EFTA0003.json")))
check("sample shard non-empty", len(rows) > 0)
row = rows[0]
for f in ["efta", "name", "chunk", "pdf", "class", "img_url", "thumb_url"]:
    check("row field " + f, f in row, str(row.keys()))
check("row efta canonical", re.fullmatch(r"EFTA\d{8}", row["efta"]) is not None, row["efta"])
# every row in the sample shard matches the shard's EFTA prefix
bad = [r["efta"] for r in rows if not r["efta"].startswith("EFTA0003")]
check("all rows in EFTA0003 shard share prefix", not bad, str(bad[:3]))

if failures:
    print("FAIL (%d):" % len(failures))
    for f in failures:
        print("  " + f)
    sys.exit(1)
print("test_visual_manifest: all checks passed (%d shards, %d served items)" % (len(shards), s["served_items"]))
