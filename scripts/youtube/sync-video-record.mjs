#!/usr/bin/env node
import { dryRunResult, jsonResult, loadVideoRecord, parseArgs, registryUrlForRecord } from "./youtube-lib.mjs";

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

if (!execute) {
  jsonResult(dryRunResult("sync-video-record", {
    registryId,
    youtubeUrl: registryUrlForRecord(record),
    registryUpdate: "matching-record-only",
    xPublicationStatus: record.xPublicationStatus || "not-queued"
  }));
}

jsonResult({
  ok: false,
  status: "LIVE_REGISTRY_SYNC_REQUIRES_REVIEWED_PATCH",
  registryId,
  message: "This dormant branch refuses to mutate the registry from CLI state until a reviewed execution adapter is enabled."
}, 1);
