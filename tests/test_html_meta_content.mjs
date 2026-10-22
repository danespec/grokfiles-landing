import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../_worker.js', import.meta.url), 'utf8');
const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(source + '\nexport { htmlMetaContent, enhanceHtmlText };\n').toString('base64');
const { htmlMetaContent, enhanceHtmlText } = await import(moduleUrl);

const cases = [
  ['apostrophe in double quotes', `<meta name="description" content="Todd Blanche's answer and its limits.">`, 'name', 'description', "Todd Blanche's answer and its limits."],
  ['double quote in single quotes', `<meta content='The "no evidence" answer, in context.' name='description'>`, 'name', 'description', 'The "no evidence" answer, in context.'],
  ['quoted greater-than character', `<meta property="og:description" content="A > B is a comparison, not a verdict.">`, 'property', 'og:description', 'A > B is a comparison, not a verdict.'],
  ['unquoted attributes', '<meta name=robots content=noindex,follow>', 'name', 'robots', 'noindex,follow'],
  ['case-insensitive attribute names', '<META NAME="description" CONTENT="A complete description.">', 'name', 'description', 'A complete description.'],
  ['data attribute is not content', '<meta name="description" data-content="wrong" content="correct">', 'name', 'description', 'correct'],
  ['other metadata is ignored', '<meta name="twitter:description" content="wrong"><meta name="description" content="correct">', 'name', 'description', 'correct'],
  ['entities remain encoded for caller', '<meta name="description" content="Black &amp; Epstein&#39;s records">', 'name', 'description', 'Black &amp; Epstein&#39;s records'],
  ['empty value', '<meta name="description" content="">', 'name', 'description', ''],
  ['missing metadata', '<title>GAH</title>', 'name', 'description', ''],
];
let failures = 0;
for (const [label, html, key, value, expected] of cases) {
  try {
    assert.equal(htmlMetaContent(html, key, value), expected);
    console.log('PASS ' + label);
  } catch (error) {
    failures++;
    console.error('FAIL ' + label + ': ' + error.message);
  }
}
assert.equal(failures, 0, `${failures} metadata regressions`);

// Exercise the real HTML enhancement pipeline, where a truncated description
// would otherwise propagate into newly generated social metadata.
const description = "Todd Blanche's answer, read in full.";
const html = `<!doctype html><html lang="en"><head><title>Research</title><meta name="description" content="${description}"></head><body><main><h1>Research</h1></main></body></html>`;
const output = enhanceHtmlText(html, 'https://grokarchivehub.com/investigations/example', {}, {});
assert.equal(htmlMetaContent(output, 'name', 'description'), description);
assert.equal(htmlMetaContent(output, 'name', 'twitter:description'), 'Todd Blanche&#39;s answer, read in full.');
assert.equal(htmlMetaContent(output, 'name', 'gah-adsense-approved'), 'false');
assert.ok(!output.includes('pagead/js/adsbygoogle.js'), 'Approval gate must stay disabled');
console.log('PASS HTML enhancement preserves complete metadata and the approval gate');

const stalePolicy = html.replace('</head>', '<meta name="gah-ad-status" content="AD-EXCLUDE"><meta name="gah-ad-eligible" content="false"><meta name="gah-ad-policy" content="unclassified-route-ad-excluded"><meta name="gah-ad-zone" content="none"><meta name="gah-adsense-approved" content="true"><meta name="gah-indexability-policy" content="noindex,follow"></head>');
const refreshed = enhanceHtmlText(stalePolicy, 'https://grokarchivehub.com/investigations', {}, {});
assert.equal(htmlMetaContent(refreshed, 'name', 'gah-ad-status'), 'AD-ELIGIBLE');
assert.equal(htmlMetaContent(refreshed, 'name', 'gah-ad-eligible'), 'true');
assert.equal(htmlMetaContent(refreshed, 'name', 'gah-ad-policy'), 'investigation-hub-lower-section');
assert.equal(htmlMetaContent(refreshed, 'name', 'gah-ad-zone'), 'investigation-hub-lower-display');
assert.equal(htmlMetaContent(refreshed, 'name', 'gah-adsense-approved'), 'false');
assert.equal(htmlMetaContent(refreshed, 'name', 'gah-indexability-policy'), 'index,follow');
assert.ok(!refreshed.includes('pagead/js/adsbygoogle.js'), 'Refreshing policy metadata must not enable ads');
console.log('PASS stale embedded policy metadata follows the current route policy');
