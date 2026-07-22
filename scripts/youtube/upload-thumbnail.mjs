#!/usr/bin/env node
import fs from "node:fs";
import { dryRunResult, jsonResult, loadVideoRecord, oauthClientFromFiles, parseArgs, validateThumbnail, verifyChannel } from "./youtube-lib.mjs";

const args = parseArgs();
const execute = args.get("execute") === "true";
const registryId = args.get("registry-id") || args.get("id") || "";
const thumbnail = args.get("thumbnail") || "";
const registryPath = args.get("registry") || "content/video-registry.json";
if (!registryId) jsonResult({ ok: false, error: "REGISTRY_ID_REQUIRED" }, 1);
const thumbnailCheck = validateThumbnail(thumbnail);
if (!thumbnailCheck.ok) jsonResult({ ok: false, error: thumbnailCheck.error }, 1);

let record;
try {
  ({ record } = loadVideoRecord(registryId, registryPath));
} catch (error) {
  jsonResult({ ok: false, error: error.message, errors: error.errors, registryId }, 1);
}
if (!record.youtubeVideoId) jsonResult({ ok: false, error: "YOUTUBE_VIDEO_ID_REQUIRED" }, 1);

if (!execute) jsonResult(dryRunResult("upload-thumbnail", { registryId, youtubeVideoId: record.youtubeVideoId, thumbnail, mime: thumbnailCheck.mime }));
const channel = await verifyChannel();
if (!channel.ok) jsonResult(channel, 1);
const { google, client } = await oauthClientFromFiles();
const youtube = google.youtube({ version: "v3", auth: client });
await youtube.thumbnails.set({
  videoId: record.youtubeVideoId,
  media: {
    mimeType: thumbnailCheck.mime,
    body: fs.createReadStream(thumbnail)
  }
});
jsonResult({
  ok: true,
  dryRun: false,
  operation: "upload-thumbnail",
  channelId: channel.channelId,
  youtubeVideoId: record.youtubeVideoId,
  youtubeWriteOccurred: true,
  xPostOccurred: false
});
