# Cloudflare Access procedure — staging (STAGING-HARDEN-001)

**Scope:** staging ONLY. Covers BOTH:
- Root: `https://gah-staging-517b8499.pages.dev`
- Preview URLs: `https://<branch>.gah-staging-517b8499.pages.dev` (all branches)

**Constraints:**
- Owner-only access (Thomas).
- No account-wide policies.
- No changes to production (no Access policies on `grokarchivehub.com`,
  no changes to production Workers/Pages).

## Procedure (dashboard)

### 1. Create an Access application for the root hostname

1. Go to Zero Trust > Access > Applications > Add an application >
   Self-hosted.
2. Application name: `GAH Staging`
3. Session duration: 24 hours (staging reviews are time-boxed).
4. Add public hostname:
   - Domain: `gah-staging-517b8499.pages.dev`
5. Identity providers: use the existing account IdP (do not create a new
   one for staging).

### 2. Cover preview URLs

Preview deployments use `https://<branch>.gah-staging-517b8499.pages.dev`.
Two options:

**Option A (recommended):** Add a second public hostname with a wildcard:
   - Domain: `*.gah-staging-517b8499.pages.dev`
   (Cloudflare Access supports wildcard subdomains on the application.)

**Option B:** Create a separate application per preview branch as needed.
Prefer Option A — one policy, both hostnames.

### 3. Owner-only policy

1. In the application, go to Policies > Add a policy.
2. Policy name: `Owner only`
3. Action: Allow
4. Configure rules:
   - Include: Emails, `Thomas's email` (the account owner email)
   - Require: (none beyond the email match)
5. Add a final Deny policy for everyone else (default-deny).

### 4. Verify

1. In a private/incognito window, visit
   `https://gah-staging-517b8499.pages.dev/` — expect the Cloudflare
   Access login page, not the site.
2. Authenticate as the owner — expect the site to load.
3. Visit a preview URL (any branch) — expect the same Access gate.
4. Confirm `https://grokarchivehub.com/` loads WITHOUT an Access gate
   (production untouched).

### 5. Service token for automated smoke tests (optional)

If the smoke suites need to run against the Access-gated staging host,
create a service token (Zero Trust > Access > Service Auth):
- Name: `gah-staging-smoke`
- Bind it to the `GAH Staging` application policy (Include > Service Auth).
- Pass `CF-Access-Client-Id` / `CF-Access-Client-Secret` headers in
  `staging/smoke-tests/smoke.sh` via environment variables
  (`CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`).
- Store the token as a secret; never commit it.

## What this procedure never does

- No Access policies on the account root or on production hostnames.
- No changes to production Workers, Pages projects, DNS, or WAF rules.
- No new identity providers (uses the existing account IdP).
