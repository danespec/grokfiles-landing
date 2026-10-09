#!/bin/bash
# GAH staging auth tests — SEPARATE from the read-only smoke suite.
#
# Usage: STAGING_ADMIN_TOKEN=<disposable-token> bash staging/smoke-tests/auth.sh https://<staging-url>
#
# This script EXERCISES the admin-login throttle, so it is deliberately NOT
# part of smoke.sh. It uses a DISPOSABLE admin token (rotate it after the
# run) and stays well under the lockout budget: it sends at most 3 bad
# attempts and asserts each returns the documented 401, then (optionally)
# one good attempt to verify success still works.
#
# Requirements:
#   - STAGING_ADMIN_TOKEN set to a disposable staging-only admin token.
#   - NEVER run against production. NEVER use a production token.
#   - If the run is interrupted mid-way, wait 15 minutes for the window to
#     expire before re-running (failures-only counting means only bad
#     attempts consume budget).
set -u
BASE="${1:-${STAGING_BASE_URL:-}}"
TOKEN="${STAGING_ADMIN_TOKEN:-}"
if [ -z "$BASE" ] || [ -z "$TOKEN" ]; then
  echo "usage: STAGING_ADMIN_TOKEN=<disposable-token> $0 https://<staging-url>"
  exit 2
fi
BASE="${BASE%/}"
if [[ "$BASE" == *"grokarchivehub.com"* && "$BASE" != *"staging"* ]]; then
  echo "REFUSAL: target looks like production. This script is staging-only."
  exit 3
fi

pass=0; fail=0
check() { local n="$1"; shift
  if "$@" >/dev/null 2>&1; then pass=$((pass+1)); echo "PASS $n";
  else fail=$((fail+1)); echo "FAIL $n"; fi; }

echo "Auth checks against $BASE (disposable token, max 3 bad attempts)"
echo

# 1-3. Bad tokens -> documented 401 (throttle admits them; budget: 3 of 5).
for i in 1 2 3; do
  check "bad token attempt $i -> 401" bash -c "[ \"\$(curl -sS -o /dev/null -w '%{http_code}' --max-time 25 -X POST --data 'admin_token=wrong-$i' '$BASE/admin/login')\" = 401 ]"
done

# 4. Good token still works (failures-only counting: 3 failures do not block it).
check "good token -> 200/302 (not 429)" bash -c "c=\$(curl -sS -o /dev/null -w '%{http_code}' --max-time 25 -X POST --data-urlencode 'admin_token=$TOKEN' '$BASE/admin/login'); [ \"\$c\" = 200 ] || [ \"\$c\" = 302 ] || [ \"\$c\" = 303 ]"

echo
echo "----------------------------------------"
if [ "$fail" -eq 0 ]; then echo "ALL $((pass)) AUTH CHECKS PASSED"; echo "Rotate the disposable token now."; exit 0;
else echo "$fail FAILED"; exit 1; fi
