import fs from 'node:fs';
import { normalizeAnalyticsHtml } from './analytics-html.mjs';
const files={'analytics.js':'application/javascript; charset=utf-8','consent.js':'application/javascript; charset=utf-8','consent.css':'text/css; charset=utf-8'};
const prefix='/__gah-analytics/';
const config={schema:'gah.consent.v2',unifiedConsent:true,googleTagEnabled:true,ga4MeasurementId:'G-XHE84C8D1V',adsenseApproved:false,deferToGoogleCmpWhenPresent:true,googleCmpConfiguredByPublisher:false,googleCmpAnalyticsEnabled:false,tcfVersionSupport:'2.3',adsDataRedaction:true};
const scripts='<script data-cfasync="false">window.GAH_CONSENT_BOOT='+JSON.stringify(config)+';window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};window.gtag("consent","default",{analytics_storage:"denied",ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied"});window.gtag("set","ads_data_redaction",true);</script><link rel="stylesheet" href="'+prefix+'consent.css?v=GAH-ANALYTICS-PARITY-001"><script data-cfasync="false" src="'+prefix+'analytics.js?v=GAH-ANALYTICS-PARITY-001"></script><script data-cfasync="false" defer src="'+prefix+'consent.js?v=GAH-ANALYTICS-PARITY-001"></script>';
export function attachWikiAnalytics(req,res){
 if(!['GET','HEAD'].includes(req.method)||String(req.headers.host||'').split(':')[0].toLowerCase()!=='wiki.grokarchivehub.com'||req.headers['x-gah-internal-wiki-proxy'])return false;
 const path=new URL(req.url,'https://wiki.grokarchivehub.com').pathname;
 if(path.startsWith(prefix)){
  const name=path.slice(prefix.length);if(!Object.hasOwn(files,name))return false;
  res.writeHead(200,{'Content-Type':files[name],'Cache-Control':'public,max-age=300','X-Content-Type-Options':'nosniff'});
  res.end(req.method==='HEAD'?'':fs.readFileSync(new URL('./'+name,import.meta.url)));return true;
 }
 if(!/^\/(?:$|archive(?:\/|$)|receipts(?:\/|$)|research-index$|research(?:\/|$)|topics(?:\/|$)|pdf-lite(?:\.html)?$)/.test(path))return false;
 res.gahPublicAnalytics=body=>{res.setHeader('X-GAH-Analytics-Instrumentation','GAH-ANALYTICS-PARITY-001');return normalizeAnalyticsHtml(String(body),scripts);};
 return false;
}
