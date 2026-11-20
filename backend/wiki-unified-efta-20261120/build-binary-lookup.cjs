'use strict';
const fs=require('fs'),readline=require('readline'),crypto=require('crypto');
const root='/tmp/gah-unified-media-inventory-20261120';
const info=JSON.parse(fs.readFileSync(root+'/inventory-summary.json','utf8'));
const visualManifest=JSON.parse(fs.readFileSync('/app/grok-artifact-index-v1.json','utf8'));
const visualIds=new Set();let visualEntries=0,redactionEntries=0,manifestMedia=0;
for(const [id,row]of Object.entries(visualManifest)){
 if(!/^EFTA\d{8}$/.test(id))continue;
 if(Array.isArray(row.visual)&&row.visual.length){visualIds.add(id);visualEntries+=row.visual.length}
 if(Array.isArray(row.redactions))redactionEntries+=row.redactions.length;
 if(Array.isArray(row.media))manifestMedia+=row.media.length;
}

const bytes=Buffer.alloc(info.unique_efta_ids*5),summary={total:0};
const SOURCE={ORIGINAL:1,OCR:2,PDF:4,VIDEO:8,AUDIO:16,IMAGE:32};
(async()=>{
 const rl=readline.createInterface({input:fs.createReadStream(root+'/unified-efta-id-inventory.ndjson',{highWaterMark:256*1024}),crlfDelay:Infinity});
 let last=-1,count=0;
 for await (const line of rl){
  if(!line)continue;
  const row=JSON.parse(line),num=Number(row.id.slice(4));
  if(!(num>last) || num<0 || num>99999999)throw Error('bad catalog ID sequence: '+row.id);
  const f=row.formats;
  let flags=(row.collections.length?SOURCE.ORIGINAL:0)|(row.has_ocr?SOURCE.OCR:0)|(f.pdf?SOURCE.PDF:0)|(f.video?SOURCE.VIDEO:0)|(f.audio?SOURCE.AUDIO:0)|((f.image||visualIds.has(row.id))?SOURCE.IMAGE:0);
  bytes.writeUInt32BE(num,count*5);bytes.writeUInt8(flags,count*5+4);
  last=num;count++;
 }
 if(count!==info.unique_efta_ids)throw Error('inventory count mismatch');
 const dest=root+'/efta-unified-ids-v1.bin';
 fs.writeFileSync(dest,bytes,{mode:0o600});
 const sha=crypto.createHash('sha256').update(bytes).digest('hex');
 fs.writeFileSync(root+'/efta-unified-public-summary-v1.json',JSON.stringify({schema:'gah.efta.unified.source-index.v1',as_of:info.as_of,records:count,source_ids:info.original_ids,ocr_ids:info.ocr_ids,pdf_ids:info.distinct_pdf_ids,media_ids:info.distinct_explicit_media_ids,video_ids:info.distinct_media_by_type.video,audio_ids:info.distinct_media_by_type.audio,standalone_image_ids:info.distinct_media_by_type.image||0,visual_indexed_ids:visualIds.size,visual_entries:visualEntries,redaction_entries:redactionEntries,manifest_media_entries:manifestMedia,bin_sha256:sha,bin_bytes:bytes.length},null,2),{mode:0o600});
 console.log(JSON.stringify({catalog_ids:count,bytes:bytes.length,sha256:sha,media_ids:info.distinct_explicit_media_ids,video:info.distinct_media_by_type.video,audio:info.distinct_media_by_type.audio,visual_ids:visualIds.size,visual_entries:visualEntries}));
})().catch(e=>{console.error(e);process.exit(1)})
