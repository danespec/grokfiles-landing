import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../_worker.js", import.meta.url), "utf8");
const start = source.indexOf("function qualifyBarakEmailIndexHtml(html)");
const end = source.indexOf("async function proxyProofLayer(request, env = {})", start);
assert.ok(start > 0 && end > start && end - start < 12000);
const methods = vm.runInNewContext(
  source.slice(start,end) + "\n({ qualifyBarakEmailIndexHtml, contextualizePhotoIndexHtml })"
);

const html = [
  '<!doctype html><html><head>',
  '<meta name="description" content="Recovered Barak parent email messages only. Attachment-backed slots are indexed separately and are not shown as full emails.">',
  '<title>Barak Recovered Emails</title></head><body><main>',
  '<p class="eyebrow">Recovered parent messages only</p>',
  '<h1>Barak Recovered Emails</h1>',
  '<p class="lede">This lane lists only <strong>recovered_email</strong> records where sender, date, subject, and body excerpt were recovered from a parent source. Attachment-backed slots (5,587) and metadata-only placeholders (5,505) are not shown here as full emails.</p>',
  '<section class="note"><p>The docker archive export contains attachment folders only: no native <code>.html</code>, <code>.eml</code>, or <code>.mbox</code> parent files were found. Nineteen parent messages were recovered from matching Gmail-export PDF sources where mailbox and slot aligned.</p></section>',
  '<section data-barak-detail></section>',
  '<label>Search recovered emails</label>',
  '<input placeholder="Search sender, subject, mailbox, date, or excerpt">',
  '</main></body></html>'
].join("\n");

const fixed = methods.qualifyBarakEmailIndexHtml(html);
for (const phrase of [
  "Barak Email Reference Index", "19 inventory entries",
  "labeled records, not 19 independently authenticated complete parent messages",
]) assert.ok(fixed.includes(phrase), "Missing corrected source context: "+phrase);
for(const phrase of [
  "Nineteen parent messages were recovered",
  "sender, date, subject, and body excerpt were recovered from a parent source",
  "Recovered parent messages only",
  "metadata-only placeholders (5,505)",
  "Search recovered emails"
]) assert.ok(!fixed.includes(phrase), "Unsupported legacy text remains: "+phrase);
assert.ok(fixed.includes('data-gah-barak-source-qualification="v1"'));
assert.equal((fixed.match(/data-gah-barak-source-qualification="v1"/g)||[]).length,1);
assert.equal(methods.qualifyBarakEmailIndexHtml(fixed),fixed,"Barak correction must be idempotent");

const photo = '<html><body><div class="wrap"><section class="hero"><h1>Incoming Visual Evidence</h1></section>\n<div class="controls"><input id="q"></div><div id="grid" class="grid"></div></div></body></html>';
const annotated = methods.contextualizePhotoIndexHtml(photo);
assert.ok(annotated.includes('data-gah-visual-source-qualification="v1"'));
assert.ok(annotated.includes("76,060 indexed image objects"));
assert.ok(annotated.includes("76,948 extraction rows"));
assert.ok(annotated.includes("888 duplicate rows skipped"));
assert.ok(annotated.includes("not an editorially authenticated gallery"));
assert.ok(annotated.includes('href="/visual-evidence"'));
assert.ok(annotated.includes('href="/corrections"'));
assert.ok(annotated.indexOf('data-gah-visual-source-qualification')<annotated.indexOf('class="controls"'));
assert.equal(methods.contextualizePhotoIndexHtml(annotated),annotated,"Photo note must be idempotent");
assert.ok(annotated.includes('<div id="grid" class="grid"></div>'));
assert.ok(source.includes('if (proxiedPath === "/barak/emails")'));
assert.ok(source.includes('if (proxiedPath === "/photos")'));
assert.ok(source.includes('headers.set("X-GAH-Barak-Source-Qualification", "v1")'));
assert.ok(source.includes('headers.set("X-GAH-Visual-Source-Qualification", "v1")'));
assert.ok(source.includes('approvedDefault: false'));
assert.ok(source.includes('"unclassified-route-ad-excluded"'));
console.log("PASS GAH-CONTENT-PROVENANCE-035: source limits, image metadata, idempotent correction and ad exclusions");
