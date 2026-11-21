'use strict';
// Second-stage offline OCR candidate screening: full-file risk search and source fingerprint.
// Output contains only EFTA IDs, hashes, document byte sizes and review flags.
const fs=require('fs'),crypto=require('crypto'),path=require('path');
const ROOT='/doj/All Data/ocr-output-new',OUT='/tmp/gah-deep-ocr-review-20261120';
const candidates=new Set(JSON.parse(fs.readFileSync('/tmp/gah-unified-media-inventory-20261120/ocr-screened-new-strict-candidates-20261120.json','utf8')).ids);
const bin=fs.readFileSync('/app/efta-unified-ids-v1.bin'),validRows=bin.length/5;
const flagsFor=id=>{
 const n=Number(id.slice(4));let lo=0,hi=validRows-1;
 while(lo<=hi){const mi=(lo+hi)>>>1,v=bin.readUInt32BE(mi*5);if(v===n)return bin.readUInt8(mi*5+4);if(v<n)lo=mi+1;else hi=mi-1;}return 0;
};
const rootFiles=new Map(),dirs=fs.readdirSync(ROOT,{withFileTypes:true}).filter(x=>x.isDirectory()&&/^DS\d+_chunk_\d+$/i.test(x.name));
for(const dir of dirs){
 const folder=ROOT+'/'+dir.name;let items;
 try{items=fs.readdirSync(folder)}catch(e){continue}
 for(const name of items){
  const m=name.match(/^(EFTA\d{8})\.txt$/i);
  if(m&&candidates.has(m[1].toUpperCase())&&!rootFiles.has(m[1].toUpperCase()))rootFiles.set(m[1].toUpperCase(),folder+'/'+name);
 }
}
for(const name of fs.readdirSync(ROOT)){
 const m=name.match(/^(EFTA\d{8})\.txt$/i);
 if(m&&candidates.has(m[1].toUpperCase()))rootFiles.set(m[1].toUpperCase(),ROOT+'/'+name);
}
const patterns={
 email:/[a-z0-9_.+-]+@[a-z0-9_.-]+\.[a-z]{2,}/i,
 phone:/\b(?:\+?1[.\- ])?\(?\d{3}\)?[.\- ]\d{3}[.\- ]\d{4}\b/,
 identifiers:/\b(?:social security (?:number|#)|ssn|passport number|driver(?:'s)? licen[sc]e|routing number|account number|\d{3}-\d{2}-\d{4})\b/i,
 address:/\b\d{1,5}\s+[A-Za-z0-9 .-]{3,35}\s+(?:street|st\.?|avenue|ave\.?|road|rd\.?|drive|dr\.?|blvd\.?|boulevard|lane|ln\.?|court|ct\.?|way|apartment|apt\.?)\b/i,
 protected:/\b(?:victim(?:s)?|survivor(?:s)?|underage|minor(?:s)?|juvenile|traffick(?:ing|ed)|sexual abuse|sex abuse|sexual assault|rape|Jane Doe|John Doe|complainant|witness identity|confidential informant|sealed identity|redacted names|protected identity|contact book|black book|address book)\b/i
};
const summary={schema:'gah.deep.ocr.review.v1',date:'2026-11-20',input_candidates:candidates.size,found_ocr_files:rootFiles.size,unresolved:0,source_pdf_confirmed:0,files_with_content_beyond_64kb:0,additional_risk_hits:0,additional_risk_by_kind:{},full_source_fingerprint_count:0,review_ready_flags:0,manual_review_large:0,bytes_hashed:0,errors:0};
const rows=[];
let i=0;
for(const id of [...candidates].sort()){
 i++;const filename=rootFiles.get(id);
 if(!filename){summary.unresolved++;continue}
 const flags=flagsFor(id);
 if(flags&4)summary.source_pdf_confirmed++;
 let fd;
 try{
  fd=fs.openSync(filename,'r');
  const stats=fs.fstatSync(fd);
  const size=stats.size;
  if(size>65536)summary.files_with_content_beyond_64kb++;
  const hash=crypto.createHash('sha256');
  const risks=new Set(),buf=Buffer.allocUnsafe(256*1024);
  let bytes=0,previous='';
  while(true){
   const len=fs.readSync(fd,buf,0,buf.length,null);
   if(!len)break;
   hash.update(buf.subarray(0,len));
   const start=bytes,stop=bytes+len;
   if(stop>65536){
    const offset=Math.max(0,65536-start-512);
    let text=previous+buf.toString('utf8',offset,len);
    for(const [kind,rx] of Object.entries(patterns))if(rx.test(text))risks.add(kind);
    previous=text.slice(-512);
   }
   bytes=stop;
  }
  summary.bytes_hashed+=bytes;summary.full_source_fingerprint_count++;
  const review=size>25*1024*1024?'large_file':risks.size?'risk_after_excerpt_window':'deep_screen_clear';
  if(review==='large_file')summary.manual_review_large++;
  if(risks.size){summary.additional_risk_hits++;for(const kind of risks)summary.additional_risk_by_kind[kind]=(summary.additional_risk_by_kind[kind]||0)+1}
  if(review==='deep_screen_clear'&&(flags&4))summary.review_ready_flags++;
  rows.push({efta:id,ocr_sha256:hash.digest('hex'),ocr_bytes:size,source_pdf_present:!!(flags&4),deep_screen:review,additional_risk:[...risks]});
 }catch(e){summary.errors++}
 finally{if(fd!==undefined)try{fs.closeSync(fd)}catch(e){}}
 if(i%10000===0)console.log('PROGRESS',i,'ready',summary.review_ready_flags,'risk',summary.additional_risk_hits);
}
fs.mkdirSync(OUT,{recursive:true,mode:0o700});
const full=OUT+'/private-ocr-review-records.json';fs.writeFileSync(full,JSON.stringify({summary,records:rows}),{mode:0o600});
const pub=OUT+'/ocr-deep-review-summary.json';fs.writeFileSync(pub,JSON.stringify(summary,null,2),{mode:0o600});
console.log('FINAL_DEEP_OCR_SCREEN',JSON.stringify(summary));
