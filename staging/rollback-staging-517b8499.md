# Staging rollback plan — STAGING-HARDEN-001

**Scope: staging ONLY.** These resources:
- Pages: `gah-staging-517b8499` → `https://gah-staging-517b8499.pages.dev`
- Worker: `gah-limiter-staging-517b8499` (rate limiter + DO)
- Worker: `gah-mock-staging-517b8499` (mock wiki backend)

**Never roll staging back to an unguarded production Worker.** The staging
Pages project must only ever bind to `gah-limiter-staging-517b8499`, never
to the production `gah-sec-rate-limiter`. The production worker has no
`GAH_STAGING` guard and no staging rate-limit budgets.

**Order matters:** do NOT delete the mock backend before the Pages site is
safely disabled or restored. If the mock is deleted first while the Pages
site still points at it, search returns 503 (fail-closed by design — safe,
but noisy). Disable or roll back the Pages site first.

## Rollback scenarios

### A. Bad Pages deployment (most likely)

```bash
# List deployments, identify the last good one:
wrangler pages deployment list --project-name=gah-staging-517b8499

# Roll back via dashboard:
# Pages > gah-staging-517b8499 > Deployments > ... > Rollback to this deployment
#
# Or via CLI (interactive):
wrangler pages deployment rollback --project-name=gah-staging-517b8499
```

Verify: `curl -sI https://gah-staging-517b8499.pages.dev/ | grep -i x-robots-tag`
must show `noindex, nofollow, noarchive` (proves the hardened worker is serving).

### B. Bad rate-limiter worker deployment

```bash
# Roll back to the previous version (keeps the DO data — throttle counters
# are per-window and expire naturally):
wrangler rollback --name=gah-limiter-staging-517b8499

# Or redeploy the known-good source (explicit --name: never rely on wrangler.toml):
cd workers/sec-rate-limiter
wrangler deploy --config wrangler.staging.toml --name=gah-limiter-staging-517b8499
```

The Pages site degrades gracefully without the limiter (fail-open by design;
smoke test `bindings.sh` covers the missing/unavailable states).

### C. Bad mock backend deployment

```bash
cd workers/mock-wiki-backend
# Redeploy from the reviewed source (explicit --name: never rely on wrangler.toml):
wrangler deploy --name=gah-mock-staging-517b8499
```

If the mock is down, staging search returns 503 `wiki_host_unconfigured`
(fail-closed — never falls back to production). Restore the mock before
re-testing search.

### D. Full staging teardown (decommission)

Order (mock LAST):
1. Disable the Pages project: Pages > gah-staging-517b8499 > Settings >
   Delete project (or pause via dashboard).
2. Verify the pages.dev URL no longer serves.
3. Delete workers:
   ```bash
   wrangler delete --name=gah-limiter-staging-517b8499
   wrangler delete --name=gah-mock-staging-517b8499
   ```
4. The staging DO namespace is deleted with the worker; its counters were
   staging-only and ephemeral.

## What this plan never does

- Never touches `gah-sec-rate-limiter` (production), the production Pages
  project, production DNS, secrets, KV, D1, or routes.
- Never deletes `gah-mock-staging-517b8499` while `gah-staging-517b8499`
  is still serving traffic.
- Never binds staging to a production worker.
