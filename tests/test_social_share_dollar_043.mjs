import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const worker=fs.readFileSync(new URL("../_worker.js",import.meta.url),"utf8");
const start=worker.indexOf("function ensureV3DocumentShell(body) {");
const end=worker.indexOf("function ensureGlobalExperienceShell(body) {",start);
assert.ok(start>0&&end>start);
const socialTitle="Nine SARs, $1.28 Billion, $& replacement markers";
const social='<aside data-gah-social-share><button type="button" data-gah-share-title="'+socialTitle+'">Share</button></aside>';
const mocks={
 v3SocialOrganizationStructuredData:()=>"",
 v3SocialUiStyle:()=>"",
 v3LegacyCompatibilityStyle:()=>"",
 v3DocumentHeaderHtml:()=>'<header class="site-header">Site menu</header>',
 v3DocumentFooterHtml:()=>'<footer class="site-footer">Site footer</footer>',
 v3ArticleSocialShareHtml:()=>social,
 v3DiscoveryLinksHtml:()=>"",
 v3SocialProfilesHtml:()=>"",
 addBodyClass:(body)=>body,
};
const shell=vm.runInNewContext(worker.slice(start,end)+"\nensureV3DocumentShell",mocks);
const content='<html lang="en"><head><title>Nine SARs, $1.28 Billion</title></head><body><main><article class="prose" data-article><h1>Finance records</h1><p id="only-source-paragraph">One source paragraph.</p></article></main></body></html>';
const result=shell(content);
assert.ok(result.includes('data-gah-share-title="'+socialTitle+'"'),"literal dollar markers must survive");
assert.equal(result.split('id="only-source-paragraph"').length,2,"article body must not be duplicated inside attributes");
assert.equal(result.split('<article class="prose"').length,2,"one article remains one article");
assert.equal(result.split('<h1>Finance records</h1>').length,2,"headline not duplicated");
assert.equal(result.split('data-gah-social-share').length,2,"one social block");
assert.ok(result.indexOf(social)>result.indexOf('One source paragraph.'));
assert.ok(result.indexOf(social)<result.indexOf("</article>"),"social block nested before article close");
const withoutArticle=content.replace(' data-article','');
const fallback=shell(withoutArticle);
assert.ok(fallback.includes('data-gah-share-title="'+socialTitle+'"'),"fallback route also escapes replacement semantics");
assert.equal(fallback.split('data-gah-social-share').length,2);
const oldCorruption=content.replace(/(<article\b(?=[^>]*\bdata-article\b)[^>]*>[\s\S]*?)(<\/article>)/i,'$1'+social+'\n$2');
assert.notEqual(oldCorruption,result,"test must distinguish callback from old replacement-string bug");
assert.ok(oldCorruption.includes('data-gah-share-title="Nine SARs, <article'),"old behavior must reproduce the DOM-corrupting substitution");
console.log("PASS GAH-SHARE-043: dollar-sign titles do not expand into captured article HTML");
