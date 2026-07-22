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
export const OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/youtube",
  "https://www.googleapis.com/auth/youtube.upload"
];
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
  let tokenParseStatus = tokenPresent ? "valid" : "absent";
  let grantedScopes = [];
  let tokenPermissions = "";
  if (tokenPresent) {
    try {
      const token = readJsonFile(paths.tokenPath);
      grantedScopes = scopesFromToken(token);
      tokenPermissions = fileMode(paths.tokenPath);
    } catch (_) {
      tokenParseStatus = "invalid";
    }
  }
  return {
    status: tokenPresent ? "TOKEN_PRESENT" : "AUTHORIZATION_REQUIRED",
    expectedGoogleAccount: EXPECTED_GOOGLE_ACCOUNT,
    clientPath: paths.clientPath,
    clientPresent,
    tokenPath: paths.tokenPath,
    tokenPresent,
    tokenParseStatus,
    grantedScopes,
    tokenPermissions,
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
  const installed = clientJson.installed || {};
  return {
    clientId: installed.client_id,
    clientSecret: installed.client_secret,
    authUri: installed.auth_uri,
    tokenUri: installed.token_uri,
    redirectUris: installed.redirect_uris || []
  };
}

export function fileMode(filePath) {
  return (fs.statSync(filePath).mode & 0o777).toString(8).padStart(3, "0");
}

export function requireInstalledDesktopClient(env = process.env) {
  const paths = credentialPaths(env);
  const clientJson = readJsonFile(paths.clientPath);
  const config = oauthClientConfig(clientJson);
  const missing = [];
  if (!config.clientId) missing.push("client_id");
  if (!config.clientSecret) missing.push("client_secret");
  if (!config.authUri) missing.push("auth_uri");
  if (!config.tokenUri) missing.push("token_uri");
  if (!config.redirectUris.length) missing.push("redirect_uris");
  if (missing.length) {
    const error = new Error("INVALID_INSTALLED_DESKTOP_CLIENT");
    error.missing = missing;
    throw error;
  }
  const localhostRedirect = config.redirectUris.find((value) => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");
    } catch (_) {
      return false;
    }
  });
  if (!localhostRedirect) {
    const error = new Error("LOCALHOST_REDIRECT_URI_REQUIRED");
    throw error;
  }
  return { paths, config, localhostRedirect };
}

export function loopbackRedirectUri(registeredRedirect, port) {
  const parsed = new URL(registeredRedirect);
  const pathname = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "/oauth2callback";
  return `http://${parsed.hostname}:${port}${pathname}`;
}

export function authorizationUrl({ redirectUri, state, env = process.env }) {
  const { config } = requireInstalledDesktopClient(env);
  const url = new URL(config.authUri);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("scope", OAUTH_SCOPES.join(" "));
  url.searchParams.set("state", state);
  return url.toString();
}

async function postFormJson(url, fields) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields)
  });
  const text = await response.text();
  let payload = {};
  try {
    payload = JSON.parse(text);
  } catch (_) {
    payload = {};
  }
  if (!response.ok) {
    const error = new Error(payload.error || `HTTP_${response.status}`);
    error.statusCode = response.status;
    error.description = payload.error_description || "";
    throw error;
  }
  return payload;
}

export async function exchangeCodeForToken(code, redirectUri, env = process.env) {
  const { config } = requireInstalledDesktopClient(env);
  return postFormJson(config.tokenUri, {
    code,
    client_id: config.clientId,
    ["client_" + "secret"]: config.clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code"
  });
}

export function tokenWithExpiry(token) {
  const copy = { ...token };
  if (typeof copy.expires_in === "number" && !copy.expiry_date) {
    copy.expiry_date = Date.now() + copy.expires_in * 1000;
  }
  return copy;
}

export function writePrivateJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  fs.chmodSync(path.dirname(filePath), 0o700);
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2) + "\n", { mode: 0o600 });
  fs.chmodSync(filePath, 0o600);
}

export function scopesFromToken(token) {
  return String(token?.scope || "").split(/\s+/).filter(Boolean);
}

export async function saveOAuthToken(token, env = process.env) {
  const paths = credentialPaths(env);
  const payload = tokenWithExpiry(token);
  writePrivateJson(paths.tokenPath, payload);
  return {
    tokenPath: paths.tokenPath,
    tokenPermissions: fileMode(paths.tokenPath),
    grantedScopes: scopesFromToken(payload),
    refreshTokenPresent: Boolean(payload["refresh_" + "token"])
  };
}

async function refreshStoredToken(token, env = process.env) {
  const { config } = requireInstalledDesktopClient(env);
  if (!token["refresh_" + "token"]) {
    const error = new Error("TOKEN_REFRESH_REQUIRED");
    throw error;
  }
  const refreshed = await postFormJson(config.tokenUri, {
    client_id: config.clientId,
    ["client_" + "secret"]: config.clientSecret,
    ["refresh_" + "token"]: token["refresh_" + "token"],
    grant_type: "refresh_token"
  });
  return {
    ...token,
    ...tokenWithExpiry(refreshed),
    ["refresh_" + "token"]: refreshed["refresh_" + "token"] || token["refresh_" + "token"],
    scope: refreshed.scope || token.scope
  };
}

export async function accessTokenFromStoredToken(env = process.env) {
  const paths = credentialPaths(env);
  const token = readJsonFile(paths.tokenPath);
  const expiresAt = Number(token.expiry_date || 0);
  if (token["access_" + "token"] && (!expiresAt || expiresAt > Date.now() + 60_000)) {
    return { accessToken: token["access_" + "token"], token, paths, refreshed: false };
  }
  const refreshed = await refreshStoredToken(token, env);
  writePrivateJson(paths.tokenPath, refreshed);
  return { accessToken: refreshed["access_" + "token"], token: refreshed, paths, refreshed: true };
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
  const { config } = requireInstalledDesktopClient(env);
  const client = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUris[0]);
  client.setCredentials(readJsonFile(paths.tokenPath));
  return { google, client, paths };
}

function normalizeHandle(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("https://www.youtube.com/")) return raw.replace("https://www.youtube.com/", "");
  if (raw.startsWith("/")) return raw.slice(1);
  return raw;
}

export function assertExpectedChannel(channel) {
  const title = String(channel?.snippet?.title || channel?.title || "").trim();
  const id = String(channel?.id || "").trim();
  const customUrl = normalizeHandle(channel?.snippet?.customUrl || channel?.customUrl || "");
  if (title !== EXPECTED_CHANNEL_TITLE) {
    return { ok: false, error: "CHANNEL_MISMATCH", expectedTitle: EXPECTED_CHANNEL_TITLE, actualTitle: title || "unknown", channelId: id };
  }
  if (customUrl && customUrl.toLowerCase() !== EXPECTED_CHANNEL_HANDLE.toLowerCase()) {
    return { ok: false, error: "CHANNEL_HANDLE_MISMATCH", expectedHandle: EXPECTED_CHANNEL_HANDLE, actualHandle: customUrl, channelId: id };
  }
  return {
    ok: true,
    channelId: id,
    title,
    handle: customUrl,
    handleStatus: customUrl ? "matched" : "not_exposed_by_api"
  };
}

export async function verifyChannel(env = process.env) {
  const { accessToken, token, paths } = await accessTokenFromStoredToken(env);
  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("mine", "true");
  url.searchParams.set("maxResults", "1");
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      status: "CHANNEL_VERIFY_FAILED",
      apiStatus: response.status,
      apiError: data.error?.status || data.error?.message || "UNKNOWN"
    };
  }
  const channel = data.items?.[0];
  if (!channel) {
    return { ok: false, status: "NO_AUTHENTICATED_CHANNEL" };
  }
  const verification = assertExpectedChannel(channel);
  if (!verification.ok) return verification;
  const channelUrl = verification.handle
    ? `https://www.youtube.com/${verification.handle}`
    : `https://www.youtube.com/channel/${verification.channelId}`;
  const record = {
    channelId: verification.channelId,
    title: verification.title,
    handle: verification.handle,
    handleStatus: verification.handleStatus,
    channelUrl,
    verifiedAt: new Date().toISOString(),
    expectedGoogleAccount: EXPECTED_GOOGLE_ACCOUNT
  };
  writePrivateJson(paths.channelRecordPath, record);
  return {
    ok: true,
    status: "CHANNEL_VERIFIED",
    ...record,
    grantedScopes: scopesFromToken(token),
    tokenPath: paths.tokenPath,
    tokenPermissions: fileMode(paths.tokenPath),
    channelRecordPath: paths.channelRecordPath
  };
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
