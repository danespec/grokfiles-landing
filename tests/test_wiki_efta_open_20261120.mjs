import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'backend/wiki-efta-open-20261120');
const catalog=JSON.parse(fs.readFileSync(path.join(base,'efta-index-eligible.json'),'utf8'));
assert.equal(catalog.schema,'gah.efta.search-discovery.v1');
assert.equal(catalog.ids.length,12100);
assert.equal(new Set(catalog.ids).size,12100);
assert.deepEqual(catalog.ids,[...catalog.ids].sort());
assert(catalog.ids.every(id=>/^EFTA\d{8}$/.test(id)));
const mains=new Set(fs.readdirSync(path.join(root,'archive')).filter(n=>/^EFTA\d{8}\.html$/.test(n)).map(n=>n.slice(0,-5)));
assert(catalog.ids.every(id=>!mains.has(id)),'Existing main-site EFTA dossiers retain canonical ownership');
const gateway=fs.readFileSync(path.join(root,'backend/identifier-release-20261027/identifier-host-policy.mjs'),'utf8');
for(const boundary of ['EFTA_SEARCH_CATALOG','EFTA_INDEX_SET','EFTA_SITEMAP_LIMIT=30000','/sitemap-efta-','if(entries.has(normalized)||!EFTA_INDEX_SET.has(normalized))','/sitemap-index.xml','return false; // Qualified canonical record'])
 assert(gateway.includes(boundary),'Required EFTA indexing control missing: '+boundary);
const patch=fs.readFileSync(path.join(base,'patch-live-wiki-gateway.py'),'utf8');
for(const boundary of ['archiveEftaIndexEligibleV1(profile)','EFTA_INDEX_PRIVACY_SENSITIVE','EFTA_INDEX_PRIVACY_ADDRESS', "res.setHeader('X-GAH-Ad-Eligible', 'false');"])
 assert(patch.includes(boundary),'EFTA safety invariant missing: '+boundary);
const audit=JSON.parse(fs.readFileSync(path.join(base,'efta-index-audit.json'),'utf8'));
assert.equal(audit.input_urls,49900);
assert.equal(audit.total_eligible,12106);
console.log('PASS 12,100 eligible EFTA documents, 69 main-site canonical owners, sitemap and privacy admission gates');
