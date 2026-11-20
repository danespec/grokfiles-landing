#!/usr/bin/env node
/**
 * Deterministic, privacy-bounded export of publicly promoted EFTA dossiers.
 * Reads the authoritative runtime sitemap, not the larger internal identifier inventory.
 * No full text, protected identities, private retrieval index or bank account details.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import worker from '../../_worker.js';

const ROOT=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
const BASE='https://grokarchivehub.com';
const RELEASE='2026-11-19';
const OUTPUT=path.join(ROOT,'research-data');
const check=process.argv.includes('--check');
const read=async p=>JSON.parse(await readFile(path.join(ROOT,p),'utf8'));
const manifest=await read('content/identifier-dossiers.json');
const privateIds=new Set((await read('atlas/data.json')).privacy_minimized_document_ids);
const byId=new Map(manifest.entries.map(r=>[r.id,r]));
const response=await worker.fetch(new Request(BASE+'/sitemap-efta.xml'),{});
assert.equal(response.status,200,'authoritative EFTA sitemap must load');
const xml=await response.text();
const urls=[...xml.matchAll(/<loc>(https:\/\/grokarchivehub\.com\/archive\/(EFTA\d{8}))<\/loc>/g)].map(m=>({url:m[1],id:m[2]}));
assert.equal(urls.length,19,'reviewed, indexed EFTA cohort changed; review before exporting');
assert.equal(new Set(urls.map(r=>r.id)).size,urls.length,'duplicate EFTA URL');
const records=[];
for(const {url,id} of urls.sort((a,b)=>a.id.localeCompare(b.id))){
  const r=byId.get(id);
  assert(r && r.indexable===true,'missing reviewed public record '+id);
  assert(!privateIds.has(id),'Atlas-minimized record must not be exported '+id);
  assert(r.source && new URL(r.source).hostname==='www.justice.gov','missing authorized source '+id);
  const filename=path.join(ROOT,'archive',id+'.html');
  const hash=createHash('sha256').update(await readFile(filename)).digest('hex');
  records.push({
    id,canonical_url:url,title:r.title,description:r.description,
    document_source_url:r.source,date_modified:r.dateModified||null,
    published_dossier_html_sha256:hash,
  });
}
const body={
  schema_version:'gah-public-efta-metadata-v1',release_date:RELEASE,
  scope:'Only self-canonical, publicly indexable EFTA dossiers from the curated sitemap; excludes consolidated/noindex pages and private document content',
  important_limit:'An identifier appearing here is not a finding of wrongdoing. SHA-256 values identify the published HTML files, not the DOJ source PDF bytes.',
  record_count:records.length,records
};
const json=JSON.stringify(body,null,2)+'\n';
const fields=['id','canonical_url','title','description','document_source_url','date_modified','published_dossier_html_sha256'];
const csvVal=v=>'"'+String(v??'').replaceAll('"','""')+'"';
const csv=fields.join(',')+'\n'+records.map(r=>fields.map(f=>csvVal(r[f])).join(',')).join('\n')+'\n';
// Preserve the already published 20-entity editorial index; export a CSV companion.
// Do not mine names from the full corpus or export inferred relationships.
const publicEntities=await read('evidence-data/epstein-entity-index/entities.json');
assert.equal(publicEntities.schema,'gah.entity-index.v1');
assert.equal(publicEntities.count,publicEntities.entities.length);
assert.equal(publicEntities.entities.length,20,'curated entity index changed: review export before updating');
const efields=['name','type','lane','relationship','route','sources','boundary'];
const ecsv=efields.join(',')+'\n'+publicEntities.entities.map(e=>efields.map(k=>csvVal(k==='sources'?e.sources.join(' | '):e[k])).join(',')).join('\n')+'\n';
const files=[['efta-reviewed-index.json',json],['efta-reviewed-index.csv',csv],['entity-index-reviewed.csv',ecsv]];
if(check){
  for(const [file,expected] of files){
    assert.equal(await readFile(path.join(OUTPUT,file),'utf8'),expected,file+' is stale; regenerate');
  }
  console.log('PASS public research exports: '+records.length+' exact, reviewed identifiers; privacy and deterministic bytes');
}else{
  await mkdir(OUTPUT,{recursive:true});
  for(const [name,data] of files)await writeFile(path.join(OUTPUT,name),data,'utf8');
  console.log('Wrote '+records.length+' public EFTA metadata rows to JSON and CSV');
}
