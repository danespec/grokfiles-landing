'use strict';
const fs=require('fs'),path=require('path'),zlib=require('zlib'),crypto=require('crypto');
const BASE='/doj';
const OUT='/tmp/gah-unified-media-inventory-20261120';
fs.mkdirSync(OUT,{recursive:true,mode:0o700});
const origins=[
 ['incoming',BASE+'/_incoming'],['all-data',BASE+'/All Data'],
 ['data2',BASE+'/Data 2'],['data3',BASE+'/Data 3'],['data4',BASE+'/Data 4'],['data5',BASE+'/Data 5'],['data6',BASE+'/Data 6'],['data7',BASE+'/Data 7'],['data8',BASE+'/Data 8'],['vault',BASE+'/The Vault']
];
const OCR=BASE+'/All Data/ocr-output-new';
const records=new Map(),extCounts={},mediaRecords=[],originsSummary={},safe=[];let stopped=0;
const FLAGS={ORIGINAL:1,OCR:2,PDF:4,VIDEO:8,AUDIO:16,IMAGE:32,OTHER:64};
const extGroup={pdf:['.pdf'],video:['.mp4','.mov','.m4v','.mkv','.avi','.webm','.mpeg','.mpg','.wmv','.3gp','.ts','.vob'],audio:['.mp3','.wav','.flac','.aac','.m4a','.ogg','.wma','.aiff'],image:['.jpg','.jpeg','.png','.tif','.tiff','.bmp','.webp','.heic','.heif','.cr2','.raw','.gif']};
const extType=e=>Object.keys(extGroup).find(t=>extGroup[t].includes(e))||'other';
function update(id,origin,kind,full){
 let x=records.get(id);
 if(!x){x={flags:0,origin:new Set(),ocrPath:null};records.set(id,x)}
 x.flags|=origin==='ocr'?FLAGS.OCR:FLAGS.ORIGINAL;
 if(kind==='pdf')x.flags|=FLAGS.PDF;
 else if(kind==='video')x.flags|=FLAGS.VIDEO;
 else if(kind==='audio')x.flags|=FLAGS.AUDIO;
 else if(kind==='image')x.flags|=FLAGS.IMAGE;
 else if(origin!=='ocr')x.flags|=FLAGS.OTHER;
 x.origin.add(origin);
 if(origin==='ocr' && (!x.ocrPath||full.length<x.ocrPath.length))x.ocrPath=full;
}
const ignore=new Set(['@eaDir','.DS_Store']);
function scan(label,root){
 const summary={files:0,eftaFiles:0,dirs:0,errors:0,symlinks:0,byType:{},byExt:{},mediaDistinct:new Set()};
 const todo=[root];
 while(todo.length){
  const dir=todo.pop();let xs;
  try{xs=fs.readdirSync(dir,{withFileTypes:true})}catch(e){summary.errors++;continue}
  for(const ent of xs){
   if(ignore.has(ent.name)||ent.name.startsWith('._'))continue;
   if(ent.isSymbolicLink()){summary.symlinks++;continue}
   const loc=dir+'/'+ent.name;
   if(ent.isDirectory()){
    if(label==='all-data'&&['ocr-output-new','ocr-output'].includes(ent.name))continue;
    summary.dirs++;todo.push(loc);continue;
   }
   if(!ent.isFile())continue;
   summary.files++;
   const ext=path.extname(ent.name).toLowerCase(),kind=label==='ocr'?'ocr_text':extType(ext);
   summary.byType[kind]=(summary.byType[kind]||0)+1;
   summary.byExt[ext||'(none)']=(summary.byExt[ext||'(none)']||0)+1;
   const match=ent.name.match(/^(EFTA\d{8})(?:\.|$)/i);
   if(!match)continue;
   summary.eftaFiles++;
   const id=match[1].toUpperCase();update(id,label,kind,loc);
   if(kind==='video'||kind==='audio'||kind==='image'){
    const key=id+'|'+kind;
    if(!summary.mediaDistinct.has(key)){
     summary.mediaDistinct.add(key);
     // Only record EFTA identifier and source media class; never log a filename or its contents.
     mediaRecords.push({efta:id,kind,collection:label});
    }
   }
  }
 }
 const out={files:summary.files,eftaFiles:summary.eftaFiles,dirs:summary.dirs,errors:summary.errors,symlinks:summary.symlinks,types:summary.byType,ext:summary.byExt,distinctMediaIdKinds:summary.mediaDistinct.size};
 originsSummary[label]=out;
 console.log('INVENTORY_BUCKET',label,JSON.stringify({files:out.files,eftaFiles:out.eftaFiles,dirs:out.dirs,errors:out.errors,types:out.types,distinctMediaIdKinds:out.distinctMediaIdKinds}));
}
for(const [label,p] of origins)scan(label,p);
scan('ocr',OCR);
const unique=Array.from(records.entries()).sort((a,b)=>a[0].localeCompare(b[0]));
const segments={};const extTotals={},collections={},modeCount={};let hasOriginal=0,hasOCR=0,both=0,media=0,pdf=0,withNoOcr=0;
const ws=fs.createWriteStream(OUT+'/unified-efta-id-inventory.ndjson',{mode:0o600});
for(const [id,r] of unique){
 if(r.flags&FLAGS.ORIGINAL)hasOriginal++;
 if(r.flags&FLAGS.OCR)hasOCR++;
 if((r.flags&(FLAGS.ORIGINAL|FLAGS.OCR))===(FLAGS.ORIGINAL|FLAGS.OCR))both++;
 if(r.flags&FLAGS.PDF)pdf++;
 if(!(r.flags&FLAGS.OCR))withNoOcr++;
 if(r.flags&(FLAGS.VIDEO|FLAGS.AUDIO|FLAGS.IMAGE))media++;
 const segment=id.slice(0,7);
 let s=segments[segment];if(!s){s={all:0,pdf:0,ocr:0,video:0,audio:0,image:0};segments[segment]=s}
 s.all++;if(r.flags&FLAGS.PDF)s.pdf++;if(r.flags&FLAGS.OCR)s.ocr++;
 if(r.flags&FLAGS.VIDEO)s.video++;if(r.flags&FLAGS.AUDIO)s.audio++;if(r.flags&FLAGS.IMAGE)s.image++;
 ws.write(JSON.stringify({id,formats:{pdf:!!(r.flags&FLAGS.PDF),image:!!(r.flags&FLAGS.IMAGE),video:!!(r.flags&FLAGS.VIDEO),audio:!!(r.flags&FLAGS.AUDIO)},has_ocr:!!(r.flags&FLAGS.OCR),collections:[...r.origin].filter(x=>x!=='ocr').sort()})+'\n');
}
ws.end();
const mediaUnique={};for(const row of mediaRecords){const k=row.kind;(mediaUnique[k]||=new Set()).add(row.efta)}
mediaRecords.sort((a,b)=>a.efta.localeCompare(b.efta)||a.kind.localeCompare(b.kind)||a.collection.localeCompare(b.collection));
fs.writeFileSync(OUT+'/efta-source-media-ids.json',JSON.stringify(mediaRecords),{mode:0o600});
const result={schema:'gah.unified-efta-inventory.v1',as_of:'2026-11-20',unique_efta_ids:unique.length,original_ids:hasOriginal,ocr_ids:hasOCR,original_ocr_overlap:both,original_no_ocr:withNoOcr,distinct_pdf_ids:pdf,distinct_explicit_media_ids:media,distinct_media_by_type:Object.fromEntries(Object.entries(mediaUnique).map(([k,v])=>[k,v.size])),media_entries:mediaRecords.length,collections:originsSummary,segments};
fs.writeFileSync(OUT+'/inventory-summary.json',JSON.stringify(result,null,2),{mode:0o600});
console.log('INVENTORY_SUMMARY',JSON.stringify({...result,segments:Object.keys(segments).length,collections:Object.keys(originsSummary)}));
