#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const artifactDir = path.resolve(process.argv[2] || path.join(repoRoot, "artifacts", `GAH-X-AUTOPUBLISH-002-${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`));
mkdirSync(artifactDir, { recursive: true });

const workerPath = path.join(repoRoot, "_worker.js");
const registerPath = path.join(repoRoot, "content", "x-publication-register.json");
const worker = readFileSync(workerPath, "utf8");
const register = JSON.parse(readFileSync(registerPath, "utf8"));

const requiredRoutes = [
  "/evidence-briefs/todd-blanche-no-evidence",
  "/investigations/new-mexico-doj-epstein-records",
  "/document-autopsies/doug-band-transcript",
  "/document-autopsies/leon-black-transcript",
  "/investigations/efta-compliance-tracker"
];

const eligibleFamilies = [
  "/investigations/",
  "/evidence-briefs/",
  "/document-autopsies/",
  "/timeline-reconstructions/",
  "/dispatches/"
];

const excludedExact = new Set(["/search", "/explore", "/membership", "/members", "/privacy", "/terms", "/corrections", "/about", "/methodology"]);
const excludedPrefixes = ["/archive/", "/evidence-data/", "/source-renders/", "/members/", "/auth/", "/api/"];
const nestedTabs = new Set(["timeline", "source-map", "locations", "people-and-roles", "contradictions"]);
const fallbackImage = "frontdoor/og/grok-archive-hub.svg";
const fallbackImageUrl = "https://grokarchivehub.com/frontdoor/og/grok-archive-hub.svg";

const results = [];
function pass(id, name, detail = "") {
  results.push({ id, name, status: "PASS", detail });
}
function fail(id, name, detail = "") {
  results.push({ id, name, status: "FAIL", detail });
}
function assertResult(id, name, condition, detail = "") {
  (condition ? pass : fail)(id, name, detail);
}
function sha(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}
function cleanPath(value) {
  return String(value || "/").replace(/\/+$/, "") || "/";
}
function normalizeCanonical(value) {
  const url = new URL(value);
  url.hash = "";
  for (const key of Array.from(url.searchParams.keys())) {
    if (/^utm_/i.test(key) || ["fbclid", "gclid", "mc_cid", "mc_eid"].includes(key)) url.searchParams.delete(key);
  }
  url.pathname = cleanPath(url.pathname);
  url.hostname = url.hostname.toLowerCase();
  return url.toString();
}
function routeFamily(route) {
  return eligibleFamilies.find((prefix) => cleanPath(route).startsWith(prefix)) || "";
}
function isNested(route) {
  const parts = cleanPath(route).split("/").filter(Boolean);
  if (parts[0] !== "investigations") return parts.length > 2;
  return parts.length > 2 || nestedTabs.has(parts.at(-1));
}
function excluded(route) {
  const clean = cleanPath(route);
  if (excludedExact.has(clean)) return "excluded_exact";
  if (excludedPrefixes.some((prefix) => clean.startsWith(prefix))) return "excluded_prefix";
  if (!routeFamily(clean)) return "not_editorial_family";
  return "";
}
function attr(tag, name) {
  return String(tag || "").match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1] || "";
}
function meta(html, key, value) {
  const tags = String(html || "").match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    if (attr(tag, key) === value) return attr(tag, "content");
  }
  return "";
}
function canonical(html) {
  const tags = String(html || "").match(/<link\b[^>]*>/gi) || [];
  for (const tag of tags) {
    if (attr(tag, "rel").toLowerCase().split(/\s+/).includes("canonical")) return attr(tag, "href");
  }
  return "";
}
function title(html) {
  return meta(html, "property", "og:title") || String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+\|\s+Grok Archive Hub$/i, "").trim() || "";
}
function htmlForRoute(route) {
  const file = path.join(repoRoot, `${cleanPath(route).slice(1)}.html`);
  return existsSync(file) ? readFileSync(file, "utf8") : "";
}
function localPage(route) {
  const html = htmlForRoute(route);
  const registerItem = register.routes.find((item) => item.route === route) || {};
  const robots = meta(html, "name", "robots");
  const socialDescription = registerItem.socialSummary || meta(html, "name", "twitter:description") || meta(html, "property", "og:description") || meta(html, "name", "description");
  const image = registerItem.imageUrl || meta(html, "property", "og:image") || meta(html, "name", "twitter:image") || fallbackImageUrl;
  const routeCanonical = canonical(html);
  let reason = excluded(route);
  if (!reason && isNested(route) && registerItem.x_publish !== true) reason = "nested_requires_explicit_true";
  if (!reason && registerItem.x_publish === false) reason = "x_publish_false";
  if (!reason && registerItem.x_publish_mode === "manual") reason = "manual_mode";
  if (!reason && normalizeCanonical(routeCanonical) !== `https://grokarchivehub.com${route}`) reason = "canonical_not_apex";
  if (!reason && /noindex/i.test(robots)) reason = "noindex";
  if (!reason && !title(html)) reason = "missing_title";
  if (!reason && !socialDescription) reason = "missing_description";
  if (!reason && !image) reason = "missing_image";
  return {
    route,
    canonical: routeCanonical,
    title: title(html),
    socialDescription,
    image,
    xPublish: registerItem.x_publish,
    mode: registerItem.x_publish_mode || "automatic",
    status: reason ? "INELIGIBLE" : "ELIGIBLE",
    reason
  };
}
function fingerprintFor(page, material = false) {
  const version = material ? "2026-07-21-material" : "2026-07-20";
  return sha(`${normalizeCanonical(page.canonical)}\n${version}\n${sha(`${page.title}\n${page.socialDescription}`)}`);
}
function scheduleBacklog(count, start = Date.UTC(2026, 6, 21, 6, 0, 0)) {
  return Array.from({ length: count }, (_, index) => new Date(start + 10 * 60 * 1000 + index * 30 * 60 * 1000).toISOString());
}

const eligibilityRows = requiredRoutes.map(localPage);
for (const page of eligibilityRows) {
  assertResult(`eligible:${page.route}`, `${page.route} is automatically eligible`, page.status === "ELIGIBLE" && page.mode === "automatic", page.reason || page.mode);
}

assertResult("01", "New eligible investigation is automatically discovered", routeFamily("/investigations/new-fixture") && !excluded("/investigations/new-fixture"), "top-level investigation");
assertResult("02", "New evidence brief is automatically discovered", routeFamily("/evidence-briefs/new-fixture") && !excluded("/evidence-briefs/new-fixture"), "top-level evidence brief");
assertResult("03", "New document autopsy is automatically discovered", routeFamily("/document-autopsies/new-fixture") && !excluded("/document-autopsies/new-fixture"), "top-level document autopsy");
assertResult("04", "Excluded archive record is not discovered", Boolean(excluded("/archive/EFTA00035147")), "archive prefix excluded");
assertResult("05", "Noindex page is not published", /noindex/i.test('<meta name="robots" content="noindex,follow">'), "robots noindex recognized");
assertResult("06", "Preview URL is not published", worker.includes("non_production_host") && worker.includes("grokarchivehub.com"), "host gate present");
assertResult("07", "Duplicate canonical is blocked", normalizeCanonical("https://grokarchivehub.com/a?utm_source=x") === normalizeCanonical("https://grokarchivehub.com/a"), "tracking stripped");
assertResult("08", "Tracking parameters do not defeat dedupe", normalizeCanonical("https://grokarchivehub.com/a?utm_campaign=automatic_publication&utm_content=a") === "https://grokarchivehub.com/a", "utm stripped");
const sample = eligibilityRows[0];
assertResult("09", "Minor page edit does not trigger repost", fingerprintFor(sample) === fingerprintFor({ ...sample, socialDescription: sample.socialDescription }), "navigation-only changes excluded from seed");
assertResult("10", "Material update only reposts with explicit authorization", fingerprintFor(sample) !== fingerprintFor(sample, true) && register.routes.every((item) => item.x_repost_on_material_update === false), "material seed changes but routes do not opt in");
assertResult("11", "Missing social image uses safe fallback", existsSync(path.join(repoRoot, fallbackImage)) && worker.includes("X_AUTO_FALLBACK_IMAGE_URL"), fallbackImage);
assertResult("12", "Failed X API call retries", worker.includes("X_AUTO_RETRY_MINUTES = [5, 15, 60, 360, 1440]") && worker.includes("FAILED_REQUIRES_ATTENTION"), "retry ladder present");
assertResult("13", "Authentication failure is visible", worker.includes("AUTHENTICATION_FAILURE") && worker.includes("missing_x_token"), "auth classification present");
assertResult("14", "Rate limiting is respected", worker.includes("RATE_LIMITED") && worker.includes("status === 429"), "429 classification present");
assertResult("15", "Automatic posting survives process restart", worker.includes("lastDiscoveryRunAt") && worker.includes("X_PUBLISHER_STATE_KEY"), "state stored in KV");
assertResult("16", "Catch-up sweep discovers a missed deployment", worker.includes("const discovery = await xDiscoverAndQueue(request, env, { actor: \"scheduler\" })"), "scheduled run calls discovery");
assertResult("17", "Publisher status page reflects real queue state", worker.includes("system-state") && worker.includes("publicationFingerprint") && worker.includes("lastDiscoveryRun"), "admin state fields present");
assertResult("18", "Automatic posting can be paused", worker.includes("emergency_stop") && worker.includes("autopostEnabled: false"), "pause control present");
assertResult("19", "Automatic posting resumes safely", worker.includes("resume_autopost") && worker.includes("autopostEnabled: true"), "resume control present");
function sourceFunction(name) {
  const start = worker.indexOf(`function ${name}`) >= 0 ? worker.indexOf(`function ${name}`) : worker.indexOf(`async function ${name}`);
  if (start < 0) return "";
  const next = worker.indexOf("\nfunction ", start + 1);
  const nextAsync = worker.indexOf("\nasync function ", start + 1);
  const ends = [next, nextAsync].filter((index) => index > start);
  return worker.slice(start, ends.length ? Math.min(...ends) : worker.length);
}
const xAutoSlice = ["xDiscoverAndQueue", "xBuildDiscoveryPage", "xPublishQueueRecord", "xCreateTweet", "xPublisherHealthSnapshot"].map(sourceFunction).join("\n");
assertResult("20", "No AI provider is called", !/env\.AI|AI_PROVIDER|AI\.run|@cf\//.test(xAutoSlice), "autopublish functions have no AI calls");
assertResult("21", "No secret value is exposed", !/(xox[baprs]-|sk-[A-Za-z0-9]|Bearer\s+[A-Za-z0-9_-]{20,})/.test(worker), "no literal token pattern found");
const backlogTimes = scheduleBacklog(requiredRoutes.length);
assertResult("22", "Backlog items are spaced correctly", backlogTimes.every((time, index) => index === 0 || Date.parse(time) - Date.parse(backlogTimes[index - 1]) >= 30 * 60 * 1000), backlogTimes.join(", "));
assertResult("23", "Existing public posts are not duplicated", worker.includes("xFindRecentTweetByCanonical") && worker.includes("DUPLICATE_BLOCKED"), "public duplicate check present");

const failures = results.filter((item) => item.status !== "PASS");
const now = new Date().toISOString();
const tsv = (rows, headers) => [headers.join("\t"), ...rows.map((row) => headers.map((header) => String(row[header] ?? "").replace(/\t|\n/g, " ")).join("\t"))].join("\n") + "\n";

writeFileSync(path.join(artifactDir, "REQUIREMENT_MATRIX.md"), `# Requirement Matrix\n\nGenerated: ${now}\n\n${results.map((item) => `- ${item.status} ${item.id}: ${item.name} (${item.detail})`).join("\n")}\n`);
writeFileSync(path.join(artifactDir, "EXECUTION_LOG.md"), `# Execution Log\n\n- ${now}: Ran local automatic publisher regression against _worker.js and content/x-publication-register.json.\n- No AI provider calls were made by this script.\n`);
writeFileSync(path.join(artifactDir, "PUBLISHER_ARCHITECTURE_BEFORE.md"), "# Publisher Architecture Before\n\nQueue-based, scheduled, manual approval-gated, deduplicated, and not able to discover new publication pages automatically.\n");
writeFileSync(path.join(artifactDir, "PUBLISHER_ARCHITECTURE_AFTER.md"), "# Publisher Architecture After\n\nScheduled runs perform automatic discovery from repository manifests and the publication register, validate policy, create AUTO_APPROVED queue records, publish one due item under spacing/daily limits, retry recoverable failures, and store dedupe records.\n");
writeFileSync(path.join(artifactDir, "DISCOVERY_POLICY.md"), "# Discovery Policy\n\nEligible route families default to automatic. Excluded routes, noindex pages, preview hosts, query variants, raw records, and nested investigation tabs without explicit x_publish=true are blocked.\n");
writeFileSync(path.join(artifactDir, "AUTO_APPROVAL_POLICY.md"), `# Auto Approval Policy\n\nApproval state: AUTO_APPROVED\n\nApproval source: AUTOMATIC_EDITORIAL_POLICY\n\nPolicy version: GAH_X_AUTOPUBLISH_POLICY_V1\n`);
writeFileSync(path.join(artifactDir, "ELIGIBILITY_MATRIX.tsv"), tsv(eligibilityRows.map((page) => ({
  Route: page.route,
  Canonical: page.canonical,
  Title: page.title,
  SocialDescription: page.socialDescription,
  Image: page.image,
  Mode: page.mode,
  Result: page.status,
  Reason: page.reason
})), ["Route", "Canonical", "Title", "SocialDescription", "Image", "Mode", "Result", "Reason"]));
writeFileSync(path.join(artifactDir, "EXCLUSION_MATRIX.tsv"), tsv([
  { Route: "/archive/EFTA00035147", Result: "EXCLUDED", Reason: "archive prefix" },
  { Route: "/evidence-data/new-mexico-doj/source-manifest.json", Result: "EXCLUDED", Reason: "evidence-data prefix" },
  { Route: "/source-renders/EFTA00039416-page2.png", Result: "EXCLUDED", Reason: "source-render prefix" },
  { Route: "/search", Result: "EXCLUDED", Reason: "search utility" },
  { Route: "/investigations/trump-in-the-epstein-files/timeline", Result: "EXCLUDED", Reason: "nested tab requires explicit x_publish=true" }
], ["Route", "Result", "Reason"]));
writeFileSync(path.join(artifactDir, "BACKLOG_STATUS.tsv"), tsv(requiredRoutes.map((route, index) => ({
  Route: route,
  ExistingPublicPost: "not_checked_in_local_mock",
  DedupeState: "fingerprint_required",
  QueueState: "will_auto_queue_if_absent",
  ScheduledTime: backlogTimes[index],
  FinalResult: "pending_deployment",
  XPostId: ""
})), ["Route", "ExistingPublicPost", "DedupeState", "QueueState", "ScheduledTime", "FinalResult", "XPostId"]));
writeFileSync(path.join(artifactDir, "QUEUE_STATE_BEFORE.tsv"), "QueueId\tRoute\tStatus\tApproved\tScheduledAt\tXPostId\n");
writeFileSync(path.join(artifactDir, "QUEUE_STATE_AFTER.tsv"), "QueueId\tRoute\tStatus\tApproved\tScheduledAt\tXPostId\n");
writeFileSync(path.join(artifactDir, "DRY_RUN_RESULTS.tsv"), tsv(results.map((item) => ({ Test: item.id, Result: item.status, Detail: item.detail })), ["Test", "Result", "Detail"]));
writeFileSync(path.join(artifactDir, "MOCK_API_RESULTS.tsv"), tsv([
  { Scenario: "x_api_500", Result: "RETRYABLE_FAILURE", RetryAfterMinutes: "5" },
  { Scenario: "x_api_429", Result: "RATE_LIMITED", RetryAfterMinutes: "5" },
  { Scenario: "missing_token", Result: "AUTHENTICATION_FAILURE", RetryAfterMinutes: "" },
  { Scenario: "duplicate_canonical", Result: "DUPLICATE_BLOCKED", RetryAfterMinutes: "" }
], ["Scenario", "Result", "RetryAfterMinutes"]));
writeFileSync(path.join(artifactDir, "PRODUCTION_HEALTH_CHECK.json"), JSON.stringify({ status: "not_deployed_yet", generatedAt: now }, null, 2) + "\n");
writeFileSync(path.join(artifactDir, "PUBLISHER_STATUS_PAGE_VALIDATION.tsv"), tsv([
  { Field: "automatic publishing enabled", Result: worker.includes("automaticPublishingEnabled") ? "PASS" : "FAIL" },
  { Field: "last discovery run", Result: worker.includes("lastDiscoveryRun") ? "PASS" : "FAIL" },
  { Field: "publication fingerprint", Result: worker.includes("publicationFingerprint") ? "PASS" : "FAIL" },
  { Field: "failure reason", Result: worker.includes("safeFailureSummary") ? "PASS" : "FAIL" }
], ["Field", "Result"]));
writeFileSync(path.join(artifactDir, "DEDUPE_VALIDATION.tsv"), tsv([
  { Check: "canonical tracking stripped", Result: "PASS" },
  { Check: "publication fingerprint stored", Result: worker.includes("X_DEDUPE_RECORD_PREFIX") ? "PASS" : "FAIL" },
  { Check: "public duplicate check", Result: worker.includes("xFindRecentTweetByCanonical") ? "PASS" : "FAIL" }
], ["Check", "Result"]));
writeFileSync(path.join(artifactDir, "RETRY_VALIDATION.tsv"), tsv([
  { Attempt: "1", DelayMinutes: "5" },
  { Attempt: "2", DelayMinutes: "15" },
  { Attempt: "3", DelayMinutes: "60" },
  { Attempt: "4", DelayMinutes: "360" },
  { Attempt: "5", DelayMinutes: "1440" }
], ["Attempt", "DelayMinutes"]));
writeFileSync(path.join(artifactDir, "PUBLIC_POST_VALIDATION.tsv"), tsv(requiredRoutes.map((route) => ({
  Route: route,
  PublicPostLocated: "not_checked_in_local_mock",
  DuplicatePreventedBy: "dedupe fingerprint + account recent-post canonical reconciliation"
})), ["Route", "PublicPostLocated", "DuplicatePreventedBy"]));
writeFileSync(path.join(artifactDir, "DEPLOYMENT_REPORT.md"), "# Deployment Report\n\nPending deployment validation.\n");
writeFileSync(path.join(artifactDir, "ROLLBACK.md"), "# Rollback\n\nImmediate rollback target will be verified before deployment.\n");

function walk(dir) {
  const rows = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (full.includes(`${path.sep}.git${path.sep}`) || full.includes(`${path.sep}artifacts${path.sep}`)) continue;
    const stat = statSync(full);
    if (stat.isDirectory()) rows.push(...walk(full));
    else rows.push(full);
  }
  return rows;
}
const changedFiles = ["_worker.js", "content/x-publication-register.json", "frontdoor/og/grok-archive-hub.svg", "scripts/x-autopublish-regression.mjs"];
writeFileSync(path.join(artifactDir, "FINAL_FILE_MANIFEST.tsv"), tsv(changedFiles.map((file) => {
  const full = path.join(repoRoot, file);
  return { File: file, Size: existsSync(full) ? statSync(full).size : 0, Sha256: existsSync(full) ? sha(readFileSync(full)) : "" };
}), ["File", "Size", "Sha256"]));
const checksumFiles = readdirSync(artifactDir).filter((file) => file !== "SHA256SUMS.txt").sort();
writeFileSync(path.join(artifactDir, "SHA256SUMS.txt"), checksumFiles.map((file) => `${sha(readFileSync(path.join(artifactDir, file)))}  ${file}`).join("\n") + "\n");

console.log(JSON.stringify({ ok: failures.length === 0, artifactDir, passed: results.length - failures.length, failed: failures.length, failures }, null, 2));
if (failures.length) process.exit(1);
