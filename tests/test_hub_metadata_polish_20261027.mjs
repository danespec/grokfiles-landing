import assert from 'node:assert/strict';
import {qualityHtml,readerQualityResponse,conciseText} from '../reader-quality.mjs';
import worker from '../_worker.js';
const page='<html><head><title>'+('A detailed documentary title '.repeat(8))+' | Grok Archive Hub</title><meta name="description" content="'+('Source records and evidence limits. '.repeat(12))+'"></head><body><main><h1>Evidence overview</h1><a href="/cdn-cgi/l/email-protection#abc">Email</a><a href="mailto:test@example.com">Email</a><a href="/api/pdf">PDF</a><a href="/auth/patreon/start?return_to=/members" rel="noopener">Sign in</a><a href="/research/trump-epstein-documented-timeline#receipts">Timeline</a></main></body></html>';
const html=qualityHtml(page,'https://grokarchivehub.com/example');
assert.ok(html.match(/<title>(.*?)<\/title>/)[1].length<=70);assert.ok(html.match(/name="description" content="([^"]*)/)[1].length<=155);
assert.doesNotMatch(html,/cdn-cgi\/l\/email-protection|mailto:|href="[^"]*\/api\/pdf"/);assert.match(html,/rel="noopener nofollow"/);assert.match(html,/https:\/\/wiki.grokarchivehub.com\/research\/trump-epstein-documented-timeline#receipts/);
assert.ok(conciseText('Unique EFTA00000468 source note',51).includes('EFTA00000468'));
const barak=qualityHtml(page,'https://grokarchivehub.com/barak');assert.ok(barak.indexOf('id="published-research"')<barak.indexOf('id="research-tools"'));assert.match(barak,/documentary-record/);
for(const method of ['GET','HEAD']){const r=await readerQualityResponse(new Response(method==='HEAD'?null:page,{headers:{'Content-Type':'text/html'}}),new Request('https://grokarchivehub.com/investigations/mcc-final-48-hours-source-chain',{method}),[]);assert.equal(r.headers.get('X-Robots-Tag'),'noindex,follow');if(method==='GET')assert.match(await r.text(),/rel="canonical" href="https:\/\/grokarchivehub.com\/research\/epstein-final-48-hours-mcc"/);}
const map=await(await worker.fetch(new Request('https://grokarchivehub.com/sitemap.xml'),{})).text();assert.doesNotMatch(map,/<loc>https:\/\/grokarchivehub.com\/investigations\/mcc-final-48-hours-source-chain<\/loc>/);assert.match(map,/<loc>https:\/\/grokarchivehub.com\/research\/epstein-final-48-hours-mcc<\/loc>/);
console.log('PASS bounded metadata, direct owner links, contact/PDF navigation, nofollow sign-in, published-first hub and GET/HEAD primary MCC policy');

const sourceAddress=qualityHtml('<html><head><title>Source note</title></head><body><main><h1>Source note</h1><p>archive@example.com</p></main></body></html>','https://grokarchivehub.com/example');assert.match(sourceAddress,/<!--email_off-->archive@example.com<!--\/email_off-->/);console.log('PASS literal source addresses retained without edge-generated utility links');
