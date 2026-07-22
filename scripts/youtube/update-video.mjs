#!/usr/bin/env node
import { dryRunResult, jsonResult, loadVideoRecord, oauthClientFromFiles, parseArgs, validateTitleDescription, verifyChannel } from "./youtube-lib.mjs";

const args = parseArgs();
const execute = args.get("execute") === "true";
const registryId = args.get("registry-id") || args.get("id") || "";
const registryPath = args.get("registry") || "content/video-registry.json";
if (!registryId) jsonResult({ ok: false, error: "REGISTRY_ID_REQUIRED" }, 1);

let record;
try {
  ({ record } = loadVideoRecord(registryId, registryPath));
} catch (error) {
  jsonResult({ ok: false, error: error.message, errors: error.errors, registryId }, 1);
}
if (!record.youtubeVideoId) jsonResult({ ok: false, error: "YOUTUBE_VIDEO_ID_REQUIRED" }, 1);
const titleCheck = validateTitleDescription(record.title, record.description);
if (!titleCheck.ok) jsonResult({ ok: false, error: titleCheck.error }, 1);

if (!execute) {
  jsonResult(dryRunResult("update-video", { registryId, youtubeVideoId: record.youtubeVideoId, privacyStatus: record.visibility || "private" }));
}

const channel = await verifyChannel();
if (!channel.ok) jsonResult(channel, 1);
const { google, client } = await oauthClientFromFiles();
const youtube = google.youtube({ version: "v3", auth: client });
const privacyStatus = ["private", "unlisted"].includes(record.visibility) ? record.visibility : "private";
const response = await youtube.videos.update({
  part: ["snippet", "status"],
  requestBody: {
    id: record.youtubeVideoId,
    snippet: {
      title: titleCheck.title,
      description: titleCheck.description,
      tags: record.tags || [],
      categoryId: args.get("category-id") || "25"
    },
    status: {
      privacyStatus,
      selfDeclaredMadeForKids: Boolean(record.madeForKids)
    }
  }
});
jsonResult({
  ok: true,
  dryRun: false,
  operation: "update-video",
  channelId: channel.channelId,
  youtubeVideoId: response.data.id || record.youtubeVideoId,
  privacyStatus,
  youtubeWriteOccurred: true,
  xPostOccurred: false
});
