#!/usr/bin/env node
/**
 * GAH-PUBLIC-SMOKE-016 — read-only, bounded public release verification.
 * No credentials, browser cookies, downloads to disk, private wiki access or payments.
 * A WAF/transport error is reported as unavailable, not as proof a document vanished.
 */
import { strict as assert } from "node:assert";

const origin = "https://grokarchivehub.com";
const checks = [
  ["/", "html"],
  ["/news", "html"],
  ["/research-index", "html"],
  ["/search", "html"],
  ["/guides", "html"],
  ["/guides/how-to-search-epstein-files", "html"],
  ["/barak/emails", "html"],
  ["/visual-evidence", "html"],
  ["/photos", "html"],
  ["/archive/EFTA00404605", "html"],
  ["/investigations/hold-the-letter", "html"],
  ["/hold-the-letter.html", "legacy-redirect"],
  ["/robots.txt", "robots"],
  ["/sitemap.xml", "sitemap"],
  ["/api/commerce/paypal/live/launch-status", "commerce-disabled"]
];
const errors = [];
for (const [path, expectation] of checks) {
  let status = "UNAVAILABLE";
  try {
    const response = await fetch(origin + path, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(18000),
      headers: { "Accept": "text/html,application/json,application/xml,text/plain" }
    });
    status = String(response.status);
    if (expectation === "legacy-redirect") {
      assert.equal(response.status, 301, "expected permanent legacy redirect");
      const target = response.headers.get("location") || "";
      assert.equal(new URL(target, origin).pathname, "/investigations/hold-the-letter");
    } else {
      assert.equal(response.status, 200, "expected successful public response");
      const type = (response.headers.get("content-type") || "").toLowerCase();
      const body = await response.text();
      if (expectation === "html") {
        assert.match(type, /text\/html/, "expected HTML content");
        assert.match(body, /<title[^>]*>[^<]+<\/title>/i, "missing page title");
        assert.ok(!/cloudflare access|cf-access/i.test(body.slice(0, 8000)), "unexpected private access challenge");
      } else if (expectation === "robots") {
        assert.match(body, /sitemap:\s*https:\/\/grokarchivehub\.com\/sitemap\.xml/i);
      } else if (expectation === "sitemap") {
        assert.match(type, /(xml|text\/plain)/, "expected XML sitemap");
        assert.ok(body.includes("<loc>https://grokarchivehub.com/guides</loc>"), "missing Guides sitemap URL");
        assert.ok(body.includes("<loc>https://grokarchivehub.com/"), "expected sitemap loc values");
      } else if (expectation === "commerce-disabled") {
        const data = JSON.parse(body);
        assert.equal(data.live_customer_checkout_available, false, "checkout must remain disabled");
        assert.equal(data.live_checkout_operator_approved, false, "unapproved merchant launch");
      }
    }
    console.log("PASS", status, path);
  } catch (error) {
    const reason = String(error?.message || error).replace(/\s+/g, " ").slice(0, 180);
    errors.push({ path, status, reason });
    console.log("FAIL", status, path, "-", reason);
  }
}
console.log(JSON.stringify({
  checkedAtUtc: new Date().toISOString(),
  origin,
  tested: checks.length,
  passed: checks.length - errors.length,
  failed: errors.length,
  note: "Public read-only checks; 403/timeout means probe unavailable, not missing evidence"
}));
if (errors.length) process.exitCode = 1;
