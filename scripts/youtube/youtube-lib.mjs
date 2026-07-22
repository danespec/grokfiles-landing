import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadRegistry, validateVideoRegistry, youtubeUrlForId } from "../video-registry-lib.mjs";

export const EXPECTED_CHANNEL_TITLE = "Grok Archive Hub";
export const EXPECTED_CHANNEL_HANDLE = "@GrokArchiveHub";
export const EXPECTED_GOOGLE_ACCOUNT = "grokcloudflare@gmail.com";
export const DEFAULT_CLIENT_PATH = "~/.config/gah-youtube/client_secret.json";
export const DEFAULT_TOKEN_PATH = "~/.config/gah-youtube/token.json";
export const DEFAULT_CHANNEL_RECORD_PATH = "~/.config/gah-youtube/channel.json";
export const SUPPORTED_VIDEO_MIME = new Map([
  [".mp4", "video/mp4"],
  [".mov", "video/quicktime"],
  [".m4v", "video/x-m4v"],
  [".webm", "video/webm"]
]);
export const SUPPORTED_IMAGE_MIME = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"]
]);
export const SUPPORTED_CAPTION_MIME = new Map([
  [".srt", "application/x-subrip"],
  [".vtt", "text/vtt"]
]);

export function expandHome(value) {
  const raw = String(value || "");
  if (raw === "~") return os.homedir();
  if (raw.startsWith("~/")) return path.join(os.homedir(), raw.slice(2));
  return raw;
}

export function credentialPaths(env = process.env) {
  return {
    clientPath: expandHome(env.GAH_YOUTUBE_CLIENT_SECRET || DEFAULT_CLIENT_PATH),
    tokenPath: expandHome(env.GAH_YOUTUBE_TOKEN || DEFAULT_TOKEN_PATH),
    channelRecordPath: expandHome(env.GAH_YOUTUBE_CHANNEL_RECORD || DEFAULT_CHANNEL_RECORD_PATH)
  };
}

export function parseArgs(argv = process.argv.slice(2)) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) continue;
    const key = value.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      args.set(key, next);
      index += 1;
    } else {
      args.set(key, "true");
    }
  }
  return args;
}

export function jsonResult(payload, status = 0) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(status);
}

export function fileExists(filePath) {
  return Boolean(filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile());
}

export function authStatus(env = process.env) {
  const paths = credentialPaths(env);
  const clientPresent = fileExists(paths.clientPath);
  const tokenPresent = fileExists(paths.tokenPath);
  return {
    status: tokenPresent ? "TOKEN_PRESENT" : "AUTHORIZATION_REQUIRED",
    expectedGoogleAccount: EXPECTED_GOOGLE_ACCOUNT,
    clientPath: paths.clientPath,
    clientPresent,
    tokenPath: paths.tokenPath,
    tokenPresent,
    bootstrapCommand: "node scripts/youtube/oauth-bootstrap.mjs --execute"
  };
}

export function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export async function loadGoogleApis() {
  try {
    return await import("googleapis");
  } catch (_) {
    const error = new Error("GOOGLEAPIS_PACKAGE_REQUIRED: install the official googleapis package before live YouTube API calls");
    error.code = "GOOGLEAPIS_PACKAGE_REQUIRED";
    throw error;
  }
}

function oauthClientConfig(clientJson) {
  const installed = clientJson.installed || clientJson.web || {};
  return {
    clientId: installed.client_id,
    clientSecret: installed.client_secret,
    redirectUri: (installed.redirect_uris || ["http://localhost"])[0]
  };
}

export async function oauthClientFromFiles(env = process.env) {
  const paths = credentialPaths(env);
  const status = authStatus(env);
  if (!status.clientPresent) {
    const error = new Error("CLIENT_SECRET_MISSING");
    error.status = status;
    throw error;
  }
  if (!status.tokenPresent) {
    const error = new Error("AUTHORIZATION_REQUIRED");
    error.status = status;
    throw error;
  }
  const { google } = await loadGoogleApis();
  const config = oauthClientConfig(readJsonFile(paths.clientPath));
  const client = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
  client.setCredentials(readJsonFile(paths.tokenPath));
  return { google, client, paths };
}

export function assertExpectedChannel(channel) {
  const title = String(channel?.snippet?.title || channel?.title || "").trim();
  const id = String(channel?.id || "").trim();
  const customUrl = String(channel?.snippet?.customUrl || channel?.customUrl || "").trim();
  if (title !== EXPECTED_CHANNEL_TITLE) {
    return { ok: false, error: "CHANNEL_MISMATCH", expectedTitle: EXPECTED_CHANNEL_TITLE, actualTitle: title || "unknown", channelId: id };
  }
  if (customUrl && customUrl.toLowerCase() !== EXPECTED_CHANNEL_HANDLE.toLowerCase()) {
    return { ok: false, error: "CHANNEL_HANDLE_MISMATCH", expectedHandle: EXPECTED_CHANNEL_HANDLE, actualHandle: customUrl, channelId: id };
  }
  return { ok: true, channelId: id, title, handle: customUrl || EXPECTED_CHANNEL_HANDLE };
}

export async function verifyChannel(env = process.env) {
  const { google, client, paths } = await oauthClientFromFiles(env);
  const youtube = google.youtube({ version: "v3", auth: client });
  const response = await youtube.channels.list({ part: ["snippet"], mine: true, maxResults: 1 });
  const channel = response.data.items?.[0];
  const verification = assertExpectedChannel(channel);
  if (!verification.ok) return verification;
  const record = {
    channelId: verification.channelId,
    title: verification.title,
    handle: verification.handle,
    verifiedAt: new Date().toISOString(),
    expectedGoogleAccount: EXPECTED_GOOGLE_ACCOUNT
  };
  fs.mkdirSync(path.dirname(paths.channelRecordPath), { recursive: true });
  fs.writeFileSync(paths.channelRecordPath, JSON.stringify(record, null, 2) + "\n", { mode: 0o600 });
  return { ok: true, ...record, channelRecordPath: paths.channelRecordPath };
}

export function loadVideoRecord(registryId, registryPath = "content/video-registry.json", root = process.cwd()) {
  const registry = loadRegistry(root, registryPath);
  const validation = validateVideoRegistry(registry);
  if (!validation.ok) {
    const error = new Error("REGISTRY_INVALID");
    error.errors = validation.errors;
    throw error;
  }
  const record = registry.videos.find((video) => video.id === registryId);
  if (!record) {
    const error = new Error("REGISTRY_RECORD_NOT_FOUND");
    error.registryId = registryId;
    throw error;
  }
  return { registry, record };
}

export function detectMime(filePath, supported) {
  const ext = path.extname(filePath || "").toLowerCase();
  return supported.get(ext) || "";
}

export function validateSourceVideo(filePath) {
  if (!filePath || !fileExists(filePath)) return { ok: false, error: "SOURCE_VIDEO_MISSING" };
  const mime = detectMime(filePath, SUPPORTED_VIDEO_MIME);
  if (!mime) return { ok: false, error: "UNSUPPORTED_VIDEO_MIME" };
  if (fs.statSync(filePath).size <= 0) return { ok: false, error: "SOURCE_VIDEO_EMPTY" };
  return { ok: true, mime };
}

export function validateThumbnail(filePath) {
  if (!filePath || !fileExists(filePath)) return { ok: false, error: "THUMBNAIL_MISSING" };
  const mime = detectMime(filePath, SUPPORTED_IMAGE_MIME);
  if (!mime) return { ok: false, error: "UNSUPPORTED_THUMBNAIL_MIME" };
  if (fs.statSync(filePath).size <= 0) return { ok: false, error: "THUMBNAIL_EMPTY" };
  return { ok: true, mime };
}

export function validateCaptions(filePath) {
  if (!filePath || !fileExists(filePath)) return { ok: false, error: "CAPTIONS_MISSING" };
  const mime = detectMime(filePath, SUPPORTED_CAPTION_MIME);
  if (!mime) return { ok: false, error: "UNSUPPORTED_CAPTIONS_MIME" };
  const text = fs.readFileSync(filePath, "utf8").trim();
  if (!text) return { ok: false, error: "CAPTIONS_EMPTY" };
  return { ok: true, mime };
}

export function validateTitleDescription(title, description) {
  const cleanTitle = String(title || "").trim();
  const cleanDescription = String(description || "").trim();
  if (!cleanTitle) return { ok: false, error: "TITLE_EMPTY" };
  if (cleanTitle.length > 100) return { ok: false, error: "TITLE_TOO_LONG" };
  if (cleanDescription.length > 5000) return { ok: false, error: "DESCRIPTION_TOO_LONG" };
  return { ok: true, title: cleanTitle, description: cleanDescription };
}

export function dryRunResult(operation, details = {}) {
  return {
    ok: true,
    dryRun: true,
    operation,
    wouldWrite: false,
    youtubeWriteOccurred: false,
    xPostOccurred: false,
    ...details
  };
}

export function registryUrlForRecord(record) {
  return record.youtubeUrl || youtubeUrlForId(record.youtubeVideoId);
}

export function scriptName(importMetaUrl) {
  return path.relative(process.cwd(), fileURLToPath(importMetaUrl));
}
