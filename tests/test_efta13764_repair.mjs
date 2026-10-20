import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const worker=fs.readFileSync(path.join(root,"_worker.js"),"utf8");
const page=fs.readFileSync(path.join(root,"archive/EFTA00013764.html"),"utf8");
const home=fs.readFileSync(path.join(root,"index.html"),"utf8");
const manifest=JSON.parse(fs.readFileSync(path.join(root,"evidence-data/hold-the-letter/source-manifest.json"),"utf8"));

const start=worker.indexOf("const CORE_ARCHIVE_DOSSIERS = new Map([");
const end=worker.indexOf("\n]);",start)+4;
assert(start>=0 && end>start,"dossier map found");
const coreMap=Function(worker.slice(start,end).replace("const CORE_ARCHIVE_DOSSIERS =","return"))();
const entry=coreMap.get("EFTA00013764");
assert(entry,"EFTA00013764 resolves to local verified source dossier");

const pinStart=worker.indexOf("const GAH_VERIFIED_LOCAL_EXACT_SOURCE_ROWS = new Map([");
const pinEnd=worker.indexOf("\n]);",pinStart)+4;
assert(pinStart>0 && pinEnd>pinStart,"exact-ID search pin registered");
const pinnedMap=Function(worker.slice(pinStart,pinEnd).replace("const GAH_VERIFIED_LOCAL_EXACT_SOURCE_ROWS =","return"))();
const pinned=pinnedMap.get("EFTA00013764");
assert(pinned && pinned.read_url==="/archive/EFTA00013764","search result links to verified dossier");
assert(pinned.source_url==="https://www.justice.gov/epstein/files/DataSet%208/EFTA00013764.pdf");
assert(pinned.local_pdf_available===false,"search does not invent a local PDF");
assert(worker.includes('verification_basis: "gah_local_hash_verified_primary_source_manifest"'),"search discloses local source provenance");
assert(worker.includes('data.document_bundle_url = verified && !localExactSource ?'),"search does not advertise a missing bundle route");
assert(pinnedMap.size===1,"only specifically proven identifiers are pinned");

assert(worker.includes('["https://grokarchivehub.com/archive/EFTA00013764", "2026-10-20"]'),"sitemap includes new authoritative dossier");
assert(entry.provenance.includes("5e4075e08ec2a1248eea0ecdb530cfa0c6751ed57ebe8ef3049fbbf64cab0117"));
assert(entry.links.some((r)=>r[1]==="https://www.justice.gov/epstein/files/DataSet%208/EFTA00013764.pdf"));
assert(entry.limitations.some((s)=>s.includes("not a locally served copy")),"no fake mirror");
assert(page.includes('<link rel="canonical" href="https://grokarchivehub.com/archive/EFTA00013764">'));
assert(page.includes('https://www.justice.gov/epstein/files/DataSet%208/EFTA00013764.pdf'));
assert(page.includes("not a claim that the PDF is mirrored locally"));
assert(page.includes("/investigations/hold-the-letter"));
assert(page.includes("no victim-identifying information"));
assert(manifest.sources.some((s)=>s.id==="EFTA00013764" && entry.provenance.includes(s.sha256)));
assert(worker.includes("if (CORE_ARCHIVE_DOSSIERS.has(archiveId)) {\n        return serveCoreArchiveDossier(request, env, archiveId);"));
const unavail=worker.slice(worker.indexOf("function archiveUnavailableResponse("),worker.indexOf("\nfunction forceNamedMeta("));
assert(unavail.includes('status: 404, headers'),"true upstream 404 must not return soft-404 HTTP 200");
assert(unavail.includes("X-GAH-Archive-Unavailable"));
const duplicated="The curated public evidence layer contains the files GAH has surfaced for reader verification";
assert(home.split(duplicated).length===2,"homepage repeat removed");
console.log("PASS: exact-ID local dossier, official link/hash, source boundary, handler, 404, duplicate copy");
