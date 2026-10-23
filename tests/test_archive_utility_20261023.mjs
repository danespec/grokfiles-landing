import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

if (!process.argv[2]) {
  console.log('SKIP: supply the staged wiki server.js path for renderer checks');
  process.exit(0);
}
const source = fs.readFileSync(process.argv[2], 'utf8');
const context = {
  bankingRecordFor: () => null,
  archiveSourceBackedRowsHtmlV1: p => `<tr><th>Record ID</th><td>${p.clean}</td></tr>`,
  bankingSeoMeta: () => null,
  bankingDocumentJsonLd: () => '',
  bankingBreadcrumbJsonLd: () => '',
  bankingFinancialContextHtml: () => ''
};
vm.createContext(context);
for (const name of ['escapeHtml', 'archiveDescription', 'archiveRelatedIds', 'archiveDossierJsonLdV2', 'archiveEvidenceDossierStyleV2', 'archiveEvidenceDossierHtmlV2', 'archivePageHtmlV1']) {
  const start = source.indexOf(`function ${name}(`);
  const next = source.indexOf('\nfunction ', start + 1);
  assert(start >= 0 && next > start, name);
  vm.runInContext(source.slice(start, next), context);
}
let checked = 0;
for (const ocr of ['', 'short source text', 'source text '.repeat(100)]) {
  const profile = {clean:'EFTA02237829', hasPdf:true, hasOcrFile:true,
    ocrExcerpt:ocr, ocrRaw:ocr, fileMtime:'2026-03-16T06:28:07.109Z'};
  const html = context.archivePageHtmlV1(profile.clean, profile);
  assert.match(html, /name="robots" content="noindex,follow"/);
  assert.match(html, /name="grok-ad-eligible" content="false"/);
  assert.match(html, /@type":"WebPage"/);
  assert.doesNotMatch(html, /@type":"Article"|datePublished|dateModified|article:modified_time|Open receipt slots|Why this record matters|Relevant chronology/);
  assert.match(html, /\/pdf-lite\?id=EFTA02237829/);
  if (ocr) assert.match(html, /\/api\/source\?id=EFTA02237829/);
  else assert.doesNotMatch(html, /\/api\/source\?id=/);
  assert.match(html, /id="ocr-excerpt-heading"|id="record-metadata-heading"/);
  assert.equal((html.match(/<h1>/g) || []).length, 1);
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
  if (ocr) assert(html.includes(ocr));
  checked++;
}
const hostile = {clean:'EFTA02237829', hasPdf:true, hasOcrFile:true,
  ocrExcerpt:'<script>alert(1)</script>', ocrRaw:'EFTA00080532 EFTA02237829'};
const safe = context.archivePageHtmlV1(hostile.clean, hostile);
assert(safe.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
assert(!safe.includes('<script>alert(1)</script>'));
assert(safe.includes('href="/archive/EFTA00080532"'));
assert(!safe.includes('Connected investigations and clusters'));
console.log(`PASS ${checked} source states, consistent noindex/ad exclusion, truthful schema, source access, related IDs and OCR escaping`);
