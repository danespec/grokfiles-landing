#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(new URL("../../..", import.meta.url).pathname);
const PACKAGE_DIR = path.join(ROOT, "video-projects/blanche-no-evidence");
const PRODUCTION_DIR = path.join(PACKAGE_DIR, "production");
const settings = readJson(path.join(PRODUCTION_DIR, "render-settings.json"));
const timeline = readJson(path.join(PRODUCTION_DIR, "render-timeline.json"));
const assets = readJson(path.join(PRODUCTION_DIR, "asset-ledger.json"));
const crops = readJson(path.join(PRODUCTION_DIR, "source-crop-ledger.json"));
const quoteLedger = readJson(path.join(PACKAGE_DIR, "source-quote-ledger.json"));

const exportDir = path.resolve(argValue("--export-dir", process.env.GAH_ROUGH_CUT_EXPORT_DIR || settings.output.directory));
const ffprobeBin = process.env.FFPROBE_BIN || settings.tools.ffprobe;
const outputMp4 = path.join(exportDir, settings.output.mp4File);
const outputVtt = path.join(exportDir, settings.output.captionsFile);
const outputHtml = path.join(exportDir, settings.output.reviewHtmlFile);
const outputManifest = path.join(exportDir, settings.output.manifestFile);
const outputContactSheet = path.join(exportDir, settings.output.contactSheetFile);

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function canRun(command, args = ["-version"]) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  return !result.error && result.status === 0;
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error) throw new Error(`${command}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `${command} failed`);
  return result.stdout;
}

function parseTimestamp(value) {
  const match = String(value).match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/);
  if (!match) return NaN;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
}

function parseVtt(text) {
  const cues = [];
  const cueRe = /^(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})$/gm;
  let match;
  while ((match = cueRe.exec(text))) {
    cues.push({ start: parseTimestamp(match[1]), end: parseTimestamp(match[2]) });
  }
  return cues;
}

function normalize(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function fileNonzero(file, errors) {
  if (!fs.existsSync(file)) errors.push(`missing file: ${file}`);
  else if (fs.statSync(file).size === 0) errors.push(`zero-byte file: ${file}`);
}

function collectFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(abs));
    if (entry.isFile()) files.push(abs);
  }
  return files;
}

function main() {
  const errors = [];
  const warnings = [];
  if (!canRun(ffprobeBin)) {
    console.log(JSON.stringify({
      ok: false,
      status: "BLOCKED_FOR_LOCAL_RENDER",
      missingDependencies: ["ffprobe"],
      checkedBinary: ffprobeBin,
      errors: ["ffprobe is required to verify the rendered MP4"]
    }, null, 2));
    process.exit(2);
  }

  for (const file of [outputMp4, outputVtt, outputHtml, outputManifest, outputContactSheet]) {
    fileNonzero(file, errors);
  }

  let media = null;
  if (fs.existsSync(outputMp4)) {
    try {
      media = JSON.parse(run(ffprobeBin, ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", outputMp4]));
    } catch (error) {
      errors.push(`MP4 container unreadable: ${error.message}`);
    }
  }

  const videoStream = media?.streams?.find((stream) => stream.codec_type === "video");
  const audioStream = media?.streams?.find((stream) => stream.codec_type === "audio");
  const duration = Number(media?.format?.duration || 0);
  if (videoStream) {
    if (videoStream.codec_name !== "h264") errors.push(`video codec is ${videoStream.codec_name}, expected h264`);
    if (Number(videoStream.width) !== settings.video.width || Number(videoStream.height) !== settings.video.height) errors.push(`resolution is ${videoStream.width}x${videoStream.height}, expected ${settings.video.width}x${settings.video.height}`);
  } else if (media) errors.push("missing video stream");
  if (audioStream) {
    if (audioStream.codec_name !== "aac") errors.push(`audio codec is ${audioStream.codec_name}, expected aac`);
  } else if (media) errors.push("missing audio stream");
  if (duration) {
    if (duration < settings.video.durationToleranceSeconds.min || duration > settings.video.durationToleranceSeconds.max) errors.push(`duration ${duration} outside tolerance`);
  }

  let cueCount = 0;
  if (fs.existsSync(outputVtt)) {
    const vtt = fs.readFileSync(outputVtt, "utf8");
    const cues = parseVtt(vtt);
    cueCount = cues.length;
    if (!vtt.startsWith("WEBVTT")) errors.push("captions do not start with WEBVTT");
    if (!vtt.includes("PROVISIONAL_TIMING")) errors.push("captions are not marked provisional");
    for (let i = 0; i < cues.length; i += 1) {
      if (!Number.isFinite(cues[i].start) || !Number.isFinite(cues[i].end) || cues[i].end <= cues[i].start) errors.push(`invalid caption cue ${i + 1}`);
      if (i > 0 && cues[i].start < cues[i - 1].end) errors.push(`overlapping caption cue ${i + 1}`);
    }
    if (duration && cues.at(-1)?.end >= duration) errors.push("captions end at or after video end");
    const normalizedVtt = normalize(vtt);
    for (const quote of quoteLedger.quotes) {
      if (!normalizedVtt.includes(normalize(quote.exactQuotedText))) errors.push(`caption missing exact approved quote ${quote.quoteId}`);
    }
  }

  const assetIds = new Set(assets.assets.map((asset) => asset.sourceId));
  const cropAssetIds = new Set(crops.crops.map((crop) => crop.assetId));
  for (const scene of timeline.scenes) {
    for (const sourceId of scene.sourceIds) {
      if (!assetIds.has(sourceId)) errors.push(`${scene.sceneId} source ${sourceId} missing from asset ledger`);
    }
  }
  for (const asset of assets.assets) {
    const abs = path.join(ROOT, asset.sourcePath);
    if (!fs.existsSync(abs)) errors.push(`${asset.assetId} source path missing: ${asset.sourcePath}`);
    else if (fs.statSync(abs).size === 0) errors.push(`${asset.assetId} source path is zero bytes`);
    if (!cropAssetIds.has(asset.assetId)) errors.push(`${asset.assetId} missing crop ledger entry`);
  }

  const planText = JSON.stringify({ settings, timeline });
  if (!planText.includes(settings.watermark.persistentText)) errors.push("watermark missing from render plan");
  const htmlText = fs.existsSync(outputHtml) ? fs.readFileSync(outputHtml, "utf8") : "";
  for (const gap of ["GAP-001", "GAP-002", "GAP-003", "GAP-004"]) {
    if (!htmlText.includes(gap)) errors.push(`${gap} missing from review HTML`);
  }

  for (const file of collectFiles(exportDir).filter((file) => !file.endsWith(".mp4") && !file.endsWith(".jpg"))) {
    const text = fs.readFileSync(file, "utf8");
    if (/AIza[0-9A-Za-z_-]{20,}|gh[pousr]_[0-9A-Za-z]{20,}/.test(text)) errors.push(`credential-looking string in export: ${file}`);
  }

  const outputInsideRepo = path.relative(ROOT, outputMp4);
  const outsideGit = outputInsideRepo.startsWith("..") || path.isAbsolute(outputInsideRepo);
  if (!outsideGit) {
    const ignored = spawnSync("git", ["check-ignore", outputMp4], { cwd: ROOT, encoding: "utf8" });
    if (ignored.status !== 0) errors.push("generated MP4 is inside the repository and not ignored by Git");
  }

  const mediaExtensions = new Set([".mp4", ".mov", ".m4v", ".webm", ".wav", ".mp3", ".m4a", ".aac", ".aiff", ".psd", ".prproj"]);
  const repoMedia = collectFiles(PACKAGE_DIR).filter((file) => mediaExtensions.has(path.extname(file).toLowerCase()));
  if (repoMedia.length) errors.push(`media binaries inside package: ${repoMedia.map((file) => path.relative(ROOT, file)).join(", ")}`);

  if (!errors.length && !audioStream) warnings.push("audio stream could not be evaluated because media probe was unavailable");

  const result = {
    ok: errors.length === 0,
    status: errors.length ? "FAILED" : "PASS",
    exportDir,
    mp4: outputMp4,
    durationSeconds: duration ? Number(duration.toFixed(3)) : 0,
    resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : "",
    videoCodec: videoStream?.codec_name || "",
    audioCodec: audioStream?.codec_name || "",
    captionCueCount: cueCount,
    sourceAssetCount: assets.assets.length,
    outsideGit,
    youtubeApiWriteOccurred: false,
    xPostOccurred: false,
    deploymentOccurred: false,
    errors,
    warnings
  };
  console.log(JSON.stringify(result, null, 2));
  if (errors.length) process.exit(1);
}

main();
