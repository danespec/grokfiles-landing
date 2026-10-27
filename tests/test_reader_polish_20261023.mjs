import { workerTestSource } from './worker-test-source.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const source=await readFile(new URL('_worker.js',root),'utf8');
const {enhanceHtmlText}=await import('data:text/javascript;base64,'+Buffer.from(workerTestSource(source)+'\nexport {enhanceHtmlText};').toString('base64'));
const url='https://grokarchivehub.com/investigations/reader-test';
const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll("'",'&#39;').replaceAll('<','&lt;').replaceAll('>','&gt;');
for(const title of ['Nine SARs, $1.28 Billion','From $18M to $5.5M','A $2 million record','$& receipt',"$` and $' remain literal"]){
  for(const article of [true,false]){
    const input=`<!doctype html><html lang="en"><head><title>${escape(title)}</title><meta property="og:title" content="${escape(title)}"><link rel="canonical" href="${url}"></head><body><main>${article?'<article data-article>':''}<h1>${escape(title)}</h1><h2 id="unique-proof">Source receipt</h2>${article?'</article>':''}</main></body></html>`;
    const output=enhanceHtmlText(input,url,{},{});
    assert.equal((output.match(/id="unique-proof"/g)||[]).length,1,title+' must not duplicate source content into share controls');
    assert.equal((output.match(/<h1\b/g)||[]).length,1);
    assert.equal((output.match(/data-gah-share-action=/g)||[]).length,4);
    assert.ok(output.includes('data-gah-share-title="'+escape(title)+'"'),title+' survives literally');
    assert.match(output,/<main id="main" tabindex="-1">/);
    assert.match(output,/<a class="skip" href="#main">/);
  }
}
for(const file of ['index.html','investigations/jpmorgan-nine-sars-epstein.html','investigations/black-family-partners-18m-to-5-5m-repricing.html']){
  let html=await readFile(new URL(file,root),'utf8');
  for(let pass=0;pass<2;pass++){
    html=enhanceHtmlText(html,'https://grokarchivehub.com/'+file.replace(/index\.html$/,'').replace(/\.html$/,''),{},{});
    for(const name of ['v3-ui-054','consent-ui-054'])assert.equal((html.match(new RegExp('href="/assets/'+name+'\\.css(?:\\?[^\"]*)?"','g'))||[]).length,1,file+' one '+name);
    const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(ids.length,new Set(ids).size,file+' unique IDs');
    assert.doesNotMatch(html,/pagead\/js\/adsbygoogle\.js/);
  }
}
const alternate=enhanceHtmlText('<html><head></head><body><a class="skip-link" href="#main">Skip</a><main id="main-content"><h1>Existing target</h1></main></body></html>','https://grokarchivehub.com/about',{},{});
assert.match(alternate,/class="skip-link" href="#main-content"/);
assert.match(alternate,/<main id="main-content" tabindex="-1">/);
console.log('PASS literal financial/share titles; no article duplication; skip targets and focusability; one shared stylesheet after repeated enhancement; real affected articles; ads remain disabled');
