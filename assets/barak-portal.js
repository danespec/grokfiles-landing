(() => {
  const data = window.BARAK_PORTAL_DATA;
  if (!data) return;

  const supportItems = Array.isArray(data.items) ? data.items : [];
  const archiveIndex = data.archiveIndex || {};
  let archiveEmails = [];
  let archivePdfs = [];
  let archiveLoaded = false;
  let archiveLoading = null;

  const params = new URLSearchParams(window.location.search);
  const SOURCE_SID_RE = /^\/barak\/source\/pdf\?sid=barak-src-[a-f0-9]{12}$/;

  const slotLabels = {
    recovered_email: "Recovered email",
    attachment_backed_slot: "Attachment-backed slot",
    metadata_only_slot: "Metadata-only slot"
  };

  const labels = {
    emails: "Recovered emails",
    attachment_slots: "Attachment-backed slots",
    metadata_slots: "Metadata-only slots",
    parent_pdf: "Parent PDF mirrors",
    pdfs: "PDFs",
    documents: "Documents",
    legal: "Legal",
    audio: "Audio",
    video: "Video",
    photos: "Photos",
    efta: "EFTA tags",
    flight: "Flight/log references",
    bookBlack: "Book/Black references"
  };

  const translationLabels = {
    hebrew: "Hebrew text",
    english: "English translation",
    translated: "Translated",
    needs_review: "Needs review",
    pending: "Translation pending",
    failed: "Translation failed"
  };

  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  function buildSearchText(item) {
    return [
      item.id, item.archiveId, item.type, item.title, item.subject,
      item.sender, item.recipient, item.mailbox, item.messageSlot,
      item.snippet, item.attachmentName,
      item.languageDetected, item.hebrewText, item.englishTranslation,
      item.translationStatus, item.translationSource,
      item.originalText, item.ocrStatus,
      ...(item.eftaTags || []), ...(item.tags || []), ...(item.entities || [])
    ].filter(Boolean).join(" ").toLowerCase();
  }

  function translationFilters(item) {
    const status = item.translationStatus || "missing";
    const hasHebrew = Boolean(item.hebrewText) || item.languageDetected === "hebrew";
    const hasEnglish = Boolean(item.englishTranslation);
    return {
      hebrew: hasHebrew,
      english: hasEnglish,
      translated: status === "translated",
      needs_review: status === "needs_review",
      pending: status === "pending",
      failed: status === "failed"
    };
  }

  function translationPanel(item) {
    const status = item.translationStatus || "missing";
    const hasOcr = Boolean(item.originalText) || (item.ocrStatus && item.ocrStatus !== "missing");
    if (status === "missing" && !item.hebrewText && !item.englishTranslation && !hasOcr) {
      return "";
    }
    const hebrew = item.hebrewText || "No Hebrew text isolated for this record.";
    const english = item.englishTranslation
      || (status === "pending"
        ? "Translation pending."
        : status === "failed"
          ? "Translation could not be generated for this record."
          : "No English translation available.");
    const archivalNote = status === "needs_review" || item.archivalTextOnly
      ? `<p class="translation-archival-note muted">Archival source and translation text shown for context only. Card summary does not adopt legal or accusatory phrasing from the source.</p>`
      : "";
    return `<details class="translation-panel">
      <summary>Hebrew original / English translation (${escapeHtml(status)})</summary>
      ${archivalNote}
      <div class="translation-row">
        <div class="translation-col">
          <span class="translation-label">Hebrew original</span>
          <p dir="rtl" lang="he">${escapeHtml(hebrew)}</p>
        </div>
        <div class="translation-col">
          <span class="translation-label">English translation</span>
          <p lang="en">${escapeHtml(english)}</p>
        </div>
      </div>
      ${item.originalText ? `<div class="translation-col translation-full"><span class="translation-label">Extracted OCR text</span><p>${escapeHtml(item.originalText)}</p></div>` : ""}
      <p class="translation-meta muted">Language: ${escapeHtml(item.languageDetected || "none")} · OCR: ${escapeHtml(item.ocrStatus || "missing")} · Translation: ${escapeHtml(status)} · Source: ${escapeHtml(item.translationSource || "n/a")}</p>
    </details>`;
  }

  function validSourceFile(item) {
    if (item.sourceFileEnabled === false) return false;
    return Boolean(item.sourceFile && SOURCE_SID_RE.test(String(item.sourceFile)));
  }

  function safeSourceLine(item, label) {
    const mb = item.mailbox || item.parentMailbox || "unknown";
    const slot = item.messageSlot || item.parentSlot || "unknown";
    return `${label}: mailbox ${mb}, slot ${slot}.`;
  }

  function hydrateSupportItem(item) {
    if (item.type === "parent-pdf") {
      item.sourceFile = "";
      item.sourceFileEnabled = false;
      item.source = safeSourceLine(item, item.sourceLabel || "parent_pdf_mirror");
      item.sourceLabel = item.sourceLabel || "parent_pdf_mirror";
      item.filters = {
        ...(item.filters || {}),
        parent_pdf: true,
        ...translationFilters(item)
      };
    }
    if (!item.searchText) item.searchText = buildSearchText(item);
    return item;
  }

  function hydrateArchiveItem(raw, type) {
    const item = { ...raw, type, searchText: "" };
    if (type === "email") {
      const slotClass = item.slotClass || "attachment_backed_slot";
      item.slotClass = slotClass;
      item.resultType = item.resultType || slotLabels[slotClass] || "Attachment-backed slot";
      item.title = item.subject || `${item.mailbox || "Archive"} slot ${item.messageSlot || ""}`;
      if (slotClass === "recovered_email") {
        item.sourceType = "Recovered parent message";
        item.claim = "Parent message recovered from a Gmail-export PDF mirror or docker attachment proxy.";
        item.bias = "Recovered headers and body excerpt are archive context only.";
      } else if (slotClass === "attachment_backed_slot") {
        item.sourceType = "Attachment-backed slot";
        item.claim = "Attachment folder indexed; parent email body was not recovered from the docker archive export.";
        item.bias = "This is not a full email record. Use linked PDFs for available attachment context.";
      } else {
        item.sourceType = "Metadata-only slot";
        item.claim = "Mailbox/message placeholder with no attachments and no recovered parent body.";
        item.bias = "Placeholder only; not an email receipt.";
      }
      const emailLabel = slotClass === "recovered_email"
        ? "recovered_email"
        : slotClass === "metadata_only_slot"
          ? "metadata_only_slot"
          : "attachment_backed_slot";
      item.source = safeSourceLine(item, item.sourceLabel || emailLabel);
      item.sourceLabel = item.sourceLabel || emailLabel;
      item.silence = "No purpose, relationship, legal meaning, or conduct is inferred.";
      if (item.parentPdfMirror) {
        item.parentPdfLabel = item.parentPdfLabel || "Parent PDF mirror (partial headers only)";
        item.parentPdfNote = item.parentPdfNote || "Parent PDF mirror present; slot class unchanged.";
      }
      item.filters = {
        emails: slotClass === "recovered_email",
        attachment_slots: slotClass === "attachment_backed_slot",
        metadata_slots: slotClass === "metadata_only_slot",
        parent_pdf: Boolean(item.parentPdfMirror),
        pdfs: (item.linkedPdfIds || []).length > 0,
        efta: (item.eftaTags || []).length > 0,
        ...translationFilters(item)
      };
    } else if (type === "pdf") {
      item.resultType = "PDFs";
      item.title = item.attachmentName || item.archiveId;
      item.sourceType = item.category === "legal" ? "Legal archive PDF" : "Archive PDF attachment";
      item.filters = {
        pdfs: true,
        emails: true,
        efta: (item.eftaTags || []).length > 0,
        documents: item.category !== "legal",
        legal: item.category === "legal"
      };
      item.readerStatus = validSourceFile(item)
        ? "Public archive PDF reader link available"
        : (item.ocrStatus && item.ocrStatus !== "missing"
          ? "Source link pending; OCR text available below."
          : "Public PDF reader link not available for this record");
      item.filters = {
        ...(item.filters || {}),
        ...translationFilters(item)
      };
      item.claim = "Archive PDF attachment linked to a parent email slot.";
      const pdfLabel = item.category === "legal" ? "legal_pdf" : "document_pdf";
      item.source = safeSourceLine(item, item.sourceLabel || pdfLabel);
      item.sourceLabel = item.sourceLabel || pdfLabel;
      item.bias = "Filename and extracted text are shown as archive context only.";
      item.silence = "No purpose, relationship, legal meaning, or conduct is inferred.";
    }
    item.searchText = buildSearchText(item);
    return item;
  }

  function allItems() {
    return [...supportItems, ...archiveEmails, ...archivePdfs];
  }

  function itemsById() {
    return new Map(allItems().map((item) => [item.id, item]));
  }

  async function loadArchiveIndex(scope = "") {
    if (archiveLoaded) return;
    if (archiveLoading) return archiveLoading;
    archiveLoading = (async () => {
      const emailScopes = new Set(["", "email", "attachment_slot", "metadata_slot"]);
      const pdfScopes = new Set(["", "pdf", "document", "legal"]);
      const loadEmails = emailScopes.has(scope) && archiveIndex.emailsUrl;
      const loadPdfs = pdfScopes.has(scope) && archiveIndex.pdfsUrl;
      const fetchJson = async (url) => {
        if (!url) return null;
        const response = await fetch(url);
        const contentType = response.headers.get("content-type") || "";
        if (!response.ok || !contentType.toLowerCase().includes("application/json")) return null;
        return response.json();
      };

      if (loadEmails && loadPdfs) {
        const emailsPayload = await fetchJson(archiveIndex.emailsUrl);
        if (emailsPayload) {
          archiveEmails = (emailsPayload.items || []).map((item) => hydrateArchiveItem(item, "email"));
        }
        const pdfsPayload = await fetchJson(archiveIndex.pdfsUrl);
        if (pdfsPayload) {
          archivePdfs = (pdfsPayload.items || []).map((item) => hydrateArchiveItem(item, "pdf"));
        }
      } else if (loadEmails) {
        const emailsPayload = await fetchJson(archiveIndex.emailsUrl);
        if (emailsPayload) {
          archiveEmails = (emailsPayload.items || []).map((item) => hydrateArchiveItem(item, "email"));
        }
      } else if (loadPdfs) {
        const pdfsPayload = await fetchJson(archiveIndex.pdfsUrl);
        if (pdfsPayload) {
          archivePdfs = (pdfsPayload.items || []).map((item) => hydrateArchiveItem(item, "pdf"));
        }
      }
      archiveLoaded = true;
    })();
    return archiveLoading;
  }

  function itemUrl(item) {
    return `/barak/search?receipt=${encodeURIComponent(item.id)}`;
  }

  function disabledAction(label, reason) {
    return `<span class="detail-link link-disabled" title="${escapeHtml(reason)}" aria-disabled="true">${escapeHtml(label)}</span>`;
  }

  function chipList(values) {
    const list = (values || []).filter(Boolean);
    if (!list.length) return `<span class="muted">None isolated</span>`;
    return list.map((value) => `<span class="data-chip">${escapeHtml(value)}</span>`).join("");
  }

  function metaRows(item) {
    return [
      ["Archive ID", item.archiveId],
      ["Source type", item.sourceType],
      ["Date", item.date || "Date not isolated"],
      ["Mailbox", item.mailbox || "Not shown"],
      ["Message slot", item.messageSlot || "Not shown"],
      ["Attachments", item.attachmentCount != null ? String(item.attachmentCount) : "Not shown"],
      ["Person/entity", item.personEntity || "Entity not isolated"],
      ["Confidence", item.confidence || "Context only"]
    ].map(([key, value]) => `<div class="meta-row"><span>${key}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
  }

  function sourceLink(item) {
    if (!validSourceFile(item)) {
      return disabledAction("Open source PDF", "No verified public PDF reader URL for this record.");
    }
    return `<a class="detail-link" href="${escapeHtml(item.sourceFile)}" target="_blank" rel="noopener">Open source PDF</a>`;
  }

  function detailLink(item) {
    if (!itemsById().has(item.id)) {
      return disabledAction("Open detail view", "Receipt is not in the public-safe Barak index.");
    }
    return `<a class="detail-link" href="${itemUrl(item)}">Open detail view</a>`;
  }

  function receiptCard(item, options = {}) {
    const compact = Boolean(options.compact);
    const emailMeta = item.type === "email" && item.slotClass === "recovered_email" ? `
      <div class="email-meta">
        <span><b>Sender</b> ${escapeHtml(item.sender || "Not isolated in archive index")}</span>
        <span><b>Recipient</b> ${escapeHtml(item.recipient || "Not isolated in archive index")}</span>
        <span><b>Subject</b> ${escapeHtml(item.subject || "Subject not shown")}</span>
        <span><b>Attachments</b> ${escapeHtml(item.attachmentCount ?? 0)}</span>
      </div>` : item.type === "email" ? `
      <div class="email-meta slot-warning">
        <span><b>Slot class</b> ${escapeHtml(slotLabels[item.slotClass] || item.slotClass || "Attachment-backed slot")}</span>
        <span><b>Attachments</b> ${escapeHtml(item.attachmentCount ?? 0)}</span>
        <span>${escapeHtml(item.slotClass === "metadata_only_slot" ? "No parent email body or attachments recovered." : "Parent email body missing; attachment folder only.")}</span>
        ${item.parentPdfMirror ? `<span><b>Parent PDF</b> ${escapeHtml(item.parentPdfLabel || "Gmail export parent PDF mirror")}</span>` : ""}
      </div>` : "";
    const readerStatus = item.type === "pdf" ? `<p class="reader-status">${escapeHtml(item.readerStatus || "Public PDF reader link pending review")}</p>` : "";
    const transcript = /audio|video|photo/.test(item.type) ? `
      <div class="transcript-status">
        <span>Transcript status</span>
        <strong>${escapeHtml(item.transcriptStatus || "missing")}</strong>
      </div>` : "";
    const eftaOnly = (item.eftaTags || []).length
      ? `<div class="chip-row efta-chip-row"><span class="muted">EFTA tags (supporting):</span>${chipList(item.eftaTags)}</div>`
      : "";
    return `<article class="receipt-card ${compact ? "compact-card" : ""}" id="${escapeHtml(item.id)}">
      <div class="card-topline">
        <span class="type-badge">${escapeHtml(item.resultType || item.type)}</span>
        <span>${escapeHtml(item.archiveId)}</span>
      </div>
      <h3><a href="${itemUrl(item)}">${escapeHtml(item.title)}</a></h3>
      ${compact ? "" : `<div class="meta-grid">${metaRows(item)}</div>`}
      ${emailMeta}
      ${readerStatus}
      ${transcript}
      <p class="snippet">${escapeHtml(item.snippet || "No public-safe snippet promoted.")}</p>
      ${item.snippetNote ? `<p class="muted snippet-note">${escapeHtml(item.snippetNote)}</p>` : ""}
      ${translationPanel(item)}
      ${eftaOnly}
      <div class="chip-row">${chipList((item.tags || []).slice(0, 4))}</div>
      <div class="csbs">
        <p><b>Claim</b> ${escapeHtml(item.claim || "Presence-only source reference.")}</p>
        <p><b>Source</b> ${escapeHtml(item.source || "Source context not promoted.")}</p>
        <p><b>Bias</b> ${escapeHtml(item.bias || "Review context may be incomplete.")}</p>
        <p><b>Silence</b> ${escapeHtml(item.silence || "No legal meaning or conduct is inferred.")}</p>
      </div>
      ${sourceLink(item)}
      ${detailLink(item)}
    </article>`;
  }

  function scopeItems(scope) {
    const items = allItems();
    if (!scope) return items;
    if (scope === "media") return items.filter((item) => ["audio", "video", "photo"].includes(item.type));
    if (scope === "key") return items.filter((item) => item.type === "receipt" || item.type === "parent-pdf");
    if (scope === "parent-pdf") return items.filter((item) => item.type === "parent-pdf");
    if (scope === "pdf") {
      const reviewed = supportItems.filter((item) => item.filters?.pdfs || item.type === "parent-pdf");
      const seen = new Set(reviewed.map((item) => item.id));
      return [...reviewed, ...archivePdfs.filter((item) => !seen.has(item.id))];
    }
    if (scope === "document") return archivePdfs.filter((item) => item.filters?.documents);
    if (scope === "legal") return archivePdfs.filter((item) => item.filters?.legal);
    if (scope === "email") return archiveEmails.filter((item) => item.slotClass === "recovered_email");
    if (scope === "attachment_slot") return archiveEmails.filter((item) => item.slotClass === "attachment_backed_slot");
    if (scope === "metadata_slot") return archiveEmails.filter((item) => item.slotClass === "metadata_only_slot");
    return items.filter((item) => item.type === scope);
  }

  function hydrateStats() {
    const el = document.querySelector("[data-barak-stats]");
    if (!el) return;
    const counts = data.coverage?.sourceInputs || {};
    const typeCounts = data.coverage?.sourceTypeCounts || {};
    const recovery = data.coverage?.emailSourceRecovery || {};
    const stats = [
      ["Recovered emails", recovery.recoveredEmail || typeCounts["Recovered emails"] || 0],
      ["Attachment-backed slots", recovery.attachmentBackedSlot || typeCounts["Attachment-backed slots"] || 0],
      ["Metadata-only slots", recovery.metadataOnlySlot || typeCounts["Metadata-only slots"] || 0],
      ["Archive PDF files", counts.archivePdfFiles || archiveIndex.pdfCount || 0],
      ["Missing parent (with PDFs)", recovery.missingParentWithAttachments || 0],
      ["Reviewed EFTA receipts", counts.reviewedEftaReceipts || 0]
    ];
    el.innerHTML = stats.map(([label, count]) => `
      <div class="stat-tile"><strong>${escapeHtml(count)}</strong><span>${escapeHtml(label)}</span></div>
    `).join("");
  }

  function hydrateTimeline() {
    const el = document.querySelector("[data-barak-timeline]");
    if (!el || !Array.isArray(data.timeline)) return;
    el.innerHTML = data.timeline.map((entry) => `
      <article class="timeline-item">
        <time>${escapeHtml(entry.date)}</time>
        <div>
          <h3><a href="/barak/search?receipt=${encodeURIComponent(entry.receiptId)}">${escapeHtml(entry.archiveId)}</a></h3>
          <p>${escapeHtml(entry.summary)}</p>
        </div>
      </article>
    `).join("");
  }

  function hydrateLists() {
    document.querySelectorAll("[data-barak-list]").forEach((el) => {
      const scope = el.dataset.barakList;
      const limit = Number(el.dataset.limit || 6);
      const selected = scopeItems(scope).slice(0, limit);
      el.innerHTML = selected.map((item) => receiptCard(item, { compact: true })).join("");
    });
  }

  function hydrateEftaChips() {
    const el = document.querySelector("[data-barak-efta-chips]");
    if (!el) return;
    const tags = [...new Set(allItems().flatMap((item) => item.eftaTags || []))].sort();
    el.innerHTML = tags.slice(0, 40).map((tag) => `<a class="data-chip link-chip" href="/barak/search?q=${encodeURIComponent(tag)}">${escapeHtml(tag)}</a>`).join("");
  }

  function hydrateClaimFrames() {
    const el = document.querySelector("[data-barak-claim-frames]");
    if (!el || !Array.isArray(data.claimFrames)) return;
    el.innerHTML = data.claimFrames.map((frame) => `
      <article class="claim-frame">
        <h3>${escapeHtml(frame.title)}</h3>
        <p><b>Claim</b> ${escapeHtml(frame.claim)}</p>
        <p><b>Source</b> ${escapeHtml(frame.source)}</p>
        <p><b>Bias</b> ${escapeHtml(frame.bias)}</p>
        <p><b>Silence</b> ${escapeHtml(frame.silence)}</p>
        <a href="/barak/search?receipt=${encodeURIComponent(frame.receiptId)}">Linked receipt</a>
      </article>
    `).join("");
  }

  function hydrateMediaOverview() {
    const el = document.querySelector("[data-barak-media-overview]");
    if (!el) return;
    const items = scopeItems("media");
    el.innerHTML = items.length
      ? items.map((item) => receiptCard(item)).join("")
      : `<div class="note"><h2>Media lane status</h2><p>Media receipt cards are modeled, but no audio, video, or photo files have been promoted to the public portal yet. Use the section search below once media records are added.</p></div>`;
  }

  function detailView(item) {
    const linked = (item.linkedPdfIds || [])
      .map((id) => itemsById().get(id))
      .filter(Boolean)
      .slice(0, 8)
      .map((pdf) => `<li><a href="${itemUrl(pdf)}">${escapeHtml(pdf.attachmentName || pdf.title)}</a></li>`)
      .join("");
    const linkedHtml = linked ? `<section><h3>Linked PDFs</h3><ul>${linked}</ul></section>` : "";
    return `<div class="detail-shell" id="receipt-detail">
      <div class="section-heading-row">
        <h2>Receipt Detail</h2>
        <a href="${window.location.pathname}">Clear detail</a>
      </div>
      ${receiptCard(item)}
      ${linkedHtml}
    </div>`;
  }

  function hydrateDetail() {
    const el = document.querySelector("[data-barak-detail]");
    if (!el) return;
    const id = params.get("receipt");
    if (!id) {
      el.innerHTML = "";
      return;
    }
    const item = itemsById().get(id);
    el.innerHTML = item ? detailView(item) : `<div class="note"><h2>Receipt Not Found</h2><p>The requested receipt ID is not in the public-safe Barak index. <a href="/barak/search">Return to search</a>.</p></div>`;
  }

  function matchQuery(item, query) {
    if (!query) return true;
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return terms.every((term) => (item.searchText || "").includes(term));
  }

  function matchChecks(item, checks) {
    if (!checks.length) return true;
    return checks.some((key) => {
      if (key === "audio") return item.type === "audio";
      if (key === "video") return item.type === "video";
      if (key === "photos") return item.type === "photo";
      if (key === "documents") return item.filters?.documents;
      if (key === "legal") return item.filters?.legal;
      if (key === "attachment_slots") return item.filters?.attachment_slots;
      if (key === "metadata_slots") return item.filters?.metadata_slots;
      if (key === "hebrew") return item.filters?.hebrew;
      if (key === "english") return item.filters?.english;
      if (key === "translated") return item.filters?.translated;
      if (key === "needs_review") return item.filters?.needs_review;
      if (key === "pending") return item.filters?.pending;
      if (key === "failed") return item.filters?.failed;
      return item.filters && item.filters[key];
    });
  }

  function matchDate(item, start, end) {
    if (!start && !end) return true;
    if (!item.dateSort) return false;
    if (start && item.dateSort < start) return false;
    if (end && item.dateSort > end) return false;
    return true;
  }

  function emptyScopeMessage(scope, count) {
    if (count > 0) return "";
    const messages = {
      audio: "Audio lane is live, but no public-safe audio receipts are indexed yet.",
      video: "Video lane is live, but no public-safe video receipts are indexed yet.",
      photo: "Photos lane is live, but no public-safe photo receipts are indexed yet.",
      document: "Documents lane is live. Archive PDFs load from the index; use search filters while the lane populates.",
      legal: "Legal lane is live. Legal-category PDFs load from the index; use search filters while the lane populates.",
      pdf: "PDF library is live and loads archive attachment records from the public index."
    };
    const text = messages[scope];
    return text ? `<div class="note status-banner"><h2>Section status</h2><p>${escapeHtml(text)}</p></div>` : "";
  }

  function hydrateSearch() {
    const shell = document.querySelector("[data-barak-search]");
    if (!shell) return;
    const scope = shell.dataset.barakSearch || "";
    const input = shell.querySelector("#barak-search-input");
    const filterRoot = shell.querySelector("[data-barak-filters]");
    const resultRoot = shell.querySelector("[data-barak-results]");
    const summary = shell.querySelector("[data-barak-result-summary]");

    filterRoot.innerHTML = `
      <fieldset class="filter-set">
        <legend>Source filters</legend>
        ${Object.entries(labels).map(([key, label]) => `
          <label><input type="checkbox" value="${key}" data-filter-check> ${escapeHtml(label)}</label>
        `).join("")}
      </fieldset>
      <fieldset class="filter-set">
        <legend>Translation filters</legend>
        ${Object.entries(translationLabels).map(([key, label]) => `
          <label><input type="checkbox" value="${key}" data-filter-check> ${escapeHtml(label)}</label>
        `).join("")}
      </fieldset>
      <fieldset class="filter-set">
        <legend>Date range</legend>
        <label>From <input type="date" data-date-start></label>
        <label>To <input type="date" data-date-end></label>
      </fieldset>
    `;

    input.value = params.get("q") || "";
    const typeParam = params.get("type");
    if (typeParam) {
      filterRoot.querySelectorAll("[data-filter-check]").forEach((box) => {
        box.checked = box.value === typeParam;
      });
    }

    function render() {
      const baseItems = scopeItems(scope);
      const query = input.value.trim();
      const checks = [...filterRoot.querySelectorAll("[data-filter-check]:checked")].map((box) => box.value);
      const start = filterRoot.querySelector("[data-date-start]").value;
      const end = filterRoot.querySelector("[data-date-end]").value;
      const results = baseItems.filter((item) => {
        if (!matchQuery(item, query)) return false;
        if (!matchChecks(item, checks)) return false;
        if (!matchDate(item, start, end)) return false;
        return true;
      });
      summary.textContent = `${results.length} result${results.length === 1 ? "" : "s"} in the public-safe Barak index`;
      const limit = scope ? 200 : 120;
      const status = emptyScopeMessage(scope, baseItems.length);
      resultRoot.innerHTML = status + (results.slice(0, limit).map((item) => receiptCard(item)).join("")
        || `<div class="note"><h2>No Public-Safe Matches</h2><p>Try a different mailbox, subject, source type, or date range. <a href="/barak/search">Open unified search</a>.</p></div>`);
      if (results.length > limit) {
        resultRoot.innerHTML += `<p class="muted">Showing first ${limit} of ${results.length} matches.</p>`;
      }
    }

    shell.addEventListener("input", render);
    shell.addEventListener("change", render);
    render();
    loadArchiveIndex(scope).then(() => {
      hydrateDetail();
      render();
    }).catch(() => render());
  }

  async function boot() {
    supportItems.forEach(hydrateSupportItem);
    hydrateStats();
    hydrateTimeline();
    hydrateLists();
    hydrateEftaChips();
    hydrateClaimFrames();
    hydrateMediaOverview();
    hydrateDetail();
    hydrateSearch();
  }

  boot();
})();