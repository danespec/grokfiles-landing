import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const worker=fs.readFileSync(new URL("../_worker.js",import.meta.url),"utf8");
const first=worker.indexOf("function qualifyBarakEmailIndexHtml(html)");
const end=worker.indexOf("// The raw photo index is a finder",first);
assert.ok(first>0 && end>first);
const qualify=vm.runInNewContext(worker.slice(first,end)+"\nqualifyBarakEmailIndexHtml");

const html=[
 '<!doctype html><html><head>',
 '<meta name="description" content="Recovered Barak parent email messages only. Attachment-backed slots are indexed separately and are not shown as full emails.">',
 '<title>Barak Recovered Emails</title></head><body>',
 '<p class="eyebrow">Recovered parent messages only</p><h1>Barak Recovered Emails</h1>',
 '<p>This lane lists only <strong>recovered_email</strong> records where sender, date, subject, and body excerpt were recovered from a parent source. Attachment-backed slots (5,587) and metadata-only placeholders (5,505) are not shown here as full emails.</p>',
 '<p>The docker archive export contains attachment folders only: no native <code>.html</code>, <code>.eml</code>, or <code>.mbox</code> parent files were found. Nineteen parent messages were recovered from matching Gmail-export PDF sources where mailbox and slot aligned.</p>',
 '<section data-barak-detail></section></body></html>'
].join("\n");

const result=qualify(html);
assert.ok(result.includes("Barak Email Reference Index"));
assert.ok(result.includes("HTML exports and PDF printouts"));
assert.ok(result.includes("representations of the same export"));
assert.ok(result.includes("labeled records, not 19 independently authenticated complete parent messages"));
assert.ok(result.includes("None of the 19 has been joined to a native"));
assert.ok(result.includes("extracted sender, recipient, subject and date fields"));
assert.ok(result.includes("must not be cited as verified original message metadata"));
assert.ok(result.includes('data-gah-barak-source-qualification="v1"'));
assert.ok(result.includes('<section data-barak-detail></section>'));
assert.ok(!result.includes("Nineteen parent messages were recovered"));
assert.ok(!result.includes("metadata-only placeholders (5,505)"));
assert.equal(qualify(result),result,"HTML qualification must remain idempotent");
assert.ok(worker.includes("approvedDefault: false"),"AdSense remains disabled");
assert.ok(worker.includes('headers.set("X-GAH-Barak-Source-Qualification", "v1")'));
assert.ok(worker.includes('if (proxiedPath === "/barak/emails")'));
assert.ok(worker.includes('if (proxiedPath === "/photos")'));
assert.ok(worker.includes('"unclassified-route-ad-excluded"'));
console.log("PASS GAH-BARAK-040: 19 HTML/PDF source limitations and unreliable extracted fields displayed without altering evidence or ad policy");
