(function () {
  "use strict";

  var path = window.location.pathname.replace(/\/+$/, "") || "/";

  function globalHeaderHtml() {
    return '' +
      '<header class="site-header" data-gah-global-header>' +
      '<div class="nav-shell">' +
      '<a class="brand" href="/"><span class="brand-mark">GA</span><span>Grok Archive Hub</span></a>' +
      '<button class="menu-button" type="button" data-menu-button aria-expanded="false" aria-label="Open navigation">Menu</button>' +
      '<nav class="nav-links" data-nav-links aria-label="Primary navigation">' +
      '<a data-route-link href="/investigations">Investigations</a>' +
      '<a data-route-link href="/evidence-briefs">Evidence</a>' +
      '<a data-route-link href="/timeline-reconstructions">Timelines</a>' +
      '<a data-route-link href="/explore">Explore</a>' +
      '<a data-route-link href="/search">Search</a>' +
      '<a data-route-link href="/methodology">Methodology</a>' +
      '<a data-route-link href="/corrections">Corrections</a>' +
      '<a data-route-link href="/membership">Membership</a>' +
      '</nav>' +
      '<button class="theme-toggle" type="button" data-theme-toggle aria-label="Switch color theme" title="Switch color theme">◐</button>' +
      '</div>' +
      '</header>';
  }

  function globalStatusHtml() {
    return '' +
      '<div class="global-status" data-gah-status>' +
      '<div class="page-shell">' +
      '<div class="status-metrics" aria-label="Archive status">' +
      '<span class="status-pill"><strong>Archive</strong> active</span>' +
      '<span class="status-pill"><strong>Evidence files</strong> <span data-gah-stat="evidenceDataFiles">Loading</span></span>' +
      '<span class="status-pill"><strong>Investigations</strong> <span data-gah-stat="investigations">Loading</span></span>' +
      '<span class="status-pill"><strong>Last update</strong> <span data-gah-stat="lastEvidenceUpdate">Loading</span></span>' +
      '<a class="status-pill" href="/corrections"><strong>Corrections</strong></a>' +
      '<a class="status-pill" href="/methodology"><strong>Methodology</strong></a>' +
      '</div>' +
      '<div class="local-time-panel" aria-label="Visitor local time">' +
      '<span class="local-time-pill"><strong data-local-greeting>Hello</strong></span>' +
      '<span class="local-time-pill"><time data-local-datetime aria-live="off">Local time loading</time></span>' +
      '<span class="local-time-pill"><strong>Timezone</strong> <span data-local-timezone>Browser timezone</span></span>' +
      '<span class="local-time-pill presence-pill" data-gah-presence data-presence-state="connecting" aria-live="polite"><span class="presence-dot" aria-hidden="true"></span><strong data-presence-count>—</strong> <span data-presence-label>connecting</span></span>' +
      '<span class="sr-only" aria-live="polite" data-local-time-status></span>' +
      '</div>' +
      '</div>' +
      '</div>';
  }

  function ensureGlobalExperience() {
    if (!document.querySelector(".skip-link")) {
      document.body.insertAdjacentHTML("afterbegin", '<a class="skip-link" href="#main-content">Skip to content</a>');
    }
    if (!document.getElementById("main-content")) {
      var main = document.querySelector("main");
      if (main && !main.id) {
        main.id = "main-content";
      } else if (main) {
        main.insertAdjacentHTML("beforebegin", '<span id="main-content" class="skip-anchor" tabindex="-1"></span>');
      }
    }
    if (!document.querySelector(".site-header")) {
      document.body.insertAdjacentHTML("afterbegin", globalHeaderHtml());
    }
    var header = document.querySelector(".site-header");
    if (header && !document.querySelector("[data-gah-status]")) {
      header.insertAdjacentHTML("afterend", globalStatusHtml());
    }
    if (header && !header.querySelector("[data-theme-toggle]")) {
      header.querySelector(".nav-shell")?.insertAdjacentHTML("beforeend", '<button class="theme-toggle" type="button" data-theme-toggle aria-label="Switch color theme" title="Switch color theme">◐</button>');
    }
  }

  function setupMenu() {
    var menu = document.querySelector("[data-menu-button]");
    var nav = document.querySelector("[data-nav-links]");
    if (menu && nav && !menu.dataset.gahMenuReady) {
      menu.dataset.gahMenuReady = "true";
      menu.addEventListener("click", function () {
        var open = nav.classList.toggle("open");
        menu.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
  }

  function markCurrentRoute() {
    document.querySelectorAll("[data-route-link]").forEach(function (link) {
      var href = (link.getAttribute("href") || "").replace(window.location.origin, "").replace(/\/+$/, "") || "/";
      if (href === path || (href !== "/" && path.indexOf(href + "/") === 0)) {
        link.setAttribute("aria-current", "page");
      }
    });
  }

  function applyTheme(theme) {
    if (theme !== "dark" && theme !== "light") theme = "light";
    document.documentElement.dataset.theme = theme;
    document.querySelectorAll("[data-theme-toggle]").forEach(function (button) {
      button.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
      button.textContent = theme === "dark" ? "☼" : "◐";
    });
  }

  function setupTheme() {
    var stored = "";
    try { stored = window.localStorage.getItem("gah-theme") || ""; } catch (_) {}
    applyTheme(stored || "light");
    document.querySelectorAll("[data-theme-toggle]").forEach(function (button) {
      if (button.dataset.gahThemeReady) return;
      button.dataset.gahThemeReady = "true";
      button.addEventListener("click", function () {
        var next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        applyTheme(next);
        try { window.localStorage.setItem("gah-theme", next); } catch (_) {}
      });
    });
  }

  function formatNumber(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) return "";
    return number.toLocaleString();
  }

  function formatDate(value) {
    if (!value) return "";
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(date);
  }

  function setStat(name, value) {
    document.querySelectorAll('[data-gah-stat="' + name + '"]').forEach(function (node) {
      node.textContent = value;
    });
  }

  function renderActivity(manifest) {
    var target = document.querySelector("[data-activity-feed]");
    if (!target || !manifest || !Array.isArray(manifest.activity)) return;
    target.innerHTML = "";
    manifest.activity.slice(0, 6).forEach(function (item) {
      var article = document.createElement("article");
      article.className = "activity-item";
      var time = document.createElement("time");
      time.dateTime = item.date || "";
      time.textContent = formatDate(item.date) || "Dated record";
      var body = document.createElement("div");
      var strong = document.createElement("strong");
      strong.textContent = item.event || "Archive event";
      var span = document.createElement("span");
      span.textContent = " · " + (item.title || item.route || "Repository manifest event");
      body.appendChild(strong);
      body.appendChild(span);
      if (item.route) {
        var link = document.createElement("a");
        link.className = "text-link";
        link.href = item.route;
        link.textContent = " Open";
        body.appendChild(link);
      }
      article.appendChild(time);
      article.appendChild(body);
      target.appendChild(article);
    });
  }

  async function loadArchiveStatus() {
    try {
      var response = await fetch("/frontdoor/archive-status.json", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) return;
      var manifest = await response.json();
      var counts = manifest && manifest.counts ? manifest.counts : {};
      setStat("evidenceDataFiles", formatNumber(counts.evidenceDataFiles) || "Unavailable");
      setStat("investigations", formatNumber(counts.investigations) || "Unavailable");
      setStat("lastEvidenceUpdate", formatDate(manifest.lastEvidenceUpdate) || "Unavailable");
      renderActivity(manifest);
    } catch (_) {}
  }


  function setupPresence() {
    if (window.__gahPresenceStarted) return;
    window.__gahPresenceStarted = true;

    var nodes = Array.prototype.slice.call(
      document.querySelectorAll("[data-gah-presence]")
    );

    if (!nodes.length) return;

    var hostname = String(
      window.location.hostname || ""
    ).toLowerCase();

    var eligibleHost =
      hostname === "grokarchivehub.com" ||
      hostname === "www.grokarchivehub.com" ||
      hostname === "wiki.grokarchivehub.com";

    function render(count, state, fallbackText) {
      nodes.forEach(function (node) {
        var countNode = node.querySelector(
          "[data-presence-count]"
        );

        var labelNode = node.querySelector(
          "[data-presence-label]"
        );

        node.dataset.presenceState = state;

        if (
          Number.isFinite(count) &&
          count >= 0
        ) {
          countNode.textContent =
            Number(count).toLocaleString();

          labelNode.textContent =
            count === 1
              ? "reader online"
              : "readers online";

          node.title =
            "Approximate active browsers connected now";
        } else {
          countNode.textContent = "—";
          labelNode.textContent =
            fallbackText || "live count unavailable";
        }
      });
    }

    if (!eligibleHost || window.location.protocol !== "https:") {
      render(
        null,
        "unavailable",
        "live on production"
      );
      return;
    }

    var storageKey = "gah_presence_client_v1";
    var clientId = "";

    try {
      clientId =
        window.localStorage.getItem(storageKey) || "";
    } catch (_) {}

    if (!/^[A-Za-z0-9_-]{16,96}$/.test(clientId)) {
      if (
        window.crypto &&
        typeof window.crypto.randomUUID === "function"
      ) {
        clientId = window.crypto.randomUUID();
      } else {
        clientId =
          Date.now().toString(36) +
          "_" +
          Math.random().toString(36).slice(2) +
          Math.random().toString(36).slice(2);
      }

      clientId = clientId.replace(
        /[^A-Za-z0-9_-]/g,
        ""
      );

      try {
        window.localStorage.setItem(
          storageKey,
          clientId
        );
      } catch (_) {}
    }

    var socket = null;
    var heartbeatTimer = null;
    var reconnectTimer = null;
    var hiddenTimer = null;
    var stopped = false;
    var reconnectDelay = 1000;

    function clearHeartbeat() {
      if (heartbeatTimer) {
        window.clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    }

    function sendHeartbeat() {
      if (
        socket &&
        socket.readyState === WebSocket.OPEN
      ) {
        try {
          socket.send(
            JSON.stringify({
              type: "heartbeat",
              path: window.location.pathname,
              at: new Date().toISOString()
            })
          );
        } catch (_) {}
      }
    }

    function scheduleReconnect() {
      if (
        stopped ||
        document.visibilityState === "hidden" ||
        reconnectTimer
      ) {
        return;
      }

      render(null, "connecting", "reconnecting");

      reconnectTimer = window.setTimeout(
        function () {
          reconnectTimer = null;
          connect();
        },
        reconnectDelay
      );

      reconnectDelay = Math.min(
        reconnectDelay * 2,
        30000
      );
    }

    function connect() {
      if (
        stopped ||
        document.visibilityState === "hidden"
      ) {
        return;
      }

      if (
        socket &&
        (
          socket.readyState === WebSocket.OPEN ||
          socket.readyState === WebSocket.CONNECTING
        )
      ) {
        return;
      }

      render(null, "connecting", "connecting");

      var endpoint =
        "wss://grokarchivehub.com/api/presence" +
        "?client=" +
        encodeURIComponent(clientId);

      try {
        socket = new WebSocket(endpoint);
      } catch (_) {
        render(
          null,
          "unavailable",
          "live count unavailable"
        );
        scheduleReconnect();
        return;
      }

      socket.addEventListener("open", function () {
        reconnectDelay = 1000;
        clearHeartbeat();
        sendHeartbeat();

        heartbeatTimer = window.setInterval(
          sendHeartbeat,
          30000
        );
      });

      socket.addEventListener("message", function (event) {
        try {
          var message = JSON.parse(event.data);

          if (
            message &&
            message.type === "presence" &&
            Number.isFinite(Number(message.count))
          ) {
            render(
              Number(message.count),
              "live",
              ""
            );
          }
        } catch (_) {}
      });

      socket.addEventListener("close", function () {
        clearHeartbeat();
        socket = null;

        if (!stopped) {
          scheduleReconnect();
        }
      });

      socket.addEventListener("error", function () {
        render(
          null,
          "unavailable",
          "live count unavailable"
        );
      });
    }

    document.addEventListener(
      "visibilitychange",
      function () {
        if (document.visibilityState === "hidden") {
          if (hiddenTimer) {
            window.clearTimeout(hiddenTimer);
          }

          hiddenTimer = window.setTimeout(
            function () {
              if (socket) {
                try {
                  socket.close(
                    1000,
                    "Reader inactive"
                  );
                } catch (_) {}
              }
            },
            90000
          );

          return;
        }

        if (hiddenTimer) {
          window.clearTimeout(hiddenTimer);
          hiddenTimer = null;
        }

        if (
          socket &&
          socket.readyState === WebSocket.OPEN
        ) {
          sendHeartbeat();
        } else {
          connect();
        }
      }
    );

    window.addEventListener("pagehide", function () {
      stopped = true;
      clearHeartbeat();

      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }

      if (hiddenTimer) {
        window.clearTimeout(hiddenTimer);
      }

      if (socket) {
        try {
          socket.close(1000, "Page closed");
        } catch (_) {}
      }
    });

    connect();
  }

  function updateLocalTime(firstRun) {
    try {
      var now = new Date();
      var hour = now.getHours();
      var greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
      var timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local timezone";
      var dateText = new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short"
      }).format(now);
      document.querySelectorAll("[data-local-greeting]").forEach(function (node) { node.textContent = greeting; });
      document.querySelectorAll("[data-local-datetime]").forEach(function (node) {
        node.textContent = dateText;
        node.setAttribute("datetime", now.toISOString());
      });
      document.querySelectorAll("[data-local-timezone]").forEach(function (node) { node.textContent = timeZone; });
      if (firstRun) {
        document.querySelectorAll("[data-local-time-status]").forEach(function (node) {
          node.textContent = "Local date, time, and timezone loaded from browser settings.";
        });
      }
    } catch (_) {
      document.querySelectorAll("[data-local-datetime]").forEach(function (node) { node.textContent = "Local time unavailable"; });
    }
  }

  ensureGlobalExperience();
  setupMenu();
  markCurrentRoute();
  setupTheme();
  updateLocalTime(true);
  window.setInterval(function () { updateLocalTime(false); }, 60000);
  loadArchiveStatus();
  setupPresence();

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
