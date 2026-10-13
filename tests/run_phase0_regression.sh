#!/bin/bash
# Combined Phase 0 regression runner for ren/phase0-integration.
#
# Runs every test suite from the three integrated workstreams against their
# combined behavior:
#   1. tests/test_exact_id_policy.mjs      — exact-ID policy (27 checks)
#   2. workers/lib/test_identifiers.mjs    — identifier module (37 checks)
#   3. tests/test_identifiers_sync.mjs     — codegen sync + wiring (6 checks)
#   3b. tests/test_wiki_host_failclosed.mjs — staging fail-closed (11 checks)
#   3c. tests/test_staging_harden.mjs       — STAGING-HARDEN-001 (20 checks)
#   3d. tests/test_worker_entrypoint.mjs    — Workers-runtime entrypoint (9 checks)
#   3e. tests/test_path_leak.mjs              — SEC-PATH-LEAK-001 (27 checks)
#   4. workers/sec-rate-limiter/test/run.mjs        — DO under Miniflare (8)
#   5. workers/sec-rate-limiter/test/admin_login.mjs — handler-level (12)
#   6. docs/security-remediation/sec-concurrency-tests.mjs (8)
#   7. docs/security-remediation/sec-test-harness.mjs       (8)
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
run "search source-link integrity" node tests/test_search_source_link_policy.mjs
run "search versioned asset" node tests/test_search_frontend_versioned_asset.mjs
run "Barak private manifest audit" python3 tests/test_barak_slot_manifest_audit.py
run "Barak active class-count reconciliation" python3 scripts/barak/test_barak_count_gate.py
run "Barak PDF attachment hash audit (synthetic)" python3 tests/test_barak_attachment_integrity.py
run "Barak recovered-reference integrity (synthetic)" python3 tests/test_barak_recovered_references_030.py
run "Barak source-link integrity" node tests/test_barak_source_link_integrity.mjs
run "Barak backend-manifest proxy" node tests/test_barak_manifest_proxy.mjs
run "Barak cache delivery" node tests/test_barak_cache_delivery.mjs
run "Barak count and asset-query normalization" node tests/test_barak_count_cache_normalization.mjs
run "Patreon OAuth member lifecycle (synthetic)" node tests/test_patreon_member_lifecycle.mjs
run "Patreon webhook idempotency (synthetic)" node tests/test_patreon_webhook_idempotency.mjs
run "PayPal live checkout fail-closed gates (synthetic)" node tests/test_commerce_release_gates.mjs
run "source-first guides hub" node tests/test_guides_hub.mjs
run "Indexable research hubs in sitemap" node tests/test_sitemap_hubs.mjs
run "DOJ-verified 2007 NPA chronology" node tests/test_npa_chronology_018.mjs
run "2007 NPA court opinion and edition gates" node tests/test_npa_court_chain_025.mjs
run "2007 NPA separate signed counterparts" node tests/test_npa_counterparts_028.mjs
run "Internal discovery and source-led hub links" node tests/test_internal_discovery_029.mjs
run "Exact IndexNow public verification route" node tests/test_indexnow_asset_030.mjs
run "Source-accurate meta and social descriptions" node tests/test_meta_snippets_031.mjs
run "Real GAH favicon with exact static route" node tests/test_favicon_032.mjs
run "AdSense policy and original-source value gate" node tests/test_adsense_quality_gate_034.mjs
run "Barak and visual source-provenance correction" node tests/test_content_provenance_035.mjs
run "DOJ official flight logs and redacted contact book" node tests/test_doj_primary_source_guides_020.mjs
run "DOJ-linked 2007 draft indictment source finder" node tests/test_doj_draft_indictment_021.mjs
run "identifier module" node workers/lib/test_identifiers.mjs
run "identifier sync + wiring" node tests/test_identifiers_sync.mjs
run "wiki-host fail-closed" node tests/test_wiki_host_failclosed.mjs
run "staging harden-001" node tests/test_staging_harden.mjs
run "path-leak sec" node tests/test_path_leak.mjs
run "unknown API JSON contract" node tests/test_api_error_contract.mjs

if [ ! -d workers/sec-rate-limiter/node_modules ]; then
  echo "Installing miniflare for DO runtime tests..."
  (cd workers/sec-rate-limiter && npm install --no-audit --no-fund >/dev/null 2>&1) \
    || { echo "npm install failed — skipping Miniflare suites"; failed_suites+=("miniflare install"); }
fi
if [ -d workers/sec-rate-limiter/node_modules ]; then
  run "worker entrypoint" node tests/test_worker_entrypoint.mjs
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
