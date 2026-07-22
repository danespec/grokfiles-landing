#!/usr/bin/env node
import fs from "node:fs";
import { writeFileIfChanged } from "../video-registry-lib.mjs";
import { dryRunResult, jsonResult, loadVideoRecord, oauthClientFromFiles, parseArgs, validateSourceVideo, validateTitleDescription, verifyChannel } from "./youtube-lib.mjs";

const args = parseArgs();
const execute = args.get("execute") === "true";
const registryId = args.get("registry-id") || args.get("id") || "";
const source = args.get("source") || "";
const registryPath = args.get("registry") || "content/video-registry.json";
const notifySubscribers = args.get("notify-subscribers") === "true";
const privacyStatus = args.get("privacy-status") || "private";
const madeForKids = args.get("made-for-kids") === "true";
const playlistId = args.get("playlist-id") || "";
const createPlaylist = args.get("create-playlist") === "true";
const playlistTitle = args.get("playlist-title") || "";

if (!registryId) jsonResult({ ok: false, error: "REGISTRY_ID_REQUIRED" }, 1);
const sourceCheck = validateSourceVideo(source);
if (!sourceCheck.ok) jsonResult({ ok: false, error: sourceCheck.error }, 1);

let record;
try {
  ({ record } = loadVideoRecord(registryId, registryPath));
} catch (error) {
  jsonResult({ ok: false, error: error.message, errors: error.errors, registryId }, 1);
}

if (record.youtubeVideoId && args.get("replace") !== "true" && args.get("retry") !== "true") {
  jsonResult({ ok: false, error: "REGISTRY_RECORD_ALREADY_HAS_YOUTUBE_ID", registryId }, 1);
}

const titleCheck = validateTitleDescription(record.title, record.description);
if (!titleCheck.ok) jsonResult({ ok: false, error: titleCheck.error }, 1);
if (!["private", "unlisted"].includes(privacyStatus)) jsonResult({ ok: false, error: "PUBLIC_UPLOAD_REJECTED" }, 1);
if (createPlaylist && !playlistTitle) jsonResult({ ok: false, error: "PLAYLIST_TITLE_REQUIRED" }, 1);

if (!execute) {
  jsonResult(dryRunResult("upload-video", {
    registryId,
    source,
    mime: sourceCheck.mime,
    privacyStatus,
    madeForKids,
    notifySubscribers,
    playlistAssignment: playlistId ? "would-assign" : "none",
    playlistCreation: createPlaylist ? "requires---execute-and-playlist-title" : "none",
    registryUpdate: "matching-record-only",
    xPublicationStatus: "not-queued"
  }));
}

const channel = await verifyChannel();
if (!channel.ok) jsonResult(channel, 1);
const { google, client } = await oauthClientFromFiles();
const youtube = google.youtube({ version: "v3", auth: client });

let finalPlaylistId = playlistId;
if (createPlaylist) {
  const playlistResponse = await youtube.playlists.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: { title: playlistTitle },
      status: { privacyStatus: "private" }
    }
  });
  finalPlaylistId = playlistResponse.data.id || "";
}

const response = await youtube.videos.insert({
  part: ["snippet", "status"],
  notifySubscribers,
  requestBody: {
    snippet: {
      title: titleCheck.title,
      description: titleCheck.description,
      tags: record.tags || []
    },
    status: {
      privacyStatus,
      selfDeclaredMadeForKids: madeForKids
    }
  },
  media: {
    mimeType: sourceCheck.mime,
    body: fs.createReadStream(source)
  }
});

const videoId = response.data.id || "";
if (!videoId) jsonResult({ ok: false, error: "UPLOAD_RESPONSE_MISSING_VIDEO_ID" }, 1);

if (finalPlaylistId) {
  await youtube.playlistItems.insert({
    part: ["snippet"],
    requestBody: {
      snippet: {
        playlistId: finalPlaylistId,
        resourceId: { kind: "youtube#video", videoId }
      }
    }
  });
}

const { registry } = loadVideoRecord(registryId, registryPath);
const target = registry.videos.find((video) => video.id === registryId);
target.youtubeVideoId = videoId;
target.youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
target.status = privacyStatus === "unlisted" ? "uploaded-unlisted" : "uploaded-private";
target.visibility = privacyStatus;
target.madeForKids = madeForKids;
target.xPublicationStatus = "not-queued";
writeFileIfChanged(registryPath, JSON.stringify(registry, null, 2));

jsonResult({
  ok: true,
  dryRun: false,
  operation: "upload-video",
  channelId: channel.channelId,
  registryId,
  youtubeVideoId: videoId,
  privacyStatus,
  notifySubscribers,
  playlistId: finalPlaylistId,
  registryUpdated: "matching-record-only",
  youtubeWriteOccurred: true,
  xPostOccurred: false
});
