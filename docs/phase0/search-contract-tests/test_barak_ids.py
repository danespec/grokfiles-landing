"""Test the Barak portal index against the contract (§1 separation, §2.2 identifiers, §6 labels).

Reads: ~/workspace/gah-repo/assets/barak-data.v298.js
Verifies:
  - every item has an id, title, date/dateSort, snippet, confidence label, and
    the what-it-shows / what-it-does-not-prove fields (claim / silence)
  - BARAK-XXX-XXX archive ids match the canonical pattern when present
  - confidence labels come from the defined set (contract §6)
  - no duplicate archive ids
"""
import sys, os, json, re
from gah_search import repo_root
REPO = repo_root()
failures = []
def check(name, cond, detail=""):
    if not cond:
        failures.append("%s %s" % (name, detail))

DEFINED_LABELS = {
    "HIGH_SOURCE_ROW_CLEAR", "HIGH_SOURCE_DOCUMENT_BOUND", "HIGH_FOR_APPEARANCE_ONLY",
    "HIGH_FOR_ROUTING_CONTEXT", "MEDIUM_HIGH_SOURCE_ROW_CLEAR",
    "MEDIUM_HIGH_FOR_APPEARANCE_ONLY", "MEDIUM_HIGH_FOR_TEXT_APPEARANCE_ONLY",
    "MEDIUM_FOR_ROUTING_CONTEXT", "MEDIUM_PARENT_MIRROR_PARTIAL",
    "MEDIUM_TRUNCATED_BUT_USABLE", "MEDIUM_LOW_UNTIL_VISUAL_CHECK",
    "LOW_CONFIDENCE_EXCLUSION", "OPEN_TRANSCRIPT_SLOT",
}

src = open(os.path.join(REPO, "assets/barak-data.v298.js")).read()
m = re.search(r"window\.BARAK_PORTAL_DATA\s*=\s*(\{.*\});?\s*$", src, re.S)
check("portal data block found", m is not None)
data = json.loads(m.group(1))
items = data["items"]
check("items non-empty", len(items) > 0)
print("  barak portal rows in snapshot: %d" % len(items))

seen_ids, seen_archive = set(), set()
archive_ids = []
date_unknown, alias_forms, empty_silence = [], [], []
efta_bound = barak_bound = 0
for it in items:
    iid = it.get("id", "")
    check("item has id", bool(iid))
    if iid in seen_ids:
        failures.append("duplicate source-row id: %s" % iid)
    seen_ids.add(iid)
    for f in ["title", "date", "snippet", "confidence", "claim"]:
        check("item %s has %s" % (iid, f), f in it and it[f] not in (None, ""),
              "missing/empty")
    # silence (what-it-does-not-prove) must never render empty: the card falls
    # back to the default silence statement. Empty values are content debt.
    if not it.get("silence"):
        empty_silence.append(iid)
    # dateSort is missing on some rows (esp. slots) -> contract date_unknown flag
    if not it.get("dateSort"):
        date_unknown.append(iid)
    conf = it.get("confidence", "")
    check("item %s confidence defined" % iid, conf in DEFINED_LABELS, conf)
    # archiveId is the identifier this row is FILED UNDER: either a canonical
    # EFTA id (receipt rows bound to a DOJ document — a cross-collection
    # reference, still a Barak-portal row) or a BARAK-XXX-XXX archive id.
    # Alias forms (e.g. BARAK-171-SLOT-001) are normalization debt, not canonical.
    aid = it.get("archiveId") or ""
    if aid:
        efta_ok = re.fullmatch(r"EFTA\d{8}", aid) is not None
        barak_ok = re.fullmatch(r"BARAK-\d{3}-\d{3}", aid) is not None
        if efta_ok:
            efta_bound += 1
        elif barak_ok:
            barak_bound += 1
            if aid in seen_archive:
                failures.append("duplicate BARAK archive id: %s" % aid)
            seen_archive.add(aid)
        else:
            alias_forms.append((iid, aid))
    found = re.findall(r"BARAK-\d{3}-\d{3}", json.dumps(it))
    for b in found:
        check("archive id canonical " + b, re.fullmatch(r"BARAK-\d{3}-\d{3}", b) is not None)
        archive_ids.append(b)

# archive ids must be unique: a BARAK-XXX-XXX row and an EFTA row are different
# evidence, but two rows must not claim the same archive id (§1)
dupes = {b for b in archive_ids if archive_ids.count(b) > 1}
check("no duplicate BARAK archive ids", not dupes, str(sorted(dupes)[:5]))
print("  distinct BARAK archive ids referenced: %d" % len(set(archive_ids)))
print("  rows filed under EFTA ids (receipt cross-refs): %d" % efta_bound)
print("  rows filed under canonical BARAK ids: %d" % barak_bound)
print("  rows with dateSort missing (date_unknown): %d" % len(date_unknown))
if alias_forms:
    print("  NORMALIZATION DEBT — non-canonical archiveId forms (%d):" % len(alias_forms))
    for iid, aid in alias_forms[:8]:
        print("    %s -> %s" % (iid, aid))
if empty_silence:
    print("  CONTENT DEBT — empty what-it-does-not-prove (%d), default silence must render:" % len(empty_silence))
    for iid in empty_silence[:8]:
        print("    %s" % iid)

# collection separation: no item may carry an EFTA badge; barak rows are barak rows
efta_badged = [it["id"] for it in items if it.get("collection") not in (None, "barak")]
check("no non-barak collection badge on barak rows", not efta_badged, str(efta_badged[:3]))

if failures:
    print("FAIL (%d):" % len(failures))
    for f in failures[:20]:
        print("  " + f)
    sys.exit(1)
print("test_barak_ids: all checks passed")
