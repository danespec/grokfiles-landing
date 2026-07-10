const FRONTDOOR_PATHS = new Set([
  "/",
  "/start",
  "/about",
  "/about-the-operator",
  "/editorial-policy",
  "/corrections",
  "/privacy",
  "/terms",
  "/dispatches",
  "/dispatches/epstein-death",
  "/dispatches/epstein-mcc-timeline",
  "/dispatches/epstein-jail-logs",
  "/dispatches/efta-files-guide",
  "/dispatches/august-8-attorney-log-colon-miro",
  "/dispatches/epstein-open-receipt-slots",
  "/dispatches/fara-leads-explained",
  "/dispatches/how-to-read-the-barak-records",
  "/dispatches/barak-archive",
  "/methodology",
  "/methodology/how-not-to-overread-flight-logs",
  "/methodology/redaction-breadcrumbs",
  "/methodology/source-map-methodology",
  "/methodology/confidence-labels-open-slots",
  "/visual-evidence",
  "/redacted-files",
  "/research/epstein-final-48-hours-mcc",
  "/research/epstein-final-48-hours-mcc-source-ledger.tsv",
  "/archive/EFTA00035147",
  "/archive/EFTA00039025",
  "/archive/EFTA00039356",
  "/archive/EFTA00039416",
  "/archive/EFTA00039660",
  "/barak/source-map",
  "/barak/receipts",
  "/barak/entities",
  "/barak/timeline",
  "/barak/fara-review",
  "/archive",
  "/search",
  "/reading-room",
  "/reading-room/notes",
  "/reading-room/receipt-drops",
  "/reading-room/request-queue",
  "/reading-room/open-slots",
  "/reading-room/barak-claim-candidates",
  "/reading-room/barak-first-dispatch-outline",
  "/reading-room/visual-review",
  "/reading-room/redaction-review",
  "/membership",
  "/login",
  "/account",
  "/forum",
  "/live",
  "/donate",
  "/faq",
  "/contact",
  "/support"
]);

const FRONTDOOR_SITE_JS = String.raw`
(function () {
  "use strict";

  var menu = document.querySelector("[data-menu-button]");
  var nav = document.querySelector("[data-nav-links]");
  if (menu && nav) {
    menu.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      menu.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  var path = window.location.pathname.replace(/\/+$/, "") || "/";
  document.querySelectorAll("[data-route-link]").forEach(function (link) {
    var href = (link.getAttribute("href") || "").replace(/\/+$/, "") || "/";
    if (href === path || (href !== "/" && path.indexOf(href + "/") === 0)) {
      link.setAttribute("aria-current", "page");
    }
  });

  function firstArray(data) {
    var keys = ["hits", "results", "documents", "docs", "sources", "evidence", "items"];
    for (var i = 0; i < keys.length; i += 1) {
      if (Array.isArray(data && data[keys[i]])) return data[keys[i]];
    }
    return Array.isArray(data) ? data : [];
  }

  function pick(obj, keys) {
    for (var i = 0; i < keys.length; i += 1) {
      if (obj && obj[keys[i]]) return String(obj[keys[i]]);
    }
    return "";
  }

  function safeUrl(value) {
    try {
      var url = new URL(String(value || ""), window.location.origin);
      if (url.protocol !== "http:" && url.protocol !== "https:") return "";
      return url.href;
    } catch (_) {
      return "";
    }
  }

  var form = document.querySelector("[data-archive-search]");
  if (!form) return;

  var input = form.querySelector("input");
  var button = form.querySelector("button");
  var status = document.querySelector("[data-search-status]");
  var results = document.querySelector("[data-search-results]");

  function addCard(title, text, href, label) {
    var card = document.createElement("article");
    card.className = "result-card";
    var h3 = document.createElement("h3");
    h3.textContent = title || "Archive result";
    card.appendChild(h3);
    if (text) {
      var p = document.createElement("p");
      p.textContent = text.slice(0, 1600);
      card.appendChild(p);
    }
    var url = safeUrl(href);
    if (url) {
      var a = document.createElement("a");
      a.href = url;
      a.textContent = label || "Open source";
      if (new URL(url).origin !== window.location.origin) {
        a.target = "_blank";
        a.rel = "noopener";
      }
      card.appendChild(a);
    }
    results.appendChild(card);
  }

  async function runSearch(query) {
    query = String(query || "").trim();
    if (!query) {
      status.textContent = "Enter a name, phrase, date, organization, or EFTA identifier.";
      return;
    }
    button.disabled = true;
    status.textContent = "Searching source records…";
    results.innerHTML = "";
    try {
      var response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: query, query: query, tag: "All", limit: 10, fast: true, no_ai: true })
      });
      var raw = await response.text();
      var data;
      try { data = JSON.parse(raw); } catch (_) { data = { answer: raw }; }
      if (!response.ok) throw new Error(pick(data, ["error", "message"]) || ("HTTP " + response.status));

      var answer = pick(data, ["answer", "summary", "response", "text"]);
      if (answer) addCard("Source-grounded summary", answer, "", "");

      var rows = firstArray(data);
      rows.forEach(function (row) {
        var id = pick(row, ["efta_id", "id", "efta", "document_id"]);
        var title = pick(row, ["title", "name"]) || id || "Archive result";
        var text = pick(row, ["snippet", "summary", "text", "content", "combined_text", "body"]);
        var href = pick(row, ["read_url", "pdf_url", "url", "source_url"]);
        if (!href && /^EFTA[0-9]{8}$/i.test(id)) href = "/archive/" + id.toUpperCase();
        addCard(title, text, href, "Open record");
      });
      if (!answer && !rows.length) addCard("No readable results", "Try a spelling variant, exact phrase, date, or EFTA identifier.", "", "");
      status.textContent = "Search complete · " + rows.length + " source result" + (rows.length === 1 ? "" : "s") + ".";
    } catch (error) {
      addCard("Search unavailable", "The archive search service did not return a usable response. The evidence vault and wiki remain available from the links below.", "/wiki", "Open evidence cockpit");
      status.textContent = "Search request failed: " + (error && error.message ? error.message : "unknown error");
    } finally {
      button.disabled = false;
    }
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var next = new URL(window.location.href);
    next.searchParams.set("q", input.value.trim());
    window.history.replaceState({}, "", next.pathname + next.search);
    runSearch(input.value);
  });

  var initial = new URL(window.location.href).searchParams.get("q");
  if (initial) {
    input.value = initial;
    runSearch(initial);
  }
})();
`;

const MCC_TIMELINE_SITEMAP_URL = "https://grokarchivehub.com/dispatches/epstein-mcc-timeline";
const MCC_TIMELINE_LASTMOD = "2026-06-26";
const JAIL_LOGS_SITEMAP_URL = "https://grokarchivehub.com/dispatches/epstein-jail-logs";
const JAIL_LOGS_LASTMOD = "2026-06-26";
const EFTA_GUIDE_SITEMAP_URL = "https://grokarchivehub.com/dispatches/efta-files-guide";
const EFTA_GUIDE_LASTMOD = "2026-06-26";
const AUG8_COLON_MIRO_SITEMAP_URL = "https://grokarchivehub.com/dispatches/august-8-attorney-log-colon-miro";
const AUG8_COLON_MIRO_LASTMOD = "2026-06-27";
const OPEN_RECEIPT_SLOTS_SITEMAP_URL = "https://grokarchivehub.com/dispatches/epstein-open-receipt-slots";
const OPEN_RECEIPT_SLOTS_LASTMOD = "2026-06-27";
const FARA_LEADS_SITEMAP_URL = "https://grokarchivehub.com/dispatches/fara-leads-explained";
const FARA_LEADS_LASTMOD = "2026-06-27";
const HOW_TO_READ_BARAK_SITEMAP_URL = "https://grokarchivehub.com/dispatches/how-to-read-the-barak-records";
const HOW_TO_READ_BARAK_LASTMOD = "2026-06-29";
const VISUAL_EVIDENCE_SITEMAP_URL = "https://grokarchivehub.com/visual-evidence";
const VISUAL_EVIDENCE_LASTMOD = "2026-06-29";
const REDACTED_FILES_SITEMAP_URL = "https://grokarchivehub.com/redacted-files";
const REDACTED_FILES_LASTMOD = "2026-06-29";
const METHODOLOGY_SITEMAP_ENTRIES = [
  ["https://grokarchivehub.com/methodology", "2026-07-01"],
  ["https://grokarchivehub.com/methodology/how-not-to-overread-flight-logs", "2026-07-01"],
  ["https://grokarchivehub.com/methodology/redaction-breadcrumbs", "2026-07-01"],
  ["https://grokarchivehub.com/methodology/source-map-methodology", "2026-07-01"],
  ["https://grokarchivehub.com/methodology/confidence-labels-open-slots", "2026-07-01"]
];
const BARAK_SOURCE_MAP_SITEMAP_URL = "https://grokarchivehub.com/barak/source-map";
const BARAK_SOURCE_MAP_LASTMOD = "2026-06-29";
const BARAK_RECEIPTS_SITEMAP_URL = "https://grokarchivehub.com/barak/receipts";
const BARAK_RECEIPTS_LASTMOD = "2026-06-29";
const BARAK_ENTITIES_SITEMAP_URL = "https://grokarchivehub.com/barak/entities";
const BARAK_ENTITIES_LASTMOD = "2026-06-29";
const BARAK_TIMELINE_SITEMAP_URL = "https://grokarchivehub.com/barak/timeline";
const BARAK_TIMELINE_LASTMOD = "2026-06-29";
const BARAK_FARA_REVIEW_SITEMAP_URL = "https://grokarchivehub.com/barak/fara-review";
const BARAK_FARA_REVIEW_LASTMOD = "2026-06-29";
const BARAK_RECEIPT_DETAIL_LASTMOD = "2026-06-29";
const ABOUT_OPERATOR_SITEMAP_URL = "https://grokarchivehub.com/about-the-operator";
const ABOUT_OPERATOR_LASTMOD = "2026-06-27";
const TRUST_SITEMAP_ENTRIES = [
  ["https://grokarchivehub.com/about", "2026-07-01"],
  ["https://grokarchivehub.com/about-the-operator", ABOUT_OPERATOR_LASTMOD],
  ["https://grokarchivehub.com/editorial-policy", "2026-07-01"],
  ["https://grokarchivehub.com/corrections", "2026-07-01"],
  ["https://grokarchivehub.com/privacy", "2026-07-01"],
  ["https://grokarchivehub.com/terms", "2026-07-08"],
  ["https://grokarchivehub.com/contact", "2026-07-01"]
];
const CORE_SITEMAP_ENTRIES = [
  ["https://grokarchivehub.com/", "2026-07-01"],
  ["https://grokarchivehub.com/start", "2026-07-01"],
  ["https://grokarchivehub.com/dispatches", "2026-07-01"],
  ["https://grokarchivehub.com/archive", "2026-07-01"],
  ["https://grokarchivehub.com/live", "2026-07-01"],
  ["https://grokarchivehub.com/faq", "2026-07-01"],
  ["https://grokarchivehub.com/membership", "2026-06-27"],
  ["https://grokarchivehub.com/support", "2026-07-03"],
  ["https://grokarchivehub.com/donate", "2026-06-27"],
  ["https://grokarchivehub.com/research-index", "2026-06-25"],
  ["https://grokarchivehub.com/topics", "2026-06-25"],
  ["https://grokarchivehub.com/grok-command-v4", "2026-06-25"],
  ["https://grokarchivehub.com/research/evidence/epstein-death", "2026-06-25"],
  ["https://grokarchivehub.com/research/evidence/mcc-epstein-control-spine", "2026-06-25"]
];

const FRESH_PROOF_PATHS = new Set([
  "/barak",
  "/research-index",
  "/topics",
  "/research/evidence/epstein-death",
  "/sitemap.xml",
  "/sitemap-index.xml",
  "/robots.txt"
]);

const MEMBER_PORTAL_PATHS = new Set([
  "/members",
  "/members/research-drops",
  "/members/downloads",
  "/members/requests",
  "/members/account"
]);
const MEMBER_COOKIE_NAME = "gah_member_session";
const OAUTH_STATE_COOKIE_NAME = "gah_oauth_state";
const MEMBER_SESSION_SECONDS = 60 * 60 * 2;
const MEMBER_RENEWAL_WINDOW_SECONDS = 60 * 30;
const OAUTH_STATE_SECONDS = 60 * 10;
const PATREON_AUTHORIZE_URL = "https://www.patreon.com/oauth2/authorize";
const PATREON_TOKEN_URL = "https://www.patreon.com/api/oauth2/token";
const PATREON_IDENTITY_URL = "https://www.patreon.com/api/oauth2/v2/identity";
const PATREON_PUBLIC_PROFILE_URL = "https://www.patreon.com/grokarchivehub";
const PATREON_PUBLIC_MEMBERSHIP_URL = "https://www.patreon.com/grokarchivehub/membership";
const DEFAULT_PATREON_SCOPE = "identity identity.memberships";
const MEMBERSHIP_TIER_MATRIX = [
  {
    id: "PATREON_TIER_READING_ROOM",
    label: "Reading Room",
    benefits: ["Early research releases", "Members-only operations briefings"]
  },
  {
    id: "PATREON_TIER_SOURCE_PACKETS",
    label: "Source Packets",
    benefits: ["Evidence ledgers and source packets", "Research-drop download access"]
  },
  {
    id: "PATREON_TIER_REQUEST_PRIORITY",
    label: "Request Priority",
    benefits: ["Investigation voting", "Prioritized archive and source requests"]
  }
];

const BARAK_RECEIPT_DETAIL_RECORDS = [
  {
    id: "barak-email-efta00559539",
    archiveId: "EFTA00559539",
    title: "EFTA00559539 archive message",
    sourceLane: "Emails · Meeting logistics message",
    laneType: "email",
    confidenceLabel: "L2 — Context Supported",
    sourceLink: "/barak/search?receipt=barak-email-efta00559539",
    indexedFrom: "Public Barak Receipts Index · barak-email-efta00559539",
    shows: "Source text references Jeffrey Epstein, Mr. Barak, and Nili Priell in meeting logistics message context.",
    doesNotProve: "This card does not establish purpose, attendance beyond the text, relationship, legal meaning, or conduct.",
    openSlots: ["PDF page not available in public index; source text lines 3–10 are the promoted context."]
  },
  {
    id: "barak-email-efta00366797",
    archiveId: "EFTA00366797",
    title: "EFTA00366797 archive message",
    sourceLane: "Emails · Meeting logistics message",
    laneType: "email",
    confidenceLabel: "L2 — Context Supported",
    sourceLink: "/barak/search?receipt=barak-email-efta00366797",
    indexedFrom: "Public Barak Receipts Index · barak-email-efta00366797",
    shows: "Source text references Jeffrey Epstein, Ehud Barak, and Kathy Ruemmler in meeting logistics message context.",
    doesNotProve: "This card does not establish purpose, attendance beyond the text, relationship, legal meaning, or conduct.",
    openSlots: ["Public index exposes promoted text lines only; full PDF/page context remains a source-chain check."]
  },
  {
    id: "barak-email-efta00322817",
    archiveId: "EFTA00322817",
    title: "EFTA00322817 archive message",
    sourceLane: "Emails · Contact-channel message",
    laneType: "email",
    confidenceLabel: "L2 — Context Supported",
    sourceLink: "/barak/search?receipt=barak-email-efta00322817",
    indexedFrom: "Public Barak Receipts Index · barak-email-efta00322817",
    shows: "Source text references Jeffrey Epstein, Ehud, and Nili Priell in contact-channel message context.",
    doesNotProve: "This card does not establish purpose, attendance beyond the text, relationship, legal meaning, or conduct.",
    openSlots: ["Sender/recipient metadata is redacted in the public index; full source context remains bounded by the promoted record."]
  },
  {
    id: "barak-pdf-efta00559539",
    archiveId: "EFTA00559539",
    title: "EFTA00559539 document receipt",
    sourceLane: "PDFs · PDF / extracted text slot",
    laneType: "pdf",
    confidenceLabel: "L2 — Context Supported",
    sourceLink: "/barak/search?receipt=barak-pdf-efta00559539",
    indexedFrom: "Public Barak Receipts Index · barak-pdf-efta00559539",
    shows: "Source text references Jeffrey Epstein, Mr. Barak, and Nili Priell in meeting logistics message context.",
    doesNotProve: "This card does not establish purpose, attendance, relationship, legal meaning, or conduct.",
    openSlots: ["Public reader link pending review; PDF bytes and local file paths are not exposed from the public index."]
  },
  {
    id: "barak-pdf-efta00389664",
    archiveId: "EFTA00389664",
    title: "EFTA00389664 document receipt",
    sourceLane: "PDFs · PDF / extracted text slot",
    laneType: "pdf",
    confidenceLabel: "L2 — Context Supported",
    sourceLink: "/barak/search?receipt=barak-pdf-efta00389664",
    indexedFrom: "Public Barak Receipts Index · barak-pdf-efta00389664",
    shows: "Source text references Ehud Barak and Bob Kerrey in calendar or schedule PDF context.",
    doesNotProve: "This card does not establish purpose, attendance, relationship, legal meaning, or conduct.",
    openSlots: ["Public reader link pending review; page context is limited to the promoted source text lines."]
  },
  {
    id: "barak-pdf-efta00473701",
    archiveId: "EFTA00473701",
    title: "EFTA00473701 document receipt",
    sourceLane: "Documents · PDF / extracted text slot",
    laneType: "document",
    confidenceLabel: "L2 — Context Supported",
    sourceLink: "/barak/search?receipt=barak-pdf-efta00473701",
    indexedFrom: "Public Barak Receipts Index · barak-pdf-efta00473701",
    shows: "Source text references Jeffrey Epstein, Steve Bannon, and Ehud Barak in calendar or schedule PDF context.",
    doesNotProve: "This card does not establish purpose, attendance, relationship, legal meaning, or conduct.",
    openSlots: ["Public reader link pending review; full source document context remains a source-chain check."]
  },
  {
    id: "barak-pdf-efta00404605",
    archiveId: "EFTA00404605",
    title: "EFTA00404605 document receipt",
    sourceLane: "Documents · PDF / extracted text slot",
    laneType: "document",
    confidenceLabel: "Open Receipt Slot",
    sourceLink: "/barak/search?receipt=barak-pdf-efta00404605",
    indexedFrom: "Public Barak Receipts Index · barak-pdf-efta00404605",
    shows: "The reviewed EFTA PDF manifest confirms a document receipt exists, but no public-safe text snippet has been promoted into this index.",
    doesNotProve: "This card does not establish purpose, attendance, relationship, legal meaning, or conduct.",
    openSlots: ["Date not isolated; entity not isolated; public reader link pending review."]
  },
  {
    id: "barak-media-audio-hebrew-workflow",
    archiveId: "BARAK-MEDIA-AUDIO-001",
    title: "Hebrew audio transcript review slot",
    sourceLane: "Media · Audio transcript workflow",
    laneType: "media",
    confidenceLabel: "Open Receipt Slot",
    sourceLink: "/barak/search?receipt=barak-media-audio-hebrew-workflow",
    indexedFrom: "Public Barak Receipts Index · barak-media-audio-hebrew-workflow",
    shows: "A media receipt slot exists in the portal workflow, but no public-safe transcript or caption has been promoted.",
    doesNotProve: "No transcript text, translation, speaker identity, image content, or conduct is inferred.",
    openSlots: ["Hebrew transcription, English translation, and review are modeled but not complete in the public index."]
  },
  {
    id: "barak-media-video-hebrew-workflow",
    archiveId: "BARAK-MEDIA-VIDEO-001",
    title: "Hebrew video transcript and subtitle review slot",
    sourceLane: "Media · Video transcript workflow",
    laneType: "media",
    confidenceLabel: "Open Receipt Slot",
    sourceLink: "/barak/search?receipt=barak-media-video-hebrew-workflow",
    indexedFrom: "Public Barak Receipts Index · barak-media-video-hebrew-workflow",
    shows: "Timestamped Hebrew transcript and English subtitle fields are ready, but no reviewed transcript is available in the public-safe build.",
    doesNotProve: "No transcript text, translation, speaker identity, image content, or conduct is inferred.",
    openSlots: ["Source media is not published from the public index; transcript review remains open."]
  },
  {
    id: "barak-media-photo-caption-slot",
    archiveId: "BARAK-MEDIA-PHOTO-001",
    title: "Photo and caption receipt review slot",
    sourceLane: "Media · Photo or caption workflow",
    laneType: "media",
    confidenceLabel: "Open Receipt Slot",
    sourceLink: "/barak/search?receipt=barak-media-photo-caption-slot",
    indexedFrom: "Public Barak Receipts Index · barak-media-photo-caption-slot",
    shows: "A generic picture-caption attachment was detected in staged archive discovery, but no image receipt is promoted.",
    doesNotProve: "No transcript text, translation, speaker identity, image content, or conduct is inferred.",
    openSlots: ["Caption, source, and related-document review remain open."]
  },
  {
    id: "barak-174-ehud-barak-01",
    archiveId: "BARAK-174-001",
    title: "Ehud Barak",
    sourceLane: "People / Entities · Schedule, email, meeting note, flight/logistics, lodging context, calendar entry",
    laneType: "entity",
    confidenceLabel: "L2 — Context Supported",
    sourceLink: "/barak/search?receipt=barak-174-ehud-barak-01",
    indexedFrom: "Public Barak Receipts Index · barak-174-ehud-barak-01",
    shows: "The name appears across the main Barak/Epstein logistics lane.",
    doesNotProve: "Purpose; attendance beyond record text; substance; legal meaning.",
    openSlots: ["Entity cards group reviewed references for navigation and may combine several source surfaces."]
  },
  {
    id: "barak-174-kathy-ruemmler-09",
    archiveId: "BARAK-174-009",
    title: "Kathy Ruemmler",
    sourceLane: "People / Entities · Email; meeting logistics",
    laneType: "entity",
    confidenceLabel: "L2 — Context Supported",
    sourceLink: "/barak/search?receipt=barak-174-kathy-ruemmler-09",
    indexedFrom: "Public Barak Receipts Index · barak-174-kathy-ruemmler-09",
    shows: "A meeting-logistics record references an invitation to sit with Ehud Barak at Jeffrey's home.",
    doesNotProve: "Attendance; discussion content; agreement; purpose.",
    openSlots: ["Appearance-only entity context; no conduct or legal conclusion is attached."]
  },
  {
    id: "barak-174-lesley-groff-10",
    archiveId: "BARAK-174-010",
    title: "Lesley Groff",
    sourceLane: "People / Entities · Email, schedule, meeting logistics, contact-channel note",
    laneType: "entity",
    confidenceLabel: "L2 — Context Supported",
    sourceLink: "/barak/search?receipt=barak-174-lesley-groff-10",
    indexedFrom: "Public Barak Receipts Index · barak-174-lesley-groff-10",
    shows: "Visit logistics, appointment timing, cancellation, private-line contact, and dinner follow-up contexts.",
    doesNotProve: "Purpose of the underlying meetings or contacts.",
    openSlots: ["Entity card is routing context; it does not merge all source surfaces into one conclusion."]
  },
  {
    id: "barak-171-slot-001",
    archiveId: "BARAK-171-SLOT-001",
    title: "Ehud Barak — PEOPLE metadata slot",
    sourceLane: "Open slots · PEOPLE · BOOK_OF_BLACK",
    laneType: "open-slot",
    confidenceLabel: "Open Receipt Slot",
    sourceLink: "/barak/search?receipt=barak-171-slot-001",
    indexedFrom: "Public Barak Receipts Index · barak-171-slot-001",
    shows: "Source row contains contact/address/phone metadata near Ehud Barak.",
    doesNotProve: "No physical presence, ownership, residency, attendance, or travel purpose is inferred.",
    openSlots: ["Discovery slot may reflect metadata, filename context, duplicate material, or a partial row."]
  },
  {
    id: "barak-171-slot-006",
    archiveId: "BARAK-171-SLOT-006",
    title: "Ehud Barak — PEOPLE name slot",
    sourceLane: "Open slots · PEOPLE · BOOK_OF_BLACK",
    laneType: "open-slot",
    confidenceLabel: "Open Receipt Slot",
    sourceLink: "/barak/search?receipt=barak-171-slot-006",
    indexedFrom: "Public Barak Receipts Index · barak-171-slot-006",
    shows: "Source row contains the name Ehud Barak.",
    doesNotProve: "No attendance, purpose, relationship, intent, culpability, or legal conclusion is inferred.",
    openSlots: ["Discovery slot requires source-chain review before any narrower use."]
  },
  {
    id: "barak-171-slot-067",
    archiveId: "BARAK-171-SLOT-067",
    title: "Bob Kerrey — PEOPLE name slot",
    sourceLane: "Open slots · PEOPLE · BOOK_OF_BLACK",
    laneType: "open-slot",
    confidenceLabel: "Open Receipt Slot",
    sourceLink: "/barak/search?receipt=barak-171-slot-067",
    indexedFrom: "Public Barak Receipts Index · barak-171-slot-067",
    shows: "Source row contains the name Bob Kerrey.",
    doesNotProve: "No attendance, purpose, relationship, intent, culpability, or legal conclusion is inferred.",
    openSlots: ["Discovery slot requires source-chain review before any narrower use."]
  }
];

const BARAK_RECEIPT_DETAIL_BY_ID = new Map(BARAK_RECEIPT_DETAIL_RECORDS.map((record) => [record.id, record]));
const BARAK_RECEIPT_DETAIL_BY_ARCHIVE_ID = new Map();
for (const record of BARAK_RECEIPT_DETAIL_RECORDS) {
  const existing = BARAK_RECEIPT_DETAIL_BY_ARCHIVE_ID.get(record.archiveId);
  if (existing) {
    existing.push(record);
  } else {
    BARAK_RECEIPT_DETAIL_BY_ARCHIVE_ID.set(record.archiveId, [record]);
  }
}

function cleanPath(pathname) {
  return pathname.replace(/\/+$/, "") || "/";
}

function withHeader(response, name, value) {
  const headers = new Headers(response.headers);
  headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function serveFrontdoor(request, env, assetPath = "") {
  let assetRequest = request;
  if (assetPath) {
    const assetUrl = new URL(request.url);
    assetUrl.pathname = assetPath;
    assetUrl.search = "";
    assetRequest = assetUrl.toString();
  }
  const response = await env.ASSETS.fetch(assetRequest);
  return withHeader(response, "X-Grok-Frontdoor", "GAH-FRONTDOOR-001");
}

function serveFrontdoorSiteJs() {
  return new Response(FRONTDOOR_SITE_JS, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=14400, must-revalidate",
      "X-Grok-Frontdoor": "GAH-FRONTDOOR-001",
      "X-GAH-Asset-Guard": "frontdoor-site-js"
    }
  });
}

async function serveFrontdoorAssetStrict(request, env, path) {
  if (path === "/frontdoor/site.js") {
    return serveFrontdoorSiteJs();
  }
  const response = await serveFrontdoor(request, env);
  const contentType = response.headers.get("Content-Type") || "";
  if ((path.startsWith("/frontdoor/") || path.startsWith("/source-renders/")) && contentType.toLowerCase().includes("text/html")) {
    return new Response("Frontdoor asset not found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Grok-Frontdoor": "GAH-FRONTDOOR-001",
        "X-GAH-Asset-Guard": "html-fallback-blocked"
      }
    });
  }
  return response;
}

async function serveEvidenceAssetStrict(request, env, path) {
  const response = await serveFrontdoor(request, env);
  const contentType = response.headers.get("Content-Type") || "";
  if ((path.startsWith("/evidence-engine/v1/") || path.startsWith("/evidence-data/")) && contentType.toLowerCase().includes("text/html")) {
    return new Response("Evidence asset not found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Grok-Frontdoor": "GAH-FRONTDOOR-001",
        "X-GAH-Asset-Guard": "evidence-html-fallback-blocked"
      }
    });
  }
  return response;
}

function isBirthdayBookEvidencePath(path) {
  return path === "/research/evidence/birthday-book" || path.startsWith("/research/evidence/birthday-book/");
}

async function proxyProofLayer(request) {
  const target = new URL(request.url);
  target.protocol = "https:";
  target.hostname = "wiki.grokarchivehub.com";
  target.port = "";

  const upstream = await fetch(new Request(target.toString(), request));
  return withHeader(upstream, "X-GAH-Apex-Proxy", "wiki.grokarchivehub.com");
}

async function serveEpsteinEvidenceWithReaderReturn(request) {
  const freshUrl = new URL(request.url);
  freshUrl.searchParams.set("gah_origin_fresh", `GAH-NAVIGATION-REPAIR-002-${Date.now()}`);
  const upstream = await proxyProofLayer(new Request(freshUrl.toString(), request));
  const contentType = upstream.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().includes("text/html")) return upstream;

  let body = await upstream.text();
  const returnBlock = `
<section style="max-width:1120px;margin:24px auto;padding:18px;border:1px solid rgba(245,158,11,.35);border-radius:18px;background:rgba(15,23,42,.82);font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e7eb">
  <p style="margin:0 0 8px;color:#facc15;font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase">Reader path · Proof layer</p>
  <h2 style="margin:0 0 8px;font-size:22px;line-height:1.2">Use this page as evidence, then return to the story.</h2>
  <p style="margin:0 0 14px;color:#cbd5e1">This evidence page is the proof layer for the Epstein death dispatch. It preserves source lanes and receipt limits; the parent story gives the narrative reading order.</p>
  <div style="display:flex;flex-wrap:wrap;gap:10px">
    <a href="/dispatches/epstein-death" style="display:inline-block;min-height:44px;padding:12px 16px;border-radius:999px;background:#facc15;color:#111827;font-weight:900;text-decoration:none">Return to parent story</a>
    <a href="/dispatches/epstein-mcc-timeline" style="display:inline-block;min-height:44px;padding:12px 16px;border-radius:999px;border:1px solid rgba(250,204,21,.55);color:#fef3c7;font-weight:850;text-decoration:none">Read related MCC story</a>
    <a href="/research-index" style="display:inline-block;min-height:44px;padding:12px 16px;border-radius:999px;border:1px solid rgba(148,163,184,.45);color:#e5e7eb;font-weight:850;text-decoration:none">Return to Research Index</a>
  </div>
</section>`;

  if (!body.includes("GAH-NAVIGATION-REPAIR-002")) {
    body = body.includes("<main")
      ? body.replace(/(<main[^>]*>)/i, `$1\n${returnBlock}`)
      : body.includes("<body")
        ? body.replace(/(<body[^>]*>)/i, `$1\n${returnBlock}`)
        : `${returnBlock}\n${body}`;
  }

  const headers = new Headers(upstream.headers);
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("X-GAH-Navigation-Repair", "GAH-NAVIGATION-REPAIR-002");
  headers.delete("Content-Length");
  return new Response(body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers
  });
}

async function serveSitemapWithPublishedDispatches(request) {
  const entries = [
    ...CORE_SITEMAP_ENTRIES,
    ...TRUST_SITEMAP_ENTRIES,
    ["https://grokarchivehub.com/dispatches/epstein-death", "2026-06-25"],
    [MCC_TIMELINE_SITEMAP_URL, MCC_TIMELINE_LASTMOD],
    [JAIL_LOGS_SITEMAP_URL, JAIL_LOGS_LASTMOD],
    [EFTA_GUIDE_SITEMAP_URL, EFTA_GUIDE_LASTMOD],
    [AUG8_COLON_MIRO_SITEMAP_URL, AUG8_COLON_MIRO_LASTMOD],
    [OPEN_RECEIPT_SLOTS_SITEMAP_URL, OPEN_RECEIPT_SLOTS_LASTMOD],
    [FARA_LEADS_SITEMAP_URL, FARA_LEADS_LASTMOD],
    [HOW_TO_READ_BARAK_SITEMAP_URL, HOW_TO_READ_BARAK_LASTMOD],
    [VISUAL_EVIDENCE_SITEMAP_URL, VISUAL_EVIDENCE_LASTMOD],
    [REDACTED_FILES_SITEMAP_URL, REDACTED_FILES_LASTMOD],
    ...METHODOLOGY_SITEMAP_ENTRIES,
    [BARAK_SOURCE_MAP_SITEMAP_URL, BARAK_SOURCE_MAP_LASTMOD],
    [BARAK_RECEIPTS_SITEMAP_URL, BARAK_RECEIPTS_LASTMOD],
    [BARAK_ENTITIES_SITEMAP_URL, BARAK_ENTITIES_LASTMOD],
    [BARAK_TIMELINE_SITEMAP_URL, BARAK_TIMELINE_LASTMOD],
    [BARAK_FARA_REVIEW_SITEMAP_URL, BARAK_FARA_REVIEW_LASTMOD],
    ...BARAK_RECEIPT_DETAIL_RECORDS.map((record) => [
      `https://grokarchivehub.com/barak/receipts/${record.id}`,
      BARAK_RECEIPT_DETAIL_LASTMOD
    ])
  ];
  const seen = new Set();
  const urlEntries = entries
    .filter(([loc]) => {
      if (seen.has(loc)) return false;
      seen.add(loc);
      return true;
    })
    .map(([loc, lastmod]) => `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`)
    .join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>\n`;
  const headers = new Headers();
  headers.set("Content-Type", "application/xml; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("X-GAH-Sitemap-AdSense-Cleanup", "strong-public-pages-only");
  headers.set("X-GAH-Sitemap-MCC-Timeline", "published");
  headers.set("X-GAH-Sitemap-Jail-Logs", "published");
  headers.set("X-GAH-Sitemap-EFTA-Guide", "published");
  headers.set("X-GAH-Sitemap-Aug8-Colon-Miro", "published");
  headers.set("X-GAH-Sitemap-Open-Receipt-Slots", "published");
  headers.set("X-GAH-Sitemap-FARA-Leads", "published");
  headers.set("X-GAH-Sitemap-Visual-Evidence", "published");
  headers.set("X-GAH-Sitemap-Redacted-Files", "published");
  headers.set("X-GAH-Sitemap-Barak-Source-Map", "published");
  headers.set("X-GAH-Sitemap-Barak-Receipts", "published");
  headers.set("X-GAH-Sitemap-Barak-Entities", "published");
  headers.set("X-GAH-Sitemap-Barak-Timeline", "published");
  headers.set("X-GAH-Sitemap-Barak-Receipt-Details", "published");
  headers.set("X-GAH-Sitemap-Barak-FARA-Review", "published");
  headers.set("X-GAH-Sitemap-Trust-Pages", "published");
  headers.set("X-GAH-Sitemap-Reading-Room", "excluded-noindex-workbench");
  return new Response(body, {
    status: 200,
    headers
  });
}

async function serveBarakPortalWithReviewLinks(request) {
  const freshUrl = new URL(request.url);
  freshUrl.searchParams.set("gah_origin_fresh", `GAH-BARAK-SOURCE-MAP-001-${Date.now()}`);
  const upstream = await proxyProofLayer(new Request(freshUrl.toString(), request));
  const contentType = upstream.headers.get("Content-Type") || "";
  if (!contentType.includes("text/html")) return upstream;

  let body = await upstream.text();
  if (!body.includes("/dispatches/how-to-read-the-barak-records") || !body.includes("/barak/source-map") || !body.includes("/barak/receipts") || !body.includes("/barak/entities") || !body.includes("/barak/timeline") || !body.includes("/barak/fara-review")) {
    const linkBlock = `
<section style="margin:24px auto;padding:20px;max-width:1040px;border:1px solid rgba(231,197,108,.35);border-radius:12px;background:rgba(231,197,108,.06);font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e8ecef">
  <p style="margin:0 0 8px;color:#e7c56c;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">Reader controls</p>
  <h2 style="margin:0 0 10px;font-size:24px;line-height:1.2">Barak Source Map, Receipts, Entities, Timeline &amp; FARA Review</h2>
  <p style="margin:0 0 14px;color:#c6ccd0">Start with the source map to identify record type, open the receipts index to inspect actual source-linked cards, use the People and Entity Index to slow identity claims down, check chronology in the Timeline Index, then use the FARA review index to track review signals without turning records into legal conclusions.</p>
  <div style="display:flex;flex-wrap:wrap;gap:10px">
    <a href="/dispatches/how-to-read-the-barak-records" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#e7c56c;color:#141007;font-weight:800;text-decoration:none">Read the Barak Reader Guide</a>
    <a href="/barak/source-map" style="display:inline-block;padding:10px 14px;border-radius:8px;border:1px solid rgba(231,197,108,.6);color:#e8ecef;font-weight:800;text-decoration:none">Open Barak Source Map</a>
    <a href="/barak/receipts" style="display:inline-block;padding:10px 14px;border-radius:8px;border:1px solid rgba(231,197,108,.6);color:#e8ecef;font-weight:800;text-decoration:none">Open Receipts Index</a>
    <a href="/barak/entities" style="display:inline-block;padding:10px 14px;border-radius:8px;border:1px solid rgba(231,197,108,.6);color:#e8ecef;font-weight:800;text-decoration:none">Open People / Entity Index</a>
    <a href="/barak/timeline" style="display:inline-block;padding:10px 14px;border-radius:8px;border:1px solid rgba(231,197,108,.6);color:#e8ecef;font-weight:800;text-decoration:none">Open Timeline Index</a>
    <a href="/barak/fara-review" style="display:inline-block;padding:10px 14px;border-radius:8px;border:1px solid rgba(231,197,108,.6);color:#e8ecef;font-weight:800;text-decoration:none">Open FARA Review Index</a>
  </div>
</section>`;
    body = body.includes("</main>")
      ? body.replace("</main>", `${linkBlock}\n</main>`)
      : body.includes("</body>")
        ? body.replace("</body>", `${linkBlock}\n</body>`)
        : `${body}${linkBlock}`;
  }

  const headers = new Headers(upstream.headers);
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("X-GAH-Barak-Source-Map-Link", "published");
  headers.set("X-GAH-Barak-Receipts-Link", "published");
  headers.set("X-GAH-Barak-Entities-Link", "published");
  headers.set("X-GAH-Barak-Timeline-Link", "published");
  headers.set("X-GAH-Barak-FARA-Review-Link", "published");
  headers.delete("Content-Length");
  return new Response(body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const TEXT_ENCODER = new TextEncoder();
const MD5_K = Array.from({ length: 64 }, (_, index) => Math.floor(Math.abs(Math.sin(index + 1)) * 4294967296) >>> 0);
const MD5_S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
];

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomBase64Url(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

async function sha256Hex(value) {
  const bytes = typeof value === "string" ? TEXT_ENCODER.encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(digest));
}

async function hmacSha256Hex(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    TEXT_ENCODER.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const bytes = typeof value === "string" ? TEXT_ENCODER.encode(value) : value;
  const signature = await crypto.subtle.sign("HMAC", key, bytes);
  return bytesToHex(new Uint8Array(signature));
}

function rotateLeft32(value, amount) {
  return ((value << amount) | (value >>> (32 - amount))) >>> 0;
}

function md5Bytes(messageBytes) {
  const input = Array.from(messageBytes);
  const bitLength = input.length * 8;
  input.push(0x80);
  while (input.length % 64 !== 56) input.push(0);
  for (let i = 0; i < 8; i += 1) {
    input.push(Math.floor(bitLength / (2 ** (8 * i))) & 0xff);
  }

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let offset = 0; offset < input.length; offset += 64) {
    const words = [];
    for (let index = 0; index < 16; index += 1) {
      const base = offset + index * 4;
      words[index] = (input[base] | (input[base + 1] << 8) | (input[base + 2] << 16) | (input[base + 3] << 24)) >>> 0;
    }

    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;

    for (let i = 0; i < 64; i += 1) {
      let f;
      let g;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }
      const previousD = d;
      d = c;
      c = b;
      b = (b + rotateLeft32((a + f + MD5_K[i] + words[g]) >>> 0, MD5_S[i])) >>> 0;
      a = previousD;
    }

    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }

  const output = new Uint8Array(16);
  [a0, b0, c0, d0].forEach((word, wordIndex) => {
    output[wordIndex * 4] = word & 0xff;
    output[wordIndex * 4 + 1] = (word >>> 8) & 0xff;
    output[wordIndex * 4 + 2] = (word >>> 16) & 0xff;
    output[wordIndex * 4 + 3] = (word >>> 24) & 0xff;
  });
  return output;
}

function hmacMd5Hex(secret, body) {
  let key = TEXT_ENCODER.encode(secret);
  if (key.length > 64) key = md5Bytes(key);
  const paddedKey = new Uint8Array(64);
  paddedKey.set(key);
  const innerPad = new Uint8Array(64);
  const outerPad = new Uint8Array(64);
  for (let i = 0; i < 64; i += 1) {
    innerPad[i] = paddedKey[i] ^ 0x36;
    outerPad[i] = paddedKey[i] ^ 0x5c;
  }
  const bodyBytes = typeof body === "string" ? TEXT_ENCODER.encode(body) : body;
  const inner = new Uint8Array(innerPad.length + bodyBytes.length);
  inner.set(innerPad);
  inner.set(bodyBytes, innerPad.length);
  const innerHash = md5Bytes(inner);
  const outer = new Uint8Array(outerPad.length + innerHash.length);
  outer.set(outerPad);
  outer.set(innerHash, outerPad.length);
  return bytesToHex(md5Bytes(outer));
}

function timingSafeEqualText(left, right) {
  const a = String(left || "");
  const b = String(right || "");
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function parseCookies(request) {
  const raw = request.headers.get("Cookie") || "";
  const cookies = new Map();
  raw.split(";").forEach((part) => {
    const index = part.indexOf("=");
    if (index === -1) return;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name) cookies.set(name, value);
  });
  return cookies;
}

function secureCookie(name, value, maxAgeSeconds) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.max(0, maxAgeSeconds)}`;
}

function clearSecureCookie(name) {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

async function signedValue(env, value) {
  const signature = await hmacSha256Hex(env.MEMBER_SESSION_SIGNING_KEY, value);
  return `${value}.${signature}`;
}

async function verifySignedValue(env, signed) {
  const raw = String(signed || "");
  const index = raw.lastIndexOf(".");
  if (index <= 0) return null;
  const value = raw.slice(0, index);
  const signature = raw.slice(index + 1);
  const expected = await hmacSha256Hex(env.MEMBER_SESSION_SIGNING_KEY, value);
  return timingSafeEqualText(signature, expected) ? value : null;
}

function nowIso() {
  return new Date().toISOString();
}

function isoPlusSeconds(seconds) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function redirectResponse(location, headers = {}) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Location", location);
  responseHeaders.set("Cache-Control", "no-store");
  responseHeaders.set("X-GAH-Membership-Portal", "staging");
  return new Response(null, { status: 302, headers: responseHeaders });
}

function configuredAllowedTierIds(env) {
  return String(env.PATREON_ALLOWED_TIER_IDS || "")
    .split(",")
    .map((tierId) => tierId.trim())
    .filter(Boolean);
}

function parseTierIds(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch (_) {
    return [];
  }
}

function membershipSetupMissing(env, mode = "protected") {
  const missing = [];
  if (!env.MEMBERS_DB || typeof env.MEMBERS_DB.prepare !== "function") missing.push("Bind D1 as MEMBERS_DB");
  if (!env.MEMBER_SESSION_SIGNING_KEY) missing.push("Add encrypted secret MEMBER_SESSION_SIGNING_KEY");
  if (mode === "oauth" || mode === "all") {
    if (!env.PATREON_CLIENT_ID) missing.push("Add encrypted secret PATREON_CLIENT_ID");
    if (!env.PATREON_CLIENT_SECRET) missing.push("Add encrypted secret PATREON_CLIENT_SECRET");
  }
  if (!configuredAllowedTierIds(env).length) missing.push("Add encrypted secret PATREON_ALLOWED_TIER_IDS with real Patreon tier IDs");
  return missing;
}

function htmlResponse(body, status = 200, extraHeaders = {}) {
  const headers = new Headers(extraHeaders);
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("X-GAH-Membership-Portal", "staging");
  return new Response(body, { status, headers });
}

function setupGapsHtml(title, gaps) {
  const items = gaps.map((gap) => `<li>${escapeHtml(gap)}</li>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)} | Grok Archive Hub</title>
  <meta name="robots" content="noindex,nofollow">
  <link rel="stylesheet" href="/frontdoor/site.css">
</head>
<body>
  <main class="page-shell">
    <section class="page-hero">
      <p class="eyebrow">Member portal staging</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="lede">Protected member access is disabled until the owner finishes Patreon, D1, and encrypted secret setup.</p>
      <div class="button-row"><a class="button primary" href="/membership">Return to Membership</a><a class="button" href="/search">Search Public Archive</a></div>
    </section>
    <article class="content">
      <div class="notice red"><p><strong>Fail-closed:</strong> no protected content was served.</p></div>
      <h2>Required setup</h2>
      <ul class="clean-list">${items}</ul>
    </article>
  </main>
</body>
</html>`;
}

function entitlementStatus(member, env) {
  const status = String(member?.membership_status || "unavailable");
  if (status !== "active_patron") return { ok: false, reason: status };
  const tierIds = parseTierIds(member?.entitled_tier_ids);
  const allowed = configuredAllowedTierIds(env);
  if (!allowed.length) return { ok: false, reason: "tier_config_missing" };
  if (!tierIds.length) return { ok: false, reason: "no_entitled_tiers" };
  const matchedTierIds = tierIds.filter((tierId) => allowed.includes(tierId));
  if (!matchedTierIds.length) return { ok: false, reason: "wrong_tier", tierIds };
  return { ok: true, reason: "active_entitled", tierIds, matchedTierIds };
}

async function auditMembershipEvent(env, eventType, details = {}) {
  if (!env.MEMBERS_DB || typeof env.MEMBERS_DB.prepare !== "function") return;
  try {
    await env.MEMBERS_DB.prepare(
      "INSERT INTO membership_audit_events (patreon_user_id, event_type, route, created_at, detail) VALUES (?, ?, ?, ?, ?)"
    ).bind(
      details.patreonUserId || null,
      eventType,
      details.route || null,
      nowIso(),
      JSON.stringify(details.detail || {})
    ).run();
  } catch (_) {
    // Audit failure must not leak internals or open access.
  }
}

async function upsertPatreonMember(env, entitlement, timestamps = {}) {
  const current = nowIso();
  await env.MEMBERS_DB.prepare(
    `INSERT INTO patreon_members (
      patreon_user_id, membership_status, entitled_tier_ids, first_synced_at,
      last_synced_at, last_login_at, last_resync_at, last_webhook_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(patreon_user_id) DO UPDATE SET
      membership_status=excluded.membership_status,
      entitled_tier_ids=excluded.entitled_tier_ids,
      last_synced_at=excluded.last_synced_at,
      last_login_at=COALESCE(excluded.last_login_at, patreon_members.last_login_at),
      last_resync_at=COALESCE(excluded.last_resync_at, patreon_members.last_resync_at),
      last_webhook_at=COALESCE(excluded.last_webhook_at, patreon_members.last_webhook_at)`
  ).bind(
    entitlement.patreonUserId,
    entitlement.membershipStatus || "unavailable",
    JSON.stringify(entitlement.tierIds || []),
    current,
    current,
    timestamps.login ? current : null,
    timestamps.resync ? current : null,
    timestamps.webhook ? current : null
  ).run();
}

async function createMemberSession(env, patreonUserId) {
  const sessionId = randomBase64Url(32);
  const sessionHash = await sha256Hex(sessionId);
  const issuedAt = nowIso();
  const expiresAt = isoPlusSeconds(MEMBER_SESSION_SECONDS);
  await env.MEMBERS_DB.prepare(
    "INSERT INTO member_sessions (session_id_hash, patreon_user_id, issued_at, expires_at, renewed_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(sessionHash, patreonUserId, issuedAt, expiresAt, issuedAt, null).run();
  return {
    cookieValue: await signedValue(env, sessionId),
    expiresAt
  };
}

async function getMemberSession(request, env) {
  const setupMissing = membershipSetupMissing(env, "protected");
  if (setupMissing.length) return { ok: false, reason: "setup_missing", setupMissing };
  const signed = parseCookies(request).get(MEMBER_COOKIE_NAME);
  const sessionId = await verifySignedValue(env, signed);
  if (!sessionId) return { ok: false, reason: "missing_session" };
  const sessionHash = await sha256Hex(sessionId);
  const row = await env.MEMBERS_DB.prepare(
    `SELECT
      s.session_id_hash, s.patreon_user_id, s.issued_at, s.expires_at, s.renewed_at, s.revoked_at,
      m.membership_status, m.entitled_tier_ids, m.first_synced_at, m.last_synced_at,
      m.last_login_at, m.last_resync_at, m.last_webhook_at
    FROM member_sessions s
    JOIN patreon_members m ON m.patreon_user_id = s.patreon_user_id
    WHERE s.session_id_hash = ?
    LIMIT 1`
  ).bind(sessionHash).first();
  if (!row || row.revoked_at) return { ok: false, reason: "revoked_session" };
  if (Date.parse(row.expires_at) <= Date.now()) {
    await env.MEMBERS_DB.prepare("UPDATE member_sessions SET revoked_at = ? WHERE session_id_hash = ?")
      .bind(nowIso(), sessionHash).run();
    return { ok: false, reason: "expired_session" };
  }
  const entitlement = entitlementStatus(row, env);
  if (!entitlement.ok) {
    await auditMembershipEvent(env, "member_access_denied", {
      patreonUserId: row.patreon_user_id,
      route: new URL(request.url).pathname,
      detail: { reason: entitlement.reason }
    });
    return { ok: false, reason: entitlement.reason, member: row };
  }

  let renewalCookie = "";
  if ((Date.parse(row.expires_at) - Date.now()) / 1000 < MEMBER_RENEWAL_WINDOW_SECONDS) {
    const renewedAt = nowIso();
    const expiresAt = isoPlusSeconds(MEMBER_SESSION_SECONDS);
    await env.MEMBERS_DB.prepare("UPDATE member_sessions SET renewed_at = ?, expires_at = ? WHERE session_id_hash = ?")
      .bind(renewedAt, expiresAt, sessionHash).run();
    renewalCookie = secureCookie(MEMBER_COOKIE_NAME, await signedValue(env, sessionId), MEMBER_SESSION_SECONDS);
    row.expires_at = expiresAt;
    row.renewed_at = renewedAt;
  }

  return { ok: true, member: row, entitlement, sessionHash, renewalCookie };
}

function safeReturnPath(value) {
  const raw = String(value || "/members");
  if (!raw.startsWith("/")) return "/members";
  if (raw.startsWith("//")) return "/members";
  if (!raw.startsWith("/members")) return "/members";
  return raw;
}

function patreonRedirectUri(request, env) {
  return env.PATREON_REDIRECT_URI || `${new URL(request.url).origin}/auth/patreon/callback`;
}

async function startPatreonOAuth(request, env) {
  const setupMissing = membershipSetupMissing(env, "oauth");
  if (setupMissing.length) return htmlResponse(setupGapsHtml("Owner setup required", setupMissing), 503);
  const requestUrl = new URL(request.url);
  const returnTo = safeReturnPath(requestUrl.searchParams.get("return_to"));
  const state = randomBase64Url(32);
  const stateHash = await sha256Hex(state);
  const createdAt = nowIso();
  const expiresAt = isoPlusSeconds(OAUTH_STATE_SECONDS);
  await env.MEMBERS_DB.prepare(
    "INSERT INTO oauth_states (state_hash, return_to, created_at, expires_at, used_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(stateHash, returnTo, createdAt, expiresAt, null).run();

  const authUrl = new URL(PATREON_AUTHORIZE_URL);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", env.PATREON_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", patreonRedirectUri(request, env));
  authUrl.searchParams.set("scope", env.PATREON_OAUTH_SCOPE || DEFAULT_PATREON_SCOPE);
  authUrl.searchParams.set("state", state);

  const response = redirectResponse(authUrl.toString());
  response.headers.append("Set-Cookie", secureCookie(OAUTH_STATE_COOKIE_NAME, await signedValue(env, state), OAUTH_STATE_SECONDS));
  await auditMembershipEvent(env, "oauth_started", { route: requestUrl.pathname, detail: { returnTo } });
  return response;
}

async function exchangePatreonCode(request, env, code) {
  const body = new URLSearchParams();
  body.set("code", code);
  body.set("grant_type", "authorization_code");
  body.set("client_id", env.PATREON_CLIENT_ID);
  body.set("client_secret", env.PATREON_CLIENT_SECRET);
  body.set("redirect_uri", patreonRedirectUri(request, env));
  const response = await fetch(PATREON_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Grok Archive Hub - Membership Worker"
    },
    body
  });
  if (!response.ok) throw new Error(`patreon_token_${response.status}`);
  return response.json();
}

async function fetchPatreonIdentity(accessToken) {
  const identityUrl = new URL(PATREON_IDENTITY_URL);
  identityUrl.searchParams.set("include", "memberships,memberships.currently_entitled_tiers");
  identityUrl.searchParams.set("fields[member]", "patron_status,last_charge_status,currently_entitled_amount_cents");
  identityUrl.searchParams.set("fields[tier]", "title,amount_cents,url");
  const response = await fetch(identityUrl.toString(), {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "User-Agent": "Grok Archive Hub - Membership Worker"
    }
  });
  if (!response.ok) throw new Error(`patreon_identity_${response.status}`);
  return response.json();
}

function includedResource(payload, type, id) {
  return (payload.included || []).find((resource) => resource.type === type && resource.id === id);
}

function entitlementFromIdentity(payload, env) {
  const userId = payload?.data?.id;
  const membershipRefs = payload?.data?.relationships?.memberships?.data || [];
  const memberships = membershipRefs
    .map((ref) => includedResource(payload, "member", ref.id))
    .filter(Boolean);
  const selected = env.PATREON_CAMPAIGN_ID
    ? memberships.find((member) => member?.relationships?.campaign?.data?.id === env.PATREON_CAMPAIGN_ID)
    : memberships[0];
  const tierRefs = selected?.relationships?.currently_entitled_tiers?.data || [];
  return {
    patreonUserId: userId,
    membershipStatus: selected?.attributes?.patron_status || "unavailable",
    tierIds: tierRefs.map((tier) => String(tier.id)).filter(Boolean)
  };
}

async function handlePatreonCallback(request, env) {
  const setupMissing = membershipSetupMissing(env, "oauth");
  if (setupMissing.length) return htmlResponse(setupGapsHtml("Owner setup required", setupMissing), 503);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const cookieState = await verifySignedValue(env, parseCookies(request).get(OAUTH_STATE_COOKIE_NAME));
  if (error) {
    await auditMembershipEvent(env, "oauth_denied", { route: url.pathname, detail: { error } });
    return htmlResponse(memberDeniedHtml("Patreon sign-in was not completed.", "oauth_denied"), 403, {
      "Set-Cookie": clearSecureCookie(OAUTH_STATE_COOKIE_NAME)
    });
  }
  if (!code || !state || !cookieState || state !== cookieState) {
    await auditMembershipEvent(env, "oauth_state_failed", { route: url.pathname, detail: { reason: "state_mismatch" } });
    return htmlResponse(memberDeniedHtml("OAuth state check failed.", "state_mismatch"), 400, {
      "Set-Cookie": clearSecureCookie(OAUTH_STATE_COOKIE_NAME)
    });
  }

  const stateHash = await sha256Hex(state);
  const stateRow = await env.MEMBERS_DB.prepare("SELECT state_hash, return_to, expires_at, used_at FROM oauth_states WHERE state_hash = ? LIMIT 1")
    .bind(stateHash).first();
  if (!stateRow || stateRow.used_at || Date.parse(stateRow.expires_at) <= Date.now()) {
    await auditMembershipEvent(env, "oauth_state_replay_or_expired", { route: url.pathname, detail: { hasStateRow: Boolean(stateRow) } });
    return htmlResponse(memberDeniedHtml("This Patreon callback is expired or already used.", "replayed_oauth_callback"), 400, {
      "Set-Cookie": clearSecureCookie(OAUTH_STATE_COOKIE_NAME)
    });
  }
  await env.MEMBERS_DB.prepare("UPDATE oauth_states SET used_at = ? WHERE state_hash = ? AND used_at IS NULL")
    .bind(nowIso(), stateHash).run();

  try {
    const token = await exchangePatreonCode(request, env, code);
    const identity = await fetchPatreonIdentity(token.access_token);
    const entitlement = entitlementFromIdentity(identity, env);
    if (!entitlement.patreonUserId) throw new Error("missing_patreon_user_id");
    await upsertPatreonMember(env, entitlement, { login: true, resync: url.searchParams.get("resync") === "1" });
    const entitlementCheck = entitlementStatus({
      membership_status: entitlement.membershipStatus,
      entitled_tier_ids: JSON.stringify(entitlement.tierIds)
    }, env);
    if (!entitlementCheck.ok) {
      await auditMembershipEvent(env, "member_login_denied", {
        patreonUserId: entitlement.patreonUserId,
        route: url.pathname,
        detail: { reason: entitlementCheck.reason }
      });
      return htmlResponse(memberDeniedHtml("Patreon membership is not currently entitled for this portal.", entitlementCheck.reason), 403, {
        "Set-Cookie": clearSecureCookie(OAUTH_STATE_COOKIE_NAME)
      });
    }
    const session = await createMemberSession(env, entitlement.patreonUserId);
    await auditMembershipEvent(env, "member_login_allowed", {
      patreonUserId: entitlement.patreonUserId,
      route: url.pathname,
      detail: { tierIds: entitlementCheck.matchedTierIds }
    });
    const response = redirectResponse(safeReturnPath(stateRow.return_to));
    response.headers.append("Set-Cookie", clearSecureCookie(OAUTH_STATE_COOKIE_NAME));
    response.headers.append("Set-Cookie", secureCookie(MEMBER_COOKIE_NAME, session.cookieValue, MEMBER_SESSION_SECONDS));
    return response;
  } catch (error) {
    await auditMembershipEvent(env, "patreon_api_unavailable", { route: url.pathname, detail: { reason: error.message } });
    return htmlResponse(memberDeniedHtml("Patreon membership could not be verified right now.", "patreon_api_unavailable"), 503, {
      "Set-Cookie": clearSecureCookie(OAUTH_STATE_COOKIE_NAME)
    });
  }
}

function memberDeniedHtml(message, reason) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Member Access Check | Grok Archive Hub</title>
  <meta name="robots" content="noindex,nofollow">
  <link rel="stylesheet" href="/frontdoor/site.css">
</head>
<body>
  <main class="page-shell">
    <section class="page-hero">
      <p class="eyebrow">Member portal</p>
      <h1>Access not available.</h1>
      <p class="lede">${escapeHtml(message)}</p>
      <div class="button-row">
        <a class="button primary" href="/auth/patreon/start?return_to=/members">Sign in with Patreon</a>
        <a class="button" href="/membership">View Membership</a>
        <a class="button" href="/search">Search Public Archive</a>
      </div>
    </section>
    <article class="content">
      <div class="notice red"><p><strong>Reason:</strong> ${escapeHtml(reason)}. Public evidence pages, SEO stories, primary-source pages, archive search, and public dispatches remain available.</p></div>
    </article>
  </main>
</body>
</html>`;
}

function memberChrome(title, activePath, member, innerHtml) {
  const nav = [
    ["/members", "Portal"],
    ["/members/research-drops", "Research Drops"],
    ["/members/downloads", "Downloads"],
    ["/members/requests", "Requests"],
    ["/members/account", "Account"]
  ].map(([href, label]) => `<a data-route-link href="${href}"${href === activePath ? " aria-current=\"page\"" : ""}>${label}</a>`).join("");
  const tierIds = parseTierIds(member.entitled_tier_ids);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)} | Members | Grok Archive Hub</title>
  <meta name="robots" content="noindex,nofollow">
  <link rel="stylesheet" href="/frontdoor/site.css">
</head>
<body data-page="members">
  <header class="site-header">
    <div class="nav-shell">
      <a class="brand" href="/"><span class="brand-mark">GA</span><span>Grok Archive Hub</span></a>
      <button class="menu-button" type="button" data-menu-button aria-expanded="false">Menu</button>
      <nav class="nav-links" data-nav-links>
        <a href="/start">Start Here</a>
        <a href="/dispatches">Dispatches</a>
        <a href="/archive">Archive</a>
        <a href="/search">Search</a>
        ${nav}
      </nav>
    </div>
  </header>
  <main class="page-shell">
    <section class="page-hero">
      <p class="eyebrow">Member portal · Staging</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="lede">Patreon status is checked server-side for every protected route. Public proof remains outside the paywall.</p>
      <div class="button-row">
        <a class="button primary" href="/members">Member Home</a>
        <a class="button" href="/search">Public Archive Search</a>
        <a class="button" href="/dispatches">Public Dispatches</a>
      </div>
    </section>
    <article class="content wide">
      <div class="notice"><p><strong>Status:</strong> ${escapeHtml(member.membership_status)} · <strong>Entitled tier IDs:</strong> ${escapeHtml(tierIds.join(", ") || "none")} · <strong>Last sync:</strong> ${escapeHtml(member.last_synced_at || "not recorded")}</p></div>
      ${innerHtml}
    </article>
  </main>
  <footer class="site-footer"><div class="page-shell"><nav class="footer-links"><a href="/membership">Membership</a><a href="/privacy">Privacy</a><a href="/contact">Contact / Source Tips</a><a href="/search">Public Search</a></nav><p class="disclaimer">Member tools do not remove, hide, or paywall public evidence.</p></div></footer>
  <script src="/frontdoor/site.js"></script>
</body>
</html>`;
}

function portalRouteHtml(path, member) {
  if (path === "/members/research-drops") {
    return memberChrome("Research Drops", path, member, `
      <h2>Early Research Releases</h2>
      <div class="prose-grid">
        <div class="info-card"><span class="badge receipt">Early</span><h3>Receipt-drop previews</h3><p>Staged summaries of source checks before public dispatch packaging. These are workflow notes, not final public claims.</p></div>
        <div class="info-card"><span class="badge open">Operations</span><h3>Briefing notes</h3><p>Members-only operations briefings on what is being checked, what remains unresolved, and what public proof still needs.</p></div>
      </div>
      <div class="notice"><p>Public evidence, SEO stories, archive pages, and primary-source records stay public. Early notes can become public when they are source-safe.</p></div>`);
  }
  if (path === "/members/downloads") {
    return memberChrome("Downloads", path, member, `
      <h2>Evidence Ledgers and Source Packets</h2>
      <div class="prose-grid">
        <div class="info-card"><span class="badge receipt">Ledger</span><h3>Source-ledger packets</h3><p>Download slots for member versions of evidence ledgers, source maps, and review packets after each packet is cleared for member distribution.</p></div>
        <div class="info-card"><span class="badge open">Boundary</span><h3>No hidden proof promise</h3><p>Downloads do not replace the public archive. Sensitive, illegal, private, or unresolved source material is not distributed through this portal.</p></div>
      </div>
      <div class="route-list"><a class="route-link" href="/research/epstein-final-48-hours-mcc-source-ledger.tsv"><strong>Public MCC source ledger</strong><span>Public example ledger</span></a><a class="route-link" href="/archive"><strong>Public archive</strong><span>Open source layer</span></a></div>`);
  }
  if (path === "/members/requests") {
    return memberChrome("Requests", path, member, `
      <h2>Archive and Source Requests</h2>
      <div class="prose-grid">
        <div class="info-card"><span class="badge live">Queue</span><h3>Prioritized source requests</h3><p>Members can request archive checks, broken-link review, source packet candidates, and public route improvements.</p></div>
        <div class="info-card"><span class="badge receipt">Voting</span><h3>Investigation voting</h3><p>Voting can help choose what the archive reviews next. It does not buy conclusions or editorial outcomes.</p></div>
      </div>
      <section class="feature-panel"><p class="eyebrow">Request safety</p><h2>Send durable request context.</h2><p>Include the public URL, EFTA identifier if known, exact wording or route at issue, and what source context should be checked. Do not send illegal material, private personal data, passwords, payment-card data, or anything requiring secure legal handling.</p><div class="button-row"><a class="button primary" href="/contact">Open Contact Path</a><a class="button" href="/search">Search First</a></div></section>`);
  }
  if (path === "/members/account") {
    return memberChrome("Account", path, member, `
      <h2>Account Status</h2>
      <div class="prose-grid">
        <div class="info-card"><h3>Patreon user ID</h3><p>${escapeHtml(member.patreon_user_id)}</p></div>
        <div class="info-card"><h3>Membership status</h3><p>${escapeHtml(member.membership_status)}</p></div>
        <div class="info-card"><h3>First sync</h3><p>${escapeHtml(member.first_synced_at || "not recorded")}</p></div>
        <div class="info-card"><h3>Last sync</h3><p>${escapeHtml(member.last_synced_at || "not recorded")}</p></div>
      </div>
      <div class="button-row">
        <form method="post" action="/members/resync"><button class="button primary" type="submit">Resync Patreon Membership</button></form>
        <form method="post" action="/members/logout"><button class="button" type="submit">Log Out</button></form>
      </div>
      <div class="notice"><p>This portal stores only the minimal Patreon membership data needed for authorization: Patreon user ID, membership status, entitled tier IDs, synchronization timestamps, session timestamps, and audit timestamps.</p></div>`);
  }
  return memberChrome("Member Portal", "/members", member, `
    <h2>Member Tools</h2>
    <div class="prose-grid">
      <div class="info-card"><span class="badge receipt">Early</span><h3>Research drops</h3><p>Early research releases and operations briefings before public packaging.</p></div>
      <div class="info-card"><span class="badge receipt">Packets</span><h3>Downloads</h3><p>Evidence ledgers and source packets cleared for member distribution.</p></div>
      <div class="info-card"><span class="badge live">Queue</span><h3>Requests</h3><p>Prioritized archive/source requests and investigation voting with editorial independence preserved.</p></div>
      <div class="info-card"><span class="badge open">Account</span><h3>Resync and logout</h3><p>Manual Patreon entitlement resync and short-lived session controls.</p></div>
    </div>
    <section class="feature-panel gold"><p class="eyebrow">Public proof rule</p><h2>No existing public archive is paywalled.</h2><p>Existing public evidence archive, SEO stories, primary-source pages, search, dispatches, methodology, and corrections remain publicly reachable.</p></section>
    <div class="route-list">
      <a class="route-link" href="/members/research-drops"><strong>Research Drops</strong><span>Early releases and briefings</span></a>
      <a class="route-link" href="/members/downloads"><strong>Downloads</strong><span>Evidence ledgers and packets</span></a>
      <a class="route-link" href="/members/requests"><strong>Requests</strong><span>Voting and source requests</span></a>
      <a class="route-link" href="/members/account"><strong>Account</strong><span>Sync, logout, status</span></a>
    </div>`);
}

async function serveMemberPortal(request, env, path) {
  const session = await getMemberSession(request, env);
  if (!session.ok) {
    if (session.reason === "setup_missing") return htmlResponse(setupGapsHtml("Owner setup required", session.setupMissing), 503);
    if (session.reason === "missing_session" || session.reason === "expired_session" || session.reason === "revoked_session") {
      return redirectResponse(`/membership?auth=required&return_to=${encodeURIComponent(path)}`);
    }
    return htmlResponse(memberDeniedHtml("Patreon membership is inactive, unavailable, or not assigned to an entitled tier.", session.reason), 403);
  }
  await auditMembershipEvent(env, "member_route_allowed", {
    patreonUserId: session.member.patreon_user_id,
    route: path
  });
  const headers = session.renewalCookie ? { "Set-Cookie": session.renewalCookie } : {};
  return htmlResponse(portalRouteHtml(path, session.member), 200, headers);
}

async function handleMemberLogout(request, env) {
  const signed = parseCookies(request).get(MEMBER_COOKIE_NAME);
  if (env.MEMBER_SESSION_SIGNING_KEY && signed) {
    const sessionId = await verifySignedValue(env, signed);
    if (sessionId && env.MEMBERS_DB) {
      await env.MEMBERS_DB.prepare("UPDATE member_sessions SET revoked_at = ? WHERE session_id_hash = ?")
        .bind(nowIso(), await sha256Hex(sessionId)).run();
    }
  }
  const response = redirectResponse("/membership?logged_out=1");
  response.headers.append("Set-Cookie", clearSecureCookie(MEMBER_COOKIE_NAME));
  await auditMembershipEvent(env, "member_logout", { route: new URL(request.url).pathname });
  return response;
}

async function handleMemberResync(request, env) {
  const session = await getMemberSession(request, env);
  if (!session.ok) return redirectResponse("/membership?auth=required&return_to=/members/account");
  await auditMembershipEvent(env, "member_resync_started", {
    patreonUserId: session.member.patreon_user_id,
    route: new URL(request.url).pathname
  });
  const url = new URL(request.url);
  url.pathname = "/auth/patreon/start";
  url.search = "?return_to=/members/account";
  return startPatreonOAuth(new Request(url.toString(), request), env);
}

function entitlementFromWebhookPayload(payload) {
  const data = payload?.data;
  if (!data || data.type !== "member") return null;
  const userId = data?.relationships?.user?.data?.id || data?.relationships?.patron?.data?.id;
  const tierRefs = data?.relationships?.currently_entitled_tiers?.data || [];
  return {
    patreonUserId: userId,
    membershipStatus: data?.attributes?.patron_status || "unavailable",
    tierIds: tierRefs.map((tier) => String(tier.id)).filter(Boolean)
  };
}

async function handlePatreonWebhook(request, env) {
  const setupMissing = [];
  if (!env.MEMBERS_DB || typeof env.MEMBERS_DB.prepare !== "function") setupMissing.push("Bind D1 as MEMBERS_DB");
  if (!env.PATREON_WEBHOOK_SECRET) setupMissing.push("Add encrypted secret PATREON_WEBHOOK_SECRET");
  if (setupMissing.length) return htmlResponse(setupGapsHtml("Webhook setup required", setupMissing), 503);
  const body = await request.text();
  const signature = (request.headers.get("X-Patreon-Signature") || "").toLowerCase();
  const expected = hmacMd5Hex(env.PATREON_WEBHOOK_SECRET, body).toLowerCase();
  if (!signature || !timingSafeEqualText(signature, expected)) {
    await auditMembershipEvent(env, "webhook_signature_failed", { route: new URL(request.url).pathname });
    return new Response("Invalid webhook signature", {
      status: 401,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
    });
  }
  let payload;
  try {
    payload = JSON.parse(body);
  } catch (_) {
    return new Response("Invalid JSON", { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const entitlement = entitlementFromWebhookPayload(payload);
  if (entitlement?.patreonUserId) {
    await upsertPatreonMember(env, entitlement, { webhook: true });
    if (entitlement.membershipStatus !== "active_patron") {
      await env.MEMBERS_DB.prepare("UPDATE member_sessions SET revoked_at = ? WHERE patreon_user_id = ? AND revoked_at IS NULL")
        .bind(nowIso(), entitlement.patreonUserId).run();
    }
    await auditMembershipEvent(env, "webhook_member_updated", {
      patreonUserId: entitlement.patreonUserId,
      route: new URL(request.url).pathname,
      detail: { status: entitlement.membershipStatus }
    });
  } else {
    await auditMembershipEvent(env, "webhook_unmapped_payload", { route: new URL(request.url).pathname });
  }
  return new Response("ok", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
  });
}

async function reconcilePatreonMembers(env) {
  if (!env.MEMBERS_DB || !env.PATREON_CREATOR_ACCESS_TOKEN || !env.PATREON_CAMPAIGN_ID) {
    throw new Error("reconciliation_setup_missing");
  }
  let nextUrl = `https://www.patreon.com/api/oauth2/v2/campaigns/${encodeURIComponent(env.PATREON_CAMPAIGN_ID)}/members?include=user,currently_entitled_tiers&fields%5Bmember%5D=patron_status,last_charge_status,currently_entitled_amount_cents&page%5Bcount%5D=100`;
  let updated = 0;
  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: {
        "Authorization": `Bearer ${env.PATREON_CREATOR_ACCESS_TOKEN}`,
        "User-Agent": "Grok Archive Hub - Membership Worker"
      }
    });
    if (!response.ok) throw new Error(`patreon_reconcile_${response.status}`);
    const payload = await response.json();
    for (const member of payload.data || []) {
      const userId = member?.relationships?.user?.data?.id;
      if (!userId) continue;
      await upsertPatreonMember(env, {
        patreonUserId: userId,
        membershipStatus: member?.attributes?.patron_status || "unavailable",
        tierIds: (member?.relationships?.currently_entitled_tiers?.data || []).map((tier) => String(tier.id)).filter(Boolean)
      });
      updated += 1;
    }
    nextUrl = payload?.links?.next || null;
  }
  await auditMembershipEvent(env, "reconciliation_complete", { detail: { updated } });
  return updated;
}

async function handleMemberReconciliation(request, env) {
  const expected = env.MEMBER_RECONCILE_SECRET;
  const supplied = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!expected || !timingSafeEqualText(supplied, expected)) {
    return new Response("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const updated = await reconcilePatreonMembers(env);
    return new Response(`updated=${updated}`, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
    });
  } catch (error) {
    await auditMembershipEvent(env, "reconciliation_failed", { detail: { reason: error.message } });
    return new Response("reconciliation failed", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

function confidenceDefinition(label) {
  if (label.startsWith("L1")) return "A record exists and is linked.";
  if (label.startsWith("L2")) return "The record has enough surrounding context to explain why it matters.";
  if (label.startsWith("L3")) return "The record raises a structured question but does not prove the answer.";
  if (label.startsWith("L4")) return "Multiple durable sources support a narrow factual finding.";
  return "A missing, unresolved, ambiguous, degraded, or pending source item.";
}

function laneCaveat(record) {
  if (record.laneType === "email") {
    return "This email receipt does not automatically prove agreement, action, intent, legal significance, or the full meaning of the thread.";
  }
  if (record.laneType === "pdf" || record.laneType === "document") {
    return "This PDF/document receipt does not automatically prove the full record context unless page sequence, source path, completeness, and surrounding pages are available.";
  }
  if (record.laneType === "media") {
    return "This media receipt is strongest for presence, timing, setting, and public-facing context. It does not prove motive, hidden conduct, or relationship depth by itself.";
  }
  if (record.laneType === "entity") {
    return "This entity receipt is a disambiguation aid, not an accusation. A name appearing in the archive does not imply guilt, agency, liability, or wrongdoing.";
  }
  if (record.laneType === "legal-fara") {
    return "This legal or FARA review receipt is not a legal conclusion. It marks a source-supported review question that requires durable records such as DOJ material, court filings, registration records, official records, or source-linked archive context.";
  }
  return "This open receipt slot is an unresolved source check. It is not a finding and does not imply conduct, guilt, agency, liability, or wrongdoing.";
}

function openSlotMarkup(record) {
  if (!record.openSlots || record.openSlots.length === 0) {
    return "<p>No specific open receipt slots are listed in the current public source index for this record.</p>";
  }
  return `<ul class="clean-list">${record.openSlots.map((slot) => `<li>${escapeHtml(slot)}</li>`).join("")}</ul>`;
}

function barakReceiptDetailHtml(record, requestUrl) {
  const canonical = `https://grokarchivehub.com/barak/receipts/${record.id}`;
  const title = `${record.title} | Barak Receipt | Grok Archive Hub`;
  const meta = `A source-linked Barak receipt card for ${record.archiveId}, with source lane, confidence label, caveats, and open receipt slots.`;
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${canonical}#breadcrumb`,
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://grokarchivehub.com/" },
      { "@type": "ListItem", "position": 2, "name": "Barak", "item": "https://grokarchivehub.com/barak" },
      { "@type": "ListItem", "position": 3, "name": "Receipts", "item": "https://grokarchivehub.com/barak/receipts" },
      { "@type": "ListItem", "position": 4, "name": record.title, "item": canonical }
    ]
  };
  const sameLaneRecords = BARAK_RECEIPT_DETAIL_RECORDS
    .filter((candidate) => candidate.id !== record.id && candidate.laneType === record.laneType)
    .slice(0, 3);
  const relatedLinks = sameLaneRecords.length
    ? sameLaneRecords.map((candidate) => `<a class="route-link" href="/barak/receipts/${escapeHtml(candidate.id)}"><strong>${escapeHtml(candidate.title)}</strong><span>${escapeHtml(candidate.archiveId)} · ${escapeHtml(candidate.confidenceLabel)}</span></a>`).join("")
    : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(meta)}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>
  <link rel="stylesheet" href="/frontdoor/site.css">
</head>
<body>
  <header class="site-header">
    <div class="nav-shell">
      <a class="brand" href="/"><span class="brand-mark">GA</span><span>Grok Archive Hub</span></a>
      <button class="menu-button" type="button" data-menu-button aria-expanded="false">Menu</button>
      <nav class="nav-links" data-nav-links>
        <a data-route-link href="/start">Start Here</a>
        <a data-route-link href="/dispatches">Dispatches</a>
        <a data-route-link href="/reading-room">Reading Room</a>
        <a data-route-link href="/archive">Archive</a>
        <a data-route-link href="/search">Search</a>
        <a data-route-link href="/live">Live</a>
        <a data-route-link href="/donate">Donate</a>
        <a class="nav-member" data-route-link data-cta="join-reading-room" href="/membership">Membership</a>
      </nav>
    </div>
  </header>

  <main class="page-shell">
    <section class="page-hero">
      <p class="eyebrow">Barak lane · Receipt card</p>
      <h1>${escapeHtml(record.title)}</h1>
      <p class="lede">Source-linked Barak receipt card — ${escapeHtml(record.sourceLane)} · ${escapeHtml(record.confidenceLabel)}</p>
      <div class="button-row">
        <a class="button primary" href="/barak/receipts">Back to Receipts Index</a>
        <a class="button" href="/barak/entities">View Entities</a>
        <a class="button" href="/barak/timeline">View Timeline</a>
        <a class="button" href="/barak/source-map">Read the Source Map</a>
        <a class="button" href="/barak/search">Search Barak Records</a>
      </div>
    </section>

    <article class="content wide">
      <div class="notice">
        <p><strong>Receipt safety:</strong> This page explains one source-linked record from the public Barak Receipts Index. It does not accuse Ehud Barak or any other person or entity of wrongdoing. Presence in a receipt card does not imply conduct, guilt, agency, liability, or a FARA violation.</p>
      </div>

      <h2>Receipt Summary</h2>
      <div class="prose-grid">
        <div class="info-card"><h3>Archive ID</h3><p>${escapeHtml(record.archiveId)}</p></div>
        <div class="info-card"><h3>Title</h3><p>${escapeHtml(record.title)}</p></div>
        <div class="info-card"><h3>Source Lane</h3><p>${escapeHtml(record.sourceLane)}</p></div>
        <div class="info-card"><h3>Confidence Label</h3><p>${escapeHtml(record.confidenceLabel)}</p></div>
        <div class="info-card"><h3>Source Link</h3><p><a class="text-link" href="${escapeHtml(record.sourceLink)}">Open source-linked search/detail route</a></p></div>
        <div class="info-card"><h3>Indexed From</h3><p>${escapeHtml(record.indexedFrom)}</p></div>
      </div>

      <h2>What the Record Shows</h2>
      <p>${escapeHtml(record.shows || "This receipt is indexed as a source-linked Barak record, but the current public source index does not provide a fuller narrative summary.")}</p>

      <h2>What This Record Does Not Prove</h2>
      <p>${escapeHtml(record.doesNotProve || "Not available in current source index")}</p>
      <p>${escapeHtml(laneCaveat(record))}</p>

      <h2>Confidence Label</h2>
      <p><strong>${escapeHtml(record.confidenceLabel)}</strong></p>
      <p>${escapeHtml(confidenceDefinition(record.confidenceLabel))}</p>

      <h2>Open Receipt Slots</h2>
      ${openSlotMarkup(record)}

      <h2>Related Records</h2>
      <div class="route-list">
        ${relatedLinks}
        <a class="route-link" href="/barak/receipts"><strong>Barak Receipts Index</strong><span>All indexed Barak receipt cards</span></a>
        <a class="route-link" href="/barak/entities"><strong>Barak People / Entity Index</strong><span>Identity-control layer for names and organizations</span></a>
        <a class="route-link" href="/barak/timeline"><strong>Barak Timeline Index</strong><span>Chronology context without causation claims</span></a>
        <a class="route-link" href="/barak/source-map"><strong>Barak Source Map</strong><span>How to read the record lanes</span></a>
        <a class="route-link" href="/barak/fara-review"><strong>Barak FARA Review Index</strong><span>Review signals, not accusations</span></a>
        <a class="route-link" href="/barak/search"><strong>Barak Search</strong><span>Search Barak records</span></a>
      </div>

      <section class="feature-panel">
        <p class="eyebrow">Correction / Source Tip</p>
        <h2>Send durable corrections.</h2>
        <p>If you have a durable source that corrects, confirms, or contextualizes this receipt, send a source tip or correction request to <a class="text-link" href="mailto:grokcloudflare@gmail.com">grokcloudflare@gmail.com</a>.</p>
        <p>Do not send illegal material, private personal data, passwords, or anything requiring secure legal handling.</p>
      </section>

      <h2>What This Page Does Not Say</h2>
      <ul class="clean-list">
        <li>It does not say Ehud Barak violated FARA.</li>
        <li>It does not say any person acted illegally.</li>
        <li>It does not say presence in a record implies conduct.</li>
        <li>It does not say an email proves agreement or intent.</li>
        <li>It does not say a photo or media item proves relationship depth.</li>
        <li>It does not convert open receipt slots into findings.</li>
        <li>It does not replace DOJ, court, registration, or official records.</li>
      </ul>

      <section class="feature-panel">
        <p class="eyebrow">Research Spine</p>
        <h2>Keep the receipt inside the source chain.</h2>
        <div class="route-list">
          <a class="route-link" href="/"><strong>Home</strong><span>Front door</span></a>
          <a class="route-link" href="/start"><strong>Start Here</strong><span>Reader path</span></a>
          <a class="route-link" href="/barak"><strong>Barak Portal</strong><span>Barak lane</span></a>
          <a class="route-link" href="/barak/source-map"><strong>Barak Source Map</strong><span>Archive legend</span></a>
          <a class="route-link" href="/barak/receipts"><strong>Barak Receipts Index</strong><span>Receipt cards</span></a>
          <a class="route-link" href="/barak/entities"><strong>Barak People / Entity Index</strong><span>Identity-control layer</span></a>
          <a class="route-link" href="/barak/timeline"><strong>Barak Timeline Index</strong><span>Chronology context</span></a>
          <a class="route-link" href="/barak/fara-review"><strong>Barak FARA Review Index</strong><span>Review signals</span></a>
          <a class="route-link" href="/dispatches/fara-leads-explained"><strong>FARA Leads Explained</strong><span>Evidence-management labels</span></a>
          <a class="route-link" href="/search"><strong>Search Archive</strong><span>Inspect records</span></a>
          <a class="route-link" href="/reading-room"><strong>Reading Room</strong><span>Member-supported workflow</span></a>
          <a class="route-link" data-cta="join-reading-room" href="/membership"><strong>Support the Archive</strong><span>Membership and support</span></a>
          <a class="route-link" href="/contact"><strong>Contact / Source Tips</strong><span>Corrections and durable records</span></a>
        </div>
      </section>
    </article>
  </main>

  <footer class="site-footer">
    <div class="page-shell">
      <nav class="footer-links">
        <!--email_off--><a href="/start">About</a><a href="/about-the-operator">About the Operator</a><a href="/dispatches">Dispatches</a><a href="/reading-room">Reading Room</a><a href="/archive">Archive</a><a href="/search">Search</a><a data-cta="join-reading-room" href="/membership">Join the Reading Room</a><a data-cta="support-archive" href="/donate">Donate</a><a href="/faq">FAQ</a><a href="mailto:grokcloudflare@gmail.com">Contact / Source Tips</a><!--/email_off-->
      </nav>
      <p class="disclaimer">Presence-only archival research. No guilt or conduct implied unless adjudicated.</p>
    </div>
  </footer>
  <script src="/frontdoor/site.js"></script>
</body>
</html>`;
}

function barakReceiptArchiveAliasHtml(records, archiveId) {
  if (records.length === 1) return barakReceiptDetailHtml(records[0]);
  const canonical = `https://grokarchivehub.com/barak/receipts/${escapeHtml(archiveId)}`;
  const cards = records.map((record) => `
    <article class="info-card">
      <span class="badge ${record.confidenceLabel === "Open Receipt Slot" ? "open" : "receipt"}">${escapeHtml(record.confidenceLabel)}</span>
      <h3>${escapeHtml(record.title)}</h3>
      <p><strong>Source lane:</strong> ${escapeHtml(record.sourceLane)}</p>
      <p><strong>What the record shows:</strong> ${escapeHtml(record.shows)}</p>
      <p><strong>What it does not prove:</strong> ${escapeHtml(record.doesNotProve)}</p>
      <a class="text-link" href="/barak/receipts/${escapeHtml(record.id)}">Open this receipt card →</a>
    </article>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(archiveId)} | Barak Receipt Group | Grok Archive Hub</title>
  <meta name="description" content="A grouped Barak receipt view for an archive ID that appears in more than one source lane.">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="${canonical}">
  <link rel="stylesheet" href="/frontdoor/site.css">
</head>
<body>
  <main class="page-shell">
    <section class="page-hero">
      <p class="eyebrow">Barak lane · Grouped archive ID</p>
      <h1>${escapeHtml(archiveId)}</h1>
      <p class="lede">This archive ID appears in more than one receipt lane. The archive keeps each receipt card separate so source lane and confidence stay visible.</p>
      <div class="button-row"><a class="button primary" href="/barak/receipts">Back to Receipts Index</a><a class="button" href="/barak/entities">View Entities</a><a class="button" href="/barak/timeline">View Timeline</a><a class="button" href="/barak/source-map">Read the Source Map</a></div>
    </section>
    <article class="content wide">
      <div class="notice"><p>This grouped view is not a claim page. Presence in a receipt card does not imply conduct, guilt, agency, liability, or a FARA violation.</p></div>
      <div class="prose-grid">${cards}</div>
    </article>
  </main>
</body>
</html>`;
}

async function serveBarakReceiptDetail(request, idOrArchiveId) {
  const record = BARAK_RECEIPT_DETAIL_BY_ID.get(idOrArchiveId);
  const groupedRecords = BARAK_RECEIPT_DETAIL_BY_ARCHIVE_ID.get(idOrArchiveId);
  if (!record && !groupedRecords) {
    return proxyProofLayer(request);
  }
  const body = record
    ? barakReceiptDetailHtml(record, request.url)
    : barakReceiptArchiveAliasHtml(groupedRecords, idOrArchiveId);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-GAH-Barak-Receipt-Detail": record ? record.id : idOrArchiveId
    }
  });
}

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(reconcilePatreonMembers(env).catch(() => undefined));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    const path = cleanPath(url.pathname);

    if (url.hostname === "www.grokarchivehub.com") {
      url.hostname = "grokarchivehub.com";
      url.protocol = "https:";
      return new Response(null, {
        status: 301,
        headers: {
          "Location": url.toString(),
          "Cache-Control": "public, max-age=3600",
          "X-Grok-Frontdoor": "GAH-WWW-APEX-301"
        }
      });
    }

    if ((request.method === "GET" || request.method === "HEAD") && path === "/wiki") {
      return new Response(null, {
        status: 302,
        headers: {
          "Location": "/grok-command-v4",
          "Cache-Control": "no-store",
          "X-Grok-Frontdoor": "GAH-FRONTDOOR-001"
        }
      });
    }

    if ((request.method === "GET" || request.method === "HEAD") && path === "/sitemap.xml") {
      return serveSitemapWithPublishedDispatches(request);
    }

    if ((request.method === "GET" || request.method === "HEAD") && path === "/auth/patreon/start") {
      return startPatreonOAuth(request, env);
    }

    if ((request.method === "GET" || request.method === "HEAD") && path === "/auth/patreon/callback") {
      return handlePatreonCallback(request, env);
    }

    if (request.method === "POST" && path === "/webhooks/patreon") {
      return handlePatreonWebhook(request, env);
    }

    if (request.method === "POST" && path === "/internal/members/reconcile") {
      return handleMemberReconciliation(request, env);
    }

    if ((request.method === "GET" || request.method === "POST" || request.method === "HEAD") && path === "/members/logout") {
      return handleMemberLogout(request, env);
    }

    if ((request.method === "POST" || request.method === "HEAD") && path === "/members/resync") {
      return handleMemberResync(request, env);
    }

    if ((request.method === "GET" || request.method === "HEAD") && MEMBER_PORTAL_PATHS.has(path)) {
      return serveMemberPortal(request, env, path);
    }

    if (path.startsWith("/api/")) {
      return proxyProofLayer(request);
    }

    if ((request.method === "GET" || request.method === "HEAD") && (url.pathname.startsWith("/evidence-engine/v1/") || url.pathname.startsWith("/evidence-data/"))) {
      return serveEvidenceAssetStrict(request, env, path);
    }

    if ((request.method === "GET" || request.method === "HEAD") && isBirthdayBookEvidencePath(path)) {
      return serveFrontdoor(request, env, "/research/evidence/birthday-book.html");
    }

    if (request.method === "GET" && path === "/barak") {
      return serveBarakPortalWithReviewLinks(request);
    }

    if ((request.method === "GET" || request.method === "HEAD") && path.startsWith("/barak/receipts/")) {
      const idOrArchiveId = decodeURIComponent(path.slice("/barak/receipts/".length));
      return serveBarakReceiptDetail(request, idOrArchiveId);
    }

    if ((request.method === "GET" || request.method === "HEAD") && path === "/dispatches/queue") {
      return serveFrontdoor(request, env, "/dispatches.html");
    }

    if (
      FRONTDOOR_PATHS.has(path) ||
      url.pathname.startsWith("/frontdoor/") ||
      url.pathname.startsWith("/source-renders/") ||
      path === "/ads.txt" ||
      path === "/app-ads.txt"
    ) {
      if (url.pathname.startsWith("/frontdoor/") || url.pathname.startsWith("/source-renders/")) {
        return serveFrontdoorAssetStrict(request, env, path);
      }
      return serveFrontdoor(request, env);
    }

    if ((request.method === "GET" || request.method === "HEAD") && path === "/research/evidence/epstein-death") {
      return serveEpsteinEvidenceWithReaderReturn(request);
    }

    if ((request.method === "GET" || request.method === "HEAD") && FRESH_PROOF_PATHS.has(path)) {
      const freshUrl = new URL(request.url);
      freshUrl.searchParams.set("gah_origin_fresh", `GAH-SEO-AUTHORITY-GRAPH-002-${Date.now()}`);
      return proxyProofLayer(new Request(freshUrl.toString(), request));
    }

    return proxyProofLayer(request);
  }
};
