#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(new URL("../../..", import.meta.url).pathname);
const PACKAGE_DIR = path.join(ROOT, "video-projects/blanche-no-evidence");
const PRODUCTION_DIR = path.join(PACKAGE_DIR, "production");
const settings = readJson(path.join(PRODUCTION_DIR, "render-settings.json"));
const manifest = readJson(path.join(PRODUCTION_DIR, "rough-cut-manifest.json"));
const timeline = readJson(path.join(PRODUCTION_DIR, "render-timeline.json"));
const assets = readJson(path.join(PRODUCTION_DIR, "asset-ledger.json"));
const crops = readJson(path.join(PRODUCTION_DIR, "source-crop-ledger.json"));
const quoteLedger = readJson(path.join(PACKAGE_DIR, "source-quote-ledger.json"));
const claimLedger = readJson(path.join(PACKAGE_DIR, "claim-ledger.json"));

const exportDir = path.resolve(process.env.GAH_ROUGH_CUT_EXPORT_DIR || settings.output.directory);
const workDir = path.resolve(process.env.GAH_ROUGH_CUT_WORK_DIR || "/private/tmp/gah-video-pilot-001rc/rough-cut-render");
const ffmpegBin = process.env.FFMPEG_BIN || settings.tools.ffmpeg;
const ffprobeBin = process.env.FFPROBE_BIN || settings.tools.ffprobe;
const sayBin = process.env.SAY_BIN || settings.tools.say;

const outputMp4 = path.join(exportDir, settings.output.mp4File);
const outputVtt = path.join(exportDir, settings.output.captionsFile);
const outputHtml = path.join(exportDir, settings.output.reviewHtmlFile);
const outputManifest = path.join(exportDir, settings.output.manifestFile);
const outputChecksums = path.join(exportDir, settings.output.checksumsFile);
const outputContactSheet = path.join(exportDir, settings.output.contactSheetFile);
const outputInstructions = path.join(exportDir, settings.output.instructionsFile);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  if (result.error) {
    throw new Error(`${command}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${command} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function canRun(command, args = ["-version"]) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  return !result.error && result.status === 0;
}

function commandExists(command) {
  if (command.includes("/")) return fs.existsSync(command);
  const result = spawnSync("/usr/bin/env", ["which", command], { encoding: "utf8" });
  return !result.error && result.status === 0;
}

function secondsToTimestamp(seconds, separator = ".") {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(totalMs / 3600000);
  const m = Math.floor((totalMs % 3600000) / 60000);
  const s = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}${separator}${String(ms).padStart(3, "0")}`;
}

function htmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapWords(text, max = 62) {
  const lines = [];
  let line = "";
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function parseParagraphs() {
  const narrationMd = fs.readFileSync(path.join(PACKAGE_DIR, "narration.md"), "utf8");
  const sections = narrationMd.split(/\n## /).slice(1);
  const paragraphs = new Map();
  for (const section of sections) {
    const idMatch = section.match(/^(P\d{2}) - ([^\n]+)/);
    if (!idMatch) continue;
    const id = idMatch[1];
    const title = idMatch[2].trim();
    const body = section
      .replace(/^[^\n]+\n+/, "")
      .split(/\nClaim refs:/)[0]
      .trim()
      .replace(/\n+/g, " ");
    const claimMatch = section.match(/Claim refs:\s*([A-Z0-9,\-\s]+)/);
    const claims = claimMatch ? claimMatch[1].split(",").map((value) => value.trim()).filter(Boolean) : [];
    paragraphs.set(id, { id, title, body, claims });
  }
  return paragraphs;
}

function makeSvg(scene, index, scaledScene, quotesById, assetBySource) {
  const width = settings.video.width;
  const height = settings.video.height;
  const sourceCards = scene.sourceIds
    .map((sourceId) => assetBySource.get(sourceId))
    .filter(Boolean)
    .slice(0, 4);
  const quoteCards = scene.quoteIds.map((quoteId) => quotesById.get(quoteId)).filter(Boolean);
  const gapCards = scene.gapIds.map((gapId) => `${gapId}: NOT PUBLICLY LOCATED IN THE REVIEWED PACKAGE`);
  const beats = [...scene.visualBeats, ...quoteCards.map((q) => `"${q.exactQuotedText}"`), ...gapCards];
  const titleLines = wrapWords(`${scene.sceneId}: ${scene.title}`, 42);
  let y = 118;
  const textEls = [];
  for (const line of titleLines) {
    textEls.push(`<text x="86" y="${y}" class="title">${htmlEscape(line)}</text>`);
    y += 58;
  }
  textEls.push(`<text x="86" y="${y + 12}" class="meta">${htmlEscape(`${secondsToTimestamp(scaledScene.start, ":").slice(0, 8)} - ${secondsToTimestamp(scaledScene.end, ":").slice(0, 8)} | ${scene.paragraphs.join(", ")}`)}</text>`);

  const beatY = 300;
  const beatEls = beats.slice(0, 8).flatMap((beat, i) => {
    const bx = 86 + (i % 2) * 860;
    const by = beatY + Math.floor(i / 2) * 112;
    const lines = wrapWords(beat, 48).slice(0, 2);
    return [
      `<rect x="${bx}" y="${by}" width="790" height="84" rx="14" class="card"/>`,
      ...lines.map((line, j) => `<text x="${bx + 24}" y="${by + 34 + j * 28}" class="beat">${htmlEscape(line)}</text>`)
    ];
  });

  const sourceEls = sourceCards.flatMap((asset, i) => {
    const sx = 86 + i * 445;
    const sy = 790;
    return [
      `<rect x="${sx}" y="${sy}" width="405" height="142" rx="12" class="source"/>`,
      `<text x="${sx + 18}" y="${sy + 34}" class="sourceId">${htmlEscape(asset.sourceId)}</text>`,
      `<text x="${sx + 18}" y="${sy + 64}" class="sourceTitle">${htmlEscape(asset.title.slice(0, 52))}</text>`,
      `<text x="${sx + 18}" y="${sy + 94}" class="sourceMeta">${htmlEscape(asset.sourcePosture)}</text>`,
      `<text x="${sx + 18}" y="${sy + 122}" class="sourcePath">${htmlEscape(asset.sourcePath.slice(0, 58))}</text>`
    ];
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    .bg{fill:#f7f1e6}.rule{stroke:#9a4f1c;stroke-width:4}.title{font-family:Arial,Helvetica,sans-serif;font-size:52px;font-weight:700;fill:#1f2328}.meta{font-family:Arial,Helvetica,sans-serif;font-size:25px;fill:#5b6470}.card{fill:#fffdf8;stroke:#d7c6ad;stroke-width:2}.beat{font-family:Arial,Helvetica,sans-serif;font-size:27px;font-weight:700;fill:#1f2328}.source{fill:#ffffff;stroke:#c9b99f;stroke-width:2}.sourceId{font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;fill:#9a4f1c}.sourceTitle{font-family:Arial,Helvetica,sans-serif;font-size:19px;fill:#1f2328}.sourceMeta{font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;fill:#1f6f43}.sourcePath{font-family:Arial,Helvetica,sans-serif;font-size:15px;fill:#5b6470}.wm{font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;fill:#7f1d1d}.brand{font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:700;fill:#1f2328}
  </style>
  <rect class="bg" width="100%" height="100%"/>
  <line class="rule" x1="86" y1="72" x2="1834" y2="72"/>
  ${index === 0 ? `<text x="86" y="54" class="wm">${htmlEscape(settings.watermark.openingText)}</text>` : ""}
  <text x="1390" y="54" class="wm">${htmlEscape(settings.watermark.persistentText)}</text>
  ${textEls.join("\n  ")}
  ${beatEls.join("\n  ")}
  ${sourceEls.join("\n  ")}
  <text x="86" y="1010" class="brand">Grok Archive Hub | grokarchivehub.com | @GrokArchiveHub</text>
</svg>`;
}

function makeCaptions(paragraphs, durationSeconds) {
  const items = [...paragraphs.values()];
  const totalWords = items.reduce((sum, item) => sum + item.body.split(/\s+/).filter(Boolean).length, 0);
  let cursor = 0;
  const cues = ["WEBVTT", "", "NOTE PROVISIONAL_TIMING", "Generated for local rough-cut review from approved narration text.", "Retiming is required after final narrator audio.", ""];
  items.forEach((item, index) => {
    const words = item.body.split(/\s+/).filter(Boolean).length;
    const cueDuration = index === items.length - 1 ? durationSeconds - cursor : Math.max(7, (words / totalWords) * durationSeconds);
    const end = Math.min(durationSeconds - 0.25, cursor + cueDuration);
    cues.push(`${secondsToTimestamp(cursor)} --> ${secondsToTimestamp(end)}`);
    cues.push(...wrapWords(`${item.id}: ${item.body}`, 72));
    cues.push("");
    cursor = end;
  });
  return cues.join("\n");
}

function writeReviewHtml(paragraphs, scaledScenes, captionFileName) {
  const rows = scaledScenes.map(({ scene, start, end }) => `<tr><td>${scene.sceneId}</td><td>${secondsToTimestamp(start, ":").slice(0, 8)}-${secondsToTimestamp(end, ":").slice(0, 8)}</td><td>${htmlEscape(scene.title)}</td><td>${scene.claimIds.join(", ")}</td><td>${scene.sourceIds.join(", ")}</td></tr>`).join("\n");
  const narration = [...paragraphs.values()].map((p) => `<section><h3>${p.id} - ${htmlEscape(p.title)}</h3><p>${htmlEscape(p.body)}</p><p><strong>Claims:</strong> ${p.claims.join(", ")}</p></section>`).join("\n");
  const gaps = ["GAP-001: Senate questions for the record or written Blanche answers", "GAP-002: person-specific DOJ analyses", "GAP-003: survivor-meeting follow-up documentation", "GAP-004: complete official stenographic Day 1 transcript"];
  const html = `<!doctype html>
<meta charset="utf-8">
<title>GAH Video Pilot Rough Cut Review</title>
<style>body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:24px auto;max-width:1100px;padding:0 18px;line-height:1.5;background:#f7f1e6;color:#1f2328}video{width:100%;background:#000}table{width:100%;border-collapse:collapse;background:#fff}td,th{border:1px solid #c9b99f;padding:8px;vertical-align:top}.warn{font-weight:800;color:#7f1d1d}.card{background:#fff;padding:14px;border:1px solid #d7c6ad;border-radius:8px;margin:14px 0}</style>
<h1>GAH Video Pilot Rough Cut Review</h1>
<p class="warn">ROUGH CUT — NOT FOR PUBLICATION</p>
<video controls preload="metadata"><source src="${htmlEscape(settings.output.mp4File)}" type="video/mp4"><track src="${htmlEscape(captionFileName)}" kind="captions" srclang="en" label="English provisional"></video>
<div class="card"><h2>Status</h2><p>Local editorial review only. No YouTube upload, API write, X post, public watch page, deployment, or merge.</p></div>
<h2>Scene Timeline</h2><table><thead><tr><th>Scene</th><th>Time</th><th>Title</th><th>Claims</th><th>Sources</th></tr></thead><tbody>${rows}</tbody></table>
<h2>Unresolved Gaps</h2><ul>${gaps.map((gap) => `<li>${htmlEscape(gap)} — <strong>NOT PUBLICLY LOCATED IN THE REVIEWED PACKAGE</strong></li>`).join("")}</ul>
<h2>Narration</h2>${narration}
<h2>Approval / Revision Checklist</h2><ul><li>Approve rough-cut structure.</li><li>Request scene or narration changes.</li><li>Hold before final narrator and thumbnail production.</li></ul>`;
  fs.writeFileSync(outputHtml, html);
}

function checksum(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function main() {
  const missing = [];
  for (const [name, command] of [["ffmpeg", ffmpegBin], ["ffprobe", ffprobeBin]]) {
    if (!canRun(command)) missing.push(name);
  }
  if (!commandExists(sayBin)) {
    missing.push("say");
  }
  if (missing.length) {
    console.log(JSON.stringify({
      ok: false,
      status: "BLOCKED_FOR_LOCAL_RENDER",
      missingDependencies: missing,
      checkedBinaries: { ffmpeg: ffmpegBin, ffprobe: ffprobeBin, say: sayBin },
      homebrewAvailable: canRun("brew", ["--version"]),
      message: "Install or link the missing local render tools, then rerun this script. No remote installers are used."
    }, null, 2));
    process.exit(2);
  }

  fs.mkdirSync(exportDir, { recursive: true });
  fs.mkdirSync(workDir, { recursive: true });

  const narrationPath = path.join(PACKAGE_DIR, "narration.txt");
  const audioPath = path.join(workDir, "provisional-narration.m4a");
  run(sayBin, ["-v", settings.audio.voice, "-r", String(settings.audio.rateWordsPerMinute), "-f", narrationPath, "-o", audioPath, "--file-format=m4af"]);

  const audioDuration = Number(run(ffprobeBin, ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", audioPath]).trim());
  const videoDuration = Math.max(audioDuration + 2, settings.video.durationToleranceSeconds.min);
  const scale = videoDuration / timeline.plannedDurationSeconds;
  const paragraphs = parseParagraphs();
  const quotesById = new Map(quoteLedger.quotes.map((quote) => [quote.quoteId, quote]));
  const assetBySource = new Map(assets.assets.map((asset) => [asset.sourceId, asset]));
  const scaledScenes = [];
  let cursor = 0;

  for (const [index, scene] of timeline.scenes.entries()) {
    const duration = index === timeline.scenes.length - 1 ? videoDuration - cursor : scene.durationSeconds * scale;
    const scaledScene = { scene, start: cursor, end: cursor + duration, duration };
    scaledScenes.push(scaledScene);
    const svg = makeSvg(scene, index, scaledScene, quotesById, assetBySource);
    fs.writeFileSync(path.join(workDir, `${scene.sceneId}.svg`), svg);
    cursor += duration;
  }

  const concatLines = [];
  for (const { scene, duration } of scaledScenes) {
    const slidePath = path.join(workDir, `${scene.sceneId}.svg`).replace(/'/g, "'\\''");
    concatLines.push(`file '${slidePath}'`);
    concatLines.push(`duration ${duration.toFixed(3)}`);
  }
  const lastSlide = path.join(workDir, `${scaledScenes.at(-1).scene.sceneId}.svg`).replace(/'/g, "'\\''");
  concatLines.push(`file '${lastSlide}'`);
  const concatPath = path.join(workDir, "slides.txt");
  fs.writeFileSync(concatPath, concatLines.join("\n"));

  const roughVtt = makeCaptions(paragraphs, videoDuration);
  fs.writeFileSync(outputVtt, roughVtt);

  run(ffmpegBin, [
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", concatPath,
    "-i", audioPath,
    "-vf", `fps=${settings.video.frameRate},scale=${settings.video.width}:${settings.video.height},format=${settings.video.pixelFormat}`,
    "-c:v", settings.video.codec,
    "-pix_fmt", settings.video.pixelFormat,
    "-c:a", settings.audio.codec,
    "-b:a", "160k",
    "-af", "loudnorm=I=-18:LRA=11:TP=-1.5",
    "-shortest",
    outputMp4
  ]);

  run(ffmpegBin, [
    "-y",
    "-i", outputMp4,
    "-vf", "fps=1/60,scale=320:180,tile=3x3:padding=4:margin=4",
    "-frames:v", "1",
    outputContactSheet
  ]);

  writeReviewHtml(paragraphs, scaledScenes, settings.output.captionsFile);
  fs.writeFileSync(outputInstructions, `# Rough-Cut Review Instructions

Open \`rough-cut-review.html\` or \`${settings.output.mp4File}\` from this folder.

This is a local rough cut only. It uses macOS \`say\`, Samantha voice, 150 wpm, for pacing review. It is not final narration.

Review decision:

- approve rough-cut structure
- request scene/narration changes
- hold before final narrator and thumbnail production
`);

  const generatedManifest = {
    ...manifest,
    status: "rough-cut-rendered",
    renderedAt: new Date().toISOString(),
    durationSeconds: Number(videoDuration.toFixed(3)),
    audioDurationSeconds: Number(audioDuration.toFixed(3)),
    sourceAssetCount: assets.assets.length,
    cropCount: crops.crops.length,
    outputFiles: [
      settings.output.mp4File,
      settings.output.captionsFile,
      settings.output.reviewHtmlFile,
      settings.output.manifestFile,
      settings.output.checksumsFile,
      settings.output.contactSheetFile,
      settings.output.instructionsFile
    ]
  };
  fs.writeFileSync(outputManifest, JSON.stringify(generatedManifest, null, 2) + "\n");
  const checksumFiles = [outputMp4, outputVtt, outputHtml, outputManifest, outputContactSheet, outputInstructions];
  fs.writeFileSync(outputChecksums, checksumFiles.map((file) => `${checksum(file)}  ${path.basename(file)}`).join("\n") + "\n");

  console.log(JSON.stringify({
    ok: true,
    status: "ROUGH_CUT_READY",
    outputDirectory: exportDir,
    mp4: outputMp4,
    captions: outputVtt,
    contactSheet: outputContactSheet,
    durationSeconds: Number(videoDuration.toFixed(3)),
    sourceAssetCount: assets.assets.length,
    youtubeApiWriteOccurred: false,
    xPostOccurred: false,
    deploymentOccurred: false
  }, null, 2));
}

main();
