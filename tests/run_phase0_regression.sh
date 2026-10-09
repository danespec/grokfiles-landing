#!/bin/bash
# Combined Phase 0 regression runner for ren/phase0-integration.
#
# Runs every test suite from the three integrated workstreams against their
# combined behavior:
#   1. tests/test_exact_id_policy.mjs      — exact-ID policy (21 checks)
#   2. workers/lib/test_identifiers.mjs    — identifier module (37 checks)
#   3. workers/sec-rate-limiter/test/run.mjs        — DO under Miniflare (8)
#   4. workers/sec-rate-limiter/test/admin_login.mjs — handler-level (12)
#   5. docs/security-remediation/sec-concurrency-tests.mjs (8)
#   6. docs/security-remediation/sec-test-harness.mjs       (8)
#
# Run: bash tests/run_phase0_regression.sh   (from the repo root)
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

pass=0; failed_suites=()

run() {
  local name="$1"; shift
  echo "=== $name ==="
  if "$@"; then pass=$((pass+1)); else failed_suites+=("$name"); fi
  echo
}

run "exact-id policy" node tests/test_exact_id_policy.mjs
run "identifier module" node workers/lib/test_identifiers.mjs

if [ ! -d workers/sec-rate-limiter/node_modules ]; then
  echo "Installing miniflare for DO runtime tests..."
  (cd workers/sec-rate-limiter && npm install --no-audit --no-fund >/dev/null 2>&1) \
    || { echo "npm install failed — skipping Miniflare suites"; failed_suites+=("miniflare install"); }
fi
if [ -d workers/sec-rate-limiter/node_modules ]; then
  run "DO concurrency (Miniflare)" node workers/sec-rate-limiter/test/run.mjs
  run "admin-login handler (Miniflare)" node workers/sec-rate-limiter/test/admin_login.mjs
fi

run "security concurrency mock" node docs/security-remediation/sec-concurrency-tests.mjs
run "security fallback harness" node docs/security-remediation/sec-test-harness.mjs

echo "----------------------------------------"
if [ ${#failed_suites[@]} -eq 0 ]; then
  echo "ALL $pass SUITES PASSED"
  exit 0
else
  echo "FAILED SUITES: ${failed_suites[*]}"
  exit 1
fi
