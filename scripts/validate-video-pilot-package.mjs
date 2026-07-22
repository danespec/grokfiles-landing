#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  buildVideoSitemap,
  buildVideoXQueue,
  buildVideoArtifacts,
  loadRegistry,
  validateVideoRegistry
} from "./video-registry-lib.mjs";

const ROOT = process.cwd();
const PACKAGE_DIR = "video-projects/blanche-no-evidence";
const PACKAGE_PATH = path.join(ROOT, PACKAGE_DIR);
const REGISTRY_ID = "gah-video-pilot-001-blanche-no-evidence";
const REGISTRY_SLUG = "no-evidence-is-not-no-records";
const REQUIRED_FILES = [
  "README.md",
  "editorial-brief.md",
  "narration.md",
  "narration.txt",
  "scene-plan.json",
  "shot-list.md",
  "evidence-manifest.json",
  "claim-ledger.json",
  "source-quote-ledger.json",
  "youtube-metadata.json",
  "captions.en.vtt",
  "thumbnail-brief.md",
  "on-screen-text.json",
  "lower-thirds.json",
  "chapter-markers.json",
  "corrections-checklist.md",
  "legal-risk-review.md",
  "production-checklist.md",
  "publication-checklist.md",
  "MOBILE-REVIEW.md"
];
const JSON_FILES = REQUIRED_FILES.filter((file) => file.endsWith(".json"));
const MEDIA_EXTENSIONS = new Set([".mp4", ".mov", ".m4v", ".webm", ".wav", ".mp3", ".aac", ".aiff", ".psd", ".prproj"]);
const SECRET_RE = /(client_secret|refresh_token|access_token|private_key|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|AIza[0-9A-Za-z_-]{20,}|gh[pousr]_[0-9A-Za-z]{20,})/i;
const FORBIDDEN_EDITORIAL_RE = [
  { re: /\bthe certified record says\b/i, message: "blanket certified-record wording is prohibited" },
  { re: /\bcertified record\b/i, message: "certified record must not be used as a blanket source posture" },
  { re: /\bthe disputed Todd Blanche hearing answer\b/i, message: "disputed-answer wording must focus on public interpretations" },
  { re: /\blegally ambiguous\b/i, message: "use scope-limited evidentiary-standard wording instead of legally ambiguous" },
  { re: /\bno closed investigations\b/i, message: "no-closed-investigations wording requires separate source posture and is not approved here" }
];
const REQUIRED_TITLE = "\"No Evidence\" Does Not Mean \"No Records\"";

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function readText(rel) {
  return fs.readFileSync(path.join(PACKAGE_PATH, rel), "utf8");
}

function readJson(rel) {
  return JSON.parse(readText(rel));
}

function htmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function collectPackageFiles(dir = PACKAGE_PATH) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectPackageFiles(abs));
    if (entry.isFile()) files.push(abs);
  }
  return files;
}

function parseNarrationClaims(narration) {
  const paragraphs = new Map();
  for (const section of narration.split(/\n## /).slice(1)) {
    const idMatch = section.match(/^(P\d{2}) - /);
    if (!idMatch) continue;
    const paragraphId = idMatch[1];
    const block = section;
    const refsMatch = block.match(/Claim refs:\s*([A-Z0-9,\-\s]+)/);
    const refs = refsMatch ? refsMatch[1].split(",").map((value) => value.trim()).filter(Boolean) : [];
    paragraphs.set(paragraphId, refs);
  }
  return paragraphs;
}

function parseTimestamp(value) {
  const match = String(value).match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/);
  if (!match) return NaN;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
}

function validateVtt(text) {
  const errors = [];
  if (!text.startsWith("WEBVTT")) errors.push("captions.en.vtt must start with WEBVTT");
  if (!text.includes("PROVISIONAL_TIMING")) errors.push("captions.en.vtt must mark PROVISIONAL_TIMING");
  const cueRe = /^(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})$/gm;
  let previousEnd = -1;
  let cues = 0;
  let match;
  while ((match = cueRe.exec(text))) {
    cues += 1;
    const start = parseTimestamp(match[1]);
    const end = parseTimestamp(match[2]);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) errors.push(`invalid VTT cue timing at ${match[0]}`);
    if (start < previousEnd) errors.push(`overlapping VTT cue at ${match[0]}`);
    previousEnd = end;
  }
  if (cues < 10) errors.push("captions.en.vtt has too few cues for the narration");
  return errors;
}

function extractQuotedPhrases(text) {
  const phrases = [];
  const quoteRe = /"([^"\n]{2,240})"/g;
  let match;
  while ((match = quoteRe.exec(text))) {
    phrases.push(match[1].trim());
  }
  return phrases;
}

function collectStringValues(value, output = []) {
  if (typeof value === "string") output.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectStringValues(item, output));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => collectStringValues(item, output));
  return output;
}

function renderTable(rows) {
  return `<table><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${htmlEscape(cell)}</td>`).join("")}</tr>`).join("\n")}</tbody></table>`;
}

function writePreview(previewDir, data) {
  fs.mkdirSync(previewDir, { recursive: true });
  const css = `<style>body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:1100px;margin:32px auto;padding:0 18px;line-height:1.5;color:#231f19;background:#fffaf0}a{color:#6b3d0c}table{border-collapse:collapse;width:100%;font-size:14px;background:#fff}td,th{border:1px solid #d8cab8;padding:8px;vertical-align:top}pre{white-space:pre-wrap;background:#fff;border:1px solid #d8cab8;padding:16px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}.card{border:1px solid #d8cab8;background:#fff;padding:14px;border-radius:8px}</style>`;
  const nav = `<p><a href="preview.html">Overview</a> | <a href="narration.html">Narration</a> | <a href="evidence-manifest.html">Evidence</a> | <a href="claim-ledger.html">Claims</a> | <a href="storyboard.html">Storyboard</a> | <a href="captions.html">Captions</a></p>`;
  fs.writeFileSync(path.join(previewDir, "preview.html"), `<!doctype html><meta charset="utf-8">${css}<h1>GAH Video Pilot Review</h1>${nav}<div class="grid"><div class="card"><h2>Status</h2><p>Offline editorial review package. No upload, X post, or deployment.</p></div><div class="card"><h2>Narration</h2><p>${data.wordCount} words. Estimated runtime ${data.estimatedRuntime}.</p></div><div class="card"><h2>Claims</h2><p>${data.claimLedger.claims.length} claim-ledger entries.</p></div><div class="card"><h2>Sources</h2><p>${data.evidenceManifest.sources.length} evidence sources.</p></div></div>\n`);
  fs.writeFileSync(path.join(previewDir, "narration.html"), `<!doctype html><meta charset="utf-8">${css}<h1>Narration</h1>${nav}<pre>${htmlEscape(data.narrationTxt)}</pre>\n`);
  fs.writeFileSync(path.join(previewDir, "evidence-manifest.html"), `<!doctype html><meta charset="utf-8">${css}<h1>Evidence Manifest</h1>${nav}${renderTable(data.evidenceManifest.sources.map((s) => [s.sourceId, s.sourceType, s.title, s.localPath, s.visualTreatment, s.verificationStatus]))}\n`);
  fs.writeFileSync(path.join(previewDir, "claim-ledger.html"), `<!doctype html><meta charset="utf-8">${css}<h1>Claim Ledger</h1>${nav}${renderTable(data.claimLedger.claims.map((c) => [c.claimId, c.narrationParagraph, c.classification, c.exactClaim, c.sourcePath, c.publicationApprovalStatus]))}\n`);
  fs.writeFileSync(path.join(previewDir, "storyboard.html"), `<!doctype html><meta charset="utf-8">${css}<h1>Storyboard</h1>${nav}${renderTable(data.scenePlan.scenes.map((s) => [s.sceneId, s.timeRange, s.title, s.visualType, s.visualPlan, s.sourceIds.join(", ")]))}\n`);
  fs.writeFileSync(path.join(previewDir, "captions.html"), `<!doctype html><meta charset="utf-8">${css}<h1>Captions Preview</h1>${nav}<pre>${htmlEscape(data.captions)}</pre>\n`);
}

const errors = [];
for (const file of REQUIRED_FILES) {
  if (!fs.existsSync(path.join(PACKAGE_PATH, file))) errors.push(`missing package file: ${file}`);
}

const parsed = {};
for (const file of JSON_FILES) {
  try {
    parsed[file] = readJson(file);
  } catch (error) {
    errors.push(`invalid JSON: ${file}: ${error.message}`);
  }
}

const narrationMd = readText("narration.md");
const narrationTxt = readText("narration.txt");
const captions = readText("captions.en.vtt");
const mobileReview = readText("MOBILE-REVIEW.md");
const claimLedger = parsed["claim-ledger.json"];
const quoteLedger = parsed["source-quote-ledger.json"];
const evidenceManifest = parsed["evidence-manifest.json"];
const scenePlan = parsed["scene-plan.json"];
const metadata = parsed["youtube-metadata.json"];
const registry = loadRegistry(ROOT);
const registryValidation = validateVideoRegistry(registry);
if (!registryValidation.ok) errors.push(...registryValidation.errors.map((error) => `registry invalid: ${error}`));

for (const [label, text] of [
  ["narration.md", narrationMd],
  ["narration.txt", narrationTxt],
  ["captions.en.vtt", captions],
  ["MOBILE-REVIEW.md", mobileReview]
]) {
  for (const rule of FORBIDDEN_EDITORIAL_RE) {
    if (rule.re.test(text)) errors.push(`${label}: ${rule.message}`);
  }
}
if (!narrationMd.includes(REQUIRED_TITLE) && !mobileReview.includes(REQUIRED_TITLE)) {
  errors.push(`missing required title wording: ${REQUIRED_TITLE}`);
}

const paragraphs = parseNarrationClaims(narrationMd);
const claimIds = new Set((claimLedger?.claims || []).map((claim) => claim.claimId));
for (const [paragraphId, refs] of paragraphs) {
  if (!refs.length) errors.push(`${paragraphId} has no claim refs`);
  for (const ref of refs) {
    if (!claimIds.has(ref)) errors.push(`${paragraphId} references missing claim ${ref}`);
  }
}
for (const claim of claimLedger?.claims || []) {
  if (!paragraphs.has(claim.narrationParagraph)) errors.push(`${claim.claimId} references missing paragraph ${claim.narrationParagraph}`);
  if (!fs.existsSync(path.join(ROOT, claim.sourcePath))) errors.push(`${claim.claimId} source path missing: ${claim.sourcePath}`);
  if (claim.batesId) errors.push(`${claim.claimId} has unsupported Bates ID ${claim.batesId}`);
  if (claim.publicationApprovalStatus !== "review-ready") errors.push(`${claim.claimId} is not review-ready`);
  if (!claim.classification) errors.push(`${claim.claimId} has no classification`);
}

const allowedClassifications = new Set(claimLedger?.allowedClassifications || []);
for (const claim of claimLedger?.claims || []) {
  if (!allowedClassifications.has(claim.classification)) errors.push(`${claim.claimId} has unsupported classification ${claim.classification}`);
}

for (const quote of quoteLedger?.quotes || []) {
  if (!fs.existsSync(path.join(ROOT, quote.sourceFile))) errors.push(`${quote.quoteId} source file missing: ${quote.sourceFile}`);
  if (!String(quote.verificationStatus || "").startsWith("HUMAN_AUDIO_CERTIFIED")) errors.push(`${quote.quoteId} is not human-certified`);
  if (!quote.exactQuotedText || quote.ellipsesUsed) errors.push(`${quote.quoteId} has unsupported quote text or ellipses`);
}
const quoteIds = new Set((quoteLedger?.quotes || []).map((quote) => quote.quoteId));
for (const requiredQuoteId of ["Q-VP-001", "Q-VP-002", "Q-VP-003", "Q-VP-004"]) {
  if (!quoteIds.has(requiredQuoteId)) errors.push(`missing approved direct quotation ${requiredQuoteId}`);
}
const allowedQuotedPhrases = new Set([
  ...(quoteLedger?.quotes || []).map((quote) => quote.exactQuotedText),
  "No Evidence",
  "No Records",
  "no evidence",
  "no records",
  "the records prove the allegation",
  "No Evidence\" Does Not Mean \"No Records",
  "No Evidence\" Is Not \"No Records",
  "What DOJ Actually Said About No Evidence in the Epstein Files"
]);
for (const [label, text] of [
  ["narration.md", narrationMd],
  ["narration.txt", narrationTxt],
  ["captions.en.vtt", captions],
  ["MOBILE-REVIEW.md", mobileReview],
  ["on-screen-text.json", collectStringValues(parsed["on-screen-text.json"]).join("\n")],
  ["youtube-metadata.json", collectStringValues(parsed["youtube-metadata.json"]).join("\n")]
]) {
  for (const phrase of extractQuotedPhrases(text)) {
    if (!allowedQuotedPhrases.has(phrase)) errors.push(`${label}: unsupported quoted phrase: ${phrase}`);
  }
}

for (const source of evidenceManifest?.sources || []) {
  if (!fs.existsSync(path.join(ROOT, source.localPath))) errors.push(`${source.sourceId} local path missing: ${source.localPath}`);
  if (source.batesId) errors.push(`${source.sourceId} has unsupported Bates ID ${source.batesId}`);
  if (!source.verificationStatus) errors.push(`${source.sourceId} missing verification status`);
}

errors.push(...validateVtt(captions));

const packageFiles = collectPackageFiles();
for (const file of packageFiles) {
  const stat = fs.statSync(file);
  const ext = path.extname(file).toLowerCase();
  if (stat.size > 1_000_000) errors.push(`large file in package: ${path.relative(ROOT, file)}`);
  if (MEDIA_EXTENSIONS.has(ext)) errors.push(`media/intermediate file in package: ${path.relative(ROOT, file)}`);
  if (SECRET_RE.test(fs.readFileSync(file, "utf8"))) errors.push(`possible secret-like content in package: ${path.relative(ROOT, file)}`);
}

const pilotRecord = registry.videos.find((video) => video.id === REGISTRY_ID);
if (!pilotRecord) errors.push(`missing registry entry ${REGISTRY_ID}`);
if (pilotRecord) {
  if (pilotRecord.slug !== REGISTRY_SLUG) errors.push(`registry slug mismatch: ${pilotRecord.slug}`);
  if (pilotRecord.status !== "draft") errors.push(`pilot registry status must be draft, got ${pilotRecord.status}`);
  if (pilotRecord.visibility !== "private") errors.push(`pilot registry visibility must be private, got ${pilotRecord.visibility}`);
  if (pilotRecord.youtubeVideoId !== null || pilotRecord.youtubeUrl !== null) errors.push("pilot registry must not have YouTube ID or URL");
  if (pilotRecord.xPublicationStatus !== "not-queued") errors.push("pilot registry must not be queued for X");
}

const generated = buildVideoArtifacts(ROOT, { checkOnly: true });
if (!generated.ok) errors.push(...generated.errors.map((error) => `video artifacts stale: ${error}`));
const sitemap = buildVideoSitemap(registry);
const xQueue = buildVideoXQueue(registry);
if (sitemap.videoUrls.some((entry) => entry.loc.includes(REGISTRY_SLUG))) errors.push("draft pilot leaked into video sitemap");
if (xQueue.records.some((entry) => entry.registryId === REGISTRY_ID)) errors.push("draft pilot leaked into X queue");
if (fs.existsSync(path.join(ROOT, "videos", `${REGISTRY_SLUG}.html`))) errors.push("public watch page exists for draft pilot");
if (fs.readFileSync(path.join(ROOT, "videos.html"), "utf8").includes(REGISTRY_SLUG)) errors.push("draft pilot leaked into public video hub");
if (metadata?.uploadStatus !== "not-uploaded") errors.push("youtube metadata must remain not-uploaded");
if (metadata?.xQueueSummary?.status !== "not-queued") errors.push("x queue summary must remain not-queued");

const icloudDir = argValue("--icloud-dir", "");
if (icloudDir) {
  const requiredExports = [
    "MOBILE-REVIEW.md",
    "preview.html",
    "narration.html",
    "claim-ledger.html",
    "evidence-manifest.html",
    "storyboard.html",
    "captions.html",
    "narration.txt",
    "captions.en.vtt"
  ];
  for (const file of requiredExports) {
    const exportPath = path.join(icloudDir, file);
    if (!fs.existsSync(exportPath)) errors.push(`iCloud export missing: ${exportPath}`);
    else if (SECRET_RE.test(fs.readFileSync(exportPath, "utf8"))) errors.push(`possible secret-like content in iCloud export: ${exportPath}`);
  }
}

const wordCount = narrationTxt.trim().split(/\s+/).filter(Boolean).length;
if (wordCount < 1300 || wordCount > 1800) errors.push(`narration word count out of target range: ${wordCount}`);

const previewDir = argValue("--preview-dir", "/private/tmp/gah-video-pilot-001");
if (!errors.length) {
  writePreview(previewDir, {
    narrationTxt,
    captions,
    claimLedger,
    evidenceManifest,
    scenePlan,
    wordCount,
    estimatedRuntime: "approximately 10:10"
  });
}

const result = {
  ok: errors.length === 0,
  packageDir: PACKAGE_DIR,
  previewDir,
  wordCount,
  estimatedRuntime: "approximately 10:10",
  claimCount: claimLedger?.claims?.length || 0,
  quotationCount: quoteLedger?.quotes?.length || 0,
  sourceCount: evidenceManifest?.sources?.length || 0,
  registryStatus: pilotRecord ? `${pilotRecord.status}/${pilotRecord.visibility}` : "missing",
  publicWatchPageGenerated: fs.existsSync(path.join(ROOT, "videos", `${REGISTRY_SLUG}.html`)),
  youtubeApiWriteOccurred: false,
  xPostOccurred: false,
  deploymentOccurred: false,
  errors
};

console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exit(1);
