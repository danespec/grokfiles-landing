#!/bin/bash
# DO binding three-state evidence.
#
# Usage: bash staging/smoke-tests/bindings.sh https://<staging-url> <state>
#   state: configured | missing | unavailable
#
# The configured case is fully automated. The missing/unavailable cases are
# guided procedures: perform the deployment change described, then re-run
# this script with the matching state to capture the evidence.
#
# Documented expectations for ALL three states: the site keeps serving.
# Search, archive, member, and research endpoints must return their normal
# statuses — a binding problem is never an outage.
set -u
BASE="${1:-${STAGING_BASE_URL:-}}"
STATE="${2:-}"
if [ -z "$BASE" ] || [ -z "$STATE" ]; then
  echo "usage: $0 https://<staging-url> <configured|missing|unavailable>"
  exit 2
fi
BASE="${BASE%/}"
TMPD="$(mktemp -d)"; trap 'rm -rf "$TMPD"' EXIT

case "$STATE" in
  configured)
    echo "State: binding configured, DO healthy."
    echo "No deployment change needed. Running observable checks..."
    ;;
  missing)
    cat <<'EOF'
State: binding MISSING (guided procedure).
  1. In the staging Pages project, REMOVE the GAH_SEC_RATE_LIMITER binding.
  2. Redeploy the Pages worker.
  3. Re-run: bash staging/smoke-tests/bindings.sh <url> missing
Expected: all checks below PASS (KV best-effort, then fail-open).
  4. Restore the binding and redeploy when done.
EOF
    ;;
  unavailable)
    cat <<'EOF'
State: binding present but DO UNAVAILABLE (guided procedure).
  1. In workers/sec-rate-limiter, deploy a build whose fetch throws
     (or stop the worker) while keeping the Pages binding in place.
  2. Re-run: bash staging/smoke-tests/bindings.sh <url> unavailable
Expected: all checks below PASS (worker catches the subrequest failure,
degrades to KV best-effort, then fail-open).
  3. Redeploy the healthy rate-limiter worker when done.
EOF
    ;;
  *) echo "state must be configured|missing|unavailable"; exit 2;;
esac
echo

pass=0; fail=0
check() { local n="$1"; shift
  if "$@" >/dev/null 2>&1; then pass=$((pass+1)); echo "PASS [$STATE] $n";
  else fail=$((fail+1)); echo "FAIL [$STATE] $n"; fi; }

# Observable evidence: the site serves normally in every binding state.
check "homepage 200" bash -c "[ \"\$(curl -sS -o /dev/null -w '%{http_code}' --max-time 25 '$BASE/')\" = 200 ]"
curl -sS --max-time 25 -o "$TMPD/s.json" -X POST -H "Content-Type: application/json" \
  -d '{"q":"Epstein","limit":3,"no_ai":true}' "$BASE/api/search"
check "search returns hits" python3 -c "import json,sys; d=json.load(open('$TMPD/s.json')); sys.exit(0 if d.get('hit_count',0)>0 else 1)"
check "admin login page 200" bash -c "[ \"\$(curl -sS -o /dev/null -w '%{http_code}' --max-time 25 '$BASE/admin/login')\" = 200 ]"
check "mcp server card 200" bash -c "[ \"\$(curl -sS -o /dev/null -w '%{http_code}' --max-time 25 '$BASE/.well-known/mcp/server-card.json')\" = 200 ]"

echo
if [ "$fail" -eq 0 ]; then echo "BINDING STATE '$STATE': ALL $pass CHECKS PASSED (no outage)"; exit 0;
else echo "BINDING STATE '$STATE': $fail FAILED — investigate before proceeding"; exit 1; fi
