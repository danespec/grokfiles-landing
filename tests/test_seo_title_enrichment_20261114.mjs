import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import worker from '../_worker.js';
import {READER_EDITORIAL_METADATA as meta} from '../content/reader-editorial-metadata.mjs';
import {escapeHtml,publicationRule} from '../reader-quality.mjs';
const apex='https://grokarchivehub.com',root=new URL('../',import.meta.url);
const expected={
 '/investigations/barak-st-thomas-dec-2014':'Ehud Barak and Epstein: St. Thomas, December 2014',
 '/investigations/barak-epstein-putin-qatar-carbyne':'Epstein and Barak: Putin, Qatar and Carbyne Records',
 '/investigations/leon-black-2023-sdny-referral-status':'Leon Black: 2023 Epstein-Related SDNY Referral',
 '/evidence-briefs/leon-black-158m-170m-epstein-payments':'Leon Black’s Epstein Payments: $158M vs. $170M',
 '/reels/leon-black-dechert-158-million-efta02730996':'Leon Black and Epstein: Dechert’s $158M Review',
 '/corrections/flight-log-count-and-aircraft-reconciliation':'Epstein Flight Logs: Passenger Counts and Aircraft',
 '/investigations/trump-acosta-epstein-doj-timeline':'Epstein, Acosta and Trump: DOJ Timeline, 2006–2019',
 '/research/epstein-final-48-hours-mcc':'Epstein Death Timeline: Final 48 Hours at MCC',
 '/news/efta00000468-removal-restoration-audit':'EFTA00000468: DOJ Removal and Restoration Audit',
 '/archive-scope':'Evidence Archive: Document Holdings and Scope'
};
const env={ASSETS:{async fetch(req){const u=new URL(typeof req==='string'?req:req.url);for(const path of [u.pathname,u.pathname+'.html',u.pathname.replace(/\/$/,'')+'/index.html']){try{return new Response(await fs.readFile(new URL('.'+path,root)),{headers:{'Content-Type':path.endsWith('.json')?'application/json':'text/html'}})}catch{}}return new Response('not found',{status:404})}}};
const sitemap=await(await worker.fetch(new Request(apex+'/sitemap.xml'),env)).text();
for(const [p,t] of Object.entries(expected)){
 const u=apex+p,d=meta[u];assert.equal(d.title,t);assert(t.length+19<=70);assert(d.description.length<=155);
 assert.equal(Object.values(meta).filter(x=>x.title===t).length,1,t);
 assert.equal(Object.values(meta).filter(x=>x.description===d.description).length,1,p);
 assert(sitemap.includes('<loc>'+u+'</loc>'),p+' sitemap membership');
 assert(!publicationRule(u)?.noindex,p);
 const r=await worker.fetch(new Request(u),env),html=await r.text();
 assert.equal(r.status,200,p);
 assert(!/noindex/i.test(r.headers.get('X-Robots-Tag')||''),p);
 assert(html.includes('<title>'+escapeHtml(t)+' | Grok Archive Hub</title>'),p+' live title');
 assert(html.includes('<meta name="description" content="'+escapeHtml(d.description)+'">'),p+' live description');
 assert(html.includes('<meta property="og:title" content="'+escapeHtml(t)+'">'),p+' og title');
 assert(html.includes('<meta name="twitter:title" content="'+escapeHtml(t)+'">'),p+' social title');
 assert(html.includes('rel="canonical" href="'+u+'"'),p+' canonical');
}
for(const p of ['/archive','/search','/timeline-reconstructions','/guides/epstein-flight-logs-doj','/archive/EFTA00000468']){
 const r=await worker.fetch(new Request(apex+p),env),h=await r.text();assert(/noindex/i.test(r.headers.get('X-Robots-Tag')||''),p+' must remain noindex');assert(!sitemap.includes('<loc>'+apex+p+'</loc>'),p+' excluded');
 if(p.endsWith('EFTA00000468'))assert(h.includes('<title>EFTA00000468: Desk with Framed Photos | Grok Archive Hub</title>'));
}
console.log('PASS ten enriched live Worker metadata routes, unique titles/descriptions, OG/Twitter parity, canonical/indexability, excluded controls');
