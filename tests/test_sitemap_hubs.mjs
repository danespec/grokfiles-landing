import assert from "node:assert/strict";
import fs from "node:fs";

const worker = fs.readFileSync(new URL("../_worker.js", import.meta.url), "utf8");
const begin = worker.indexOf("const CORE_SITEMAP_ENTRIES = [");
const end = worker.indexOf("\n];", begin);
assert.ok(begin >= 0 && end > begin, "missing core sitemap entries");
const core = worker.slice(begin, end);
const mustIndex = [
  "https://grokarchivehub.com/research-index",
  "https://grokarchivehub.com/barak/emails",
  "https://grokarchivehub.com/guides"
];
for (const url of mustIndex) {
  const exact = JSON.stringify(url);
  const regex = new RegExp(exact.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
  assert.equal((core.match(regex) || []).length, 1, "must include once: " + url);
}
assert.ok(!core.includes('"https://grokarchivehub.com/search"'), "noindex search must not enter sitemap");
assert.ok(core.includes("GAH-SEO-HUBS-017"));
const manifest = fs.readFileSync(new URL("../docs/phase0/SEO_HUB_SITEMAP_017.md",import.meta.url),"utf8");
assert.ok(manifest.includes("index,follow"));
assert.ok(manifest.includes("noindex,follow"));
assert.ok(manifest.includes("URL is unknown to Google"));
console.log("PASS exact indexable hub sitemap entries and noindex exclusion");
