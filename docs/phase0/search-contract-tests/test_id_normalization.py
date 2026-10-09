"""Test ID normalization rules (contract §2) and missing-record responses (contract §7)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gah_search import normalize_efta, normalize_barak, classify_query, missing_record_response

failures = []
def check(name, got, want):
    if got != want:
        failures.append("%s: got %r, want %r" % (name, got, want))

# --- EFTA normalization (§2.1) ---
check("efta canonical", normalize_efta("EFTA00033413"), "EFTA00033413")
check("efta lowercase", normalize_efta("efta00033413"), "EFTA00033413")
check("efta hyphen", normalize_efta("EFTA-00033413"), "EFTA00033413")
check("efta space", normalize_efta("EFTA 00033413"), "EFTA00033413")
check("efta underscore", normalize_efta("EFTA_00033413"), "EFTA00033413")
check("efta short digits pad", normalize_efta("EFTA33413"), "EFTA00033413")
check("efta very short", normalize_efta("efta1"), "EFTA00000001")
check("efta mixed seps", normalize_efta(" efta - 0003 3413 "), "EFTA00033413")
check("efta 9 digits rejected", normalize_efta("EFTA000334134"), None)
check("efta letters rejected", normalize_efta("EFTA0003341A"), None)
check("efta no prefix rejected", normalize_efta("00033413"), None)
check("efta empty", normalize_efta(""), None)
check("efta none", normalize_efta(None), None)

# --- BARAK normalization (§2.2) ---
check("barak canonical", normalize_barak("BARAK-174-001"), "BARAK-174-001")
check("barak lowercase", normalize_barak("barak-174-001"), "BARAK-174-001")
check("barak no seps", normalize_barak("BARAK174001"), "BARAK-174-001")
check("barak spaces", normalize_barak("BARAK 174 001"), "BARAK-174-001")
check("barak short groups pad", normalize_barak("BARAK-174-1"), "BARAK-174-001")
check("barak 4-digit group rejected", normalize_barak("BARAK-1744-001"), None)
check("barak missing group rejected", normalize_barak("BARAK-174"), None)
check("barak letters rejected", normalize_barak("BARAK-ABC-001"), None)
check("barak empty", normalize_barak(""), None)

# --- classify_query ---
check("classify efta hyphenated", classify_query("EFTA-00033413"), ("efta", "EFTA00033413"))
check("classify barak", classify_query("barak174001"), ("barak", "BARAK-174-001"))
check("classify text", classify_query("flight logs")[0], "text")
# A BARAK id must not normalize as EFTA and vice versa
check("barak not efta", classify_query("BARAK-174-001")[0], "barak")

# --- missing-record responses (§7): never silence, always a collection hint ---
r = missing_record_response("barak", "BARAK-174-001", "efta")
check("barak-in-efta hint", r["collection_hint"], "barak")
check("barak-in-efta type", r["result_type"], "missing_record")
assert "not an EFTA record" in r["message"], "barak-in-efta message wrong: %r" % r["message"]

r = missing_record_response("efta", "EFTA00033413", "barak")
check("efta-in-barak hint", r["collection_hint"], "efta")
assert "not a Barak archive record" in r["message"], "efta-in-barak message wrong: %r" % r["message"]

r = missing_record_response("efta", "EFTA00999999", "efta")
assert "No EFTA record" in r["message"] and "EFTA00999999" in r["message"], "efta missing message wrong"
check("efta missing no fabricated route", r["suggested_route"], None)

r = missing_record_response("barak", "BARAK-174-999", "barak")
assert "No Barak archive record" in r["message"], "barak missing message wrong"

r = missing_record_response("text", "zzz", "efta")
assert "EFTA00033413" in r["message"] and "BARAK-174-001" in r["message"], "malformed guidance missing examples"

if failures:
    print("FAIL (%d):" % len(failures))
    for f in failures:
        print("  " + f)
    sys.exit(1)
print("test_id_normalization: all %d checks passed" % 37)
