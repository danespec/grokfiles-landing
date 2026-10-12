import fs from 'node:fs';
import assert from 'node:assert/strict';
const doc=fs.readFileSync(new URL('../search.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../assets/v3-newsletter-062.js',import.meta.url),'utf8');
assert.match(doc, /src="\/assets\/v3-newsletter-062\.js\?v=ren-search-003-20261012"/);
assert.equal((doc.match(/v3-newsletter-062\.js/g)||[]).length,1,'one script reference');
assert.match(js,/function sourceHrefForResult\(row\)/);
assert.ok(!js.includes('if (!href && /^EFTA[0-9]{8}$/i.test(id))'),'no fabricated archive URL');
console.log('PASS 4 versioned source-first script assertions');
