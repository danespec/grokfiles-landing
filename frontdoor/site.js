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
