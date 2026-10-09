#!/bin/bash
# GAH staging auth tests — SEPARATE from the read-only smoke suite.
#
# Usage:
#   STAGING_HOSTS=staging.example.com \
#   STAGING_ADMIN_TOKEN=<disposable-token> \
#   bash staging/smoke-tests/auth.sh https://staging.example.com
#
# This script EXERCISES the admin-login throttle, so it is deliberately NOT
# part of smoke.sh. It uses a DISPOSABLE admin token (rotate it after the
# run) and stays well under the lockout budget: at most 3 bad attempts
# (each must return the documented 401), then one good attempt.
#
# Safety:
#   - STAGING_HOSTS is an exact allowlist of staging hostnames
#     (comma-separated, no wildcards, no substrings). The target URL's host
#     must match one entry EXACTLY or the script refuses to run.
#   - No shell-string interpolation of the URL or token: values are passed
#     as arguments / environment, never embedded in eval'd strings.
#   - NEVER run against production. NEVER use a production token.
#   - If interrupted mid-run, wait 15 minutes for the window to expire
#     before re-running (failures-only counting: only bad attempts consume
#     budget).
set -u
BASE="${1:-${STAGING_BASE_URL:-}}"
TOKEN="${STAGING_ADMIN_TOKEN:-}"
ALLOWLIST="${STAGING_HOSTS:-}"
if [ -z "$BASE" ] || [ -z "$TOKEN" ] || [ -z "$ALLOWLIST" ]; then
  echo "usage: STAGING_HOSTS=<host[,host...]> STAGING_ADMIN_TOKEN=<disposable-token> $0 https://<staging-url>"
  exit 2
fi

# Exact host allowlist check — no substring matching.
HOST="$(python3 -c "import sys,urllib.parse; print(urllib.parse.urlparse(sys.argv[1]).hostname or '')" "$BASE")"
ALLOWED=0
IFS=',' read -ra ENTRIES <<< "$ALLOWLIST"
for e in "${ENTRIES[@]}"; do
  [ "$HOST" = "$e" ] && ALLOWED=1
done
if [ "$ALLOWED" -ne 1 ]; then
  echo "REFUSAL: host '$HOST' is not on the STAGING_HOSTS allowlist."
  exit 3
fi

pass=0; fail=0
check() { # name, expected-code, then curl args (as separate words)
  local name="$1" expected="$2"; shift 2
  local got
  got="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 25 "$@")"
  if [ "$got" = "$expected" ]; then pass=$((pass+1)); echo "PASS $name";
  else fail=$((fail+1)); echo "FAIL $name (got $got, want $expected)"; fi
}

echo "Auth checks against $BASE (host allowlisted; disposable token; max 3 bad attempts)"
echo

# 1-3. Bad tokens -> documented 401 (throttle admits them; budget: 3 of 5).
for i in 1 2 3; do
  check "bad token attempt $i -> 401" 401 -X POST --data-urlencode "admin_token=wrong-$i" "$BASE/admin/login"
done

# 4. Good token still works (failures-only counting: 3 failures do not block it).
#    Accepts 200/302/303 — any documented success shape, never 429.
GOT="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 25 -X POST --data-urlencode "admin_token=$TOKEN" "$BASE/admin/login")"
case "$GOT" in
  200|302|303) pass=$((pass+1)); echo "PASS good token -> $GOT (not 429)";;
  *) fail=$((fail+1)); echo "FAIL good token (got $GOT)";;
esac

echo
echo "----------------------------------------"
if [ "$fail" -eq 0 ]; then echo "ALL $pass AUTH CHECKS PASSED"; echo "Rotate the disposable token now."; exit 0;
else echo "$fail FAILED"; exit 1; fi
