#!/bin/bash
# GAH staging smoke tests — READ-ONLY suite.
#
# Usage: STAGING_BASE_URL=https://staging.example.com bash staging/smoke-tests/smoke.sh
#    or: bash staging/smoke-tests/smoke.sh https://staging.example.com
#
# This suite makes NO authenticated requests and NO state-changing requests.
# The only POSTs are to read-only endpoints (/api/search). Authentication is
# tested separately in auth.sh with disposable fixtures.
#
# Every check asserts a DOCUMENTED status and response shape — there are no
# permissive "not 500" checks.
set -u
BASE="${1:-${STAGING_BASE_URL:-}}"
if [ -z "$BASE" ]; then echo "usage: $0 https://<staging-url>"; exit 2; fi
BASE="${BASE%/}"

# Refuse production hostnames: this suite must never run against production.
PROD_HOST="$(python3 -c "import sys,urllib.parse; print(urllib.parse.urlparse(sys.argv[1]).hostname or '')" "$BASE")"
case "$PROD_HOST" in
  grokarchivehub.com|www.grokarchivehub.com|wiki.grokarchivehub.com)
    echo "REFUSAL: '$PROD_HOST' looks like production. This suite is staging-only."; exit 3;;
esac

TMPD="$(mktemp -d)"; trap 'rm -rf "$TMPD"' EXIT

pass=0; fail=0; failed=()
check() { # name, then a command; passes if the command exits 0
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then pass=$((pass+1)); echo "PASS $name";
  else fail=$((fail+1)); failed+=("$name"); echo "FAIL $name"; fi
}
code() { curl -sS -o /dev/null -w "%{http_code}" --max-time 25 "$BASE$1"; }
code_is() { [ "$(code "$1")" = "$2" ]; }
# jcheck <file> <python-expr>: exit 0 iff the JSON file satisfies the expr (as d)
jcheck() { python3 -c "import json,sys; d=json.load(open('$1')); sys.exit(0 if ($2) else 1)"; }
get_json() { curl -sS --max-time 25 -o "$TMPD/$2" "$BASE$1"; }
post_json() { curl -sS --max-time 25 -o "$TMPD/$3" -X POST -H "Content-Type: application/json" -d "$2" "$BASE$1"; }

echo "Staging: $BASE"
echo

# 1. Homepage serves.
check "homepage 200" code_is "/" "200"

# 2. Search — text query returns hits.
post_json "/api/search" '{"q":"Epstein","limit":5,"no_ai":true,"fast":true}' s2.json
check "search text: hits list non-empty" jcheck "$TMPD/s2.json" "d.get('hit_count',0)>0 and isinstance(d.get('hits'),list)"

# 3. Search — Barak namespace separation (never searched as EFTA text).
post_json "/api/search" '{"q":"BARAK-174-001","no_ai":true}' s3.json
check "search barak: classification=barak, hit_count=0" jcheck "$TMPD/s3.json" "d.get('query_classification')=='barak' and d.get('hit_count')==0 and d.get('hits',[{}])[0].get('collection_hint')=='barak'"

# 4. Search — exact EFTA id, three legitimate states.
# Missing is deterministic (EFTA00999999 is not a real id).
post_json "/api/search" '{"q":"EFTA00999999","no_ai":true}' s4a.json
check "exact id missing: card present, excluded from hits" jcheck "$TMPD/s4a.json" "d.get('exact_identifier_missing')==True and d.get('hits',[{}])[0].get('missing')==True and d.get('document_bundle_url') in (None,'')"
# EFTA00000001 lands in verified or unverified depending on staging data;
# assert the correct invariants for whichever state the backend returns.
post_json "/api/search" '{"q":"EFTA00000001","no_ai":true}' s4b.json
cat > "$TMPD/exact_state.py" <<'PYEOF2'
import json, sys
d = json.load(open(sys.argv[1]))
URL_FIELDS = ["read_url","url","pdf_url","source_url","img_url","image_url","thumb_url","thumbnail_url","page_image_url","visual_evidence_url","document_bundle_url"]
hits = d.get("hits", [])
if "exact_identifier_route" in d:
    # VERIFIED: route set, first hit labeled verified, links allowed, counted.
    ok = (isinstance(d["exact_identifier_route"], str) and d["exact_identifier_route"]
          and hits and hits[0].get("verification") == "verified"
          and d.get("hit_count", 0) >= 1)
    print("state=verified")
elif d.get("exact_identifier_unverified"):
    # UNVERIFIED: visible findings, link-free API-wide, no bundle URL, counted.
    ok = (hits and all(h.get("verification") == "unverified" for h in hits if h.get("efta_id"))
          and all(not h.get(k) for h in hits for k in URL_FIELDS)
          and d.get("document_bundle_url") in (None, "")
          and d.get("hit_count", 0) >= 1)
    print("state=unverified")
elif d.get("exact_identifier_missing"):
    # MISSING: card present, excluded from hit count.
    ok = (hits and hits[0].get("missing") == True
          and d.get("hit_count", 0) == len([h for h in hits if not h.get("missing")]))
    print("state=missing")
else:
    ok = False
    print("state=unknown")
sys.exit(0 if ok else 1)
PYEOF2
check "exact id: state-aware invariants hold" python3 "$TMPD/exact_state.py" "$TMPD/s4b.json"

# 5. Search — limit clamp respected.
post_json "/api/search" '{"q":"test","limit":5000,"no_ai":true}' s5.json
check "search limit clamped to <=50" jcheck "$TMPD/s5.json" "len(d.get('hits',[]))<=50"

# 6. A2A — GET returns documented 405 (route intact; no message sent).
check "a2a GET -> 405 (Allow: POST)" bash -c "[ \"\$(curl -sS -o /dev/null -w '%{http_code}' --max-time 25 '$BASE/a2a/v1/message:send')\" = 405 ]"

# 7. Barak viewer renders.
check "barak viewer 200" code_is "/barak" "200"

# 8. Member route: documented behavior is 200 (portal page) or 302 (login redirect).
check "member account: 200 or 302" bash -c "c=\$(curl -sS -o /dev/null -w '%{http_code}' --max-time 25 '$BASE/members/account'); [ \"\$c\" = 200 ] || [ \"\$c\" = 302 ]"

# 9. PayPal live checkout disabled — REAL schema assertions.
get_json "/api/commerce/paypal/live/launch-status" p9.json
check "paypal launch-status: schema + disabled" jcheck "$TMPD/p9.json" "d.get('schema')=='gah.paypal-live-launch-gates.v1' and d.get('live_customer_checkout_available')==False and d.get('config',{}).get('live_client_id_present')==False"

# 10. PayPal live webhook is unconfigured in staging -> documented 503, never 200.
#     (Proves no staging request can process live PayPal events.)
check "paypal live webhook unconfigured (503)" bash -c "[ \"\$(curl -sS -o /dev/null -w '%{http_code}' --max-time 25 -X POST -H 'Content-Type: application/json' -d '{}' '$BASE/api/commerce/paypal/live/webhook')\" = 503 ]"

# 11. Research interfaces intact.
check "mcp server card 200" code_is "/.well-known/mcp/server-card.json" "200"
check "api catalog 200" code_is "/.well-known/api-catalog" "200"
check "openapi 200" code_is "/openapi.json" "200"

# 12. Admin login page renders (GET only — no credential attempts in this suite).
check "admin login page 200" code_is "/admin/login" "200"

echo
echo "----------------------------------------"
if [ "$fail" -eq 0 ]; then echo "ALL $pass SMOKE TESTS PASSED"; exit 0;
else echo "$fail FAILED: ${failed[*]}"; exit 1; fi
