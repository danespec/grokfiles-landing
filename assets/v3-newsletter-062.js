(function () {
  "use strict";

  var THEME_KEY = "gah-theme-v2";
  var CONSENT_KEY = "gah_consent_v1";
  var overlayStack = [];
  var previouslyFocused = null;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function applyTheme(theme) {
    var next = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.style.colorScheme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch (_) {}
    $$("[data-theme-toggle]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", next === "dark" ? "true" : "false");
      btn.setAttribute("aria-label", next === "dark" ? "Switch to light theme" : "Switch to dark theme");
    });
  }

  function initThemeControls() {
    $$("[data-theme-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyTheme(currentTheme() === "dark" ? "light" : "dark");
      });
    });
  }

  function isVisible(el) {
    if (!el || !el.getClientRects().length) return false;
    var style = window.getComputedStyle(el);
    return style.visibility !== "hidden" && style.display !== "none";
  }

  function focusables(node) {
    return $$("a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])", node).filter(isVisible);
  }

  function safeHref(value) {
    if (value == null) return "";
    var raw = String(value).trim();
    if (!raw) return "";
    try {
      var url = new URL(raw, window.location.origin);
      var protocol = String(url.protocol || "").toLowerCase();
      if (protocol !== "http:" && protocol !== "https:") return "";
      return url.href;
    } catch (_) {
      return "";
    }
  }

  function applySafeLink(anchor, value, label) {
    var href = safeHref(value);
    if (!href) return false;
    anchor.href = href;
    anchor.textContent = label || href;
    try {
      if (new URL(href).origin !== window.location.origin) {
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
      }
    } catch (_) {}
    return true;
  }

  function lockScroll(lock) {
    if (lock) {
      if (document.documentElement.dataset.gahScrollLock == null) {
        document.documentElement.dataset.gahScrollLock = String(window.scrollY || 0);
      }
      document.documentElement.style.overflow = "hidden";
    } else {
      var y = Number(document.documentElement.dataset.gahScrollLock || 0);
      document.documentElement.style.overflow = "";
      delete document.documentElement.dataset.gahScrollLock;
      if (y) window.scrollTo(0, y);
    }
  }

  function topOverlay() {
    return overlayStack.length ? overlayStack[overlayStack.length - 1] : null;
  }

  function setBackgroundInert(inert) {
    $$("header, main, footer, .ask-launcher, .progress, .consent-reopen").forEach(function (node) {
      if (!node) return;
      if (inert) node.setAttribute("aria-hidden", "true");
      else node.removeAttribute("aria-hidden");
      if ("inert" in node) node.inert = !!inert;
    });
  }

  function openOverlay(id, opener) {
    var node = document.getElementById(id);
    if (!node) return;
    var backdrop = $("#gah-backdrop");
    node.hidden = false;
    node.setAttribute("data-open", "1");
    node.setAttribute("aria-modal", "true");
    if (!node.getAttribute("role")) node.setAttribute("role", "dialog");
    if (backdrop) backdrop.hidden = false;
    overlayStack.push({ id: id, opener: opener || document.activeElement });
    lockScroll(true);
    setBackgroundInert(true);
    if ("inert" in node) node.inert = false;
    node.removeAttribute("aria-hidden");
    var list = focusables(node);
    if (list.length) list[0].focus();
    else node.setAttribute("tabindex", "-1"), node.focus();
  }

  function closeOverlay(id) {
    var entry = null;
    if (id) {
      for (var i = overlayStack.length - 1; i >= 0; i -= 1) {
        if (overlayStack[i].id === id) { entry = overlayStack[i]; overlayStack.splice(i, 1); break; }
      }
    } else {
      entry = overlayStack.pop();
    }
    if (!entry) return;
    var node = document.getElementById(entry.id);
    if (node) {
      node.hidden = true;
      node.removeAttribute("data-open");
      node.removeAttribute("aria-modal");
    }
    if (!overlayStack.length) {
      var backdrop = $("#gah-backdrop");
      if (backdrop) backdrop.hidden = true;
      lockScroll(false);
      setBackgroundInert(false);
    }
    var opener = entry.opener;
    if (opener && opener.isConnected && typeof opener.focus === "function") opener.focus();
  }

  function closeAllOverlays() {
    while (overlayStack.length) closeOverlay();
  }

  function initOverlays() {
    var backdrop = $("#gah-backdrop");
    if (backdrop) backdrop.addEventListener("click", function () { closeAllOverlays(); });
    document.addEventListener("keydown", function (event) {
      var top = topOverlay();
      if (event.key === "Escape" && top) {
        event.preventDefault();
        closeOverlay(top.id);
        return;
      }
      if (event.key === "Tab" && top) {
        var node = document.getElementById(top.id);
        if (!node || node.hidden) return;
        var list = focusables(node);
        if (!list.length) { event.preventDefault(); return; }
        var first = list[0];
        var last = list[list.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (top && top.id === "command-palette") closeOverlay("command-palette");
        else openOverlay("command-palette", document.activeElement);
      }
    });
    $$("[data-overlay-open]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openOverlay(btn.getAttribute("data-overlay-open"), btn);
      });
    });
    $$("[data-overlay-close]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        closeOverlay(btn.getAttribute("data-overlay-close"));
      });
    });
  }

  function initNav() {
    var menu = $("[data-menu-button]") || $("[data-menu]");
    var panel = $("[data-mobile-nav]") || $("[data-mobile]");
    if (!menu || !panel) return;
    menu.addEventListener("click", function () {
      var open = menu.getAttribute("aria-expanded") === "true";
      menu.setAttribute("aria-expanded", open ? "false" : "true");
      panel.classList.toggle("is-open", !open);
    });
    var path = location.pathname.replace(/\.html$/, "") || "/";
    $$("a[data-route-link]").forEach(function (a) {
      var href = a.getAttribute("href");
      if (href === path || (href !== "/" && path.indexOf(href) === 0)) {
        a.setAttribute("aria-current", "page");
      }
    });
  }

  function initProgress() {
    var bar = $("[data-article-progress] span");
    var article = $("article.prose, [data-article]");
    if (!bar || !article) return;
    function update() {
      var rect = article.getBoundingClientRect();
      var total = article.offsetHeight - window.innerHeight * 0.35;
      var scrolled = Math.min(1, Math.max(0, -rect.top / Math.max(total, 1)));
      bar.style.width = (scrolled * 100) + "%";
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  function initLens() {
    $$("[data-evidence-lens]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var payload;
        try { payload = JSON.parse(btn.getAttribute("data-evidence-lens") || "{}"); }
        catch (_) { payload = {}; }
        var title = $("#lens-title");
        var body = $("#lens-body");
        if (title) title.textContent = payload.title || "Inspect receipt";
        if (body) {
          body.innerHTML = "";
          body.classList.add("lens-doc");
          function row(k, v, cls) {
            if (!v) return;
            var dt = document.createElement("dt");
            dt.textContent = k;
            var dd = document.createElement("dd");
            if (cls) dd.className = cls;
            if (k === "Source link") {
              var a = document.createElement("a");
              if (applySafeLink(a, payload.href || v, v === payload.href ? "Open source" : v)) dd.appendChild(a);
              else dd.textContent = "Source available in the investigation text.";
            } else if (k === "Identifier") {
              dd.className = (dd.className + " evidence-id").trim();
              dd.textContent = v;
            } else dd.textContent = v;
            body.appendChild(dt);
            body.appendChild(dd);
          }
          row("Source type", payload.type);
          row("Date", payload.date);
          row("Identifier", payload.id);
          row("What it establishes", payload.establishes, "lens-establishes");
          row("What it does not establish", payload.not, "lens-not");
          row("Confidence", payload.confidence);
          row("Source link", payload.href || payload.linkLabel);
          row("Related timeline", payload.timeline);
          row("Correction status", payload.correction);
        }
        openOverlay("evidence-lens", btn);
      });
    });
  }

  function initPalette() {
    var form = $("[data-palette-form]");
    var list = $("[data-palette-list]");
    if (!form || !list) return;
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var q = ($("[data-palette-input]") || {}).value || "";
      q = String(q).trim();
      if (!q) return;
      window.location.href = "/search?q=" + encodeURIComponent(q);
    });
  }

  var DEFAULT_CONSENT = {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied"
  };

  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function () { window.dataLayer.push(arguments); };
  }

  function readStoredConsent() {
    try {
      var parsed = JSON.parse(localStorage.getItem(CONSENT_KEY) || "null");
      if (!parsed || parsed.version !== 1 || !parsed.choice) return null;
      return parsed;
    } catch (_) { return null; }
  }

  function writeStoredConsent(choice, consent) {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify({
        version: 1, choice: choice, consent: consent, updated_at: new Date().toISOString()
      }));
    } catch (_) {}
  }

  function loadGoogleTagIfAllowed(consent) {
    var boot = window.GAH_CONSENT_BOOT || {};
    var host = String(location.hostname || "").toLowerCase();
    var prod = host === "grokarchivehub.com" || host.endsWith(".grokarchivehub.com");
    if (!prod) return;
    if (!boot.googleTagEnabled || !boot.ga4MeasurementId) return;
    if (!consent || consent.analytics_storage !== "granted") return;
    if (document.querySelector("script[data-gah-google-tag]")) return;
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(boot.ga4MeasurementId);
    script.setAttribute("data-gah-google-tag", "true");
    document.head.appendChild(script);
    window.gtag("js", new Date());
    window.gtag("config", boot.ga4MeasurementId, { send_page_view: true });
  }

  function applyConsent(consent) {
    var next = Object.assign({}, DEFAULT_CONSENT, consent || {});
    window.gtag("consent", "update", next);
    document.documentElement.dataset.gahConsent = JSON.stringify(next);
    loadGoogleTagIfAllowed(next);
    window.dispatchEvent(new CustomEvent("gah:consent:update", { detail: next }));
  }

  function googleCmpPresent() {
    try {
      if (typeof window.__tcfapi === "function") return true;
      if (window.googlefc && (window.googlefc.callbackQueue || window.googlefc.controlledMessagingFunction)) return true;
      if (document.querySelector('script[src*="fundingchoicesmessages.google.com"]')) return true;
    } catch (_) {}
    return false;
  }

  function setConsentReserve(px) {
    var value = Math.max(0, Math.ceil(Number(px) || 0));
    document.documentElement.style.setProperty("--gah-consent-reserve", value + "px");
    if (value > 0) document.documentElement.setAttribute("data-gah-consent-banner", "1");
    else document.documentElement.removeAttribute("data-gah-consent-banner");
    window.dispatchEvent(new Event("gah:consent:reserve"));
  }

  function updateConsentReserve() {
    var banner = $("[data-gah-consent-ui='banner']");
    if (!banner) { setConsentReserve(0); return; }
    setConsentReserve(banner.getBoundingClientRect().height);
  }

  function closeConsentUi() {
    $$("[data-gah-consent-ui]").forEach(function (n) { n.remove(); });
    updateConsentReserve();
  }

  function showReopen() {
    if ($("[data-gah-consent-reopen]")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "consent-reopen";
    btn.setAttribute("data-gah-consent-reopen", "true");
    btn.textContent = "Privacy choices";
    btn.addEventListener("click", showSettings);
    document.body.appendChild(btn);
  }

  function choiceConsent(choice, partial) {
    if (choice === "accept") {
      return { analytics_storage: "granted", ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" };
    }
    if (choice === "partial") return Object.assign({}, DEFAULT_CONSENT, partial || {});
    return Object.assign({}, DEFAULT_CONSENT);
  }

  function persistChoice(choice, partial) {
    var consent = choiceConsent(choice, partial);
    writeStoredConsent(choice, consent);
    applyConsent(consent);
    closeConsentUi();
    showReopen();
  }

  function showSettings() {
    closeConsentUi();
    var current = (readStoredConsent() && readStoredConsent().consent) || DEFAULT_CONSENT;
    var panel = document.createElement("section");
    panel.className = "drawer drawer-bottom";
    panel.id = "consent-settings";
    panel.setAttribute("data-gah-consent-ui", "settings");
    panel.setAttribute("aria-label", "Privacy settings");
    panel.innerHTML =
      "<div class='wrap-narrow'><h2 class='headline'>Privacy choices</h2>" +
      "<p>Essential functions always stay on.</p>" +
      "<label><input type='checkbox' data-consent-field='analytics_storage'> Analytics storage</label><br>" +
      "<label><input type='checkbox' data-consent-field='ad_storage'> Advertising storage</label><br>" +
      "<label><input type='checkbox' data-consent-field='ad_user_data'> Advertising user data</label><br>" +
      "<label><input type='checkbox' data-consent-field='ad_personalization'> Personalized advertising</label>" +
      "<div class='btn-row' data-settings-actions></div></div>";
    $$("[data-consent-field]", panel).forEach(function (input) {
      input.checked = current[input.getAttribute("data-consent-field")] === "granted";
    });
    var actions = $("[data-settings-actions]", panel);
    function add(label, fn, primary) {
      var b = document.createElement("button");
      b.className = primary ? "btn btn-primary" : "btn";
      b.type = "button";
      b.textContent = label;
      b.addEventListener("click", fn);
      actions.appendChild(b);
    }
    add("Save", function () {
      var partial = {};
      $$("[data-consent-field]", panel).forEach(function (input) {
        partial[input.getAttribute("data-consent-field")] = input.checked ? "granted" : "denied";
      });
      persistChoice("partial", partial);
    }, true);
    add("Reject nonessential", function () { persistChoice("reject"); }, false);
    document.body.appendChild(panel);
    updateConsentReserve();
  }

  function showBanner() {
    if (googleCmpPresent()) return;
    if ($("[data-gah-consent-ui]")) return;
    var wrap = document.createElement("section");
    wrap.className = "consent-banner";
    wrap.setAttribute("data-gah-consent-ui", "banner");
    wrap.setAttribute("aria-label", "Privacy choices");
    wrap.innerHTML = "<div class='consent-copy'><strong>Privacy choices</strong><p>Essential functions stay on. Analytics and ads stay off unless you allow them.</p></div>";
    var actions = document.createElement("div");
    actions.className = "btn-row";
    [["Reject nonessential", "reject", false], ["Settings", "settings", false], ["Accept all", "accept", true]].forEach(function (row) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = row[2] ? "btn btn-primary" : "btn";
      b.textContent = row[0];
      b.addEventListener("click", function () {
        if (row[1] === "settings") showSettings();
        else persistChoice(row[1]);
      });
      actions.appendChild(b);
    });
    wrap.appendChild(actions);
    document.body.appendChild(wrap);
    updateConsentReserve();
    if (typeof ResizeObserver === "function") {
      new ResizeObserver(updateConsentReserve).observe(wrap);
    }
  }

  function initConsent() {
    var stored = readStoredConsent();
    if (stored && stored.consent) {
      applyConsent(stored.consent);
      showReopen();
    } else {
      applyConsent(DEFAULT_CONSENT);
      showBanner();
    }
  }

  function initAskGah() {
    var form = $("[data-ask-gah-form]");
    if (!form) return;
    var question = $("[data-ask-gah-question]");
    var status = $("[data-ask-gah-status]");
    var responseNode = $("[data-ask-gah-response]");
    var intent = "auto";
    $$("[data-ask-gah-intent]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        intent = btn.getAttribute("data-ask-gah-intent") || "auto";
        if (status) status.textContent = "Intent: " + intent;
      });
    });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var value = String((question && question.value) || "").trim();
      if (!value) { if (status) status.textContent = "Enter a question first."; return; }
      if (status) status.textContent = "Routing your question…";
      if (responseNode) {
        responseNode.innerHTML = "<p class='loading'>Working…</p>";
      }
      fetch("/api/ai/query", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ question: value, query: value, intent: intent, limit: 8 })
      }).then(function (res) { return res.text().then(function (raw) { return { res: res, raw: raw }; }); })
        .then(function (pack) {
          var data;
          try { data = JSON.parse(pack.raw); } catch (_) { data = { ok: false, error: pack.raw }; }
          if (!pack.res.ok) throw new Error(data.error || data.message || ("HTTP " + pack.res.status));
          if (status) status.textContent = data.mode === "help_desk_v1" ? "Help Desk response ready." : "Archive response ready.";
          if (!responseNode) return;
          responseNode.textContent = "";
          var answer = data.answer || data.summary || data.response || data.text || "";
          if (answer) {
            var p = document.createElement("p");
            p.textContent = answer;
            responseNode.appendChild(p);
          }
          var rows = data.hits || data.results || data.sources || data.items || [];
          rows.forEach(function (row) {
            var href = row.read_url || row.url || row.source_url || "";
            var title = row.title || row.name || "Source";
            var wrap = document.createElement("p");
            var a = document.createElement("a");
            if (applySafeLink(a, href, title)) wrap.appendChild(a);
            else wrap.textContent = title;
            responseNode.appendChild(wrap);
          });
        })
        .catch(function (err) {
          if (status) status.textContent = "Ask GAH is temporarily unavailable.";
          if (responseNode) {
            responseNode.innerHTML = "";
            var p = document.createElement("p");
            p.className = "error-state";
            p.textContent = err && err.message ? err.message : "Request failed.";
            responseNode.appendChild(p);
          }
        });
    });
  }

  function firstArray(data) {
    var keys = ["hits", "results", "documents", "docs", "sources", "evidence", "items"];
    for (var i = 0; i < keys.length; i += 1) if (Array.isArray(data && data[keys[i]])) return data[keys[i]];
    return Array.isArray(data) ? data : [];
  }
  function pick(obj, keys) {
    for (var i = 0; i < keys.length; i += 1) if (obj && obj[keys[i]]) return String(obj[keys[i]]);
    return "";
  }

  function initSearch() {
    var forms = $$("[data-archive-search]");
    if (!forms.length) return;
    var searchPath = window.location.pathname.replace(/\/+$/, "") || "/";
    var isGlobalSearchPage = searchPath === "/search";
    var status = isGlobalSearchPage ? $("[data-search-status]") : null;
    var results = isGlobalSearchPage ? $("[data-search-results]") : null;
    var suggest = isGlobalSearchPage ? $("[data-search-suggest]") : null;
    var recentKey = "gah-search-recent-v2";
    function formInput(form) { return form ? form.querySelector("input, textarea") : null; }
    function formButton(form) { return form ? form.querySelector("button") : null; }
    function mainForm() {
      for (var i = 0; i < forms.length; i += 1) {
        if (forms[i].classList.contains("search-form")) return forms[i];
      }
      return forms[0];
    }
    function recents() {
      try { return JSON.parse(localStorage.getItem(recentKey) || "[]"); } catch (_) { return []; }
    }
    function saveRecent(q) {
      var list = recents().filter(function (x) { return x !== q; });
      list.unshift(q);
      try { localStorage.setItem(recentKey, JSON.stringify(list.slice(0, 6))); } catch (_) {}
    }
    function renderRecents() {
      if (!suggest) return;
      suggest.innerHTML = "";
      recents().forEach(function (q) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "btn";
        b.textContent = q;
        b.addEventListener("click", function () { runSearch(q, mainForm()); });
        suggest.appendChild(b);
      });
    }
    renderRecents();
    function addResult(title, text, href, id) {
      var article = document.createElement("article");
      article.className = "search-result";
      var h3 = document.createElement("h3");
      h3.textContent = title;
      article.appendChild(h3);
      if (id) {
        var meta = document.createElement("p");
        meta.className = "evidence-id";
        meta.textContent = id;
        article.appendChild(meta);
      }
      if (text) {
        var p = document.createElement("p");
        p.textContent = text.slice(0, 1600);
        article.appendChild(p);
      }
      if (href) {
        var a = document.createElement("a");
        if (applySafeLink(a, href, "Open source")) article.appendChild(a);
      }
      results.appendChild(article);
    }
    function runSearch(query, sourceForm) {
      query = String(query || "").trim();
      var button = formButton(sourceForm || mainForm());
      if (!results) {
        window.location.href = "/search?q=" + encodeURIComponent(query);
        return;
      }
      if (!query) { if (status) status.textContent = "Enter a name, phrase, date, or EFTA identifier."; return; }
      if (button) button.disabled = true;
      if (status) status.textContent = "Searching source records…";
      results.innerHTML = "<p class='loading'>Searching the archive…</p>";
      saveRecent(query);
      renderRecents();
      forms.forEach(function (form) {
        var input = formInput(form);
        if (input) input.value = query;
      });
      fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: query, query: query, tag: "All", limit: 10, fast: true, no_ai: true })
      }).then(function (res) { return res.text().then(function (raw) { return { res: res, raw: raw }; }); })
        .then(function (pack) {
          var data;
          try { data = JSON.parse(pack.raw); } catch (_) { data = { answer: pack.raw }; }
          if (!pack.res.ok) throw new Error(pick(data, ["error", "message"]) || ("HTTP " + pack.res.status));
          results.innerHTML = "";
          var answer = pick(data, ["answer", "summary", "response", "text"]);
          if (answer) addResult("Source-grounded summary", answer, "", "");
          var rows = firstArray(data);
          rows.forEach(function (row) {
            var id = pick(row, ["efta_id", "id", "efta", "document_id"]);
            var title = pick(row, ["title", "name"]) || id || "Archive result";
            var text = pick(row, ["snippet", "summary", "text", "content", "combined_text", "body"]);
            var href = pick(row, ["read_url", "pdf_url", "url", "source_url"]);
            if (href && (href.indexOf("/volume") === 0 || href.indexOf("/homes") === 0)) href = "";
            if (!href && /^EFTA[0-9]{8}$/i.test(id)) href = "/archive/" + id.toUpperCase();
            addResult(title, text, href, id);
          });
          if (/^EFTA[0-9]{8}$/i.test(query)) {
            var wanted = query.toUpperCase();
            var found = rows.some(function (row) { return pick(row, ["efta_id", "id", "efta", "document_id"]).toUpperCase() === wanted; });
            if (!found) addResult(wanted, "Exact archive identifier route. The search index did not return an OCR hit for this identifier.", "/archive/" + wanted, wanted);
          }
          if (!answer && !results.children.length) {
            results.innerHTML = "<div class='empty'>No readable results. Try a spelling variant, exact phrase, or EFTA identifier.</div>";
          }
          var shown = results.querySelectorAll(".search-result").length;
          if (status) status.textContent = "Search complete · " + shown + " result" + (shown === 1 ? "" : "s") + ".";
        })
        .catch(function (err) {
          results.innerHTML = "<div class='error-state'>Search is unavailable in this preview or the archive service did not respond. The evidence vault remains linked from Explore.</div>";
          if (status) status.textContent = "Search request failed: " + (err && err.message ? err.message : "unknown error");
        })
        .then(function () { if (button) button.disabled = false; });
    }
    forms.forEach(function (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var input = formInput(form);
        var q = input ? input.value : "";
        if (!results) {
          window.location.href = "/search?q=" + encodeURIComponent(String(q).trim());
          return;
        }
        var next = new URL(window.location.href);
        next.searchParams.set("q", String(q).trim());
        window.history.replaceState({}, "", next.pathname + next.search);
        runSearch(q, mainForm());
      });
    });
    var initial = new URL(window.location.href).searchParams.get("q");
    if (initial && results) runSearch(initial, mainForm());
  }
  function initMotion() {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var targets = $$(".reveal-target");
    if (!targets.length) return;
    document.documentElement.classList.add("js-motion");
    if (typeof IntersectionObserver !== "function") {
      targets.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    targets.forEach(function (el) { io.observe(el); });
  }

  function initSubscribe() {
    var forms = $$("[data-subscribe]");
    if (!forms.length) return;
    forms.forEach(function (sub) {
      sub.addEventListener("submit", async function (event) {
        event.preventDefault();
        var note = sub.querySelector("[data-subscribe-note]");
        var emailInput = sub.querySelector('input[type="email"]');
        var trap = sub.querySelector('input[name="company"]');
        var button = sub.querySelector('button[type="submit"]');
        var email = String(emailInput && emailInput.value || "").trim();
        if (!email) {
          if (note) note.textContent = "Enter an email address to subscribe.";
          if (emailInput) emailInput.focus();
          return;
        }
        if (button) { button.disabled = true; button.setAttribute("aria-busy", "true"); }
        if (note) note.textContent = "Subscribing…";
        try {
          var response = await fetch("/api/newsletter/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ email: email, company: String(trap && trap.value || ""), source_path: window.location.pathname })
          });
          var payload = {};
          try { payload = await response.json(); } catch (_) {}
          if (!response.ok || !payload.ok) throw new Error(payload.error || "subscribe_failed");
          if (note) note.textContent = payload.status === "already_subscribed" ? "You're already on the GAH newsletter list." : "You're subscribed. Watch this inbox for GAH newsroom updates.";
          if (emailInput) emailInput.value = "";
        } catch (_) {
          if (note) note.textContent = "Subscription failed. Please try again or email grokcloudflare@gmail.com.";
        } finally {
          if (button) { button.disabled = false; button.removeAttribute("aria-busy"); }
        }
      });
    });
  }

  function initNewsletterUnsubscribe() {
    var form = $("[data-newsletter-unsubscribe]");
    if (!form) return;
    var params = new URLSearchParams(window.location.search || "");
    var token = String(params.get("token") || "").trim();
    var note = form.querySelector("[data-unsubscribe-note]");
    var button = form.querySelector('button[type="submit"]');
    if (!token) {
      if (button) button.disabled = true;
      if (note) note.textContent = "This unsubscribe link is incomplete. Use the link from a GAH newsletter message.";
      return;
    }
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (button) { button.disabled = true; button.setAttribute("aria-busy", "true"); }
      if (note) note.textContent = "Updating subscription…";
      try {
        var response = await fetch("/api/newsletter/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ token: token })
        });
        var payload = {};
        try { payload = await response.json(); } catch (_) {}
        if (!response.ok || !payload.ok) throw new Error(payload.error || "unsubscribe_failed");
        if (note) note.textContent = "You're unsubscribed from GAH newsletter delivery.";
        if (button) button.hidden = true;
      } catch (_) {
        if (note) note.textContent = "We couldn't update that subscription. Email grokcloudflare@gmail.com and we'll handle it manually.";
        if (button) { button.disabled = false; button.removeAttribute("aria-busy"); }
      }
    });
  }

  initThemeControls();
  initNav();
  initOverlays();
  initProgress();
  initLens();
  initPalette();
  initConsent();
  initAskGah();
  initSearch();
  initMotion();
  initSubscribe();
  initNewsletterUnsubscribe();
})();
