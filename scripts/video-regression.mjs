#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  APEX,
  buildVideoArtifacts,
  buildVideoSitemap,
  hasVideoObjectFields,
  renderWatchPage,
  validateVideoRegistry
} from "./video-registry-lib.mjs";
import { assertExpectedChannel } from "./youtube/youtube-lib.mjs";

const repoRoot = process.cwd();
const results = [];

function pass(name, detail = "") {
  results.push({ name, status: "PASS", detail });
}

function fail(name, detail = "") {
  results.push({ name, status: "FAIL", detail });
}

function assert(name, condition, detail = "") {
  if (condition) pass(name, detail);
  else fail(name, detail);
}

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "gah-video-regression-"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function baseRegistry(videos = []) {
  return {
    schemaVersion: 1,
    updatedAt: "2026-07-22T00:00:00Z",
    channel: {
      title: "Grok Archive Hub",
      handle: "@GrokArchiveHub",
      youtubeUrl: "https://www.youtube.com/@GrokArchiveHub",
      expectedGoogleAccount: "grokcloudflare@gmail.com"
    },
    lifecycleStates: ["draft", "rendered", "uploaded-private", "uploaded-unlisted", "scheduled", "published", "failed", "archived"],
    videos
  };
}

function validPublishedVideo(overrides = {}) {
  return {
    id: "video-fixture-001",
    slug: "video-fixture-001",
    status: "published",
    title: "Fixture Video",
    description: "Fixture description with source-chain context.",
    shortDescription: "Fixture summary.",
    youtubeVideoId: "abcDEF12345",
    youtubeUrl: "https://www.youtube.com/watch?v=abcDEF12345",
    thumbnailUrl: "https://grokarchivehub.com/frontdoor/og/grok-archive-hub.svg",
    durationIso8601: "PT2M10S",
    uploadDate: "2026-07-22",
    publishDate: "2026-07-22",
    updatedDate: "2026-07-22",
    category: "Evidence explainer",
    tags: ["fixture"],
    transcriptPath: "/transcripts/video-fixture-001.txt",
    captionsPath: "/captions/video-fixture-001.en.vtt",
    evidenceLinks: [{ label: "Fixture evidence", url: "/archive/EFTA00039025", note: "Test-only route reference" }],
    archiveIds: ["EFTA00039025"],
    batesIds: ["BATES-FIXTURE-001"],
    relatedArchiveDocuments: [{ label: "Archive card", url: "/archive/EFTA00039025" }],
    relatedInvestigation: { title: "Investigation fixture", url: "/investigations/doj-oig-report-as-backbone" },
    factualStatusLabels: ["established fact", "unresolved"],
    featured: true,
    visibility: "public",
    madeForKids: false,
    language: "en",
    recordingDate: "2026-07-21",
    scheduledPublishAt: "",
    xPublicationStatus: "queue-ready-not-published",
    ...overrides
  };
}

const registry = JSON.parse(fs.readFileSync(path.join(repoRoot, "content/video-registry.json"), "utf8"));
const registryCheck = validateVideoRegistry(registry);
assert("registry schema validates", registryCheck.ok, registryCheck.errors.join("; "));

assert("duplicate IDs rejected", !validateVideoRegistry(baseRegistry([
  validPublishedVideo(),
  validPublishedVideo({ slug: "video-fixture-002" })
])).ok);
assert("duplicate slugs rejected", !validateVideoRegistry(baseRegistry([
  validPublishedVideo(),
  validPublishedVideo({ id: "video-fixture-002" })
])).ok);
assert("malformed YouTube ID rejected", !validateVideoRegistry(baseRegistry([
  validPublishedVideo({ youtubeVideoId: "bad", youtubeUrl: "https://www.youtube.com/watch?v=bad" })
])).ok);
assert("invalid date rejected", !validateVideoRegistry(baseRegistry([
  validPublishedVideo({ publishDate: "2026-99-99" })
])).ok);
assert("invalid duration rejected", !validateVideoRegistry(baseRegistry([
  validPublishedVideo({ durationIso8601: "two minutes" })
])).ok);
assert("published missing fields rejected", !validateVideoRegistry(baseRegistry([
  validPublishedVideo({ thumbnailUrl: "" })
])).ok);

const generatedCheck = buildVideoArtifacts(repoRoot, { checkOnly: true });
assert("generated video artifacts are current", generatedCheck.ok, generatedCheck.errors.join("; "));
const hubHtml = fs.readFileSync(path.join(repoRoot, "videos.html"), "utf8");
assert("hub empty state present", /No videos are public yet/.test(hubHtml));
assert("mobile navigation present", /menu-button/.test(hubHtml) && /data-nav-links/.test(hubHtml));
assert("no VideoObject emitted for empty hub", !/VideoObject/.test(hubHtml));

const tmp = tempRoot();
const publishedRegistry = baseRegistry([validPublishedVideo()]);
writeJson(path.join(tmp, "content/video-registry.json"), publishedRegistry);
const built = buildVideoArtifacts(tmp);
const watchPath = path.join(tmp, "videos/video-fixture-001.html");
const watchHtml = fs.readFileSync(watchPath, "utf8");
assert("published watch page generated", built.ok && fs.existsSync(watchPath));
assert("VideoObject output emitted only with required fields", /"@type": "VideoObject"/.test(watchHtml) && hasVideoObjectFields(validPublishedVideo()));
const sitemap = buildVideoSitemap(publishedRegistry);
assert("published watch page included in video sitemap", sitemap.videoUrls.some((entry) => entry.loc === `${APEX}/videos/video-fixture-001`));

const draftTmp = tempRoot();
writeJson(path.join(draftTmp, "content/video-registry.json"), baseRegistry([validPublishedVideo({
  id: "draft-fixture",
  slug: "draft-fixture",
  status: "draft",
  visibility: "private"
})]));
buildVideoArtifacts(draftTmp);
assert("unpublished item excluded", !fs.existsSync(path.join(draftTmp, "videos/draft-fixture.html")));
const draftSitemap = JSON.parse(fs.readFileSync(path.join(draftTmp, "content/video-sitemap.json"), "utf8"));
assert("unpublished item excluded from sitemap", draftSitemap.videoUrls.length === 0);

const ignoreText = fs.readFileSync(path.join(repoRoot, ".gitignore"), "utf8");
assert("credential exclusions present", /client_secret\*\.json/.test(ignoreText) && /\*\*\/token\.json/.test(ignoreText) && /\.dev\.vars/.test(ignoreText));

const authTmp = tempRoot();
const fakeClient = path.join(authTmp, "client_secret.json");
const clientSecretKey = ["client", "secret"].join("_");
fs.writeFileSync(fakeClient, JSON.stringify({ installed: { client_id: "redacted", [clientSecretKey]: "redacted", redirect_uris: ["http://localhost"] } }));
const authStatus = spawnSync("node", ["scripts/youtube/auth-status.mjs"], {
  cwd: repoRoot,
  encoding: "utf8",
  env: {
    ...process.env,
    [["GAH", "YOUTUBE", "CLIENT", "SECRET"].join("_")]: fakeClient,
    GAH_YOUTUBE_TOKEN: path.join(authTmp, "token.json")
  }
});
assert("OAuth absent-token behavior", /AUTHORIZATION_REQUIRED/.test(authStatus.stdout));
assert("channel mismatch rejected", !assertExpectedChannel({ id: "fixture", snippet: { title: "Wrong Channel", customUrl: "@GrokArchiveHub" } }).ok);

const uploadTmp = tempRoot();
const source = path.join(uploadTmp, "fixture.mp4");
fs.writeFileSync(source, Buffer.from("not a real video; dry-run validation only"));
const uploadRegistry = path.join(uploadTmp, "video-registry.json");
writeJson(uploadRegistry, baseRegistry([validPublishedVideo({
  id: "upload-fixture",
  slug: "upload-fixture",
  status: "draft",
  visibility: "private",
  youtubeVideoId: "",
  youtubeUrl: "",
  uploadDate: "",
  publishDate: "",
  updatedDate: ""
})]));
const upload = spawnSync("node", ["scripts/youtube/upload-video.mjs", "--registry-id", "upload-fixture", "--source", source, "--registry", uploadRegistry], {
  cwd: repoRoot,
  encoding: "utf8"
});
assert("dry-run upload performs no write", upload.status === 0 && /"dryRun": true/.test(upload.stdout) && /"youtubeWriteOccurred": false/.test(upload.stdout));
assert("dry-run upload does not post to X", /"xPostOccurred": false/.test(upload.stdout));

const queue = JSON.parse(fs.readFileSync(path.join(repoRoot, "content/video-x-publication-queue.json"), "utf8"));
assert("X queue is explicit only", queue.policy.includes("does not automatically post to X") && Array.isArray(queue.records));

const worker = fs.readFileSync(path.join(repoRoot, "_worker.js"), "utf8");
assert("worker serves video watch routes", worker.includes('path.startsWith("/videos/")') && worker.includes("content/video-sitemap.json"));

const failures = results.filter((result) => result.status !== "PASS");
console.log(JSON.stringify({
  ok: failures.length === 0,
  passed: results.length - failures.length,
  failed: failures.length,
  failures,
  results
}, null, 2));

if (failures.length) process.exit(1);
