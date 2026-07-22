#!/usr/bin/env node
import fs from "node:fs";
import { dryRunResult, jsonResult, loadVideoRecord, oauthClientFromFiles, parseArgs, validateCaptions, verifyChannel } from "./youtube-lib.mjs";

const args = parseArgs();
const execute = args.get("execute") === "true";
const registryId = args.get("registry-id") || args.get("id") || "";
const captions = args.get("captions") || "";
const language = args.get("language") || "en";
const registryPath = args.get("registry") || "content/video-registry.json";
if (!registryId) jsonResult({ ok: false, error: "REGISTRY_ID_REQUIRED" }, 1);
if (language !== "en") jsonResult({ ok: false, error: "ONLY_ENGLISH_CAPTIONS_SUPPORTED_BY_DEFAULT" }, 1);
const captionsCheck = validateCaptions(captions);
if (!captionsCheck.ok) jsonResult({ ok: false, error: captionsCheck.error }, 1);

let record;
try {
  ({ record } = loadVideoRecord(registryId, registryPath));
} catch (error) {
  jsonResult({ ok: false, error: error.message, errors: error.errors, registryId }, 1);
}
if (!record.youtubeVideoId) jsonResult({ ok: false, error: "YOUTUBE_VIDEO_ID_REQUIRED" }, 1);

if (!execute) jsonResult(dryRunResult("upload-captions", { registryId, youtubeVideoId: record.youtubeVideoId, captions, language, mime: captionsCheck.mime }));
const channel = await verifyChannel();
if (!channel.ok) jsonResult(channel, 1);
const { google, client } = await oauthClientFromFiles();
const youtube = google.youtube({ version: "v3", auth: client });
const response = await youtube.captions.insert({
  part: ["snippet"],
  requestBody: {
    snippet: {
      videoId: record.youtubeVideoId,
      language,
      name: args.get("name") || "English captions",
      isDraft: args.get("draft") === "true"
    }
  },
  media: {
    mimeType: captionsCheck.mime,
    body: fs.createReadStream(captions)
  }
});
jsonResult({
  ok: true,
  dryRun: false,
  operation: "upload-captions",
  channelId: channel.channelId,
  youtubeVideoId: record.youtubeVideoId,
  captionId: response.data.id || "",
  youtubeWriteOccurred: true,
  xPostOccurred: false
});
