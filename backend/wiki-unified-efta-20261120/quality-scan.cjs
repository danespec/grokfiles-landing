'use strict';
const fs=require('fs'),path=require('path');
const OCR='/doj/All Data/ocr-output-new',OUT='/tmp/gah-unified-media-inventory-20261120';
const published=new Set(JSON.parse(fs.readFileSync('/app/efta-index-eligible-20261120.json','utf8')).ids);
const bank=JSON.parse(fs.readFileSync('/app/banking_v1/banking_records_by_id.json','utf8'));
const primary=new Set(JSON.parse(fs.readFileSync('/app/identifier-dossiers.json','utf8')).entries.map(e=>e.id));
const paths=new Map();
const dirs=fs.readdirSync(OCR,{withFileTypes:true});
const directoryNames=dirs.filter(x=>x.isDirectory()).map(x=>x.name).filter(x=>/^DS\d+_chunk_\d+$/i.test(x));
function addFiles(dir,prefer){
 try{
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
   if(!ent.isFile())continue;const m=ent.name.match(/^(EFTA\d{8})\.txt$/i);
   if(!m)continue;const id=m[1].toUpperCase();
   if(!paths.has(id)||prefer)paths.set(id,dir+'/'+ent.name);
  }
 }catch(e){}
}
// Root-file source precedence matches archiveTxtPathForId's direct-file lookup.
for(const dir of directoryNames)addFiles(OCR+'/'+dir,false);
addFiles(OCR,true);
const patterns={
 email:/[a-z0-9_.+-]+@[a-z0-9_.-]+\.[a-z]{2,}/i,
 phone:/\b(?:\+?1[.\- ])?\(?\d{3}\)?[.\- ]\d{3}[.\- ]\d{4}\b/,
 identifiers:/\b(?:social security (?:number|#)|ssn|passport number|driver(?:'s)? licen[sc]e|routing number|account number|\d{3}-\d{2}-\d{4})\b/i,
 address:/\b\d{1,5}\s+[A-Za-z0-9 .-]{3,35}\s+(?:street|st\.?|avenue|ave\.?|road|rd\.?|drive|dr\.?|blvd\.?|boulevard|lane|ln\.?|court|ct\.?|way|apartment|apt\.?)\b/i,
 protected:/\b(?:victim(?:s)?|survivor(?:s)?|underage|minor(?:s)?|juvenile|traffick(?:ing|ed)|sexual abuse|sex abuse|sexual assault|rape|Jane Doe|John Doe|complainant|witness identity|confidential informant|sealed identity|redacted names|protected identity|contact book|black book|address book)\b/i
};
const stats={total_ocr_ids:paths.size,processed:0,errors:0,prior_indexed:0,bank_holds:0,main_dossier_holds:0,short:0,low_letters:0,risk_excerpt:{},strict_additional_risk:{},excerpt_only_eligible:0,strict_eligible:0,new_strict_eligible:0};
const eligibleExcerpt=[],eligibleStrict=[],newStrict=[];
const textSanitize=text=>String(text).split(/\r?\n/).map(line=>{
 const t=line.trim();
 if(/^SourcePDF\s*:/i.test(t)||t.startsWith('/volume1/')||t.startsWith('/Volumes/'))return '';
 let o=t.replace(/\bSourcePDF\s*:\s*[^\r\n]*/ig,'').replace(/^\s*Alpha\s*:\s*/i,'').replace(/\bAlpha\s*:\s*/ig,'');
 for(const p of ['/volume1/','/Volumes/']){const i=o.indexOf(p);if(i>=0)o=o.slice(0,i)}
 return o.trim()
}).filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
const ordered=[...paths.keys()].sort();
for(const id of ordered){
 stats.processed++;
 if(primary.has(id)){stats.main_dossier_holds++;continue}
 if(bank[id]?.indexing_policy&&bank[id].indexing_policy!=='indexable'){stats.bank_holds++;continue}
 let full='';
 try {
  const fd=fs.openSync(paths.get(id),'r');const b=Buffer.allocUnsafe(64000),n=fs.readSync(fd,b,0,64000,0);fs.closeSync(fd);
  full=textSanitize(b.toString('utf8',0,n));
 }catch(e){stats.errors++;continue}
 const excerpt=full.slice(0,2400);
 if(excerpt.length<800){stats.short++;continue}
 if((excerpt.match(/[A-Za-z]/g)||[]).length<300){stats.low_letters++;continue}
 let bad=false;
 for(const [key,pattern]of Object.entries(patterns))if(pattern.test(excerpt)){stats.risk_excerpt[key]=(stats.risk_excerpt[key]||0)+1;bad=true}
 if(bad)continue;
 eligibleExcerpt.push(id);stats.excerpt_only_eligible++;
 let riskyFull=false;
 for(const [key,pattern]of Object.entries(patterns))if(pattern.test(full)){stats.strict_additional_risk[key]=(stats.strict_additional_risk[key]||0)+1;riskyFull=true}
 if(riskyFull)continue;
 eligibleStrict.push(id);stats.strict_eligible++;
 if(!published.has(id)){newStrict.push(id);stats.new_strict_eligible++}else stats.prior_indexed++;
 if(stats.processed%25000===0)console.log('PROGRESS',stats.processed,stats.strict_eligible,stats.new_strict_eligible)
}
fs.writeFileSync(OUT+'/ocr-screened-full-excerpt-candidates-20261120.json',JSON.stringify({schema:'gah.ocr.safety.candidates.v1',date:'2026-11-20',ids:eligibleExcerpt}),{mode:0o600});
fs.writeFileSync(OUT+'/ocr-screened-strict-candidates-20261120.json',JSON.stringify({schema:'gah.ocr.safety.candidates-strict.v1',date:'2026-11-20',ids:eligibleStrict}),{mode:0o600});
fs.writeFileSync(OUT+'/ocr-screened-new-strict-candidates-20261120.json',JSON.stringify({schema:'gah.ocr.safety.candidates-strict-new.v1',date:'2026-11-20',ids:newStrict}),{mode:0o600});
fs.writeFileSync(OUT+'/ocr-quality-scan-summary-20261120.json',JSON.stringify(stats,null,2),{mode:0o600});
console.log('FINAL_QUALITY_SCREEN',JSON.stringify(stats));
