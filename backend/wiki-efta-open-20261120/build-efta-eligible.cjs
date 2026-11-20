'use strict';
const fs=require('fs');
const ocr='/doj/All Data/ocr-output-new';
const sourceFile='/tmp/gah-wiki-efta-source-ids-20261120.txt';
const destination='/tmp/gah-wiki-efta-index-eligible-20261120.json';
const full=fs.readFileSync(sourceFile,'utf8').split(/\s+/).filter(x=>/^EFTA\d{8}$/.test(x));
const bank=JSON.parse(fs.readFileSync('/app/banking_v1/banking_records_by_id.json','utf8'));
const email=/[a-z0-9_.+-]+@[a-z0-9_.-]+\.[a-z]{2,}/i;
const phone=/\b(?:\+?1[.\- ])?\(?\d{3}\)?[.\- ]\d{3}[.\- ]\d{4}\b/;
const ssn=/\b(?:social security (?:number|#)|ssn|passport number|driver(?:'s)? licen[sc]e|routing number|account number|\d{3}-\d{2}-\d{4})\b/i;
const sensitive=/\b(?:victim(?:s)?|survivor(?:s)?|underage|minor(?:s)?|juvenile|traffick(?:ing|ed)|sexual abuse|sex abuse|sexual assault|rape|Jane Doe|John Doe|complainant|witness identity|confidential informant|sealed identity|redacted names|protected identity|contact book|black book|address book)\b/i;
const address=/\b\d{1,5}\s+[A-Za-z0-9 .-]{3,35}\s+(?:street|st\.?|avenue|ave\.?|road|rd\.?|drive|dr\.?|blvd\.?|boulevard|lane|ln\.?|court|ct\.?|way|apartment|apt\.?)\b/i;
function excerpt(text) {
  const internalPrefixes=['/volume1/','/Volumes/'];
  return text.split(/\r?\n/).map(line=>{
    let out=line,trim=line.trim();
    if(/^SourcePDF\s*:/i.test(trim))return '';
    if(internalPrefixes.some(p=>trim.startsWith(p)))return '';
    out=out.replace(/\bSourcePDF\s*:\s*[^\r\n]*/ig,'');
    out=out.replace(/^\s*Alpha\s*:\s*/i,'');
    for(const p of internalPrefixes){const i=out.indexOf(p);if(i>=0)out=out.slice(0,i)}
    return out.trim();
  }).filter(Boolean).join(' ').replace(/\s+/g,' ').trim().slice(0,2400);
}
const good=[];const stat={bank_protected_exclusions:0,input_urls:full.length,bank_records_all:Object.keys(bank).length,bank_indexable:0,bank_eligible:0,ocr_eligible:0,ocr_absent:0,ocr_short:0,risk_email:0,risk_phone:0,risk_ssn:0,risk_address:0,risk_sensitive:0,meaningless:0,read_errors:0};
const sources=new Set(full);
for(const [id,row] of Object.entries(bank)){if(row?.indexing_policy==='indexable'){stat.bank_indexable++;if(!sources.has(id)&&fs.existsSync(ocr+'/'+id+'.txt'))sources.add(id)}}
const ids=Array.from(sources).sort();
for(let i=0;i<ids.length;i++){
 const id=ids[i],b=bank[id];
 if(b?.indexing_policy&&b.indexing_policy!=='indexable'){stat.bank_protected_exclusions++;continue;}
 if(!fs.existsSync(ocr+'/'+id+'.txt')){stat.ocr_absent++;continue}
 try{
  const fd=fs.openSync(ocr+'/'+id+'.txt','r');const buf=Buffer.allocUnsafe(64000);const n=fs.readSync(fd,buf,0,64000,0);fs.closeSync(fd);
  let val=excerpt(buf.toString('utf8',0,n));
  const bankApproved=b?.indexing_policy==='indexable';
  // Existing human editorial banking review controls eligibility only when
  // the public OCR excerpt contains no contact/identity-risk marker.
  if(val.length<800){stat.ocr_short++;continue}
  if(email.test(val)){stat.risk_email++;continue}
  if(phone.test(val)){stat.risk_phone++;continue}
  if(ssn.test(val)){stat.risk_ssn++;continue}
  if(address.test(val)){stat.risk_address++;continue}
  if(sensitive.test(val)){stat.risk_sensitive++;continue}
  if((val.match(/[A-Za-z]/g)||[]).length<300){stat.meaningless++;continue}
  good.push(id);if(bankApproved)stat.bank_eligible++;else stat.ocr_eligible++;
 }catch(err){stat.read_errors++}
 if((i+1)%5000===0)console.log('PROGRESS',i+1,'/',ids.length,'eligible',good.length,JSON.stringify({ocr_absent:stat.ocr_absent,short:stat.ocr_short,risk_email:stat.risk_email,risk_sensitive:stat.risk_sensitive}),Date.now());
}
const out={schema:'gah.efta.search-discovery.v1',date:'2026-11-20',source_files:'existing public OCR EFTA IDs, anchored to 49,900 preexisting archive sitemap and indexable banking records',privacy_gate:'exclude potential email/phone/SSN/street-address/victim-or-protected-identity cues in rendered bounded excerpt',length_gate:'at least 800 visible excerpt characters and 300 letters',ids:good};
fs.writeFileSync(destination,JSON.stringify(out));stat.total_input=ids.length;stat.total_eligible=good.length;stat.excluded=ids.length-good.length;
fs.writeFileSync('/tmp/gah-wiki-efta-inventory-stat-20261120.json',JSON.stringify(stat,null,2));
console.log('COMPLETE',JSON.stringify(stat));
