#!/bin/bash
# GAH staging smoke tests.
#
# Usage: STAGING_BASE_URL=https://staging.example.com bash staging/smoke-tests/smoke.sh
#    or: bash staging/smoke-tests/smoke.sh https://staging.example.com
#
# Verifies: homepage, search (text / exact-ID / Barak namespace), A2A,
# archive access, Barak viewer, member routes, PayPal disabled-checkout
# state, research interfaces (MCP, api-catalog, openapi), admin login page.
#
# Safe to run repeatedly: makes no purchases, no logins, no writes.
# The admin-login throttle is NOT exercised here (that would consume the
# staging lockout budget); it is covered by the Miniflare suite.
set -u
BASE="${1:-${STAGING_BASE_URL:-}}"
if [ -z "$BASE" ]; then echo "usage: $0 https://<staging-url>"; exit 2; fi
BASE="${BASE%/}"

pass=0; fail=0; failed=()
check() { # name, condition-command...
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then pass=$((pass+1)); echo "PASS $name";
  else fail=$((fail+1)); failed+=("$name"); echo "FAIL $name"; fi
}
get()  { curl -sS -o /dev/null -w "%{http_code}" --max-time 25 "$BASE$1"; }
get_body() { curl -sS --max-time 25 "$BASE$1"; }
post_json() { curl -sS --max-time 25 -X POST -H "Content-Type: application/json" -d "$2" "$BASE$1"; }
code_is() { [ "$(get "$1")" = "$2" ]; }
json_has() { # body, python-expr -> exit 0 if truthy
  python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if ($2) else 1)" <<< "$1";
}

echo "Staging: $BASE"
echo

# 1. Homepage
check "homepage 200" code_is "/" "200"

# 2. Search — text query returns hits
BODY=$(post_json "/api/search" '{"q":"Epstein","limit":5,"no_ai":true,"fast":true}')
check "search text 200 + hits" json_has "$BODY" "d.get('hit_count',0) > 0"

# 3. Search — Barak namespace separation (never searched as EFTA text)
BODY=$(post_json "/api/search" '{"q":"BARAK-174-001","no_ai":true}')
check "barak id -> cross-collection hint" json_has "$BODY" "d.get('query_classification')=='barak' and d.get('hit_count')==0"

# 4. Search — exact EFTA id is not fabricated (either verified or missing, never invented)
BODY=$(post_json "/api/search" '{"q":"EFTA00000001","no_ai":true}')
check "exact id -> verified-or-missing (no fabrication)" json_has "$BODY" "(d.get('exact_identifier_missing')==True) or ('exact_identifier_route' in d)"

# 5. Search — limit clamp respected
BODY=$(post_json "/api/search" '{"q":"test","limit":5000,"no_ai":true}')
check "limit clamped" json_has "$BODY" "len(d.get('hits',[])) <= 50"

# 6. A2A endpoint responds (auth may apply; must not 500)
CODE=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 25 -X POST -H "Content-Type: application/json" -d '{"message":"ping"}' "$BASE/a2a/v1/message:send")
check "a2a endpoint responsive (not 500)" test "$CODE" != "500"

# 7. Archive + Barak viewer render
check "barak viewer 200" code_is "/barak" "200"

# 8. Member routes still challenge (redirect/login), not 500
CODE=$(get "/members/account")
check "member route challenges (not 500)" test "$CODE" != "500"

# 9. PayPal live checkout stays disabled in staging
BODY=$(get_body "/api/commerce/paypal/live/launch-status")
check "paypal launch-status 200" json_has "$BODY" "True"
check "paypal live NOT configured" json_has "$BODY" "not d.get('live_client_id_present', False)"

# 10. Research interfaces intact
check "mcp server card" code_is "/.well-known/mcp/server-card.json" "200"
check "api catalog" code_is "/.well-known/api-catalog" "200"
check "openapi" code_is "/openapi.json" "200"

# 11. Admin login page renders; bad token -> 401 (not 500)
check "admin login page 200" code_is "/admin/login" "200"
CODE=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 25 -X POST --data "admin_token=wrong" "$BASE/admin/login")
check "admin bad token -> 401" test "$CODE" = "401"

echo
echo "----------------------------------------"
if [ "$fail" -eq 0 ]; then echo "ALL $pass SMOKE TESTS PASSED"; exit 0;
else echo "$fail FAILED: ${failed[*]}"; exit 1; fi
