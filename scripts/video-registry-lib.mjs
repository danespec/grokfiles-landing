import fs from "node:fs";
import path from "node:path";

export const APEX = "https://grokarchivehub.com";
export const REGISTRY_PATH = "content/video-registry.json";
export const VIDEO_SITEMAP_PATH = "content/video-sitemap.json";
export const X_QUEUE_PATH = "content/video-x-publication-queue.json";
export const WATCH_DIR = "videos";
export const ALLOWED_STATUSES = new Set([
  "draft",
  "rendered",
  "uploaded-private",
  "uploaded-unlisted",
  "scheduled",
  "published",
  "failed",
  "archived"
]);
export const ALLOWED_VISIBILITIES = new Set(["private", "unlisted", "public"]);
export const FACTUAL_STATUS_LABELS = new Set([
  "established fact",
  "court finding",
  "party position",
  "allegation",
  "inference",
  "unresolved"
]);

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const DURATION_RE = /^PT(?=.)(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function writeFileIfChanged(filePath, content) {
  const normalized = content.endsWith("\n") ? content : `${content}\n`;
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, "utf8") === normalized) return false;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, normalized);
  return true;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

export function normalizeSpace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function isValidDate(value) {
  if (value == null || value === "") return true;
  if (!DATE_RE.test(String(value))) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function isValidDateTime(value) {
  if (value == null || value === "") return true;
  if (!DATE_TIME_RE.test(String(value))) return false;
  return Number.isFinite(new Date(value).valueOf());
}

export function isValidDateOrDateTime(value) {
  return isValidDate(value) || isValidDateTime(value);
}

export function isValidDuration(value) {
  if (value == null || value === "") return true;
  if (!DURATION_RE.test(String(value))) return false;
  return /[HMS]/.test(String(value));
}

export function isValidYoutubeId(value) {
  if (value == null || value === "") return true;
  return YOUTUBE_ID_RE.test(String(value));
}

export function youtubeUrlForId(id) {
  return id ? `https://www.youtube.com/watch?v=${id}` : "";
}

export function youtubeEmbedUrl(id) {
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : "";
}

export function canonicalForSlug(slug) {
  return `${APEX}/videos/${slug}`;
}

export function isHttpUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(String(value), APEX);
    return url.protocol === "https:" || (url.origin === APEX && url.pathname.startsWith("/"));
  } catch (_) {
    return false;
  }
}

export function isPublicPublished(video) {
  return video.status === "published" && video.visibility === "public";
}

export function hasVideoObjectFields(video) {
  return Boolean(
    normalizeSpace(video.title) &&
    normalizeSpace(video.description) &&
    isValidYoutubeId(video.youtubeVideoId) &&
    video.youtubeVideoId &&
    video.thumbnailUrl &&
    video.uploadDate &&
    isValidDateOrDateTime(video.uploadDate)
  );
}

function requireString(errors, video, field, context) {
  if (!normalizeSpace(video[field])) errors.push(`${context}: missing ${field}`);
}

function validateLinks(errors, video, field, context) {
  const links = Array.isArray(video[field]) ? video[field] : [];
  if (!Array.isArray(video[field])) errors.push(`${context}: ${field} must be an array`);
  links.forEach((link, index) => {
    if (!normalizeSpace(link.label)) errors.push(`${context}: ${field}[${index}].label is required`);
    if (!normalizeSpace(link.url)) errors.push(`${context}: ${field}[${index}].url is required`);
    if (link.url && !isHttpUrl(link.url)) errors.push(`${context}: ${field}[${index}].url must be http(s) or site-relative`);
  });
}

export function validateVideoRegistry(registry) {
  const errors = [];
  if (!registry || typeof registry !== "object") return { ok: false, errors: ["registry must be an object"], videos: [] };
  if (registry.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!registry.channel || registry.channel.title !== "Grok Archive Hub") errors.push("channel.title must be Grok Archive Hub");
  if (registry.channel?.handle !== "@GrokArchiveHub") errors.push("channel.handle must be @GrokArchiveHub");
  if (!Array.isArray(registry.videos)) errors.push("videos must be an array");

  const ids = new Set();
  const slugs = new Set();
  const videos = Array.isArray(registry.videos) ? registry.videos : [];

  videos.forEach((video, index) => {
    const context = `videos[${index}]`;
    if (!video || typeof video !== "object") {
      errors.push(`${context}: must be an object`);
      return;
    }

    requireString(errors, video, "id", context);
    requireString(errors, video, "slug", context);
    if (video.id) {
      if (ids.has(video.id)) errors.push(`${context}: duplicate id ${video.id}`);
      ids.add(video.id);
    }
    if (video.slug) {
      if (!SLUG_RE.test(video.slug)) errors.push(`${context}: invalid slug ${video.slug}`);
      if (slugs.has(video.slug)) errors.push(`${context}: duplicate slug ${video.slug}`);
      slugs.add(video.slug);
    }
    if (!ALLOWED_STATUSES.has(video.status)) errors.push(`${context}: invalid status ${video.status}`);
    if (!ALLOWED_VISIBILITIES.has(video.visibility)) errors.push(`${context}: invalid visibility ${video.visibility}`);
    if (typeof video.madeForKids !== "boolean") errors.push(`${context}: madeForKids must be boolean`);
    if (!Array.isArray(video.tags)) errors.push(`${context}: tags must be an array`);
    if (!Array.isArray(video.archiveIds)) errors.push(`${context}: archiveIds must be an array`);
    if (!Array.isArray(video.batesIds)) errors.push(`${context}: batesIds must be an array`);
    if (!Array.isArray(video.factualStatusLabels)) errors.push(`${context}: factualStatusLabels must be an array`);
    for (const label of video.factualStatusLabels || []) {
      if (!FACTUAL_STATUS_LABELS.has(label)) errors.push(`${context}: unsupported factualStatusLabels value ${label}`);
    }

    for (const field of ["uploadDate", "publishDate", "updatedDate", "recordingDate"]) {
      if (!isValidDateOrDateTime(video[field])) errors.push(`${context}: invalid ${field}`);
    }
    if (!isValidDateTime(video.scheduledPublishAt)) errors.push(`${context}: scheduledPublishAt must be UTC ISO date-time when present`);
    if (!isValidDuration(video.durationIso8601)) errors.push(`${context}: invalid durationIso8601`);
    if (!isValidYoutubeId(video.youtubeVideoId)) errors.push(`${context}: malformed YouTube ID`);
    if (video.youtubeVideoId && video.youtubeUrl && video.youtubeUrl !== youtubeUrlForId(video.youtubeVideoId)) {
      errors.push(`${context}: youtubeUrl must match youtubeVideoId`);
    }
    for (const field of ["youtubeUrl", "thumbnailUrl", "transcriptPath", "captionsPath"]) {
      if (!isHttpUrl(video[field])) errors.push(`${context}: invalid ${field}`);
    }
    validateLinks(errors, video, "evidenceLinks", context);
    validateLinks(errors, video, "relatedArchiveDocuments", context);
    if (video.relatedInvestigation && !isHttpUrl(video.relatedInvestigation.url)) {
      errors.push(`${context}: relatedInvestigation.url must be http(s) or site-relative`);
    }

    if (isPublicPublished(video)) {
      for (const field of ["title", "description", "shortDescription", "youtubeVideoId", "youtubeUrl", "thumbnailUrl", "durationIso8601", "uploadDate", "publishDate", "updatedDate", "language"]) {
        requireString(errors, video, field, context);
      }
      if (!hasVideoObjectFields(video)) errors.push(`${context}: published videos require valid VideoObject source fields`);
    }
  });

  return { ok: errors.length === 0, errors, videos };
}

export function loadRegistry(root = process.cwd(), registryPath = REGISTRY_PATH) {
  const filePath = path.resolve(root, registryPath);
  return readJson(filePath);
}

export function videoSort(a, b) {
  return String(b.publishDate || b.uploadDate || "").localeCompare(String(a.publishDate || a.uploadDate || "")) ||
    String(a.title || "").localeCompare(String(b.title || "")) ||
    String(a.slug || "").localeCompare(String(b.slug || ""));
}

export function publicVideos(registry) {
  return [...(registry.videos || [])].filter(isPublicPublished).sort(videoSort);
}

export function videoCategories(videos) {
  return Array.from(new Set(videos.map((video) => video.category).filter(Boolean))).sort();
}

export function breadcrumbJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };
}

export function organizationJsonLd(channel) {
  const sameAs = [];
  if (channel?.youtubeUrl) sameAs.push(channel.youtubeUrl);
  return {
    "@type": "Organization",
    "@id": `${APEX}/#organization`,
    "name": "Grok Archive Hub",
    "url": APEX,
    "description": "Source-first investigations and evidence archive.",
    ...(sameAs.length ? { sameAs } : {}),
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Contact / Source Tips",
      "url": `${APEX}/contact`
    }
  };
}

export function videoObjectJsonLd(video) {
  if (!hasVideoObjectFields(video)) return null;
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": video.title,
    "description": video.description,
    "thumbnailUrl": [video.thumbnailUrl],
    "uploadDate": video.uploadDate,
    ...(video.durationIso8601 ? { duration: video.durationIso8601 } : {}),
    ...(video.youtubeUrl ? { embedUrl: youtubeEmbedUrl(video.youtubeVideoId), contentUrl: video.youtubeUrl } : {}),
    "publisher": { "@id": `${APEX}/#organization` }
  };
}

export function jsonScript(value) {
  return `<script type="application/ld+json">\n${JSON.stringify(value, null, 2)}\n  </script>`;
}

export function renderNav(active = "/videos") {
  const links = [
    ["/start", "Start Here"],
    ["/investigations", "Investigations"],
    ["/evidence-briefs", "Evidence Briefs"],
    ["/videos", "Videos"],
    ["/banking-records", "Banking Records"],
    ["/methodology", "Methodology"],
    ["/corrections", "Corrections"],
    ["/about", "About"],
    ["/explore", "Explore"]
  ];
  return `<header class="site-header">
    <div class="nav-shell">
      <a class="brand" href="/"><span class="brand-mark">GA</span><span>Grok Archive Hub</span></a>
      <button class="menu-button" type="button" data-menu-button aria-expanded="false" aria-label="Open navigation">Menu</button>
      <nav class="nav-links" data-nav-links aria-label="Primary navigation">
        ${links.map(([href, label]) => `<a${href === "/explore" ? ' class="nav-support"' : ""} data-route-link href="${href}"${href === active ? ' aria-current="page"' : ""}>${label}</a>`).join("\n        ")}
      </nav>
    </div>
  </header>`;
}

export function renderFooter() {
  return `<footer class="site-footer">
    <div class="page-shell">
      <nav class="footer-links" aria-label="Footer navigation"><a href="/editorial-policy">Editorial policy</a><a href="/corrections">Corrections</a><a href="/privacy">Privacy</a><a href="/contact">Contact / Source Tips</a></nav>
      <p class="disclaimer">Presence-only archival research. No guilt or conduct implied unless adjudicated. Video pages distinguish transcript, captions, OCR, editorial summary, and verbatim quotation.</p>
    </div>
  </footer>`;
}

export function renderVideoHub(registry) {
  const videos = publicVideos(registry);
  const categories = videoCategories(videos);
  const featured = videos.find((video) => video.featured) || videos[0] || null;
  const title = "Videos | Grok Archive Hub";
  const description = "Grok Archive Hub video publication hub for source-first explainers, watch pages, transcripts, captions, and evidence links.";
  const channel = registry.channel || {};
  const filterMarkup = categories.length
    ? `        <div class="video-filter-row" aria-label="Video topic filters"><a class="chip" href="/videos">All</a>${categories.map((category) => `<a class="chip" href="/videos?category=${encodeURIComponent(category)}">${escapeHtml(category)}</a>`).join("")}</div>\n`
    : "";
  const videoListMarkup = videos.length
    ? `<div class="dispatch-grid video-card-grid">${videos.map((video) => renderVideoCard(video, false)).join("\n")}</div>`
    : `<div class="notice video-empty"><p><strong>No videos are public yet.</strong> The registry is ready, but no real YouTube IDs, thumbnails, upload dates, or transcripts have been published.</p></div>`;
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      organizationJsonLd(channel),
      breadcrumbJsonLd([
        { name: "Grok Archive Hub", url: `${APEX}/` },
        { name: "Videos", url: `${APEX}/videos` }
      ])
    ]
  };
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeAttr(description)}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="${APEX}/videos">
  <meta property="og:site_name" content="Grok Archive Hub">
  <meta property="og:title" content="Videos | Grok Archive Hub">
  <meta property="og:description" content="${escapeAttr(description)}">
  <meta property="og:url" content="${APEX}/videos">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="Videos | Grok Archive Hub">
  <meta name="twitter:description" content="${escapeAttr(description)}">
  ${jsonScript(graph)}
  <link rel="stylesheet" href="/frontdoor/site.css">
</head>
<body>
  ${renderNav("/videos")}
  <nav class="breadcrumb-nav" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li aria-current="page">Videos</li></ol></nav>
  <main>
    <section class="page-hero video-hero">
      <div class="page-shell">
        <p class="eyebrow">YouTube · dormant publication rail</p>
        <h1>Video explainers stay attached to receipts.</h1>
        <p class="lede">The Grok Archive Hub video lane is prepared for source-first explainers, transcript review, caption files, and watch pages. No public video is listed until a registry entry is actually published.</p>
        <div class="button-row">
          <a class="button primary" href="${escapeAttr(channel.youtubeUrl || "https://www.youtube.com/@GrokArchiveHub")}" rel="noopener noreferrer" target="_blank">Open YouTube channel</a>
          <a class="button" href="/corrections">Corrections and source tips</a>
        </div>
      </div>
    </section>
    <section class="section">
      <div class="page-shell video-grid">
        <article class="feature-panel video-featured">
          <p class="eyebrow">Featured video</p>
          ${featured ? renderVideoCard(featured, true) : `<h2>No public video has been published yet.</h2><p>The upload pipeline is dormant until OAuth is authorized, the channel is verified, and an editor marks a registry record as published. Drafts, private uploads, and scheduled records stay out of public discovery.</p>`}
        </article>
        <aside class="video-side-panel">
          <span class="badge receipt">${escapeHtml(channel.handle || "@GrokArchiveHub")}</span>
          <h2>Channel purpose</h2>
          <p>Video pages will summarize evidence without replacing the source trail. Watch pages link back to transcripts, captions, archive records, Bates IDs, related investigations, and corrections.</p>
          <dl class="video-facts">
            <div><dt>Default upload status</dt><dd>Private</dd></div>
            <div><dt>Automatic X posting</dt><dd>Disabled</dd></div>
            <div><dt>Public indexing</dt><dd>Published registry records only</dd></div>
          </dl>
        </aside>
      </div>
    </section>
    <section class="section">
      <div class="page-shell">
        <div class="section-head">
          <div><p class="eyebrow">Newest videos</p><h2>Watch pages.</h2></div>
          <p>Filters appear after public registry entries exist. Empty states remain explicit so unpublished drafts cannot masquerade as releases.</p>
        </div>
${filterMarkup}        ${videoListMarkup}
      </div>
    </section>
  </main>
  ${renderFooter()}
  <script data-cfasync="false" src="/frontdoor/site.js?v=GAH-ROCKET-004"></script>
</body>
</html>`;
}

export function renderVideoCard(video, featured = false) {
  const href = `/videos/${video.slug}`;
  const evidenceCount = Array.isArray(video.evidenceLinks) ? video.evidenceLinks.length : 0;
  const transcript = video.transcriptPath ? "Transcript available" : (video.captionsPath ? "Captions available" : "Transcript pending");
  return `<${featured ? "div" : "article"} class="${featured ? "video-feature-card" : "dispatch-card video-card"}" data-category="${escapeAttr(video.category || "")}">
    ${video.thumbnailUrl ? `<img class="video-thumb" src="${escapeAttr(video.thumbnailUrl)}" alt="${escapeAttr(video.title)} thumbnail" loading="lazy">` : ""}
    <span class="badge receipt">${escapeHtml(video.category || "Video")}</span>
    <h3>${escapeHtml(video.title)}</h3>
    <p>${escapeHtml(video.shortDescription || video.description || "")}</p>
    <p class="card-date">Published ${escapeHtml(video.publishDate || "pending")} · Updated ${escapeHtml(video.updatedDate || video.publishDate || "pending")} · ${escapeHtml(video.durationIso8601 || "duration pending")}</p>
    <p class="card-url">${escapeHtml(transcript)} · ${evidenceCount} evidence link${evidenceCount === 1 ? "" : "s"}</p>
    <div class="chip-row">${(video.factualStatusLabels || []).map((label) => `<span class="chip">${escapeHtml(label)}</span>`).join("")}</div>
    <div class="button-row"><a class="button primary" href="${href}">Open watch page</a><a class="button" href="${escapeAttr(video.youtubeUrl || youtubeUrlForId(video.youtubeVideoId))}" rel="noopener noreferrer" target="_blank">Open on YouTube</a></div>
  </${featured ? "div" : "article"}>`;
}

export function renderWatchPage(video, registry) {
  const canonical = canonicalForSlug(video.slug);
  const description = video.shortDescription || video.description;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      organizationJsonLd(registry.channel || {}),
      breadcrumbJsonLd([
        { name: "Grok Archive Hub", url: `${APEX}/` },
        { name: "Videos", url: `${APEX}/videos` },
        { name: video.title, url: canonical }
      ]),
      videoObjectJsonLd(video)
    ].filter(Boolean)
  };
  const evidenceLinks = video.evidenceLinks || [];
  const archiveDocs = video.relatedArchiveDocuments || [];
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(video.title)} | Grok Archive Hub</title>
  <meta name="description" content="${escapeAttr(description)}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="${canonical}">
  <meta property="og:site_name" content="Grok Archive Hub">
  <meta property="og:title" content="${escapeAttr(video.title)}">
  <meta property="og:description" content="${escapeAttr(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:type" content="video.other">
  ${video.thumbnailUrl ? `<meta property="og:image" content="${escapeAttr(video.thumbnailUrl)}">` : ""}
  <meta name="twitter:card" content="${video.thumbnailUrl ? "summary_large_image" : "summary"}">
  <meta name="twitter:title" content="${escapeAttr(video.title)}">
  <meta name="twitter:description" content="${escapeAttr(description)}">
  ${video.thumbnailUrl ? `<meta name="twitter:image" content="${escapeAttr(video.thumbnailUrl)}">` : ""}
  ${jsonScript(jsonLd)}
  <link rel="stylesheet" href="/frontdoor/site.css">
</head>
<body>
  ${renderNav("/videos")}
  <nav class="breadcrumb-nav" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li><a href="/videos">Videos</a></li><li aria-current="page">${escapeHtml(video.title)}</li></ol></nav>
  <main>
    <article class="content wide video-watch">
      <section class="page-hero video-watch-hero">
        <p class="eyebrow">${escapeHtml(video.category || "Video")}</p>
        <h1>${escapeHtml(video.title)}</h1>
        <p class="lede">${escapeHtml(description)}</p>
        <div class="chip-row">${(video.factualStatusLabels || []).map((label) => `<span class="chip">${escapeHtml(label)}</span>`).join("")}</div>
      </section>
      <section class="video-player-shell" aria-label="YouTube video player">
        <iframe src="${escapeAttr(youtubeEmbedUrl(video.youtubeVideoId))}" title="${escapeAttr(video.title)}" loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
      </section>
      <section class="prose-grid">
        <div class="info-card">
          <span class="badge receipt">Publication</span>
          <h3>Dates and status</h3>
          <p><strong>Published:</strong> ${escapeHtml(video.publishDate)}</p>
          <p><strong>Updated:</strong> ${escapeHtml(video.updatedDate || video.publishDate)}</p>
          <p><strong>Duration:</strong> ${escapeHtml(video.durationIso8601)}</p>
          <p><strong>Language:</strong> ${escapeHtml(video.language || "en")}</p>
        </div>
        <div class="info-card">
          <span class="badge">Transcript / captions</span>
          <h3>Reviewed text rails</h3>
          <p>${video.transcriptPath ? `<a class="text-link" href="${escapeAttr(video.transcriptPath)}">Transcript available</a>` : "Transcript pending."}</p>
          <p>${video.captionsPath ? `<a class="text-link" href="${escapeAttr(video.captionsPath)}">Captions available</a>` : "Captions pending."}</p>
        </div>
      </section>
      <section>
        <h2>Evidence links</h2>
        ${evidenceLinks.length ? renderLinkList(evidenceLinks) : `<p>No evidence links are attached yet. This page should not be published until the source chain is complete.</p>`}
      </section>
      <section>
        <h2>Related archive documents</h2>
        ${archiveDocs.length ? renderLinkList(archiveDocs) : `<p>No related archive documents are attached yet.</p>`}
      </section>
      <section class="feature-panel">
        <p class="eyebrow">Source limits</p>
        <h2>What this video can and cannot do.</h2>
        <p>Bates IDs: ${(video.batesIds || []).length ? video.batesIds.map(escapeHtml).join(", ") : "none attached"}.</p>
        <p>Archive IDs: ${(video.archiveIds || []).length ? video.archiveIds.map(escapeHtml).join(", ") : "none attached"}.</p>
        ${video.relatedInvestigation?.url ? `<p>Related investigation: <a class="text-link" href="${escapeAttr(video.relatedInvestigation.url)}">${escapeHtml(video.relatedInvestigation.title || video.relatedInvestigation.url)}</a></p>` : ""}
        <p>Corrections and broken source links route through <a class="text-link" href="/corrections">Corrections and Source Tips</a>.</p>
      </section>
    </article>
  </main>
  ${renderFooter()}
  <script data-cfasync="false" src="/frontdoor/site.js?v=GAH-ROCKET-004"></script>
</body>
</html>`;
}

export function renderLinkList(links) {
  return `<div class="route-list">${links.map((link) => `<a class="route-link" href="${escapeAttr(link.url)}"><strong>${escapeHtml(link.label)}</strong><span>${escapeHtml(link.note || link.url)}</span></a>`).join("")}</div>`;
}

export function buildVideoArtifacts(root = process.cwd(), options = {}) {
  const registry = loadRegistry(root, options.registryPath || REGISTRY_PATH);
  const validation = validateVideoRegistry(registry);
  if (!validation.ok) return { ok: false, errors: validation.errors, changed: [] };

  const videos = publicVideos(registry);
  const changed = [];
  const hubPath = path.join(root, "videos.html");
  const hub = renderVideoHub(registry);
  if (!options.checkOnly && writeFileIfChanged(hubPath, hub)) changed.push("videos.html");
  if (options.checkOnly && (!fs.existsSync(hubPath) || fs.readFileSync(hubPath, "utf8") !== `${hub}\n`)) changed.push("videos.html");

  for (const video of videos) {
    const pagePath = path.join(root, WATCH_DIR, `${video.slug}.html`);
    const page = renderWatchPage(video, registry);
    const rel = `${WATCH_DIR}/${video.slug}.html`;
    if (!options.checkOnly && writeFileIfChanged(pagePath, page)) changed.push(rel);
    if (options.checkOnly && (!fs.existsSync(pagePath) || fs.readFileSync(pagePath, "utf8") !== `${page}\n`)) changed.push(rel);
  }

  const sitemap = buildVideoSitemap(registry);
  const sitemapPath = path.join(root, VIDEO_SITEMAP_PATH);
  const sitemapText = `${JSON.stringify(sitemap, null, 2)}\n`;
  if (!options.checkOnly && writeFileIfChanged(sitemapPath, sitemapText)) changed.push(VIDEO_SITEMAP_PATH);
  if (options.checkOnly && (!fs.existsSync(sitemapPath) || fs.readFileSync(sitemapPath, "utf8") !== sitemapText)) changed.push(VIDEO_SITEMAP_PATH);

  const xQueue = buildVideoXQueue(registry);
  const queuePath = path.join(root, X_QUEUE_PATH);
  const queueText = `${JSON.stringify(xQueue, null, 2)}\n`;
  if (!options.checkOnly && writeFileIfChanged(queuePath, queueText)) changed.push(X_QUEUE_PATH);
  if (options.checkOnly && (!fs.existsSync(queuePath) || fs.readFileSync(queuePath, "utf8") !== queueText)) changed.push(X_QUEUE_PATH);

  return { ok: changed.length === 0 || !options.checkOnly, errors: options.checkOnly && changed.length ? changed.map((file) => `${file} is not up to date`) : [], changed, registry, videos };
}

export function buildVideoSitemap(registry) {
  const videos = publicVideos(registry);
  return {
    schemaVersion: 1,
    generatedFrom: REGISTRY_PATH,
    hub: { loc: `${APEX}/videos`, lastmod: registry.updatedAt?.slice(0, 10) || "2026-07-22" },
    videoUrls: videos.filter(hasVideoObjectFields).map((video) => ({
      loc: canonicalForSlug(video.slug),
      lastmod: video.updatedDate || video.publishDate,
      video: {
        title: video.title,
        description: video.description,
        thumbnail_loc: video.thumbnailUrl,
        content_loc: video.youtubeUrl,
        player_loc: youtubeEmbedUrl(video.youtubeVideoId),
        publication_date: video.uploadDate,
        duration: video.durationIso8601
      }
    }))
  };
}

export function buildVideoXQueue(registry) {
  return {
    schemaVersion: 1,
    policy: "Queue-ready only. Publishing a YouTube video does not automatically post to X.",
    records: publicVideos(registry).map((video) => ({
      registryId: video.id,
      route: `/videos/${video.slug}`,
      canonicalUrl: canonicalForSlug(video.slug),
      videoTitle: video.title,
      watchPageUrl: canonicalForSlug(video.slug),
      youtubeUrl: video.youtubeUrl,
      summary: video.shortDescription || video.description,
      evidenceHook: (video.evidenceLinks || [])[0]?.note || (video.evidenceLinks || [])[0]?.label || "",
      imageOrThumbnailPath: video.thumbnailUrl || "",
      publicationStatus: video.xPublicationStatus || "queue-ready-not-published",
      requiresExplicitXPublicationAction: true
    }))
  };
}
