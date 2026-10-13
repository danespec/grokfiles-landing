import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {execFileSync} from "node:child_process";

const root=new URL("../",import.meta.url);
const site=fs.readFileSync(new URL("index.html",root),"utf8");
const worker=fs.readFileSync(new URL("_worker.js",root),"utf8");
const privacy=fs.readFileSync(new URL("privacy.html",root),"utf8");
const policy=fs.readFileSync(new URL("editorial-policy.html",root),"utf8");
const rootPath=fileURLToPath(root);
const htmls=execFileSync("git",["ls-files","--","*.html"],{cwd:rootPath,encoding:"utf8"})
  .trim().split("\n").filter(Boolean);

assert.ok(worker.includes("approvedDefault: false"),"AdSense must remain OFF without confirmed approval");
assert.ok(worker.includes("multiplexApproved: false"),"Multiplex must remain OFF");
assert.ok(worker.includes("adPlacementAllowed = status === AD_ROUTE_STATUS.eligible || status === AD_ROUTE_STATUS.limited"));
assert.ok(worker.includes('return routePolicy(AD_ROUTE_STATUS.exclude, "unclassified-route-ad-excluded"'),
  "Unclassified route fallback must remain ad-excluded");

const eligible=worker.split("const AD_ELIGIBLE_EXACT_PATHS = new Map([")[1]?.split("]);")[0];
assert.ok(eligible,"Cannot locate narrowly reviewed eligible placements");
for(const p of ["/photos","/barak/emails","/barak/search","/archive/","/search","/reading-room","/members","/privacy"])
 assert.ok(!eligible.includes('["'+p+'"'),"Raw, private or legal routes must not become eligible: "+p);

assert.ok(worker.includes('if (path.startsWith("/barak/search")) return routePolicy(AD_ROUTE_STATUS.exclude'));
assert.ok(worker.includes('if (path.startsWith("/barak/receipts/")) return routePolicy(AD_ROUTE_STATUS.exclude'));
assert.ok(worker.includes('if (path.startsWith("/archive/EFTA"))'));
assert.ok(worker.includes('return routePolicy(AD_ROUTE_STATUS.exclude, "raw-or-generated-archive-source-card", "noindex,follow")'));
assert.ok(privacy.includes("Google-certified CMP is not yet live") || privacy.includes("Google-certified CMP is active"),
  "Privacy must accurately distinguish CMP configured vs pending");
assert.ok(policy.includes("no guilt by proximity"));
assert.ok(policy.includes("Thin generated pages"));
assert.ok(site.includes("gah-visual-provenance-note"));
assert.ok(site.includes('href="/visual-evidence"'));
assert.ok(site.includes("not an authenticated finding about any person"));
assert.ok(site.indexOf("gah-visual-provenance-note")>site.indexOf('href="/photos"'));
for(const f of htmls){
 const h=fs.readFileSync(path.join(rootPath,f),"utf8");
 assert.ok(!/<script[^>]+src=["']https?:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/i.test(h),
  "AdSense network tag must remain inactive before approval: "+f);
 assert.ok(!/<ins[^>]*class=["'][^"']*adsbygoogle/i.test(h),
  "Unapproved adsbygoogle placement appeared: "+f);
}
console.log("PASS GAH-ADSENSE-034: publisher unapproved, no live ad tags, sensitive routes excluded, original-source warning");
console.log("STATIC_HTML_FILES_CHECKED",htmls.length);
