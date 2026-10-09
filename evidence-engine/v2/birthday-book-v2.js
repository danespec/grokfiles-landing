(function () {
  "use strict";

  var ROUTES = [
    ["", "Overview"],
    ["pages", "Pages"],
    ["people", "People"],
    ["sections", "Sections"],
    ["unresolved", "Unresolved"],
    ["methodology", "Methodology"]
  ];

  var FILTERS = [
    ["contributor", "Contributor"],
    ["section", "Section"],
    ["typed", "Typed"],
    ["handwritten", "Handwritten"],
    ["photograph", "Photograph"],
    ["drawing", "Drawing"],
    ["signature", "Signature"],
    ["redaction", "Redaction"],
    ["date", "Date"],
    ["verified", "Verified"],
    ["probable", "Probable"],
    ["unresolved", "Unresolved"]
  ];

  var WITHHELD_TEXT = "Automated transcription withheld because the scan or handwriting did not meet publication-quality standards. View the original page image.";

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function attr(value) {
    return esc(value).replace(/`/g, "&#96;");
  }

  function clean(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function asArray(value) {
    if (Array.isArray(value)) return value;
    if (value == null || value === "") return [];
    return [value];
  }

  function unique(values) {
    var seen = new Set();
    return values.map(clean).filter(Boolean).filter(function (value) {
      var key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function pagePad(page) {
    return String(Number(page) || 0).padStart(3, "0");
  }

  function pick(source, keys) {
    for (var i = 0; i < keys.length; i += 1) {
      if (source && source[keys[i]] != null) return source[keys[i]];
    }
    return undefined;
  }

  function itemText(value) {
    if (value == null) return "";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return clean(value);
    if (typeof value === "object") {
      return clean(value.text_as_seen || value.text || value.value || value.note || value.description || value.summary || value.location || JSON.stringify(value));
    }
    return "";
  }

  function publicBirthdayText(value) {
    return clean(value)
      .replace(/\bthe first fifty years\b/gi, "the visible book title")
      .replace(/\bauthoritative\b/gi, "independent source")
      .replace(/\bauthorship\b/gi, "attribution")
      .replace(/\bauthors?\b/gi, "contributors")
      .replace(/\bwritten by\b/gi, "credited to");
  }

  function itemList(values, emptyText) {
    var rows = unique(asArray(values).map(itemText).map(publicBirthdayText));
    if (!rows.length) return "<p>" + esc(emptyText) + "</p>";
    return "<ul>" + rows.map(function (value) { return "<li>" + esc(value) + "</li>"; }).join("") + "</ul>";
  }

  function statusLabel(value) {
    return clean(value).replace(/_/g, " ");
  }

  function routeState(baseRoute) {
    var path = window.location.pathname.replace(/\/+$/, "");
    var base = baseRoute.replace(/\/+$/, "");
    var rel = path === base ? "" : path.slice(base.length).replace(/^\/+/, "");
    var parts = rel ? rel.split("/") : [];
    var params = new URLSearchParams(window.location.search);
    return {
      rel: rel,
      section: parts[0] || "",
      page: parts[0] === "pages" && parts[1] ? Number(parts[1].replace(/^page[_-]?/i, "")) : 0,
      personSlug: parts[0] === "people" && parts[1] ? decodeURIComponent(parts[1]) : "",
      q: params.get("q") || "",
      filter: params.get("filter") || ""
    };
  }

  function badge(label, kind) {
    return '<span class="bb-status ' + attr(kind || "open") + '">' + esc(label) + "</span>";
  }

  function linkButton(href, label, extraClass) {
    return '<a class="button ' + attr(extraClass || "") + '" href="' + attr(href) + '">' + esc(label) + "</a>";
  }

  var genericStrings = new Set([
    "the first fifty years",
    "first fifty years",
    "fifty years",
    "birthday book",
    "house oversight",
    "house_oversight",
    "science",
    "business",
    "friends",
    "family",
    "brooklyn",
    "prologue",
    "i",
    "ii",
    "iii",
    "iv",
    "v",
    "vi",
    "vii",
    "viii",
    "ix",
    "x"
  ]);

  function publicDocString(value) {
    var text = clean(value);
    var lower = text.toLowerCase();
    if (!text || genericStrings.has(lower)) return "";
    if (/^house[_\s-]?oversight/i.test(text)) return "";
    if (/^[ivxlcdm]+$/i.test(text)) return "";
    if (/^[\W_0-9]+$/.test(text)) return "";
    if (text.length < 3 || text.length > 220) return "";
    return text;
  }

  function extractBates(page) {
    var text = [page.bates, page.source_label, page.ocr_text, asArray(page.document_strings).join(" ")].join(" ");
    var match = text.match(/HOUSE[_\s-]?OVERSIGHT[_\s-]?\d{6}/i);
    return match ? match[0].replace(/\s+/g, "_").toUpperCase() : "";
  }

  function bracketSegment(text, segment) {
    var value = clean(segment);
    if (!value || (value.charAt(0) === "[" && value.charAt(value.length - 1) === "]")) return text;
    if (String(text || "").indexOf("[" + value + "]") !== -1) return text;
    return String(text || "").split(value).join("[" + value + "]");
  }

  function transcriptLineText(line) {
    var confidence = clean(line && line.confidence).toLowerCase();
    if (confidence === "low") return "[uncertain]";
    var text = clean((line && (line.public_text || line.text)) || "");
    asArray(line && line.uncertain_segments).forEach(function (segment) {
      text = bracketSegment(text, segment);
    });
    if (asArray(line && line.illegible_segments).length && !/\[illegible\]/i.test(text)) {
      text += " [illegible]";
    }
    return text || "[illegible]";
  }

  function transcriptExcerpt(indexItem) {
    return clean(indexItem && indexItem.excerpt).slice(0, 240);
  }

  function pageFlags(page) {
    return asArray(page.flags).map(function (flag) { return clean(flag).toLowerCase(); });
  }

  function hasFlag(page, flag) {
    return pageFlags(page).indexOf(flag) !== -1;
  }

  function publicFeatureBadges(page, records) {
    var flags = pageFlags(page);
    var labels = [];
    if (records.some(function (record) { return record.status === "verified"; })) labels.push(["Verified", "probable"]);
    if (records.some(function (record) { return record.status === "probable"; })) labels.push(["Probable", "probable"]);
    if (flags.indexOf("handwriting") !== -1) labels.push(["Handwritten", "open"]);
    if (flags.indexOf("signature") !== -1) labels.push(["Signature visible", "probable"]);
    if (flags.indexOf("redaction") !== -1) labels.push(["Redaction", "gap"]);
    if (flags.indexOf("photo") !== -1) labels.push(["Photograph", "open"]);
    if (flags.indexOf("drawing") !== -1) labels.push(["Drawing", "open"]);
    if (flags.indexOf("date") !== -1) labels.push(["Date visible", "open"]);
    if (flags.indexOf("gaps") !== -1 || Number(page.page) === 30) labels.push(["GAPS", "gap"]);
    if (!labels.length) labels.push(["Scanned page", "open"]);
    return labels.map(function (item) { return badge(item[0], item[1]); }).join("");
  }

  function normalizePage(raw, fallbackPage) {
    raw = raw || {};
    var page = Number(pick(raw, ["page", "pageNumber", "page_number"])) || Number(fallbackPage) || 0;
    return Object.assign({}, raw, {
      page: page,
      id: clean(pick(raw, ["id", "page_id"])) || "page_" + pagePad(page),
      image: clean(pick(raw, ["image", "image_url", "page_image_url"])) || "/evidence-data/birthday-book/recovered_pages/page_" + pagePad(page) + ".png",
      ocr_text: clean(pick(raw, ["ocr_text", "ocrText", "ocr", "text"])),
      observations: unique(asArray(pick(raw, ["observations", "objective_vision_observations", "vision_observations"])).map(itemText)),
      document_strings: unique(asArray(pick(raw, ["document_strings", "documentStrings", "names_as_strings", "names"])).map(itemText)),
      signatures: asArray(pick(raw, ["signatures", "signature_marks"])),
      handwriting: asArray(pick(raw, ["handwriting", "handwriting_candidates"])),
      redactions: asArray(pick(raw, ["redactions", "visual_redactions"])),
      dates: unique(asArray(pick(raw, ["dates", "dates_visible", "date_strings"])).map(itemText)),
      gaps: unique(asArray(pick(raw, ["gaps", "warnings", "gap_labels"])).map(itemText)),
      bates: clean(pick(raw, ["bates", "bates_number"])) || clean(raw.source && raw.source.bates) || extractBates(raw),
      source_label: clean(pick(raw, ["source_label", "sourceLabel"])) || clean(raw.source && raw.source.label) || "Birthday Book durable OCR/image corpus"
    });
  }

  function BirthdayBookApp(root, data) {
    this.root = root;
    this.baseRoute = root.getAttribute("data-base-route");
    this.manifest = data.manifest || {};
    this.identities = data.identities || [];
    this.reviewQueue = data.reviewQueue || [];
    this.reviewCases = data.reviewCases && data.reviewCases.cases ? data.reviewCases.cases : [];
    this.quality = data.quality || {};
    this.transcriptIndex = data.transcriptIndex || { pages: [] };
    this.dataBase = clean(this.manifest.dataBase) || "/evidence-data/birthday-book";
    this.transcriptBase = clean(root.getAttribute("data-transcript-base")) || "/evidence-data/birthday-book/research/transcripts";
    this.totalPages = Number(this.manifest.totalPages || this.manifest.pageCount || 238);
    this.pageCache = new Map();
    this.transcriptCache = new Map();
    this.pageSummaries = asArray(this.manifest.pages).map(function (page, index) { return normalizePage(page, index + 1); });
    this.transcriptsByPage = new Map(asArray(this.transcriptIndex.pages).map(function (item) { return [Number(item.page), item]; }));
    this.sectionPages = asArray(this.quality.section_pages).slice().sort(function (a, b) { return Number(a.page) - Number(b.page); });
    this.state = routeState(this.baseRoute);
    this.isStaging = this.baseRoute.indexOf("birthday-book-v2") !== -1;
  }

  BirthdayBookApp.prototype.sectionForPage = function (pageNumber) {
    var section = "Unassigned";
    this.sectionPages.forEach(function (item) {
      if (Number(item.page) <= Number(pageNumber)) section = clean(item.section) || section;
    });
    return section;
  };

  BirthdayBookApp.prototype.recordsForPage = function (pageNumber) {
    return this.identities.filter(function (record) {
      return asArray(record.pages).map(Number).indexOf(Number(pageNumber)) !== -1;
    });
  };

  BirthdayBookApp.prototype.reviewForPage = function (pageNumber) {
    return this.reviewQueue.filter(function (item) { return Number(item.page) === Number(pageNumber); });
  };

  BirthdayBookApp.prototype.qualityForPage = function (pageNumber) {
    var found = asArray(this.quality.withheld_pages).find(function (item) { return Number(item.page) === Number(pageNumber); });
    return found ? { publish: false, reasons: asArray(found.reasons) } : { publish: true, reasons: [] };
  };

  BirthdayBookApp.prototype.pageSummary = function (pageNumber) {
    return this.pageSummaries.find(function (page) { return Number(page.page) === Number(pageNumber); }) || normalizePage({ page: pageNumber }, pageNumber);
  };

  BirthdayBookApp.prototype.loadPage = async function (pageNumber) {
    var page = Number(pageNumber) || 1;
    if (this.pageCache.has(page)) return this.pageCache.get(page);
    var summary = this.pageSummary(page);
    try {
      var response = await fetch(this.dataBase.replace(/\/+$/, "") + "/pages/page_" + pagePad(page) + ".json", { cache: "no-store" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      var detail = normalizePage(Object.assign({}, summary, await response.json()), page);
      this.pageCache.set(page, detail);
      return detail;
    } catch (error) {
      var fallback = normalizePage(Object.assign({}, summary, {
        gaps: asArray(summary.gaps).concat("Page JSON fetch failed: " + error.message)
      }), page);
      this.pageCache.set(page, fallback);
      return fallback;
    }
  };

  BirthdayBookApp.prototype.loadTranscript = async function (pageNumber) {
    var page = Number(pageNumber) || 0;
    if (!page) return null;
    if (this.transcriptCache.has(page)) return this.transcriptCache.get(page);
    if (!this.transcriptsByPage.has(page)) {
      this.transcriptCache.set(page, null);
      return null;
    }
    try {
      var response = await fetch(this.transcriptBase.replace(/\/+$/, "") + "/page_" + pagePad(page) + "_transcript.json", { cache: "no-store" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      var transcript = await response.json();
      this.transcriptCache.set(page, transcript);
      return transcript;
    } catch (_) {
      this.transcriptCache.set(page, null);
      return null;
    }
  };

  BirthdayBookApp.prototype.routeHref = function (slug) {
    return this.baseRoute + (slug ? "/" + slug : "");
  };

  BirthdayBookApp.prototype.renderShell = async function () {
    this.state = routeState(this.baseRoute);
    var content = await this.renderContent();
    this.root.innerHTML = '<div class="bb-page">' + content + "</div>";
  };

  BirthdayBookApp.prototype.subnav = function () {
    var self = this;
    return '<nav class="bb-subnav" aria-label="Birthday Book V2 navigation">' + ROUTES.map(function (route) {
      var slug = route[0];
      var label = route[1];
      var active = (self.state.section || "") === slug || (!slug && !self.state.section);
      return '<a class="button ' + (active ? "primary" : "") + '" href="' + attr(self.routeHref(slug)) + '">' + esc(label) + "</a>";
    }).join("") + "</nav>";
  };

  BirthdayBookApp.prototype.hero = function (kicker, title, lede, extra) {
    var label = this.isStaging ? "Birthday Book V2" : "Birthday Book";
    return '<section class="section bb-hero"><div class="page-shell">' +
      '<div class="bb-breadcrumbs"><a href="/">Grok Archive Hub</a><span>/</span><a href="' + attr(this.baseRoute) + '">' + esc(label) + '</a></div>' +
      '<p class="eyebrow">' + esc(kicker) + '</p><h1 class="bb-page-title">' + esc(title) + '</h1>' +
      '<p class="bb-hero-lede">' + esc(lede) + '</p>' +
      '<div class="bb-badges">' + badge("Public research reader", "review") + badge("Public OCR gated", "probable") + badge("No photo identification", "open") + '</div>' +
      this.subnav() + (extra || "") + '</div></section>';
  };

  BirthdayBookApp.prototype.stats = function () {
    var verified = this.identities.filter(function (r) { return r.status === "verified"; }).length;
    var probable = this.identities.filter(function (r) { return r.status === "probable"; }).length;
    var open = this.identities.filter(function (r) { return r.status === "open"; }).length;
    return { verified: verified, probable: probable, open: open };
  };

  BirthdayBookApp.prototype.statGrid = function () {
    var stats = this.stats();
    return '<div class="bb-stat-grid">' +
      '<div class="bb-stat"><strong>' + esc(this.totalPages) + '</strong><span>Pages loaded</span></div>' +
      '<div class="bb-stat"><strong>' + esc(stats.verified) + '</strong><span>Verified contributors</span></div>' +
      '<div class="bb-stat"><strong>' + esc(stats.probable) + '</strong><span>Probable attributions</span></div>' +
      '<div class="bb-stat"><strong>' + esc(this.quality.public_transcript_withheld || 0) + '</strong><span>Transcripts withheld</span></div>' +
      '</div>';
  };

  BirthdayBookApp.prototype.renderLanding = function () {
    var selected = [1, 3, 7, 8, 9, 30, 68, 158, 175, 176, 177, 178, 238].map(this.pageSummary.bind(this));
    var stats = this.stats();
    var sections = this.sectionPages.map(function (item) {
      return '<span class="bb-chip">' + esc(item.section) + ' starts near page ' + esc(item.page) + '</span>';
    }).join("");
    return this.hero("Birthday Book evidence reader", "Birthday Book evidence reader", "A public research reader for the House Oversight scan, built to separate scanned-page evidence from OCR noise, table-of-contents strings, signatures, mentions, and unresolved attributions.") +
      '<section class="section"><div class="page-shell bb-grid">' +
      '<div class="feature-panel">' + this.statGrid() + '</div>' +
      '<div class="bb-two-col">' +
      '<section class="bb-panel"><h2>Overview</h2><p>The scanned album is presented here as a source object. The reader shows page images, objective visual observations, source-control strings, redactions, and explicit review limits. It does not treat OCR, handwriting, table-of-contents text, or photographs as contribution proof.</p></section>' +
      '<section class="bb-panel"><h2>Book structure</h2><p>The scan is organized as a sequence of 238 page images. Visible section pages and table-of-contents strings are treated as navigation evidence, not as confirmed contribution evidence.</p><div class="bb-badges">' + (sections || badge("GAPS - section starts require review", "gap")) + '</div></section>' +
      '</div>' +
      '<div class="bb-card-grid">' +
      '<section class="bb-card"><h2>Verified contributors</h2><p>' + esc(stats.verified) + ' contributor record' + (stats.verified === 1 ? ' is' : 's are') + ' marked verified with page evidence and source citations. Other attributions remain probable or open.</p>' + linkButton(this.routeHref("people"), "Review people") + '</section>' +
      '<section class="bb-card"><h2>Contributions requiring review</h2><p>' + esc(this.reviewCases.length || this.reviewQueue.length) + ' grouped page/person cases are queued for handwriting, low-confidence transcription, signatures, famous-name attribution, redactions, safety blocks, and multiple possible contributors.</p>' + linkButton(this.routeHref("unresolved"), "Open review queue") + '</section>' +
      '<section class="bb-card"><h2>Methodology</h2><p>OCR is internal for search/debug unless it passes the public quality gate. Handwriting is withheld until a dedicated transcription pass or human review supports publication.</p>' + linkButton(this.routeHref("methodology"), "Read methodology") + '</section>' +
      '</div>' +
      '<section><div class="section-head"><div><p class="eyebrow">Selected pages</p><h2>Reported problem pages</h2></div><p>These cards use vetted descriptions, not low-quality automated text.</p></div>' + this.pageGrid(selected) + '</section>' +
      '<div class="bb-two-col">' +
      '<section class="bb-panel"><h2>Known GAPS</h2><ul><li>External identity research is incomplete for open records.</li><li>Most handwriting transcripts are withheld pending review.</li><li>Page 30 remains a safety-block/GAPS page.</li></ul></section>' +
      '<section class="bb-panel"><h2>Source provenance</h2><p>Canonical page JSON and recovered page images are loaded from the Birthday Book durable OCR/image corpus. Page-level Bates strings are shown when visible in OCR or document strings. Missing source-PDF links render as GAPS.</p></section>' +
      '</div>' +
      '</div></section>';
  };

  BirthdayBookApp.prototype.pageSearchText = function (page) {
    var records = this.recordsForPage(page.page).map(function (record) { return record.display_name + " " + record.classification + " " + record.status; }).join(" ");
    return [
      "page " + page.page,
      this.sectionForPage(page.page),
      page.ocr_text,
      page.observations.join(" "),
      page.document_strings.join(" "),
      asArray(page.signatures).map(itemText).join(" "),
      asArray(page.handwriting).map(itemText).join(" "),
      asArray(page.redactions).map(itemText).join(" "),
      page.dates.join(" "),
      pageFlags(page).join(" "),
      records
    ].join(" ").toLowerCase();
  };

  BirthdayBookApp.prototype.matchesFilter = function (page, filter) {
    if (!filter) return true;
    var records = this.recordsForPage(page.page);
    if (filter === "typed") return pageFlags(page).indexOf("handwriting") === -1;
    if (filter === "handwritten") return hasFlag(page, "handwriting");
    if (filter === "photograph") return hasFlag(page, "photo");
    if (filter === "contributor") return records.some(function (record) { return record.contribution_pages && record.contribution_pages.length; });
    if (filter === "section") return this.sectionForPage(page.page) !== "Unassigned";
    if (filter === "verified") return records.some(function (record) { return record.status === "verified"; });
    if (filter === "probable") return records.some(function (record) { return record.status === "probable"; });
    if (filter === "unresolved") return records.some(function (record) { return record.status === "open"; });
    return hasFlag(page, filter);
  };

  BirthdayBookApp.prototype.searchPages = function (limit) {
    var self = this;
    var q = clean(this.state.q).toLowerCase();
    return this.pageSummaries.filter(function (page) {
      return self.matchesFilter(page, self.state.filter) && (!q || self.pageSearchText(page).indexOf(q) !== -1);
    }).slice(0, limit || 238);
  };

  BirthdayBookApp.prototype.pagePreview = function (page) {
    var records = this.recordsForPage(page.page);
    var verified = records.find(function (record) {
      return record.status === "verified" && asArray(record.contribution_pages).map(Number).indexOf(Number(page.page)) !== -1;
    });
    if (verified) return "Verified contributor: " + verified.display_name + ".";
    var transcript = this.transcriptsByPage.get(Number(page.page));
    var excerpt = transcriptExcerpt(transcript);
    if (transcript && transcript.public_transcript_allowed && excerpt) return excerpt;
    var quality = this.qualityForPage(page.page);
    if (quality.publish && !hasFlag(page, "handwriting") && page.ocr_text) return clean(page.ocr_text).slice(0, 220);
    if (page.observations[0]) return publicBirthdayText(page.observations[0]);
    var doc = page.document_strings.map(publicDocString).find(Boolean);
    if (doc) return "Document string visible: " + doc + ".";
    var probable = records.find(function (record) { return record.status === "probable"; });
    if (probable) return "Probable attribution under review: " + probable.display_name + ".";
    return "View scanned contribution.";
  };

  BirthdayBookApp.prototype.filterBar = function () {
    var self = this;
    var route = this.routeHref(this.state.section === "pages" ? "pages" : "");
    var filterLinks = FILTERS.map(function (item) {
      var params = new URLSearchParams();
      if (self.state.q) params.set("q", self.state.q);
      if (self.state.filter !== item[0]) params.set("filter", item[0]);
      var href = route + (params.toString() ? "?" + params.toString() : "");
      return '<a class="bb-filter" aria-pressed="' + (self.state.filter === item[0] ? "true" : "false") + '" href="' + attr(href) + '">' + esc(item[1]) + "</a>";
    }).join("");
    return '<section class="bb-panel"><form class="bb-search-form" action="' + attr(route) + '" method="get">' +
      '<input name="q" type="search" placeholder="Search pages, contributors, observations, document strings, dates, and notes" value="' + attr(this.state.q) + '">' +
      '<select name="filter"><option value="">All evidence types</option>' + FILTERS.map(function (item) { return '<option value="' + attr(item[0]) + '"' + (self.state.filter === item[0] ? " selected" : "") + '>' + esc(item[1]) + '</option>'; }).join("") + '</select>' +
      '<button class="button primary" type="submit">Search</button></form><div class="bb-subnav">' + filterLinks + '</div></section>';
  };

  BirthdayBookApp.prototype.pageGrid = function (pages) {
    var self = this;
    if (!pages.length) return '<div class="bb-empty">No matching pages.</div>';
    return '<div class="bb-result-grid">' + pages.map(function (page) {
      var records = self.recordsForPage(page.page);
      return '<article class="bb-result"><h3>Birthday Book - Page ' + esc(page.page) + '</h3>' +
        '<p>' + esc(self.pagePreview(page)) + '</p>' +
        '<div class="bb-badges">' + publicFeatureBadges(page, records) + '</div>' +
        '<div class="bb-actions">' + linkButton(self.routeHref("pages/" + page.page), "Open page", "primary") + '</div></article>';
    }).join("") + "</div>";
  };

  BirthdayBookApp.prototype.renderPages = function () {
    var pages = this.searchPages(238);
    return this.hero("Pages", "Birthday Book pages", "Search and filter the 238-page scan without exposing low-quality OCR as public summary text.") +
      '<section class="section"><div class="page-shell bb-grid">' + this.filterBar() + this.pageGrid(pages) + '</div></section>';
  };

  BirthdayBookApp.prototype.typedTextHtml = function (page) {
    var rows = page.document_strings.map(publicDocString).filter(Boolean);
    if (!rows.length && page.ocr_text && !hasFlag(page, "handwriting")) rows = [page.ocr_text];
    if (!rows.length) return '<p class="bb-withheld">' + esc(WITHHELD_TEXT) + '</p>';
    return '<div class="bb-transcript typed">' + rows.map(function (value) { return esc(value); }).join("\n") + '</div>';
  };

  BirthdayBookApp.prototype.publicTranscriptHtml = function (page, quality, isHandwriting, transcriptRecord) {
    if (transcriptRecord && transcriptRecord.transcript_status === "no_handwriting_found") {
      return '<p class="bb-transcript-note">Typed text is shown from validated page strings. Signature-like marks remain attribution evidence, not contribution proof.</p>' +
        this.typedTextHtml(page);
    }
    if (transcriptRecord && transcriptRecord.public_transcript_allowed === true) {
      var lines = asArray(transcriptRecord.lines).map(function (line) {
        var text = transcriptLineText(line);
        var location = clean(line.location);
        return '<li><span class="bb-line-number">' + esc(line.line_number || "") + '</span><span>' +
          (location ? '<em>' + esc(location) + '</em> ' : '') + esc(text) + '</span></li>';
      }).join("");
      return '<p class="bb-transcript-note">Machine-assisted handwriting transcription; uncertain words are bracketed. Transcription does not verify attribution or identity.</p>' +
        '<ol class="bb-line-transcript">' + (lines || '<li><span></span><span>[illegible]</span></li>') + '</ol>';
    }
    if (isHandwriting) return '<p class="bb-withheld">No reliable public transcription is currently available.</p>';
    if (quality.publish && page.ocr_text) return '<div class="bb-transcript">' + esc(page.ocr_text) + '</div>';
    return '<p class="bb-withheld">' + esc(WITHHELD_TEXT) + '</p>';
  };

  BirthdayBookApp.prototype.renderPage = async function (pageNumber) {
    var page = await this.loadPage(pageNumber);
    var transcriptRecord = await this.loadTranscript(page.page);
    var records = this.recordsForPage(page.page);
    var reviews = this.reviewForPage(page.page);
    var quality = this.qualityForPage(page.page);
    var section = this.sectionForPage(page.page);
    var prev = page.page > 1 ? this.routeHref("pages/" + (page.page - 1)) : "";
    var next = page.page < this.totalPages ? this.routeHref("pages/" + (page.page + 1)) : "";
    var isHandwriting = hasFlag(page, "handwriting");
    var transcript = this.publicTranscriptHtml(page, quality, isHandwriting, transcriptRecord);
    var image = page.image
      ? '<img class="bb-page-image" src="' + attr(page.image) + '" alt="' + attr("Birthday Book page " + page.page) + '">'
      : '<div class="bb-image-placeholder">Page image GAPS</div>';
    var publicDocs = page.document_strings.map(publicDocString).filter(Boolean);
    var safety = (page.page === 30 || page.safety_block || hasFlag(page, "safety-block"))
      ? '<section class="bb-panel"><h2>Safety-block / GAPS notice</h2><p class="bb-withheld">Page 30 remains a preserved safety-block/GAPS page. No replacement visual inference or transcript is published here.</p></section>'
      : "";
    var sourceMeta = Object.assign({}, this.manifest.source || {}, this.quality.source_provenance || {});
    var sourcePdf = clean(sourceMeta.source_pdf_url || sourceMeta.pdf);
    var sourceRelease = clean(sourceMeta.release_url);
    var sourceCollection = clean(sourceMeta.source_collection_url);
    var sourceLine = [
      sourcePdf ? '<a class="bb-inline-link" href="' + attr(sourcePdf) + '">Open source PDF</a>' : '',
      sourceRelease ? '<a class="bb-inline-link" href="' + attr(sourceRelease) + '">House release</a>' : '',
      sourceCollection ? '<a class="bb-inline-link" href="' + attr(sourceCollection) + '">Document collection</a>' : ''
    ].filter(Boolean).join(" · ") || 'GAPS - source PDF link not available in loaded data.';
    var contributionStatus = records.length
      ? records.map(function (record) {
        var recordStatus = record.slug === "donald-trump" ? "open/disputed" : statusLabel(record.status || "open");
        return badge(recordStatus + " - " + statusLabel(record.classification) + ": " + record.display_name, record.status === "verified" ? "verified" : record.status === "probable" ? "probable" : "open");
      }).join("")
      : badge("No contributor attribution loaded", "open");
    return this.hero("Page reader", "Birthday Book - Page " + page.page, "Original page image with public-quality transcription rules, objective observations, document strings, attribution status, provenance, and review GAPS.") +
      '<section class="section"><div class="page-shell bb-reader">' +
      '<div><div class="bb-image-frame">' + image + '</div><nav class="bb-page-nav">' + (prev ? linkButton(prev, "Previous page") : '<span></span>') + linkButton(this.routeHref("pages"), "All pages") + (next ? linkButton(next, "Next page") : '<span></span>') + '</nav></div>' +
      '<div class="bb-reader-side bb-grid">' +
      safety +
      '<section class="bb-panel"><h2>Page record</h2><dl class="bb-kv"><div><dt>Printed identifier</dt><dd>' + esc(page.bates || extractBates(page) || "GAPS - Bates value not visible in loaded data") + '</dd></div><div><dt>Book section</dt><dd>' + esc(section) + '</dd></div><div><dt>Attribution status</dt><dd><div class="bb-badges">' + contributionStatus + '</div></dd></div></dl><div class="bb-badges">' + publicFeatureBadges(page, records) + '</div></section>' +
      '<section class="bb-panel"><h2>Public transcription</h2>' + transcript + '</section>' +
      '<section class="bb-panel"><h2>Objective page description</h2>' + itemList(page.observations, "GAPS - objective observations not loaded.") + '</section>' +
      '<section class="bb-panel"><h2>Document strings detected</h2>' + itemList(publicDocs, "No publication-safe document strings loaded for this page.") + '<p>Document strings are not identity verification and do not establish attribution.</p></section>' +
      '<section class="bb-panel"><h2>Research notes</h2>' + itemList(reviews.slice(0, 6).map(function (item) { return item.issue + ": " + item.recommended_action; }), "No automatic review issues queued for this page.") + '</section>' +
      '<section class="bb-panel"><h2>Related contributors/pages</h2>' + (records.length ? '<ul>' + records.map(function (record) { return '<li><a class="bb-inline-link" href="' + attr(this.routeHref("people/" + record.slug)) + '">' + esc(record.display_name) + '</a> - ' + esc(statusLabel(record.classification)) + '</li>'; }, this).join("") + '</ul>' : '<p>No contributor or mention record is loaded for this page.</p>') + '</section>' +
      '<section class="bb-panel"><h2>Source provenance</h2><p><strong>Source label:</strong> ' + esc(page.source_label) + '</p><p><strong>Source links:</strong> ' + sourceLine + '</p><p><strong>Rule:</strong> no identity is inferred from photos, OCR, or handwriting alone.</p></section>' +
      '<details class="bb-processing"><summary>Processing details</summary><div class="bb-processing-body"><p>Internal extraction fields are retained for audit review and are not used as public attribution proof.</p><p><strong>OCR gate:</strong> ' + esc(quality.publish ? "public display uses validated page strings" : "withheld - " + asArray(quality.reasons).join("; ")) + '</p></div></details>' +
      '</div></div></section>';
  };

  BirthdayBookApp.prototype.renderPeople = function () {
    var groups = [
      ["Verified contributors", this.identities.filter(function (r) { return r.status === "verified"; })],
      ["Probable contributors", this.identities.filter(function (r) { return r.status === "probable"; })],
      ["Mentioned people", this.identities.filter(function (r) { return r.classification === "mentioned_only"; })],
      ["Unresolved attributions", this.identities.filter(function (r) { return r.status === "open" && r.classification !== "mentioned_only"; })],
      ["Redacted entries", []]
    ];
    return this.hero("People", "Contributor and mention status", "This replaces the V1 open-identities view. Names are separated by evidence basis and every card preserves uncertainty.") +
      '<section class="section"><div class="page-shell bb-grid">' + groups.map(function (group) {
        return '<section><div class="section-head"><div><p class="eyebrow">' + esc(group[0]) + '</p><h2>' + esc(group[1].length) + ' records</h2></div></div>' + this.personGrid(group[1], "No records in this category for the current public reader.") + '</section>';
      }, this).join("") + '</div></section>';
  };

  BirthdayBookApp.prototype.personGrid = function (records, emptyText) {
    var self = this;
    if (!records.length) return '<div class="bb-empty">' + esc(emptyText) + '</div>';
    return '<div class="bb-card-grid">' + records.slice(0, 90).map(function (record) {
      var pages = asArray(record.pages).join(", ");
      return '<article class="bb-person-card"><h3>' + esc(record.display_name) + '</h3><p>' + esc(statusLabel(record.classification)) + ' · pages ' + esc(pages || "GAPS") + '</p><div class="bb-badges">' + badge(record.status || "open", record.status === "verified" ? "verified" : record.status === "probable" ? "probable" : "open") + '</div><div class="bb-actions">' + linkButton(self.routeHref("people/" + record.slug), "Open record", "primary") + '</div></article>';
    }).join("") + '</div>';
  };

  BirthdayBookApp.prototype.renderPerson = function (slug) {
    var record = this.identities.find(function (item) { return item.slug === slug; });
    if (!record) return this.hero("People", "Person record GAPS", "No matching identity record was loaded.") + '<section class="section"><div class="page-shell"><div class="bb-empty">No matching record.</div></div></section>';
    var evidence = asArray(record.evidence).map(function (item) {
      var bates = clean(item.bates) ? ' · ' + esc(item.bates) : '';
      var release = clean(item.source_release_url) ? ' · <a class="bb-inline-link" href="' + attr(item.source_release_url) + '">source release</a>' : '';
      return '<li>' + esc(item.claim) + ' <a class="bb-inline-link" href="' + attr(item.source) + '">page ' + esc(item.page) + '</a>' + bates + release + '</li>';
    }).join("");
    var sources = asArray(record.external_sources);
    var sourceList = sources.length ? '<ul>' + sources.map(function (source) {
      var url = clean(source.url);
      return '<li><a class="bb-inline-link" href="' + attr(url) + '">' + esc(source.title || source.publisher || url) + '</a>' +
        (source.publisher ? ' · ' + esc(source.publisher) : '') +
        (source.date ? ' · ' + esc(source.date) : '') +
        (source.supports ? '<br><span>' + esc(source.supports) + '</span>' : '') + '</li>';
    }).join("") + '</ul>' : '<p>No external sources are attached in this public record.</p>';
    return this.hero("Person record", record.display_name, "Contributor status, evidence basis, contribution-versus-mention distinction, confidence, sources, and unresolved issues.") +
      '<section class="section"><div class="page-shell bb-two-col">' +
      '<section class="bb-panel"><h2>Status</h2><dl class="bb-kv"><div><dt>Contributor status</dt><dd>' + esc(statusLabel(record.classification)) + '</dd></div><div><dt>Book section</dt><dd>' + esc(record.book_section || "Unassigned") + '</dd></div><div><dt>Pages</dt><dd>' + esc(asArray(record.pages).join(", ")) + '</dd></div><div><dt>Contribution pages</dt><dd>' + esc(asArray(record.contribution_pages).join(", ") || "None confirmed") + '</dd></div><div><dt>Mention pages</dt><dd>' + esc(asArray(record.mention_pages).join(", ") || "None loaded") + '</dd></div><div><dt>Confidence</dt><dd>' + esc(record.status || "open") + '</dd></div></dl></section>' +
      '<section class="bb-panel"><h2>Research summary</h2><p>' + esc(record.research_summary || "This record is built from document strings and page evidence. It is not an externally verified identity statement unless marked verified and backed by sources.") + '</p><h3>Evidence basis</h3><ul>' + (evidence || '<li>GAPS - no evidence rows loaded.</li>') + '</ul><h3>Sources</h3>' + sourceList + '<h3>Open issues</h3>' + itemList(record.open_questions, "No open issues loaded.") + '</section>' +
      '</div></section>';
  };

  BirthdayBookApp.prototype.renderSections = function () {
    var self = this;
    var groups = {};
    this.pageSummaries.forEach(function (page) {
      var section = self.sectionForPage(page.page);
      if (!groups[section]) groups[section] = [];
      groups[section].push(page);
    });
    return this.hero("Sections", "Book sections", "Visible section dividers organize navigation but do not verify contribution attribution.") +
      '<section class="section"><div class="page-shell bb-section-grid">' + Object.keys(groups).map(function (section) {
        return '<article class="bb-card"><h2>' + esc(section) + '</h2><p>' + esc(groups[section].length) + ' pages currently mapped.</p><div class="bb-actions">' + linkButton(self.routeHref("pages") + "?q=" + encodeURIComponent(section), "View pages") + '</div></article>';
      }).join("") + '</div></section>';
  };

  BirthdayBookApp.prototype.renderUnresolved = function () {
    var cases = this.reviewCases.length ? this.reviewCases : this.reviewQueue.map(function (item) {
      return {
        page: item.page,
        priority: item.priority,
        grouped_issue_count: 1,
        issue_labels: [item.issue],
        people: [],
        recommended_action: item.recommended_action
      };
    });
    return this.hero("Review queue", "Unresolved attributions and GAPS", "Grouped page/person cases for handwriting, low-confidence transcript, signature candidates, famous-name attributions, redactions, safety blocks, and multiple possible contributors.") +
      '<section class="section"><div class="page-shell bb-grid"><div class="bb-stat-grid"><div class="bb-stat"><strong>' + esc(cases.length) + '</strong><span>Grouped cases</span></div><div class="bb-stat"><strong>' + esc(this.reviewQueue.length) + '</strong><span>Raw review items</span></div><div class="bb-stat"><strong>' + esc(cases.filter(function (i) { return i.priority === "high"; }).length) + '</strong><span>High priority cases</span></div><div class="bb-stat"><strong>' + esc(cases.filter(function (i) { return asArray(i.issue_labels).some(function (issue) { return /safety/i.test(issue); }); }).length) + '</strong><span>Safety/GAPS cases</span></div></div>' +
      '<div class="bb-result-grid">' + cases.slice(0, 120).map(function (item) {
        var people = asArray(item.people).map(function (person) { return person.display_name; }).filter(Boolean).join(", ");
        var issueLabels = asArray(item.issue_labels).join(", ");
        var heading = 'Page ' + item.page + (people ? ' - ' + people : '');
        return '<article class="bb-result"><h3>' + esc(heading) + '</h3><p>' + esc(publicBirthdayText(item.recommended_action || 'Review before public attribution or transcript use.')) + '</p><p>' + esc(publicBirthdayText(issueLabels || 'Review case')) + ' · ' + esc(item.grouped_issue_count || 1) + ' linked item' + (Number(item.grouped_issue_count || 1) === 1 ? '' : 's') + '</p><div class="bb-badges">' + badge(item.priority || 'open', item.priority === "high" ? "gap" : "review") + '</div><div class="bb-actions">' + linkButton(this.routeHref("pages/" + item.page), "Open page", "primary") + '</div></article>';
      }, this).join("") + '</div></div></section>';
  };

  BirthdayBookApp.prototype.renderMethodology = function () {
    return this.hero("Methodology", "How this reader handles evidence", "The V2 reader is designed to be public-facing, conservative, and source-bound.") +
      '<section class="section"><div class="page-shell bb-grid">' +
      '<section class="bb-panel"><h2>What the book establishes</h2><p>The scan establishes visible page content, order, page images, source-control markings, and curated visual observations. It does not by itself establish contribution attribution, identity, intent, relationship, knowledge, or conduct.</p></section>' +
      '<section class="bb-panel"><h2>Attribution categories</h2><ul><li>Contributor: a contribution is located and the attribution has supporting evidence.</li><li>Signer: a signature-like mark is visible and treated as a document string pending verification.</li><li>Named subject: a person appears in text or caption but is not treated as a contributor.</li><li>Mentioned person: a name appears inside another contribution.</li><li>Table-of-contents attribution: a TOC string exists, but the corresponding contribution still needs review.</li><li>Unresolved document string: a name-like string remains open.</li></ul></section>' +
      '<section class="bb-panel"><h2>OCR and vision rules</h2><p>Low-quality OCR remains available to internal search but is not displayed as a public transcript, page-card summary, title, quote, claim, or identity candidate. Handwriting is withheld until a dedicated transcription pass or human review supports public display.</p></section>' +
      '<section class="bb-panel"><h2>External verification</h2><p>Famous or disputed attributions require page evidence plus independent source support before they can be presented as verified. Records not marked verified remain probable, mentioned-only, association-only, unresolved, or redacted.</p></section>' +
      '<section class="bb-panel"><h2>Known redactions and limitations</h2><p>Redactions are shown as document conditions. The reader does not attempt to defeat redactions and does not identify people from appearance in photographs.</p></section>' +
      '</div></section>';
  };

  BirthdayBookApp.prototype.renderContent = async function () {
    if (this.state.section === "pages" && this.state.page) return this.renderPage(this.state.page);
    if (this.state.section === "pages") return this.renderPages();
    if (this.state.section === "people" && this.state.personSlug) return this.renderPerson(this.state.personSlug);
    if (this.state.section === "people") return this.renderPeople();
    if (this.state.section === "sections") return this.renderSections();
    if (this.state.section === "unresolved") return this.renderUnresolved();
    if (this.state.section === "methodology") return this.renderMethodology();
    return this.renderLanding();
  };

  async function fetchJson(url) {
    var response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(url + " HTTP " + response.status);
    return response.json();
  }

  async function boot() {
    var root = document.getElementById("birthday-book-v2-root");
    if (!root) return;
    try {
      var data = {
        manifest: await fetchJson(root.getAttribute("data-manifest")),
        identities: await fetchJson(root.getAttribute("data-identities")),
        reviewQueue: await fetchJson(root.getAttribute("data-review-queue")),
        reviewCases: root.getAttribute("data-review-cases") ? await fetchJson(root.getAttribute("data-review-cases")) : { cases: [] },
        quality: await fetchJson(root.getAttribute("data-quality")),
        transcriptIndex: root.getAttribute("data-transcripts") ? await fetchJson(root.getAttribute("data-transcripts")) : { pages: [] }
      };
      var app = new BirthdayBookApp(root, data);
      await app.renderShell();
      window.BirthdayBookV2 = app;
    } catch (error) {
      root.innerHTML = '<section class="section"><div class="page-shell"><div class="feature-panel"><p class="eyebrow">GAPS</p><h1>Birthday Book V2 failed to load</h1><p>' + esc(error.message || error) + '</p></div></div></section>';
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
