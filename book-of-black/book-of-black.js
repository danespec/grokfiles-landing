(function () {
  "use strict";

  var pageType = document.body.getAttribute("data-bob-page") || "";
  var ACK_COOKIE = "gah_bob_ack";
  var SOURCE_PDF_URL = "/book-of-black/source/Book_of_Black_V6HHT.pdf";
  var PDFJS_MODULE_URL = "/pdfjs/build/pdf.mjs";
  var PDFJS_WORKER_URL = "/pdfjs/build/pdf.worker.mjs";
  var STATUS_ORDER = ["CORROBORATED", "PARTIALLY_SUPPORTED", "CONTRADICTED", "UNRESOLVED", "RETIRED", "NOT_YET_TESTED"];
  var STATUS_LABELS = {
    CORROBORATED: "Corroborated",
    PARTIALLY_SUPPORTED: "Partially supported",
    CONTRADICTED: "Contradicted",
    UNRESOLVED: "Unresolved",
    RETIRED: "Retired",
    NOT_YET_TESTED: "Not yet tested"
  };
  var CONFIDENCE_ORDER = ["INSUFFICIENT", "LOW", "MEDIUM", "HIGH"];
  var CONFIDENCE_LABELS = {
    INSUFFICIENT: "Insufficient",
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High"
  };
  var state = {
    status: null,
    ledger: null,
    schema: null,
    page: 1,
    totalPages: 1639,
    zoom: 100,
    fitMode: "",
    rotation: 0,
    loadToken: 0,
    pdfjsLib: null,
    pdfjsPromise: null,
    pdfDocument: null,
    pdfLoadingPromise: null,
    pdfLoadingTask: null,
    pdfLoadComplete: false,
    renderTask: null,
    resizeTimer: null,
    searchResults: [],
    resultIndex: -1
  };

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $all(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function clean(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function hasAck() {
    return document.cookie.split(";").map(function (part) { return part.trim(); }).some(function (part) {
      return part === ACK_COOKIE + "=1";
    });
  }

  function setAck() {
    document.cookie = ACK_COOKIE + "=1; path=/; SameSite=Lax";
  }

  function apiJson(path, options) {
    return fetch(path, Object.assign({ credentials: "same-origin" }, options || {})).then(function (response) {
      return response.text().then(function (text) {
        var data = {};
        try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { error: text }; }
        if (!response.ok) {
          var message = data.error || data.message || ("HTTP " + response.status);
          var error = new Error(message);
          error.data = data;
          throw error;
        }
        return data;
      });
    });
  }

  function html(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setText(selector, value) {
    var el = $(selector);
    if (el) el.textContent = value;
  }

  function renderStatusCards(root, ledger) {
    if (!root || !ledger) return;
    var counts = ledger.counts || {};
    var definitions = ledger.status_definitions || {};
    root.innerHTML = STATUS_ORDER.map(function (status) {
      return '<article class="bob-status-card"><strong>' + html(STATUS_LABELS[status] || status) + '</strong><b>' + html(counts[status] || 0) + '</b><p>' + html(definitions[status] || "") + '</p></article>';
    }).join("");
    var total = STATUS_ORDER.reduce(function (sum, status) { return sum + Number(counts[status] || 0); }, 0);
    $all("[data-bob-ledger-empty]").forEach(function (el) { el.hidden = total !== 0; });
  }

  function renderLatest(root, ledger) {
    if (!root || !ledger) return;
    var latest = Array.isArray(ledger.latest_resolutions) ? ledger.latest_resolutions : [];
    if (!latest.length) {
      root.innerHTML = '<div class="bob-empty"><strong>No recently resolved entries.</strong><span>The ledger is empty until source-tested entries are ready.</span></div>';
      return;
    }
    root.innerHTML = latest.map(function (entry) {
      return '<article class="bob-result-card"><div class="bob-result-meta"><span class="bob-chip">' + html(STATUS_LABELS[entry.resolution] || entry.resolution || "") + '</span><span class="bob-chip">' + html(CONFIDENCE_LABELS[entry.confidence] || entry.confidence || "") + '</span><span class="bob-chip">Reviewed ' + html(entry.date_reviewed || "unknown") + '</span></div><h3>' + html(entry.title || entry.id || "Ledger entry") + '</h3><p>' + html(entry.editorial_summary || "") + '</p><a class="bob-inline-link" href="/book-of-black/entry/' + encodeURIComponent(entry.id) + '">Open entry</a></article>';
    }).join("");
  }

  function arrayCount(value) {
    return Array.isArray(value) ? value.length : 0;
  }

  function firstPage(entry) {
    return Array.isArray(entry.manuscript_pages) && entry.manuscript_pages.length ? entry.manuscript_pages[0] : "";
  }

  function entryCount(entry, key, fallbackKey) {
    if (entry[fallbackKey] != null) return Number(entry[fallbackKey]) || 0;
    return arrayCount(entry[key]);
  }

  function populateLedgerFilters(ledger) {
    var statusSelect = $("[data-bob-status-filter]");
    var confidenceSelect = $("[data-bob-confidence-filter]");
    if (statusSelect && statusSelect.options.length <= 1) {
      statusSelect.innerHTML = '<option value="">All statuses</option>' + STATUS_ORDER.map(function (status) {
        return '<option value="' + html(status) + '">' + html(STATUS_LABELS[status] || status) + '</option>';
      }).join("");
    }
    if (confidenceSelect && confidenceSelect.options.length <= 1) {
      confidenceSelect.innerHTML = '<option value="">All confidence levels</option>' + CONFIDENCE_ORDER.map(function (confidence) {
        return '<option value="' + html(confidence) + '">' + html(CONFIDENCE_LABELS[confidence] || confidence) + '</option>';
      }).join("");
    }
  }

  function renderLedgerEntries(root, ledger) {
    if (!root || !ledger) return;
    var statusFilter = clean($("[data-bob-status-filter]") && $("[data-bob-status-filter]").value);
    var confidenceFilter = clean($("[data-bob-confidence-filter]") && $("[data-bob-confidence-filter]").value);
    var entries = Array.isArray(ledger.entries) ? ledger.entries.slice() : [];
    entries = entries.filter(function (entry) {
      if (statusFilter && entry.resolution !== statusFilter) return false;
      if (confidenceFilter && entry.confidence !== confidenceFilter) return false;
      return true;
    });
    if (!entries.length) {
      root.innerHTML = '<div class="bob-empty"><strong>No ledger entries match these filters.</strong><span>Counts remain limited to actual populated entries.</span></div>';
      return;
    }
    root.innerHTML = entries.map(function (entry) {
      var page = firstPage(entry);
      var support = entryCount(entry, "supporting_receipts", "supporting_record_count");
      var counter = entryCount(entry, "counterevidence", "counterevidence_count");
      return '<article class="bob-ledger-entry">' +
        '<div class="bob-ledger-entry-head"><div><p class="bob-eyebrow">' + html(entry.id || "") + '</p><h3>' + html(entry.title || "Untitled ledger entry") + '</h3></div><span class="bob-resolution-badge">' + html(STATUS_LABELS[entry.resolution] || entry.resolution || "Unknown") + '</span></div>' +
        '<p>' + html(entry.editorial_summary || "") + '</p>' +
        '<dl class="bob-ledger-mini">' +
        '<div><dt>Confidence</dt><dd>' + html(CONFIDENCE_LABELS[entry.confidence] || entry.confidence || "Unknown") + '</dd></div>' +
        '<div><dt>Tested date</dt><dd>' + html(entry.date_reviewed || "Unknown") + '</dd></div>' +
        '<div><dt>Manuscript page</dt><dd>' + (page ? '<a href="/book-of-black/read?page=' + encodeURIComponent(page) + '">' + html(page) + '</a>' : 'Unknown') + '</dd></div>' +
        '<div><dt>Supporting records</dt><dd>' + html(support) + '</dd></div>' +
        '<div><dt>Counterevidence</dt><dd>' + html(counter) + '</dd></div>' +
        '<div><dt>Last revision</dt><dd>' + html(entry.last_revision_date || entry.updated_at || "Unknown") + '</dd></div>' +
        '</dl>' +
        '<a class="bob-inline-link" href="/book-of-black/entry/' + encodeURIComponent(entry.id || "") + '">Open source review</a>' +
        '</article>';
    }).join("");
  }

  function loadStatus() {
    return apiJson("/api/book-of-black/status").then(function (data) {
      state.status = data;
      state.ledger = data.ledger || null;
      state.totalPages = Number(data.manifest && data.manifest.determination && data.manifest.determination.page_count) || state.totalPages;
      setText('[data-bob-stat="page_count"]', String(state.totalPages));
      var pct = data.manifest && data.manifest.determination ? data.manifest.determination.ocr_coverage_percent : "";
      setText('[data-bob-stat="ocr_coverage_percent"]', pct === "" ? "Unknown" : pct + "%");
      setText('[data-bob-stat="ledger_entries"]', String(data.ledger_total || 0));
      renderStatusCards($("[data-bob-ledger-counts]"), state.ledger);
      renderLatest($("[data-bob-latest-resolutions]"), state.ledger);
      var total = $("[data-bob-page-total]");
      if (total) total.textContent = "/ " + state.totalPages;
      return data;
    }).catch(function () {
      setText('[data-bob-stat="page_count"]', "Unavailable");
      setText('[data-bob-stat="ocr_coverage_percent"]', "Unavailable");
    });
  }

  function setupAckGate(onAccepted) {
    var boxes = $all("[data-bob-ack-checkbox]");
    var buttons = $all("[data-bob-ack-button]");
    function refresh() {
      var checked = boxes.some(function (box) { return box.checked; });
      buttons.forEach(function (button) { button.disabled = !checked; });
    }
    boxes.forEach(function (box) { box.addEventListener("change", refresh); });
    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        setAck();
        if (typeof onAccepted === "function") onAccepted();
      });
    });
    refresh();
  }

  function applyResponsiveDefaultZoom() {
    if (!state.fitMode && window.matchMedia && window.matchMedia("(max-width: 760px)").matches) {
      state.fitMode = "page-fit";
    }
  }

  function setReaderVisible() {
    var gate = $("[data-bob-ack-gate]");
    var app = $("[data-bob-reader-app]");
    if (gate) gate.hidden = true;
    if (app) {
      app.hidden = false;
      window.setTimeout(function () { app.scrollIntoView({ block: "start" }); }, 0);
    }
  }

  function currentPageFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var page = Number(params.get("page") || 1);
    return Math.max(1, Math.min(state.totalPages, page || 1));
  }

  function updateReaderUrl(page) {
    var next = new URL(window.location.href);
    next.searchParams.set("page", String(page));
    window.history.replaceState({}, "", next.pathname + next.search);
  }

  function renderMetadata() {
    var root = $("[data-bob-artifact-metadata]");
    if (!root || !state.status || !state.status.manifest) return;
    var manifest = state.status.manifest;
    var source = (manifest.source_files || []).find(function (item) { return item.role === "authoritative_pdf"; }) || {};
    root.innerHTML = [
      ["Source version", manifest.source_version || "Unknown"],
      ["Pages", manifest.determination && manifest.determination.page_count],
      ["PDF bytes", source.bytes],
      ["SHA-256", source.sha256 ? source.sha256.slice(0, 20) + "..." : "Unknown"],
      ["Text basis", manifest.determination && manifest.determination.text_layer_vs_verified_transcription]
    ].map(function (row) {
      return "<div><dt>" + html(row[0]) + "</dt><dd>" + html(row[1] == null ? "Unknown" : row[1]) + "</dd></div>";
    }).join("");
  }

  function updatePdfLinks() {
    var download = $("[data-bob-download-pdf]");
    var original = $("[data-bob-open-original]");
    if (download) download.href = SOURCE_PDF_URL;
    if (original) original.href = SOURCE_PDF_URL;
  }

  function updateReaderControls() {
    var label = $("[data-bob-zoom-label]");
    if (label) label.textContent = state.fitMode === "page-width" ? "Fit width" : state.fitMode === "page-fit" ? "Fit page" : String(state.zoom || 100) + "%";
    var input = $("[data-bob-page-input]");
    if (input) {
      input.value = state.page;
      input.max = state.totalPages;
    }
    var total = $("[data-bob-page-total]");
    if (total) total.textContent = "/ " + state.totalPages;
    var prev = $("[data-bob-prev-page]");
    var next = $("[data-bob-next-page]");
    if (prev) prev.disabled = state.page <= 1;
    if (next) next.disabled = state.page >= state.totalPages;
    updatePdfLinks();
  }

  function setPageStatus(message, visible) {
    var status = $("[data-bob-page-status]");
    if (!status) return;
    status.textContent = message || "";
    status.hidden = !visible;
  }

  function ensurePromiseWithResolvers() {
    if (!Promise.withResolvers) {
      Promise.withResolvers = function () {
        var resolve;
        var reject;
        var promise = new Promise(function (res, rej) {
          resolve = res;
          reject = rej;
        });
        return { promise: promise, resolve: resolve, reject: reject };
      };
    }
  }

  function loadPdfJs() {
    if (state.pdfjsLib) return Promise.resolve(state.pdfjsLib);
    if (state.pdfjsPromise) return state.pdfjsPromise;
    ensurePromiseWithResolvers();
    state.pdfjsPromise = import(PDFJS_MODULE_URL).then(function (pdfjsLib) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      state.pdfjsLib = pdfjsLib;
      return pdfjsLib;
    });
    return state.pdfjsPromise;
  }

  function loadPdfDocument() {
    if (state.pdfDocument) return Promise.resolve(state.pdfDocument);
    if (state.pdfLoadingPromise) return state.pdfLoadingPromise;
    setPageStatus("Loading PDF.js manuscript source...", true);
    state.pdfLoadingPromise = loadPdfJs().then(function (pdfjsLib) {
      var loadingTask = pdfjsLib.getDocument({
        url: SOURCE_PDF_URL,
        withCredentials: true,
        rangeChunkSize: 65536,
        disableAutoFetch: false,
        disableStream: false
      });
      state.pdfLoadingTask = loadingTask;
      loadingTask.onProgress = function (progress) {
        if (state.pdfLoadComplete || state.pdfDocument) return;
        if (!progress || !progress.total) {
          setPageStatus("Loading PDF.js manuscript source...", true);
          return;
        }
        var pct = Math.max(1, Math.min(99, Math.round((progress.loaded / progress.total) * 100)));
        setPageStatus("Loading PDF.js manuscript source... " + pct + "%", true);
      };
      return loadingTask.promise;
    }).then(function (pdfDocument) {
      state.pdfDocument = pdfDocument;
      state.pdfLoadComplete = true;
      state.totalPages = Number(pdfDocument.numPages) || state.totalPages;
      updateReaderControls();
      return pdfDocument;
    }).catch(function (error) {
      state.pdfLoadingPromise = null;
      setPageStatus("PDF.js could not load the manuscript source: " + (error.message || "unknown error"), true);
      throw error;
    });
    return state.pdfLoadingPromise;
  }

  function clampScale(scale) {
    return Math.max(0.18, Math.min(3, Number(scale) || 1));
  }

  function availableCanvasBox() {
    var frame = $("[data-bob-document-stage]");
    var stage = $("[data-bob-canvas-stage]");
    var width = (stage && stage.clientWidth) || (frame && frame.clientWidth) || window.innerWidth || 900;
    var height = (frame && frame.clientHeight) || (stage && stage.clientHeight) || window.innerHeight || 900;
    return {
      width: Math.max(280, width - 32),
      height: Math.max(280, height - 32)
    };
  }

  function scaleForViewport(baseViewport) {
    var box = availableCanvasBox();
    if (state.fitMode === "page-width") {
      return clampScale(box.width / baseViewport.width);
    }
    if (state.fitMode === "page-fit") {
      return clampScale(Math.min(box.width / baseViewport.width, box.height / baseViewport.height));
    }
    return clampScale((Number(state.zoom) || 100) / 100);
  }

  function renderPdfPage(pageNumber) {
    pageNumber = Math.max(1, Math.min(state.totalPages, Number(pageNumber) || 1));
    state.loadToken += 1;
    var loadToken = state.loadToken;
    var canvas = $("[data-bob-page-canvas]");
    if (!canvas) return Promise.reject(new Error("Reader canvas missing"));
    if (state.renderTask && typeof state.renderTask.cancel === "function") {
      try { state.renderTask.cancel(); } catch (_) {}
    }
    setPageStatus("Rendering manuscript page " + pageNumber + "...", true);
    return loadPdfDocument().then(function (pdfDocument) {
      return pdfDocument.getPage(pageNumber);
    }).then(function (pdfPage) {
      if (loadToken !== state.loadToken) return null;
      var context = canvas.getContext("2d", { alpha: false });
      var baseViewport = pdfPage.getViewport({ scale: 1, rotation: state.rotation });
      var scale = scaleForViewport(baseViewport);
      var viewport = pdfPage.getViewport({ scale: scale, rotation: state.rotation });
      var outputScale = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.floor(viewport.width * outputScale));
      canvas.height = Math.max(1, Math.floor(viewport.height * outputScale));
      canvas.style.width = Math.floor(viewport.width) + "px";
      canvas.style.height = Math.floor(viewport.height) + "px";
      context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
      context.fillStyle = "#fff";
      context.fillRect(0, 0, viewport.width, viewport.height);
      state.renderTask = pdfPage.render({
        canvasContext: context,
        viewport: viewport
      });
      return state.renderTask.promise.then(function () {
        if (loadToken === state.loadToken) {
          setPageStatus("Page " + pageNumber + " rendered.", false);
        }
        try { pdfPage.cleanup(); } catch (_) {}
        return pdfPage;
      });
    }).catch(function (error) {
      if (error && error.name === "RenderingCancelledException") return null;
      console.error("[Book of Black reader] PDF.js render failed", error);
      setPageStatus("Page rendering failed: " + (error.message || "unknown error"), true);
      throw error;
    });
  }

  function prefetchAdjacentPages(page) {
    [page - 1, page + 1].forEach(function (candidate) {
      if (candidate >= 1 && candidate <= state.totalPages) {
        if (state.pdfDocument && typeof state.pdfDocument.getPage === "function") {
          state.pdfDocument.getPage(candidate).then(function (pdfPage) {
            try { pdfPage.cleanup(); } catch (_) {}
          }).catch(function () {});
        }
        apiJson("/api/book-of-black/page/" + candidate).catch(function () {});
      }
    });
  }

  function loadPage(page) {
    page = Math.max(1, Math.min(state.totalPages, Number(page) || 1));
    state.page = page;
    updateReaderUrl(page);
    renderMetadata();
    updateReaderControls();
    var report = $("[data-bob-report-link]");
    if (report) report.href = "mailto:grokcloudflare@gmail.com?subject=Book%20of%20Black%20transcription%20issue%20page%20" + encodeURIComponent(page);
    var renderPromise = renderPdfPage(page);
    var ocrPromise = apiJson("/api/book-of-black/page/" + page).then(function (data) {
      var pageData = data.page || {};
      var text = pageData.text || "";
      var pre = $("[data-bob-ocr-text]");
      if (pre) pre.textContent = text || "[No extracted text for this page.]";
      prefetchAdjacentPages(page);
    }).catch(function (error) {
      var pre = $("[data-bob-ocr-text]");
      if (pre) pre.textContent = "OCR unavailable: " + (error.message || "unknown error");
    });
    return Promise.allSettled([renderPromise, ocrPromise]);
  }

  function goToPage(page) {
    loadPage(page);
  }

  function setupReader() {
    setupAckGate(function () {
      setReaderVisible();
      applyResponsiveDefaultZoom();
      loadStatus().then(function () { loadPage(currentPageFromUrl()); });
    });
    if (hasAck()) {
      setReaderVisible();
      applyResponsiveDefaultZoom();
      loadStatus().then(function () { loadPage(currentPageFromUrl()); });
    } else {
      loadStatus();
    }
    var pageInput = $("[data-bob-page-input]");
    if (pageInput) {
      pageInput.addEventListener("change", function () { goToPage(pageInput.value); });
      pageInput.addEventListener("blur", function () { goToPage(pageInput.value); });
      pageInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          goToPage(pageInput.value);
        }
      });
    }
    var prev = $("[data-bob-prev-page]");
    var next = $("[data-bob-next-page]");
    if (prev) prev.addEventListener("click", function () { goToPage(state.page - 1); });
    if (next) next.addEventListener("click", function () { goToPage(state.page + 1); });
    var zoomOut = $("[data-bob-zoom-out]");
    var zoomIn = $("[data-bob-zoom-in]");
    if (zoomOut) zoomOut.addEventListener("click", function () {
      state.fitMode = "";
      state.zoom = Math.max(50, Number(state.zoom || 100) - 10);
      loadPage(state.page);
    });
    if (zoomIn) zoomIn.addEventListener("click", function () {
      state.fitMode = "";
      state.zoom = Math.min(220, Number(state.zoom || 100) + 10);
      loadPage(state.page);
    });
    $all("[data-bob-fit]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.fitMode = button.getAttribute("data-bob-fit") === "width" ? "page-width" : "page-fit";
        loadPage(state.page);
      });
    });
    var rotate = $("[data-bob-rotate]");
    if (rotate) rotate.addEventListener("click", function () {
      state.rotation = (state.rotation + 90) % 360;
      loadPage(state.page);
    });
    var fullscreen = $("[data-bob-fullscreen]");
    if (fullscreen) fullscreen.addEventListener("click", function () {
      var app = $("[data-bob-reader-app]");
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(function () {});
        if (app) app.classList.remove("fullscreen-fallback");
      } else if (app && app.requestFullscreen) {
        app.requestFullscreen().catch(function () { app.classList.add("fullscreen-fallback"); });
      } else if (app) {
        app.classList.toggle("fullscreen-fallback");
      }
    });
    var copyUrl = $("[data-bob-copy-url]");
    if (copyUrl) copyUrl.addEventListener("click", function () {
      copyText(window.location.origin + "/book-of-black/read?page=" + state.page);
    });
    var copyOcr = $("[data-bob-copy-ocr]");
    if (copyOcr) copyOcr.addEventListener("click", function () {
      var pre = $("[data-bob-ocr-text]");
      copyText(pre ? pre.textContent || "" : "");
    });
    var toggleOcr = $("[data-bob-toggle-ocr]");
    if (toggleOcr) toggleOcr.addEventListener("click", function () {
      var app = $("[data-bob-reader-app]");
      var collapsed = app ? app.classList.toggle("ocr-collapsed") : false;
      toggleOcr.setAttribute("aria-expanded", collapsed ? "false" : "true");
    });
    function setMeta(open) {
      var drawer = $("[data-bob-meta-drawer]");
      var toggle = $("[data-bob-toggle-meta]");
      if (drawer) drawer.hidden = !open;
      if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }
    var toggleMeta = $("[data-bob-toggle-meta]");
    var closeMeta = $("[data-bob-close-meta]");
    if (toggleMeta) toggleMeta.addEventListener("click", function () {
      var drawer = $("[data-bob-meta-drawer]");
      setMeta(Boolean(drawer && drawer.hidden));
    });
    if (closeMeta) closeMeta.addEventListener("click", function () { setMeta(false); });
    var form = $("[data-bob-reader-search]");
    if (form) form.addEventListener("submit", function (event) {
      event.preventDefault();
      var q = clean(new FormData(form).get("q"));
      runSearch(q, {}, true);
    });
    var prevResult = $("[data-bob-prev-result]");
    var nextResult = $("[data-bob-next-result]");
    if (prevResult) prevResult.addEventListener("click", function () { jumpResult(-1); });
    if (nextResult) nextResult.addEventListener("click", function () { jumpResult(1); });
    window.addEventListener("resize", function () {
      if (!state.pdfDocument || !state.page) return;
      window.clearTimeout(state.resizeTimer);
      state.resizeTimer = window.setTimeout(function () {
        renderPdfPage(state.page).catch(function () {});
      }, 160);
    });
    document.addEventListener("fullscreenchange", function () {
      if (!state.pdfDocument || !state.page) return;
      window.clearTimeout(state.resizeTimer);
      state.resizeTimer = window.setTimeout(function () {
        renderPdfPage(state.page).catch(function () {});
      }, 160);
    });
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () {});
    }
  }

  function resultCard(result) {
    var links = '<a class="bob-inline-link" href="' + html(result.reader_url || ("/book-of-black/read?page=" + result.page)) + '">Open reader page</a>';
    var archive = Array.isArray(result.connected_archive_records) && result.connected_archive_records.length
      ? result.connected_archive_records.map(function (record) { return html(record.id || record.url || record); }).join(", ")
      : "None established";
    return '<article class="bob-result-card" data-result-page="' + html(result.page || "") + '">' +
      '<h2>Page ' + html(result.page || "Unknown") + '</h2>' +
      '<p>' + (result.highlighted_excerpt || html(result.excerpt || "")) + '</p>' +
      '<div class="bob-result-meta">' +
      '<span class="bob-chip">Text basis: ' + html(result.text_basis || "OCR/layout extraction") + '</span>' +
      '<span class="bob-chip">Confidence: ' + html(result.ocr_confidence || "unknown") + '</span>' +
      '<span class="bob-chip">Verification: ' + html(result.verification_status || "NOT_YET_TESTED") + '</span>' +
      '<span class="bob-chip">Archive records: ' + archive + '</span>' +
      '</div>' + links + '</article>';
  }

  function runSearch(query, filters, readerMode) {
    query = clean(query);
    var payload = Object.assign({ q: query, limit: readerMode ? 12 : 25 }, filters || {});
    var status = readerMode ? null : $("[data-bob-search-status]");
    var resultsRoot = readerMode ? $("[data-bob-reader-results]") : $("[data-bob-search-results]");
    if (!query && !payload.page && !payload.status && !payload.verified_connection) {
      if (status) status.textContent = "Enter a term or page number.";
      return;
    }
    if (status) status.textContent = "Searching manuscript extraction...";
    if (resultsRoot) resultsRoot.innerHTML = "";
    return apiJson("/api/book-of-black/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (data) {
      state.searchResults = data.results || [];
      state.resultIndex = state.searchResults.length ? 0 : -1;
      if (resultsRoot) {
        resultsRoot.innerHTML = state.searchResults.length
          ? state.searchResults.map(resultCard).join("")
          : '<div class="bob-empty"><strong>No manuscript matches.</strong><span>Try a narrower phrase, page number, date, spelling variant, or archive search.</span></div>';
      }
      if (status) status.textContent = "Search complete: " + state.searchResults.length + " result" + (state.searchResults.length === 1 ? "" : "s") + ".";
    }).catch(function (error) {
      if (resultsRoot) resultsRoot.innerHTML = '<div class="bob-empty"><strong>Search unavailable.</strong><span>' + html(error.message || "Unknown error") + '</span></div>';
      if (status) status.textContent = "Search failed.";
    });
  }

  function jumpResult(offset) {
    if (!state.searchResults.length) return;
    state.resultIndex = (state.resultIndex + offset + state.searchResults.length) % state.searchResults.length;
    var result = state.searchResults[state.resultIndex];
    if (result && result.page) goToPage(result.page);
  }

  function setupSearch() {
    function reveal() {
      var ack = $("[data-bob-search-ack]");
      var app = $("[data-bob-search-app]");
      if (ack) ack.hidden = true;
      if (app) app.hidden = false;
      var params = new URLSearchParams(window.location.search);
      var q = params.get("q") || "";
      var form = $("[data-bob-search-form]");
      if (q && form) {
        form.elements.q.value = q;
        runSearch(q, {}, false);
      }
    }
    setupAckGate(function () { setAck(); reveal(); });
    if (hasAck()) reveal();
    loadStatus();
    var form = $("[data-bob-search-form]");
    if (form) form.addEventListener("submit", function (event) {
      event.preventDefault();
      var data = new FormData(form);
      var q = clean(data.get("q"));
      var filters = {
        status: clean(data.get("status")),
        page: clean(data.get("page")),
        verified_connection: Boolean(data.get("verified_connection"))
      };
      var next = new URL(window.location.href);
      if (q) next.searchParams.set("q", q); else next.searchParams.delete("q");
      window.history.replaceState({}, "", next.pathname + next.search);
      runSearch(q, filters, false);
    });
  }

  function setupLedger() {
    Promise.all([
      apiJson("/api/book-of-black/ledger"),
      apiJson("/evidence-data/book-of-black/entry-schema.json")
    ]).then(function (rows) {
      state.ledger = rows[0];
      state.schema = rows[1];
      renderStatusCards($("[data-bob-ledger-counts]"), state.ledger);
      renderLatest($("[data-bob-latest-resolutions]"), state.ledger);
      populateLedgerFilters(state.ledger);
      renderLedgerEntries($("[data-bob-ledger-entries]"), state.ledger);
      var definitions = $("[data-bob-status-definitions]");
      if (definitions) {
        definitions.innerHTML = STATUS_ORDER.map(function (status) {
          return '<article class="bob-status-card"><strong>' + html(STATUS_LABELS[status] || status) + '</strong><p>' + html(state.ledger.status_definitions[status] || "") + '</p></article>';
        }).join("");
      }
      var schema = $("[data-bob-entry-schema]");
      if (schema) schema.textContent = JSON.stringify(state.schema.template || state.schema, null, 2);
      var statusFilter = $("[data-bob-status-filter]");
      var confidenceFilter = $("[data-bob-confidence-filter]");
      if (statusFilter) statusFilter.addEventListener("change", function () { renderLedgerEntries($("[data-bob-ledger-entries]"), state.ledger); });
      if (confidenceFilter) confidenceFilter.addEventListener("change", function () { renderLedgerEntries($("[data-bob-ledger-entries]"), state.ledger); });
    });
  }

  if (pageType === "reader") setupReader();
  else if (pageType === "search") setupSearch();
  else if (pageType === "ledger") setupLedger();
  else loadStatus();
})();
