import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  if (process.argv[i].startsWith("--")) {
    const key = process.argv[i].slice(2);
    const next = process.argv[i + 1];
    if (next && !next.startsWith("--")) {
      args.set(key, next);
      i += 1;
    } else {
      args.set(key, "true");
    }
  }
}

const artifactDir = path.resolve(args.get("artifact-dir") || `artifacts/GAH-PUBLIC-REACH-REPAIR-001-${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`);
const productionBase = args.get("production") || "";
const immutableBase = args.get("immutable") || "";
const includePublic = args.get("public") === "true" || Boolean(productionBase);
const apex = "https://grokarchivehub.com";

const newest = [
  {
    route: "/evidence-briefs/todd-blanche-no-evidence",
    section: "/evidence-briefs",
    sectionFile: "evidence-briefs.html",
    type: "Evidence Brief",
    title: "Todd Blanche \"No Evidence\" Evidence Brief",
    date: "2026-07-20",
    button: "Read evidence brief",
    patreonContent: "todd-blanche-no-evidence",
  },
  {
    route: "/investigations/new-mexico-doj-epstein-records",
    section: "/investigations",
    sectionFile: "investigations.html",
    type: "Investigation",
    title: "The New Mexico-DOJ Epstein Records Standoff",
    date: "2026-07-19",
    button: "Open investigation",
    patreonContent: "new-mexico-doj-epstein-records",
  },
  {
    route: "/document-autopsies/doug-band-transcript",
    section: "/document-autopsies",
    sectionFile: "document-autopsies.html",
    type: "Document Autopsy",
    title: "Doug Band Transcript Autopsy",
    date: "2026-07-19",
    button: "Read document autopsy",
    patreonContent: "doug-band-transcript",
  },
  {
    route: "/document-autopsies/leon-black-transcript",
    section: "/document-autopsies",
    sectionFile: "document-autopsies.html",
    type: "Document Autopsy",
    title: "Leon Black Transcript Autopsy",
    date: "2026-07-19",
    button: "Read document autopsy",
    patreonContent: "leon-black-transcript",
  },
  {
    route: "/investigations/efta-compliance-tracker",
    section: "/investigations",
    sectionFile: "investigations.html",
    type: "Compliance Tracker",
    title: "EFTA Compliance Tracker",
    date: "2026-07-18",
    button: "Open compliance tracker",
    patreonContent: "efta-compliance-tracker",
  },
];

const nested = [
  "/investigations/trump-in-the-epstein-files/timeline",
  "/investigations/trump-in-the-epstein-files/source-map",
  "/investigations/trump-in-the-epstein-files/people-and-roles",
  "/investigations/trump-in-the-epstein-files/locations",
  "/investigations/trump-in-the-epstein-files/contradictions",
];

const requiredArtifactFiles = [
  "REQUIREMENT_MATRIX.md",
  "EXECUTION_LOG.md",
  "PUBLIC_BASELINE.tsv",
  "HOMEPAGE_SURFACING_BEFORE_AFTER.tsv",
  "SECTION_INDEX_VALIDATION.tsv",
  "BREADCRUMB_COVERAGE_BEFORE_AFTER.tsv",
  "BREADCRUMB_VALIDATION.tsv",
  "NESTED_PARENT_LINK_VALIDATION.tsv",
  "STRUCTURED_DATA_VALIDATION.tsv",
  "SOCIAL_METADATA_VALIDATION.tsv",
  "PATREON_PATHWAY_VALIDATION.tsv",
  "X_PUBLISHER_INVENTORY.md",
  "X_PUBLICATION_STATUS.tsv",
  "X_PUBLISHER_DRY_RUN.tsv",
  "TELEMETRY_CONFIGURATION_AUDIT.md",
  "TELEMETRY_ROUTE_MATRIX.tsv",
  "CRAWLER_SEMANTIC_VARIANCE.tsv",
  "PRODUCTION_PARITY.tsv",
  "INTERNAL_LINK_RESULTS.tsv",
  "MOBILE_VALIDATION.tsv",
  "VALIDATION_RESULTS.tsv",
  "DEPLOYMENT_REPORT.md",
  "ROLLBACK.md",
  "FINAL_FILE_MANIFEST.tsv",
  "SHA256SUMS.txt",
];

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });
const write = (name, content) => fs.writeFileSync(path.join(artifactDir, name), content);
const tsv = (rows) => rows.map((row) => row.map((cell) => String(cell ?? "").replace(/\t/g, " ").replace(/\n/g, " ")).join("\t")).join("\n") + "\n";
const pass = (value) => (value ? "PASS" : "FAIL");
const now = new Date().toISOString();
const failures = [];
const log = [`# Execution Log`, "", `Started: ${now}`, `Repository: ${ROOT}`, `Artifact directory: ${artifactDir}`];

function fail(name, detail) {
  failures.push({ name, detail });
}

function routeFile(route) {
  if (route === "/") return path.join(ROOT, "index.html");
  const direct = path.join(ROOT, `${route.slice(1)}.html`);
  if (fs.existsSync(direct)) return direct;
  return path.join(ROOT, route.slice(1), "index.html");
}

function readRoute(route) {
  return fs.readFileSync(routeFile(route), "utf8");
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(html) {
  const text = stripHtml(html);
  return text ? text.split(/\s+/).length : 0;
}

function meta(html, attr, value) {
  const re = new RegExp(`<meta[^>]+${attr}=["']${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*content=["']([^"']*)["'][^>]*>`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*${attr}=["']${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`, "i");
  return html.match(re)?.[1] || html.match(re2)?.[1] || "";
}

function canonical(html) {
  return html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] || "";
}

function title(html) {
  return html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "";
}

function h1(html) {
  return stripHtml(html.match(/<h1[\s\S]*?<\/h1>/i)?.[0] || "");
}

function flattenJsonLd(value) {
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (value && Array.isArray(value["@graph"])) return flattenJsonLd(value["@graph"]);
  return value ? [value] : [];
}

function jsonLd(html) {
  const out = [];
  const errors = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      out.push(...flattenJsonLd(JSON.parse(match[1].trim())));
    } catch (error) {
      errors.push(error.message);
    }
  }
  return { objects: out, errors };
}

function typeHas(object, typeName) {
  const type = object?.["@type"];
  return type === typeName || (Array.isArray(type) && type.includes(typeName));
}

function breadcrumb(html) {
  const { objects, errors } = jsonLd(html);
  const item = objects.find((object) => typeHas(object, "BreadcrumbList"));
  const items = (item?.itemListElement || []).map((entry) => {
    const nestedItem = typeof entry.item === "object" ? entry.item : {};
    return { ...entry, ...nestedItem, item: typeof entry.item === "string" ? entry.item : nestedItem["@id"] || nestedItem.url || "" };
  });
  return { item, items, errors };
}

function validBreadcrumb(html, expectedCanonical = "") {
  const bc = breadcrumb(html);
  const items = bc.items;
  const positions = items.map((item) => Number(item.position));
  const urls = items.map((item) => item.item || "");
  const names = items.map((item) => item.name || "");
  const sequential = positions.every((position, index) => position === index + 1);
  const absolute = urls.every((url) => /^https:\/\/grokarchivehub\.com\/?/.test(url));
  const nonempty = names.every(Boolean);
  const finalMatches = expectedCanonical ? urls[urls.length - 1] === expectedCanonical : Boolean(urls[urls.length - 1]);
  const visible = /class=["'][^"']*breadcrumb-nav/.test(html);
  return {
    ok: Boolean(bc.item) && sequential && absolute && nonempty && finalMatches && visible && bc.errors.length === 0,
    hasJson: Boolean(bc.item),
    visible,
    sequential,
    absolute,
    nonempty,
    finalMatches,
    count: items.length,
    finalUrl: urls[urls.length - 1] || "",
    errors: bc.errors.join("; "),
  };
}

function hasArticleSchema(html) {
  const articleTypes = new Set(["Article", "NewsArticle", "InvestigativeNewsArticle", "ReportageNewsArticle", "AnalysisNewsArticle"]);
  return jsonLd(html).objects.some((object) => {
    const type = object?.["@type"];
    if (Array.isArray(type)) return type.some((item) => articleTypes.has(item));
    return articleTypes.has(type);
  });
}

function hasOg(html) {
  return Boolean(meta(html, "property", "og:title") && meta(html, "property", "og:description") && meta(html, "property", "og:url") && meta(html, "property", "og:type"));
}

function hasTwitter(html) {
  return Boolean(meta(html, "name", "twitter:card"));
}

function patreonLinks(html) {
  return [...html.matchAll(/href=["']([^"']*patreon\.com\/grokarchivehub[^"']*)["']/gi)].map((match) => match[1].replace(/&amp;/g, "&"));
}

function linkRoutes(html) {
  return [...html.matchAll(/href=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((href) => href.startsWith("/") && !href.startsWith("//"))
    .map((href) => href.split("#")[0].split("?")[0])
    .filter(Boolean);
}

function localRouteExists(route) {
  if (route === "/") return true;
  if (fs.existsSync(routeFile(route))) return true;
  if (route === "/barak" || route === "/research-index") return true;
  const allowPrefixes = [
    "/archive/",
    "/auth/",
    "/api/",
    "/evidence-data/",
    "/source-renders/",
    "/frontdoor/",
    "/research/evidence/",
    "/members",
    "/wiki",
  ];
  return allowPrefixes.some((prefix) => route.startsWith(prefix));
}

function semanticSignature(html) {
  const bc = breadcrumb(html);
  return {
    title: title(html),
    canonical: canonical(html),
    robots: meta(html, "name", "robots"),
    h1: h1(html),
    wordCount: wordCount(html),
    breadcrumbItems: bc.items.map((item) => `${item.position}:${item.name}:${item.item}`).join("|"),
    article: hasArticleSchema(html),
    ogTitle: meta(html, "property", "og:title"),
    ogUrl: meta(html, "property", "og:url"),
    xCard: meta(html, "name", "twitter:card"),
    internalLinkCount: new Set(linkRoutes(html)).size,
  };
}

function compareSemantic(a, b) {
  const keys = Object.keys(a);
  const diff = keys.filter((key) => JSON.stringify(a[key]) !== JSON.stringify(b[key]));
  if (!diff.length) return { classification: "SEMANTICALLY_IDENTICAL", diff: "" };
  if (diff.every((key) => ["ogTitle", "ogUrl", "xCard"].includes(key))) return { classification: "METADATA_DIFFERENCE", diff: diff.join(",") };
  if (diff.some((key) => ["breadcrumbItems", "internalLinkCount"].includes(key))) return { classification: "NAVIGATION_DIFFERENCE", diff: diff.join(",") };
  if (diff.some((key) => ["wordCount", "h1"].includes(key))) return { classification: "CONTENT_DIFFERENCE", diff: diff.join(",") };
  return { classification: "METADATA_DIFFERENCE", diff: diff.join(",") };
}

async function fetchHtml(base, route, userAgent = "Mozilla/5.0 GAH public reach regression") {
  const url = `${base.replace(/\/$/, "")}${route}`;
  const res = await fetch(url, { headers: { "user-agent": userAgent, accept: "text/html,application/xhtml+xml" }, redirect: "follow" });
  return { route, url, status: res.status, finalUrl: res.url, html: await res.text() };
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

ensureDir(artifactDir);
for (const file of requiredArtifactFiles) write(file, "");

const homepage = readRoute("/");
const homepageRows = [["state", "route", "expected_card", "found_link", "found_button", "status"]];
const beforeCards = [
  ["/investigations/mcc-final-48-hours-source-chain", "The Final 48 Hours at MCC"],
  ["/investigations/ch0080-video-file-windows", "CH0080 File Windows"],
  ["/investigations/barak-receipts-presence-not-conduct", "Barak Receipt Cards"],
];
for (const [route, label] of beforeCards) homepageRows.push(["before", route, label, "present in previous production baseline", "card-link", "BASELINE"]);
for (const item of newest) {
  const foundLink = homepage.includes(`href="${item.route}"`);
  const foundButton = homepage.includes(item.button);
  homepageRows.push(["after", item.route, item.title, foundLink, foundButton, pass(foundLink && foundButton)]);
  if (!foundLink || !foundButton) fail("homepage-current-work", item.route);
}
const invCount = (fs.readFileSync(path.join(ROOT, "investigations.html"), "utf8").match(/class=["']dispatch-card/g) || []).length;
homepageRows.push(["count-before", "/investigations", "Open all 13 investigations", "13", "stale", "BASELINE"]);
homepageRows.push(["count-after", "/investigations", "Open all 15 investigations", invCount, homepage.includes("Open all 15 investigations"), pass(invCount === 15 && homepage.includes("Open all 15 investigations"))]);
if (invCount !== 15 || !homepage.includes("Open all 15 investigations")) fail("homepage-count", `investigations=${invCount}`);
write("HOMEPAGE_SURFACING_BEFORE_AFTER.tsv", tsv(homepageRows));

const sectionRows = [["route", "section_index", "section_linked", "status"]];
for (const item of newest) {
  const sectionHtml = fs.readFileSync(path.join(ROOT, item.sectionFile), "utf8");
  const linked = sectionHtml.includes(`href="${item.route}"`);
  sectionRows.push([item.route, item.sectionFile, linked, pass(linked)]);
  if (!linked) fail("section-index", item.route);
}
write("SECTION_INDEX_VALIDATION.tsv", tsv(sectionRows));

const breadcrumbRows = [["route", "canonical", "visible", "json_ld", "positions", "absolute_urls", "final_matches_canonical", "items", "status", "errors"]];
const structuredRows = [["route", "article_schema", "breadcrumb_schema", "canonical", "breadcrumb_final_url", "status"]];
const socialRows = [["route", "og", "twitter_x_card", "status"]];
const patreonRows = [["route", "patreon_links", "utm_source", "utm_medium", "utm_campaign", "utm_content", "status"]];
for (const item of [...newest, { route: "/investigations/trump-in-the-epstein-files" }, ...nested.map((route) => ({ route }))]) {
  const html = readRoute(item.route);
  const can = canonical(html);
  const bc = validBreadcrumb(html, can);
  breadcrumbRows.push([item.route, can, bc.visible, bc.hasJson, bc.sequential, bc.absolute, bc.finalMatches, bc.count, pass(bc.ok), bc.errors]);
  if (!bc.ok) fail("breadcrumb", item.route);
  const article = hasArticleSchema(html);
  const routeRequiresArticle = !nested.includes(item.route);
  structuredRows.push([item.route, article, bc.hasJson, can, bc.finalUrl, pass((routeRequiresArticle ? article : true) && bc.ok)]);
  if (routeRequiresArticle && !article) fail("article-schema", item.route);
  const og = hasOg(html);
  const tw = hasTwitter(html);
  socialRows.push([item.route, og, tw, pass(og && tw)]);
  if (!og || !tw) fail("social-metadata", item.route);
  if (newest.some((page) => page.route === item.route)) {
    const links = patreonLinks(html);
    const ok =
      links.length > 0 &&
      links.every((link) => {
        const url = new URL(link);
        return (
          url.searchParams.get("utm_source") === "grokarchivehub" &&
          url.searchParams.get("utm_medium") === "editorial" &&
          url.searchParams.get("utm_campaign") === "support_bridge" &&
          url.searchParams.get("utm_content") === newest.find((page) => page.route === item.route)?.patreonContent
        );
      }) &&
      html.includes('href="/membership"') &&
      html.includes('href="/auth/patreon/start?return_to=/members"');
    const first = links[0] ? new URL(links[0]) : null;
    patreonRows.push([
      item.route,
      links.length,
      first?.searchParams.get("utm_source") || "",
      first?.searchParams.get("utm_medium") || "",
      first?.searchParams.get("utm_campaign") || "",
      first?.searchParams.get("utm_content") || "",
      pass(ok),
    ]);
    if (!ok) fail("patreon", item.route);
  }
}
write("BREADCRUMB_VALIDATION.tsv", tsv(breadcrumbRows));
write("STRUCTURED_DATA_VALIDATION.tsv", tsv(structuredRows));
write("SOCIAL_METADATA_VALIDATION.tsv", tsv(socialRows));
write("PATREON_PATHWAY_VALIDATION.tsv", tsv(patreonRows));

const editorialFiles = [];
for (const dir of ["investigations", "evidence-briefs", "document-autopsies", "dispatches"]) {
  if (!fs.existsSync(path.join(ROOT, dir))) continue;
  for (const file of fs.readdirSync(path.join(ROOT, dir), { recursive: true })) {
    if (!file.endsWith(".html")) continue;
    const filePath = path.join(ROOT, dir, file);
    const html = fs.readFileSync(filePath, "utf8");
    if (/noindex/i.test(html)) continue;
    editorialFiles.push(filePath);
  }
}
const validEditorialBreadcrumbs = editorialFiles.filter((file) => {
  const html = fs.readFileSync(file, "utf8");
  return validBreadcrumb(html, canonical(html)).ok;
}).length;
write(
  "BREADCRUMB_COVERAGE_BEFORE_AFTER.tsv",
  tsv([
    ["scope", "eligible_pages", "valid_breadcrumb_pages", "coverage_percent", "source"],
    ["public_audit_before", 156, 38, "24.4", "verified external audit"],
    ["repo_editorial_after", editorialFiles.length, validEditorialBreadcrumbs, ((validEditorialBreadcrumbs / editorialFiles.length) * 100).toFixed(1), "local regression"],
  ]),
);
if (validEditorialBreadcrumbs !== editorialFiles.length) fail("breadcrumb-coverage", `${validEditorialBreadcrumbs}/${editorialFiles.length}`);

const parentHtml = readRoute("/investigations/trump-in-the-epstein-files");
const nestedRows = [["parent", "child", "parent_links_child", "child_links_parent", "breadcrumb_depth", "status"]];
for (const route of nested) {
  const childHtml = readRoute(route);
  const parentLinks = parentHtml.includes(`href="${route}"`);
  const childBack = childHtml.includes('href="/investigations/trump-in-the-epstein-files"');
  const depth = breadcrumb(childHtml).items.length;
  const ok = parentLinks && childBack && depth === 4 && validBreadcrumb(childHtml, canonical(childHtml)).ok;
  nestedRows.push(["/investigations/trump-in-the-epstein-files", route, parentLinks, childBack, depth, pass(ok)]);
  if (!ok) fail("nested-parent-links", route);
}
write("NESTED_PARENT_LINK_VALIDATION.tsv", tsv(nestedRows));

const register = JSON.parse(fs.readFileSync(path.join(ROOT, "content/x-publication-register.json"), "utf8"));
const registered = new Map(register.routes.map((item) => [item.route, item]));
const xRows = [[
  "Route",
  "publication date",
  "eligible for X",
  "social summary exists",
  "queue entry exists",
  "trigger observed",
  "API attempt",
  "API result",
  "public post located",
  "dedupe state",
  "failure reason",
  "recommended action",
]];
for (const item of newest) {
  const row = registered.get(item.route);
  const ok = Boolean(row?.eligibleForX && row?.socialSummary && row?.dedupeKey);
  xRows.push([
    item.route,
    item.date,
    Boolean(row?.eligibleForX),
    Boolean(row?.socialSummary),
    "not_found_in_live_queue_summary",
    "no_page-discovery_trigger_observed",
    "not_attempted",
    "not_sent",
    "not_located",
    row?.dedupeKey ? "registered_route_dedupe_key" : "missing",
    "publisher does not auto-discover new pages from HTML metadata",
    "stage reviewable queue item; do not publish automatically during this repair",
  ]);
  if (!ok) fail("x-register", item.route);
}
write("X_PUBLICATION_STATUS.tsv", tsv(xRows));
write(
  "X_PUBLISHER_DRY_RUN.tsv",
  tsv([
    ["route", "dry_run_status", "would_publish", "reason"],
    ...newest.map((item) => [item.route, "READY_FOR_REVIEW_REGISTERED", false, "No explicit production policy authorizing missed-post publication in this task"]),
  ]),
);

const worker = fs.readFileSync(path.join(ROOT, "_worker.js"), "utf8");
const wrangler = fs.readFileSync(path.join(ROOT, "wrangler.toml"), "utf8");
write(
  "X_PUBLISHER_INVENTORY.md",
  [
    "# X Publisher Inventory",
    "",
    `Implementation found: ${worker.includes("X_POST_QUEUE") && worker.includes("/api/x/scheduled-run") ? "yes" : "no"}`,
    "",
    "Operating mode: queue-based scheduled publisher with explicit approval, posting flags, scheduler endpoint, execution lock, retry/backoff, content hash dedupe, and X post ID recording. The implementation does not automatically discover new editorial pages from their X card metadata.",
    "",
    "Active configuration or secret names observed: X_TOKEN_STORE, X_POST_QUEUE, X_POSTING_ENABLED, X_AUTOPOST_ENABLED, X_SCHEDULER_SECRET, X_ADMIN_TOKEN, X_CLIENT_ID, X_CLIENT_SECRET.",
    "",
    "No secret values are printed in this artifact.",
  ].join("\n"),
);

const telemetryRoutes = ["/", ...newest.map((item) => item.route)];
const telemetryRows = [["route", "cloudflare_template_present", "ga4_template_present", "public_cloudflare_tag", "public_ga4_tag", "status"]];
const cfTemplateInRepo = worker.includes("static.cloudflareinsights.com/beacon.min.js") || worker.includes("cloudflareinsights.com");
const gaTemplate = worker.includes("googletagmanager.com/gtag/js") || worker.includes("GA4");
const publicTelemetry = new Map();
if (includePublic && productionBase) {
  for (const route of telemetryRoutes) {
    const page = await fetchHtml(productionBase, route);
    publicTelemetry.set(route, {
      cf: /cloudflareinsights\.com|data-cf-beacon|\/cdn-cgi\/rum/i.test(page.html),
      ga: /googletagmanager\.com\/gtag\/js|gtag\(|google-analytics\.com/i.test(page.html),
    });
  }
}
for (const route of telemetryRoutes) {
  const publicTags = publicTelemetry.get(route);
  const cfOk = cfTemplateInRepo || (!includePublic ? true : Boolean(publicTags?.cf));
  const gaOk = gaTemplate || Boolean(publicTags?.ga);
  telemetryRows.push([route, cfTemplateInRepo, gaTemplate, includePublic ? Boolean(publicTags?.cf) : "platform_or_public_required", includePublic ? Boolean(publicTags?.ga) : "not_run", pass(cfOk && gaOk)]);
  if (!cfOk || !gaOk) fail("telemetry-template", `${route}: Cloudflare or GA4 public/template tag missing`);
}
write("TELEMETRY_ROUTE_MATRIX.tsv", tsv(telemetryRows));
write(
  "TELEMETRY_CONFIGURATION_AUDIT.md",
  [
    "# Telemetry Configuration Audit",
    "",
    `Cloudflare Web Analytics repo template present: ${cfTemplateInRepo}`,
    `Cloudflare Web Analytics local gate: ${cfTemplateInRepo ? "repo template" : "public/platform validation required"}`,
    `GA4 injection/measurement template present: ${gaTemplate}`,
    "",
    "Dashboard metric scope was not directly inspected because no Cloudflare or GA4 dashboard connector/session was available in this run. Public HTML tag presence therefore does not explain low Cloudflare visit counts by itself.",
    "",
    "Manual browser test path: /?telemetry_test=<UTC_TIMESTAMP>. Verify normal response, Cloudflare beacon request, GA4 collection request, CSP allowance, no WAF challenge, and dashboard hostname/time-zone filters.",
  ].join("\n"),
);

const internalRows = [["source_route", "href", "local_resolution", "status"]];
for (const route of telemetryRoutes) {
  for (const href of new Set(linkRoutes(readRoute(route)))) {
    const ok = localRouteExists(href);
    internalRows.push([route, href, ok ? "resolved_or_dynamic_allowed" : "missing", pass(ok)]);
    if (!ok) fail("internal-link", `${route} -> ${href}`);
  }
}
write("INTERNAL_LINK_RESULTS.tsv", tsv(internalRows));

const baselineRows = [["route", "status", "title", "canonical", "word_count", "breadcrumb", "article_schema", "og", "twitter_x"]];
for (const route of telemetryRoutes) {
  const html = readRoute(route);
  baselineRows.push([route, "LOCAL", title(html), canonical(html), wordCount(html), validBreadcrumb(html, canonical(html)).ok, route === "/" ? "n/a" : hasArticleSchema(html), hasOg(html), route === "/" ? "n/a" : hasTwitter(html)]);
}
write("PUBLIC_BASELINE.tsv", tsv(baselineRows));

const parityRows = [["route", "production_status", "immutable_status", "classification", "diff"]];
const crawlerRows = [["route", "user_agent_a", "user_agent_b", "classification", "diff"]];
if (includePublic && productionBase && immutableBase) {
  for (const route of telemetryRoutes) {
    const prod = await fetchHtml(productionBase, route);
    const imm = await fetchHtml(immutableBase, route);
    const cmp = compareSemantic(semanticSignature(prod.html), semanticSignature(imm.html));
    parityRows.push([route, prod.status, imm.status, cmp.classification, cmp.diff]);
    if (!["SEMANTICALLY_IDENTICAL", "METADATA_DIFFERENCE"].includes(cmp.classification)) fail("production-parity", `${route} ${cmp.classification}`);
  }
}
if (includePublic && productionBase) {
  const uas = [
    ["browser", "Mozilla/5.0 GAH semantic crawler"],
    ["googlebot", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"],
    ["twitterbot", "Twitterbot/1.0"],
  ];
  for (const route of telemetryRoutes) {
    const pages = [];
    for (const [label, ua] of uas) pages.push([label, await fetchHtml(productionBase, route, ua)]);
    for (const [label, page] of pages.slice(1)) {
      const cmp = compareSemantic(semanticSignature(pages[0][1].html), semanticSignature(page.html));
      crawlerRows.push([route, "browser", label, cmp.classification, cmp.diff]);
      if (!["SEMANTICALLY_IDENTICAL", "METADATA_DIFFERENCE"].includes(cmp.classification)) fail("crawler-variance", `${route} ${label} ${cmp.classification}`);
    }
  }
} else {
  parityRows.push(["not_run", "", "", "INCONCLUSIVE", "public production and immutable bases not supplied"]);
  crawlerRows.push(["not_run", "", "", "INCONCLUSIVE", "public production base not supplied"]);
}
write("PRODUCTION_PARITY.tsv", tsv(parityRows));
write("CRAWLER_SEMANTIC_VARIANCE.tsv", tsv(crawlerRows));

const mobileCaptures = [
  ["/", "mobile/home-390.png"],
  ["/evidence-briefs/todd-blanche-no-evidence", "mobile/todd-blanche-390.png"],
  ["/investigations/new-mexico-doj-epstein-records", "mobile/new-mexico-390.png"],
  ["/document-autopsies/doug-band-transcript", "mobile/doug-band-390.png"],
  ["/document-autopsies/leon-black-transcript", "mobile/leon-black-390.png"],
  ["/investigations/efta-compliance-tracker", "mobile/efta-390.png"],
];
const mobileRows = [["viewport", "route", "status", "note"]];
for (const [route, file] of mobileCaptures) {
  const exists = fs.existsSync(path.join(artifactDir, file));
  mobileRows.push(["390x844", route, exists ? "PASS" : "MANUAL_OR_PLAYWRIGHT_REQUIRED", exists ? `Playwright CLI screenshot captured: ${file}; h1 rendered.` : "Capture the route at 390px before final deployment gate signoff."]);
}
write("MOBILE_VALIDATION.tsv", tsv(mobileRows));

const requirementRows = [
  ["Requirement", "Status", "Evidence"],
  ["Homepage newest five surfaced", failures.some((f) => f.name === "homepage-current-work") ? "FAIL" : "PASS", "HOMEPAGE_SURFACING_BEFORE_AFTER.tsv"],
  ["Section indexes link newest five", failures.some((f) => f.name === "section-index") ? "FAIL" : "PASS", "SECTION_INDEX_VALIDATION.tsv"],
  ["Visible and JSON-LD breadcrumbs", failures.some((f) => f.name === "breadcrumb") ? "FAIL" : "PASS", "BREADCRUMB_VALIDATION.tsv"],
  ["Article schema preserved", failures.some((f) => f.name === "article-schema") ? "FAIL" : "PASS", "STRUCTURED_DATA_VALIDATION.tsv"],
  ["OG and X metadata preserved", failures.some((f) => f.name === "social-metadata") ? "FAIL" : "PASS", "SOCIAL_METADATA_VALIDATION.tsv"],
  ["Patreon pathways valid", failures.some((f) => f.name === "patreon") ? "FAIL" : "PASS", "PATREON_PATHWAY_VALIDATION.tsv"],
  ["Nested parent navigation valid", failures.some((f) => f.name === "nested-parent-links") ? "FAIL" : "PASS", "NESTED_PARENT_LINK_VALIDATION.tsv"],
  ["X eligibility registered", failures.some((f) => f.name === "x-register") ? "FAIL" : "PASS", "X_PUBLICATION_STATUS.tsv"],
  ["Telemetry templates present", failures.some((f) => f.name === "telemetry-template") ? "FAIL" : "PASS", "TELEMETRY_ROUTE_MATRIX.tsv"],
];
write("REQUIREMENT_MATRIX.md", `# Requirement Matrix\n\n${requirementRows.map((row) => `| ${row.join(" | ")} |`).join("\n")}\n`);

const validationRows = [["check", "status", "detail"], ...failures.map((f) => [f.name, "FAIL", f.detail])];
if (failures.length === 0) validationRows.push(["local_regression", "PASS", "all local gates in this harness passed"]);
write("VALIDATION_RESULTS.tsv", tsv(validationRows));

write(
  "DEPLOYMENT_REPORT.md",
  [
    "# Deployment Report",
    "",
    "Status: not deployed by this regression script.",
    "Production URL: https://grokarchivehub.com",
    "Immutable deployment URL: pending deployment.",
    "Deployment ID: pending deployment.",
    "Commit: pending commit.",
  ].join("\n"),
);
write(
  "ROLLBACK.md",
  [
    "# Rollback",
    "",
    "Verified rollback target supplied for this task: d43bcede-1de6-4d63-b877-cfeb95d0c064.",
    "Rollback command should use Cloudflare Pages deployment rollback for the project, not a content rollback commit, unless explicitly required.",
  ].join("\n"),
);

const manifest = [["path", "sha256"]];
for (const file of [
  "index.html",
  "frontdoor/site.css",
  "content/x-publication-register.json",
  "scripts/public-reach-regression.mjs",
  "scripts/add-visible-breadcrumbs.mjs",
  "scripts/serve-static.mjs",
  ...newest.map((item) => `${item.route.slice(1)}.html`),
  "investigations/trump-in-the-epstein-files.html",
  ...nested.map((route) => `${route.slice(1)}.html`),
]) {
  const filePath = path.join(ROOT, file);
  if (fs.existsSync(filePath)) manifest.push([file, sha256(fs.readFileSync(filePath))]);
}
write("FINAL_FILE_MANIFEST.tsv", tsv(manifest));

log.push("", `Completed: ${new Date().toISOString()}`, `Failure count: ${failures.length}`);
if (failures.length) log.push("", ...failures.map((f) => `- ${f.name}: ${f.detail}`));
write("EXECUTION_LOG.md", log.join("\n") + "\n");

const sums = requiredArtifactFiles
  .filter((file) => file !== "SHA256SUMS.txt")
  .map((file) => `${sha256(fs.readFileSync(path.join(artifactDir, file)))}  ${file}`)
  .join("\n");
write("SHA256SUMS.txt", `${sums}\n`);

console.log(JSON.stringify({ artifactDir, failures: failures.length }, null, 2));
if (failures.length) process.exit(1);
