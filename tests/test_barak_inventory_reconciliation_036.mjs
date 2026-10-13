import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const root=fileURLToPath(new URL("../",import.meta.url));
const worker=fs.readFileSync(path.join(root,"_worker.js"),"utf8");
const start=worker.indexOf("function qualifyBarakLandingLedgerHtml(html)");
const end=worker.indexOf("async function proxyProofLayer(request, env = {})",start);
assert.ok(start>0 && end>start && end-start<6000);
const qualify=vm.runInNewContext(worker.slice(start,end)+"\nqualifyBarakLandingLedgerHtml");
const old='<p>Only recovered parent messages appear here. Attachment-backed slots (5,587) and metadata-only records (5,505) are indexed separately and are not presented as full emails.</p>';
const original='<h2>Recovered Emails</h2>'+old+'<div class="compact-list"></div>';
const edited=qualify(original);
for(const phrase of [
 '5,587 attachment-backed records','5,483 metadata-only records',
 '19 records labeled recovered_email','data-gah-barak-ledger-036="v1"',
 'inventory rows, not independently authenticated messages',
 'href="/barak/emails"'
])assert.ok(edited.includes(phrase),phrase);
assert.ok(!edited.includes('5,505'));
assert.ok(!edited.includes("Only recovered parent messages"));
assert.ok(edited.includes('<div class="compact-list"></div>'));
assert.equal(qualify(edited),edited);
assert.ok(worker.includes('if (proxiedPath === "/barak")'));
assert.ok(worker.includes('X-GAH-Barak-Ledger-Count'));
assert.ok(worker.includes('approvedDefault: false'));
const activeData=fs.readFileSync(path.join(root,"assets/barak-data-050.js"),"utf8");
assert.ok(activeData.includes('"Metadata-only slots":5483'));
assert.ok(!activeData.includes('"Metadata-only slots":5505'));

// A synthetic (non-real, non-private) fixture proves exact reciprocal joins
// and that a deliberately broken reverse reference is detected.
const td=fs.mkdtempSync(path.join(os.tmpdir(),"gah-barak-ledger-036-"));
try{
 const baseRow=(id,mailbox,slot,slotClass,linkedPdfIds)=>({
   id,archiveId:"archive-"+id,mailbox,messageSlot:slot,slotClass,linkedPdfIds,
   sourceVerificationStatus:"unverified_shared_source_link"
 });
 const E=[
   baseRow("e-attach","mail-A","slot-1","attachment_backed_slot",["p-1"]),
   baseRow("e-meta","mail-A","slot-1","metadata_only_slot",[]),
   baseRow("e-recovered","mail-A","slot-2","recovered_email",["p-2"])
 ];
 const P=[
   {id:"p-1",archiveId:"archive-e-attach",sourceSid:"src-1",linkedEmailId:"e-attach",parentMailbox:"mail-A",parentSlot:"slot-1"},
   {id:"p-2",archiveId:"archive-e-recovered",sourceSid:"src-2",linkedEmailId:"e-recovered",parentMailbox:"mail-A",parentSlot:"slot-2"}
 ];
 const M={sources:{"src-1":"/file/1","src-2":"/file/2"}};
 const p=(name,obj)=>{const f=path.join(td,name);fs.writeFileSync(f,JSON.stringify(obj));return f};
 const e=p("e.json",{items:E,version:1});
 const pdf=p("p.json",{items:P,version:1});
 const manifest=p("m.json",M);
 const script=path.join(root,"scripts/barak/reconcile_inventory_036.py");
 const args=["--emails",e,"--pdfs",pdf,"--manifest",manifest,"--expected-emails","3","--expected-pdfs","2"];
 const good=JSON.parse(execFileSync("python3",[script,...args],{encoding:"utf8"}));
 assert.equal(good.email_inventory_rows,3);
 assert.equal(good.distinct_mailbox_slot_keys,2);
 assert.equal(good.pdf_rows,2);
 assert.equal(good.pdf_unique_reference_ids,2);
 assert.equal(good.mailbox_slot_class_combinations["attachment_backed_slot+metadata_only_slot"],1);
 assert.equal(good.recovered_labeled.with_pdf_reference,1);
 assert.equal(good.integrity_gates_pass,true);
 const s=JSON.stringify(good);
 assert.ok(!s.includes("mail-A") && !s.includes("slot-1") && !s.includes("e-recovered"));
 const broken=P.map(x=>({...x}));
 broken[1].linkedEmailId="nonexistent";
 const badPdf=p("broken-p.json",{items:broken,version:1});
 let rejected=false;
 try{execFileSync("python3",[script,"--emails",e,"--pdfs",badPdf,"--manifest",manifest],{stdio:"pipe"});}
 catch(e){rejected=e.status!==0;}
 assert.ok(rejected,"Broken reverse PDF link must fail the audit");
} finally {fs.rmSync(td,{recursive:true,force:true});}
console.log("PASS GAH-BARAK-LEDGER-036: read-only manifest joins, duplicate-class pairs, public wording, broken-link rejection");
