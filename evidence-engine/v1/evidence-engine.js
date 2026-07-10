(function () {
  "use strict";

  const FILTERS = [
    ["handwriting", "Handwriting"],
    ["signature", "Signature"],
    ["redaction", "Redaction"],
    ["drawing", "Drawing"],
    ["photo", "Photo"],
    ["date", "Date"],
    ["sparse-ocr", "Sparse OCR"],
    ["gaps", "GAPS"]
  ];

  const ROUTES = [
    ["", "Overview"],
    ["pages", "Pages"],
    ["people", "Document strings"],
    ["open-identities", "Open identities"],
    ["visuals", "Visuals"],
    ["redactions", "Redactions"],
    ["handwriting", "Handwriting"]
  ];

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

  function asArray(value) {
    if (Array.isArray(value)) return value;
    if (value == null || value === "") return [];
    return [value];
  }

  function cleanText(value) {
    if (value == null) return "";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return String(value).trim();
    }
    if (typeof value === "object") {
      const keys = ["text", "value", "label", "summary", "note", "notes", "observation", "description", "candidate", "string"];
      for (const key of keys) {
        if (value[key] != null && String(value[key]).trim()) return String(value[key]).trim();
      }
      return Object.entries(value)
        .filter(([, v]) => v != null && typeof v !== "object")
        .slice(0, 4)
        .map(([k, v]) => `${k}: ${v}`)
        .join("; ");
    }
    return "";
  }

  function getAny(source, keys) {
    for (const key of keys) {
      if (source && source[key] != null) return source[key];
    }
    return undefined;
  }

  function unique(values) {
    const seen = new Set();
    return values
      .map(cleanText)
      .filter(Boolean)
      .filter((value) => {
        const key = value.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function pagePad(pageNumber) {
    return String(Number(pageNumber) || 0).padStart(3, "0");
  }

  function safeHref(value) {
    const href = cleanText(value);
    if (!href) return "";
    if (/^https?:\/\//i.test(href)) return href;
    if (href.startsWith("/") && !href.startsWith("//") && !href.includes("..")) return href;
    return "";
  }

  function safeSourceLabel(value) {
    const label = cleanText(value);
    if (!label) return "";
    const privateRoots = ["/" + "Users/", "/" + "volume1/"];
    if (privateRoots.some((root) => label.includes(root)) || /^[A-Za-z]:\\/i.test(label)) return "Local source path withheld";
    return label;
  }

  function itemList(items, emptyText) {
    const values = unique(items);
    if (!values.length) return `<p>${esc(emptyText)}</p>`;
    return `<ul>${values.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`;
  }

  function routeState(baseRoute) {
    const path = window.location.pathname.replace(/\/+$/, "");
    const base = baseRoute.replace(/\/+$/, "");
    let rel = path === base ? "" : path.slice(base.length).replace(/^\/+/, "");
    const parts = rel ? rel.split("/") : [];
    const params = new URLSearchParams(window.location.search);
    return {
      rel,
      section: parts[0] || "",
      page: parts[0] === "pages" && parts[1] ? Number(parts[1].replace(/^page[_-]?/i, "")) : 0,
      q: params.get("q") || "",
      filter: params.get("filter") || ""
    };
  }

  class EvidenceGapBadge {
    constructor(label, detail) {
      this.label = label || "GAPS";
      this.detail = detail || "";
    }

    render() {
      const title = this.detail ? ` title="${attr(this.detail)}"` : "";
      return `<span class="ee-gap-badge"${title}>${esc(this.label)}</span>`;
    }
  }

  class EvidenceReceiptCard {
    constructor(title, body, meta) {
      this.title = title;
      this.body = body;
      this.meta = meta || {};
    }

    render() {
      const tags = asArray(this.meta.tags).map((tag) => `<span class="ee-tag">${esc(tag)}</span>`).join("");
      const href = safeHref(this.meta.href);
      const link = href ? `<a class="ee-action" href="${attr(href)}">Open source</a>` : "";
      return `
        <article class="ee-result">
          <h3>${esc(this.title)}</h3>
          <p>${esc(this.body || "No derived receipt text available.")}</p>
          ${tags ? `<div class="ee-badges">${tags}</div>` : ""}
          ${link}
        </article>
      `;
    }
  }

  class EvidenceSourcePanel {
    constructor(dataset, page) {
      this.dataset = dataset;
      this.page = page;
    }

    render() {
      const source = this.page.source || {};
      const sourcePdf = safeHref(source.pdf || source.source_pdf || source.sourcePdf || this.dataset.source.pdf);
      const sourceLabel = safeSourceLabel(source.label || source.source_label || this.dataset.source.label || this.dataset.title);
      const bates = cleanText(source.bates || source.bates_number || source.batesRange || source.bates_range || this.page.bates);
      const sourceLine = sourcePdf
        ? `<p><strong>Source PDF:</strong> <a href="${attr(sourcePdf)}">Open source PDF</a></p>`
        : `<p><strong>Source PDF:</strong> <span>GAPS - source PDF link not available in loaded data.</span></p>`;
      const batesLine = bates
        ? `<p><strong>Bates:</strong> ${esc(bates)}</p>`
        : `<p><strong>Bates:</strong> <span>GAPS - Bates value not available in loaded data.</span></p>`;
      return `
        <section class="ee-panel">
          <h2>Source provenance</h2>
          <p><strong>Source label:</strong> ${esc(sourceLabel || "GAPS - source label not available")}</p>
          ${sourceLine}
          ${batesLine}
          <p><strong>Evidence rule:</strong> document strings are not identity verification. This reader does not infer authorship from OCR alone.</p>
        </section>
      `;
    }
  }

  class EvidenceFilterBar {
    constructor(dataset, state) {
      this.dataset = dataset;
      this.state = state;
    }

    render() {
      const base = this.dataset.baseRoute;
      const section = this.state.section ? `/${this.state.rel}` : "";
      const route = `${base}${section}`;
      const q = this.state.q ? ` value="${attr(this.state.q)}"` : "";
      const filterLinks = FILTERS.map(([key, label]) => {
        const params = new URLSearchParams();
        if (this.state.q) params.set("q", this.state.q);
        if (this.state.filter === key) {
          return `<a class="ee-filter" aria-pressed="true" href="${attr(route)}${this.state.q ? `?q=${encodeURIComponent(this.state.q)}` : ""}">${esc(label)}</a>`;
        }
        params.set("filter", key);
        return `<a class="ee-filter" aria-pressed="false" href="${attr(route)}?${params.toString()}">${esc(label)}</a>`;
      }).join("");
      return `
        <section class="ee-filterbar" aria-label="Evidence filters">
          <form class="ee-search-form" action="${attr(route)}" method="get">
            <input name="q" type="search" placeholder="Search OCR, observations, document strings, dates, handwriting, redactions"${q}>
            ${this.state.filter ? `<input type="hidden" name="filter" value="${attr(this.state.filter)}">` : ""}
            <button type="submit">Search</button>
          </form>
          <div class="ee-filters">${filterLinks}</div>
        </section>
      `;
    }
  }

  class EvidencePage {
    constructor(dataset, raw, fallbackNumber) {
      this.dataset = dataset;
      this.raw = raw || {};
      this.pageNumber = Number(getAny(this.raw, ["page", "pageNumber", "page_number", "page_index", "number"])) || Number(fallbackNumber) || 0;
      this.id = cleanText(getAny(this.raw, ["id", "page_id"])) || `page_${pagePad(this.pageNumber)}`;
      this.title = cleanText(getAny(this.raw, ["title", "label"])) || `Page ${this.pageNumber}`;
      this.ocrText = this.normalizeOcr();
      this.observations = this.normalizeList(["observations", "vision_observations", "objective_vision_observations", "visual_observations"]);
      this.signatures = this.normalizeList(["signatures", "signature_marks", "signatureCandidates", "signature_candidates"]);
      this.handwriting = this.normalizeList(["handwriting", "handwriting_candidates", "handwritingCandidates", "handwriting_notes"]);
      this.redactions = this.normalizeList(["redactions", "visual_redactions", "redaction_notes", "redactionNotes"]);
      this.dates = unique(asArray(getAny(this.raw, ["dates", "date_candidates", "dateCandidates", "date_strings"])));
      this.documentStrings = unique(asArray(getAny(this.raw, ["document_strings", "documentStrings", "names_as_strings", "name_strings", "names", "people", "entities"])));
      this.gaps = this.normalizeList(["gaps", "gap_labels", "warnings"]);
      this.source = getAny(this.raw, ["source", "provenance"]) || {};
      this.bates = cleanText(getAny(this.raw, ["bates", "bates_number", "batesRange", "bates_range"]));
      this.image = safeHref(getAny(this.raw, ["image", "image_url", "imageUrl", "rendered_page_image", "page_image_url", "thumbnail"]));
      this.flags = this.normalizeFlags();
      this.safetyBlock = this.normalizeSafetyBlock();
      this.searchText = this.buildSearchText();
    }

    normalizeOcr() {
      const rawOcr = getAny(this.raw, ["ocr_text", "ocrText", "ocr", "text", "transcription", "page_text"]);
      if (rawOcr && typeof rawOcr === "object") {
        return cleanText(rawOcr.text || rawOcr.value || rawOcr.raw || rawOcr.plaintext);
      }
      return cleanText(rawOcr);
    }

    normalizeList(keys) {
      const value = getAny(this.raw, keys);
      return unique(asArray(value).map(cleanText));
    }

    normalizeSafetyBlock() {
      const pageBlock = getAny(this.raw, ["safety_block", "safetyBlock", "safety_notice", "safetyNotice"]);
      const manifestBlock = this.dataset.safetyBlocks[String(this.pageNumber)];
      const block = pageBlock || manifestBlock;
      if (!block) return null;
      if (typeof block === "string") return { label: "Safety-block / GAPS notice", detail: block };
      return {
        label: cleanText(block.label || block.title) || "Safety-block / GAPS notice",
        detail: cleanText(block.detail || block.note || block.reason) || "This page is intentionally rendered as a GAPS notice."
      };
    }

    normalizeFlags() {
      const flags = new Set(asArray(getAny(this.raw, ["flags", "labels", "facets"])).map((flag) => cleanText(flag).toLowerCase()).filter(Boolean));
      const allVisual = `${this.observations.join(" ")} ${cleanText(this.raw.visual_type)} ${cleanText(this.raw.media_type)}`.toLowerCase();
      if (this.handwriting.length) flags.add("handwriting");
      if (this.signatures.length) flags.add("signature");
      if (this.redactions.length) flags.add("redaction");
      if (this.dates.length) flags.add("date");
      if (!this.ocrText || this.ocrText.length < 40) flags.add("sparse-ocr");
      if (/\bdrawing\b|\bsketch\b|\billustration\b/.test(allVisual)) flags.add("drawing");
      if (/\bphoto\b|\bphotograph\b|\bimage\b/.test(allVisual)) flags.add("photo");
      if (this.gaps.length || this.raw.canonical_status === "missing" || this.raw.gaps === true) flags.add("gaps");
      if (this.pageNumber === 30) flags.add("gaps");
      return Array.from(flags);
    }

    buildSearchText() {
      return [
        this.title,
        `page ${this.pageNumber}`,
        this.ocrText,
        this.observations.join(" "),
        this.signatures.join(" "),
        this.handwriting.join(" "),
        this.redactions.join(" "),
        this.dates.join(" "),
        this.documentStrings.join(" "),
        this.gaps.join(" "),
        this.flags.join(" ")
      ].join(" ").toLowerCase();
    }

    matchesFilter(filter) {
      if (!filter) return true;
      return this.flags.includes(filter);
    }

    matchesQuery(query) {
      const q = cleanText(query).toLowerCase();
      if (!q) return true;
      return this.searchText.includes(q);
    }
  }

  class EvidenceDataset {
    constructor(manifest, baseRoute) {
      this.manifest = manifest || {};
      this.id = cleanText(this.manifest.id) || "evidence-dataset";
      this.title = cleanText(this.manifest.title) || "Evidence dataset";
      this.subtitle = cleanText(this.manifest.subtitle);
      this.mode = cleanText(this.manifest.mode || this.manifest.dataMode) || "Evidence Reader Mode";
      this.baseRoute = baseRoute || this.manifest.baseRoute || "/research/evidence";
      this.dataBase = cleanText(this.manifest.dataBase) || "";
      this.totalPages = Number(this.manifest.totalPages || this.manifest.pageCount || this.manifest.page_count || 0);
      this.source = this.manifest.source || {};
      this.gaps = asArray(this.manifest.gaps).map(cleanText).filter(Boolean);
      this.safetyBlocks = this.manifest.safetyBlocks || {};
      this.adminDataBadge = this.manifest.adminDataBadge || this.manifest.admin_data_badge || {};
      this.visionPending = cleanText(this.adminDataBadge.vision_enrichment || this.manifest.indexes?.status?.vision_enrichment).toLowerCase() === "pending";
      this.derivedVisionIndexesPending = cleanText(this.adminDataBadge.signature_redaction_handwriting_indexes || this.manifest.indexes?.status?.signature_redaction_handwriting_indexes).toLowerCase() === "pending";
      this.pageFilesAvailable = Boolean(this.manifest.pageFilesAvailable);
      this.pages = new Map();
      this.indexPages = this.buildIndexPages();
    }

    static async load(url, baseRoute) {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Manifest failed: ${res.status}`);
      const manifest = await res.json();
      return new EvidenceDataset(manifest, baseRoute);
    }

    buildIndexPages() {
      const manifestPages = Array.isArray(this.manifest.pages) ? this.manifest.pages : [];
      const byPage = new Map();
      for (const item of manifestPages) {
        const page = new EvidencePage(this, item, item && item.page);
        byPage.set(page.pageNumber, page);
      }
      if (!this.totalPages && byPage.size) this.totalPages = Math.max(...byPage.keys());
      for (let page = 1; page <= this.totalPages; page += 1) {
        if (!byPage.has(page)) byPage.set(page, this.stubPage(page));
      }
      return Array.from(byPage.values()).sort((a, b) => a.pageNumber - b.pageNumber);
    }

    stubPage(pageNumber) {
      const gaps = ["Canonical page JSON not loaded"];
      if (pageNumber === 30) gaps.push("Safety-block page rendered as GAPS stub");
      return new EvidencePage(this, {
        page: pageNumber,
        title: `Page ${pageNumber}`,
        canonical_status: "missing",
        gaps,
        observations: [],
        ocr_text: "",
        source: this.source,
        safety_block: pageNumber === 30 ? {
          label: "Safety-block / GAPS notice",
          detail: "Page 30 is intentionally rendered as a GAPS stub when the canonical Birthday Book vision JSON is unavailable."
        } : null
      }, pageNumber);
    }

    pageSummary(pageNumber) {
      return this.indexPages.find((page) => page.pageNumber === Number(pageNumber)) || this.stubPage(pageNumber);
    }

    async page(pageNumber) {
      const number = Number(pageNumber) || 1;
      if (this.pages.has(number)) return this.pages.get(number);
      const indexed = this.pageSummary(number);
      if (!this.pageFilesAvailable || !this.dataBase) {
        this.pages.set(number, indexed);
        return indexed;
      }
      const jsonFile = cleanText(indexed.raw.json || indexed.raw.json_file || `pages/page_${pagePad(number)}.json`);
      if (!jsonFile || jsonFile.includes("..") || jsonFile.startsWith("/")) {
        this.pages.set(number, indexed);
        return indexed;
      }
      try {
        const res = await fetch(`${this.dataBase.replace(/\/+$/, "")}/${jsonFile}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`page ${number} HTTP ${res.status}`);
        const raw = await res.json();
        const page = new EvidencePage(this, { ...indexed.raw, ...raw }, number);
        this.pages.set(number, page);
        return page;
      } catch (error) {
        const fallback = new EvidencePage(this, {
          ...indexed.raw,
          gaps: [...indexed.gaps, `Page JSON fetch failed: ${error.message}`],
          canonical_status: "missing"
        }, number);
        this.pages.set(number, fallback);
        return fallback;
      }
    }

    stats() {
      const pages = this.indexPages;
      const count = (filter) => pages.filter((page) => page.matchesFilter(filter)).length;
      return {
        pages: this.totalPages || pages.length,
        signatures: count("signature"),
        handwriting: count("handwriting"),
        redactions: count("redaction"),
        gaps: count("gaps"),
        ocrFiles: Number(this.adminDataBadge.ocr_files_loaded || this.adminDataBadge.ocrFilesLoaded || 0),
        images: Number(this.adminDataBadge.images_loaded || this.adminDataBadge.imagesLoaded || 0),
        visionStatus: cleanText(this.adminDataBadge.vision_enrichment || "unknown"),
        indexStatus: cleanText(this.adminDataBadge.signature_redaction_handwriting_indexes || "unknown")
      };
    }

    search(query, filter, limit) {
      return this.indexPages
        .filter((page) => page.matchesFilter(filter) && page.matchesQuery(query))
        .slice(0, limit || 120);
    }

    documentStrings(filterOpenOnly) {
      const rows = [];
      for (const page of this.indexPages) {
        for (const value of page.documentStrings) {
          rows.push({ page: page.pageNumber, value, open: true, flags: page.flags });
        }
      }
      if (!rows.length && this.gaps.length) {
        rows.push({ page: 0, value: "GAPS - canonical document strings index not loaded", open: true, flags: ["gaps"] });
      }
      return filterOpenOnly ? rows.filter((row) => row.open) : rows;
    }
  }

  class EvidenceReader {
    constructor(root, dataset) {
      this.root = root;
      this.dataset = dataset;
      this.state = routeState(dataset.baseRoute);
    }

    async render() {
      this.state = routeState(this.dataset.baseRoute);
      const content = await this.renderContent();
      this.root.innerHTML = `
        <div class="ee-shell">
          ${this.renderTopbar()}
          ${new EvidenceFilterBar(this.dataset, this.state).render()}
          ${content}
          <p class="ee-footer-note">Evidence Engine V1. JSON page files are canonical; TSV files are derived indexes. Missing source fields render as GAPS.</p>
        </div>
      `;
      this.bindSearch();
    }

    renderTopbar() {
      const nav = ROUTES.map(([slug, label]) => {
        const href = `${this.dataset.baseRoute}${slug ? `/${slug}` : ""}`;
        const active = (this.state.section || "") === slug || (!slug && !this.state.section);
        return `<a href="${attr(href)}" ${active ? `aria-current="page"` : ""}>${esc(label)}</a>`;
      }).join("");
      return `
        <header class="ee-topbar">
          <div class="ee-title-row">
            <p class="ee-kicker">Grok Archive Hub evidence engine</p>
            <h1>${esc(this.dataset.title)}</h1>
            <p class="ee-lede">${esc(this.dataset.subtitle || "Source-first archive reader for OCR text, vision observations, document strings, signatures, handwriting candidates, redactions, dates, receipt cards, provenance, and explicit GAPS labels.")}</p>
            <div class="ee-status-row">
              <span class="ee-status-badge">${esc(this.dataset.mode)}</span>
              ${this.dataset.visionPending ? `<span class="ee-status-badge ee-status-pending">Vision enrichment pending</span>` : ""}
            </div>
          </div>
          <nav class="ee-nav" aria-label="Evidence reader routes">${nav}</nav>
        </header>
      `;
    }

    bindSearch() {
      const form = this.root.querySelector(".ee-search-form");
      if (!form) return;
      form.addEventListener("submit", () => {});
    }

    async renderContent() {
      if (this.state.section === "pages" && this.state.page) {
        return this.renderPage(await this.dataset.page(this.state.page));
      }
      if (this.state.section === "pages") return this.renderPages();
      if (this.state.section === "people") return this.renderDocumentStrings(false);
      if (this.state.section === "open-identities") return this.renderDocumentStrings(true);
      if (this.state.section === "visuals") return this.renderFilteredListing("Visuals", ["drawing", "photo"], "Vision observations, drawings, photos, and other visual page features.");
      if (this.state.section === "redactions") return this.renderFilteredListing("Redactions", ["redaction"], "Visual redaction notes and redaction-related GAPS.");
      if (this.state.section === "handwriting") return this.renderFilteredListing("Handwriting", ["handwriting", "signature"], "Handwriting candidates and signature marks. These are document strings, not verified identities.");
      return this.renderOverview();
    }

    renderOverview() {
      const stats = this.dataset.stats();
      const gaps = this.dataset.gaps.map((gap) => new EvidenceGapBadge("GAPS", gap).render()).join("");
      const results = this.dataset.search(this.state.q, this.state.filter, 24);
      return `
        <section class="ee-listing-header">
          ${this.dataset.gaps.length ? `<section class="ee-panel ee-warning"><h2>Data load GAPS</h2><div class="ee-badges">${gaps}</div></section>` : ""}
          ${this.renderAdminDataBadge(stats)}
          <section class="ee-panel">
            <h2>Reader rules</h2>
            <p>Use document string wording unless an identity is externally verified. OCR text, handwriting candidates, and signature marks do not imply authorship by themselves.</p>
          </section>
        </section>
        ${this.renderPageResults(results, "Search and filter results")}
      `;
    }

    renderPages() {
      const pages = this.dataset.search(this.state.q, this.state.filter, 238);
      return `
        <section class="ee-listing-header">
          <h2>Pages</h2>
          <p class="ee-lede">Page routes are stable even when canonical JSON is missing. Missing page fields render as GAPS labels.</p>
        </section>
        ${this.renderPageGrid(pages)}
      `;
    }

    renderPage(page) {
      const prev = page.pageNumber > 1 ? `${this.dataset.baseRoute}/pages/${page.pageNumber - 1}` : "";
      const next = page.pageNumber < this.dataset.totalPages ? `${this.dataset.baseRoute}/pages/${page.pageNumber + 1}` : "";
      const flags = page.flags.map((flag) => `<span class="ee-tag">${esc(flag)}</span>`).join("");
      const gaps = page.gaps.map((gap) => new EvidenceGapBadge("GAPS", gap).render()).join("");
      const safety = page.safetyBlock ? `
        <section class="ee-panel ee-warning">
          <h2>${esc(page.safetyBlock.label)}</h2>
          <p>${esc(page.safetyBlock.detail)}</p>
        </section>` : "";
      const image = page.image
        ? `<img class="ee-page-image" src="${attr(page.image)}" alt="${attr(`Rendered page image for page ${page.pageNumber}`)}">`
        : `<div class="ee-image-placeholder"><strong>Page image GAPS</strong><span>Rendered page image not available in loaded data for page ${esc(page.pageNumber)}.</span></div>`;
      const pendingText = this.dataset.derivedVisionIndexesPending ? "Vision enrichment pending." : "No loaded records for this page.";
      return `
        <section class="ee-reader">
          <div class="ee-page-stage">
            <div class="ee-page-toolbar">
              <span class="ee-page-label">Page ${esc(page.pageNumber)} of ${esc(this.dataset.totalPages || "?")}</span>
              <a class="ee-pill" href="${attr(this.dataset.baseRoute)}/pages">All pages</a>
            </div>
            <div class="ee-image-frame">${image}</div>
            <nav class="ee-page-nav" aria-label="Page navigation">
              ${prev ? `<a class="ee-page-link" href="${attr(prev)}">Previous page</a>` : `<span class="ee-page-link" aria-disabled="true">Previous page</span>`}
              ${next ? `<a class="ee-page-link" href="${attr(next)}">Next page</a>` : `<span class="ee-page-link" aria-disabled="true">Next page</span>`}
            </nav>
          </div>
          <div class="ee-panels">
            ${safety}
            <section class="ee-panel">
              <h2>Evidence labels</h2>
              <div class="ee-badges">${flags || `<span class="ee-tag">no derived labels</span>`}${gaps}</div>
            </section>
            <section class="ee-panel">
              <h2>OCR text</h2>
              ${page.ocrText ? `<pre>${esc(page.ocrText)}</pre>` : `<p>GAPS - OCR text not available or too sparse in loaded data.</p>`}
            </section>
            <section class="ee-panel"><h2>Objective vision observations</h2>${itemList(page.observations, "GAPS - objective vision observations not loaded for this page.")}</section>
            <section class="ee-panel"><h2>Document strings</h2>${itemList(page.documentStrings, "No document strings loaded for this page.")}</section>
            <section class="ee-panel"><h2>Signatures</h2>${itemList(page.signatures, pendingText)}</section>
            <section class="ee-panel"><h2>Handwriting candidates</h2>${itemList(page.handwriting, pendingText)}</section>
            <section class="ee-panel"><h2>Redactions</h2>${itemList(page.redactions, pendingText)}</section>
            <section class="ee-panel"><h2>Dates</h2>${itemList(page.dates, "No date strings loaded for this page.")}</section>
            ${new EvidenceSourcePanel(this.dataset, page).render()}
            ${new EvidenceReceiptCard(`Receipt card - page ${page.pageNumber}`, "This card summarizes the loaded page record without adding authorship or identity claims beyond verified source fields.", { tags: page.flags }).render()}
          </div>
        </section>
      `;
    }

    renderDocumentStrings(openOnly) {
      const rows = this.dataset.documentStrings(openOnly).filter((row) => {
        if (this.state.filter && !row.flags.includes(this.state.filter)) return false;
        if (this.state.q && !row.value.toLowerCase().includes(this.state.q.toLowerCase())) return false;
        return true;
      });
      const title = openOnly ? "Open identity strings" : "Document strings";
      const cards = rows.map((row) => `
        <article class="ee-result">
          <h3>${esc(row.value)}</h3>
          <p>${row.page ? `Document string on page ${esc(row.page)}. Identity remains open unless externally verified.` : "Dataset-level GAPS item."}</p>
          ${row.page ? `<a class="ee-action" href="${attr(this.dataset.baseRoute)}/pages/${attr(row.page)}">Open page</a>` : ""}
        </article>
      `).join("");
      return `
        <section class="ee-listing-header">
          <h2>${esc(title)}</h2>
          <p class="ee-lede">This route uses document string wording. It does not convert OCR, handwriting, or signatures into identity claims.</p>
        </section>
        <div class="ee-results">${cards || `<div class="ee-empty">No matching document strings in the loaded data.</div>`}</div>
      `;
    }

    renderFilteredListing(title, filters, description) {
      const pages = this.dataset.indexPages.filter((page) => {
        const filterHit = filters.some((filter) => page.matchesFilter(filter));
        const activeHit = this.state.filter ? page.matchesFilter(this.state.filter) : true;
        return filterHit && activeHit && page.matchesQuery(this.state.q);
      });
      return `
        <section class="ee-listing-header">
          <h2>${esc(title)}</h2>
          <p class="ee-lede">${esc(description)}</p>
          ${this.dataset.derivedVisionIndexesPending ? `<section class="ee-panel ee-pending"><h3>Vision enrichment pending</h3><p>Signature, redaction, handwriting, drawing, and photo indexes are pending model enrichment.</p></section>` : ""}
        </section>
        ${this.renderPageGrid(pages, this.dataset.derivedVisionIndexesPending ? "Vision enrichment pending." : "No matching page records in the loaded data.")}
      `;
    }

    renderPageResults(pages, title) {
      return `
        <section>
          <div class="ee-listing-header"><h2>${esc(title)}</h2></div>
          ${this.renderPageGrid(pages)}
        </section>
      `;
    }

    renderPageGrid(pages, emptyText) {
      if (!pages.length) return `<div class="ee-empty">${esc(emptyText || "No matching page records in the loaded data.")}</div>`;
      return `<div class="ee-page-grid">${pages.map((page) => this.pageCard(page)).join("")}</div>`;
    }

    pageCard(page) {
      const labels = page.flags.slice(0, 4).map((flag) => `<span class="ee-tag">${esc(flag)}</span>`).join("");
      const snippet = page.ocrText || page.observations.join(" ") || page.gaps.join(" ") || "No loaded page text.";
      return `
        <article class="ee-page-card">
          <h3>Page ${esc(page.pageNumber)}</h3>
          <p>${esc(snippet).slice(0, 170)}</p>
          <div class="ee-badges">${labels || `<span class="ee-tag">unlabeled</span>`}</div>
          <a class="ee-action" href="${attr(this.dataset.baseRoute)}/pages/${attr(page.pageNumber)}">Open page</a>
        </article>
      `;
    }

    stat(label, value) {
      return `<div class="ee-stat"><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`;
    }

    renderAdminDataBadge(stats) {
      return `
        <section class="ee-panel ee-admin-badge">
          <h2>Data status</h2>
          <div class="ee-stat-grid">
            ${this.stat("Pages loaded", stats.pages)}
            ${this.stat("OCR files loaded", stats.ocrFiles || 0)}
            ${this.stat("Images loaded", stats.images || 0)}
            ${this.stat("Vision enrichment", stats.visionStatus || "pending")}
          </div>
          <div class="ee-index-status">
            <strong>Signature/redaction/handwriting indexes:</strong>
            <span>${esc(stats.indexStatus || "pending")}</span>
          </div>
        </section>
      `;
    }
  }

  async function boot() {
    const root = document.getElementById("evidence-engine-root");
    if (!root) return;
    try {
      const datasetUrl = root.getAttribute("data-dataset-url");
      const baseRoute = root.getAttribute("data-base-route");
      const dataset = await EvidenceDataset.load(datasetUrl, baseRoute);
      const reader = new EvidenceReader(root, dataset);
      await reader.render();
      window.GrokEvidenceEngine = { EvidenceDataset, EvidencePage, EvidenceReader, EvidenceFilterBar, EvidenceReceiptCard, EvidenceGapBadge, EvidenceSourcePanel };
    } catch (error) {
      root.innerHTML = `
        <section class="ee-shell">
          <div class="ee-panel ee-warning">
            <h1>Evidence reader GAPS</h1>
            <p>${esc(error.message || error)}</p>
          </div>
        </section>
      `;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
