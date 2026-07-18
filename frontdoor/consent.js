(function () {
  "use strict";

  var STORAGE_KEY = "gah_consent_v1";
  var DEFAULT_CONSENT = {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied"
  };

  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
  }

  window.gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500
  });
  window.gtag("set", "ads_data_redaction", true);

  function routePolicy() {
    var meta = document.querySelector('meta[name="gah-ad-status"]');
    var eligible = document.querySelector('meta[name="gah-ad-eligible"]');
    return {
      adStatus: meta ? meta.getAttribute("content") || "" : "",
      adEligible: eligible ? eligible.getAttribute("content") === "true" : false
    };
  }

  function readStoredConsent() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1 || !parsed.choice) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function writeStoredConsent(choice, consent) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: 1,
        choice: choice,
        consent: consent,
        updated_at: new Date().toISOString()
      }));
    } catch (_) {
      return false;
    }
    return true;
  }

  function applyConsent(consent) {
    var next = Object.assign({}, DEFAULT_CONSENT, consent || {});
    window.gtag("consent", "update", next);
    document.documentElement.dataset.gahConsent = JSON.stringify(next);
    loadGoogleTagIfAllowed(next);
    window.dispatchEvent(new CustomEvent("gah:consent:update", { detail: next }));
  }

  function loadGoogleTagIfAllowed(consent) {
    var boot = window.GAH_CONSENT_BOOT || {};
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

  function currentConsent() {
    var stored = readStoredConsent();
    return stored && stored.consent ? Object.assign({}, DEFAULT_CONSENT, stored.consent) : Object.assign({}, DEFAULT_CONSENT);
  }

  function removeDuplicateUi() {
    document.querySelectorAll("[data-gah-consent-ui]").forEach(function (node, index) {
      if (index > 0) node.remove();
    });
  }

  function button(text, action, primary) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = primary ? "gah-consent-button primary" : "gah-consent-button";
    btn.textContent = text;
    btn.setAttribute("data-gah-consent-action", action);
    return btn;
  }

  function showBanner() {
    if (document.querySelector("[data-gah-consent-ui]")) return;
    var wrap = document.createElement("section");
    wrap.className = "gah-consent-banner";
    wrap.setAttribute("data-gah-consent-ui", "banner");
    wrap.setAttribute("aria-label", "Privacy choices");
    wrap.innerHTML = '<div><strong>Privacy choices</strong><p>Essential site functions always stay on. Analytics and advertising storage stay off unless you allow them.</p></div>';
    var actions = document.createElement("div");
    actions.className = "gah-consent-actions";
    actions.appendChild(button("Reject nonessential", "reject", false));
    actions.appendChild(button("Settings", "settings", false));
    actions.appendChild(button("Accept all", "accept", true));
    wrap.appendChild(actions);
    document.body.appendChild(wrap);
    removeDuplicateUi();
  }

  function showReopenControl() {
    if (document.querySelector("[data-gah-consent-reopen]")) return;
    var reopen = document.createElement("button");
    reopen.type = "button";
    reopen.className = "gah-consent-reopen";
    reopen.setAttribute("data-gah-consent-reopen", "true");
    reopen.textContent = "Privacy choices";
    reopen.addEventListener("click", showSettings);
    document.body.appendChild(reopen);
  }

  function closeConsentUi() {
    document.querySelectorAll("[data-gah-consent-ui]").forEach(function (node) {
      node.remove();
    });
  }

  function choiceConsent(choice, partial) {
    if (choice === "accept") {
      return {
        analytics_storage: "granted",
        ad_storage: "granted",
        ad_user_data: "granted",
        ad_personalization: "granted"
      };
    }
    if (choice === "partial") return Object.assign({}, DEFAULT_CONSENT, partial || {});
    return Object.assign({}, DEFAULT_CONSENT);
  }

  function persistChoice(choice, partial) {
    var consent = choiceConsent(choice, partial);
    writeStoredConsent(choice, consent);
    applyConsent(consent);
    closeConsentUi();
    showReopenControl();
  }

  function showSettings() {
    closeConsentUi();
    var current = currentConsent();
    var panel = document.createElement("section");
    panel.className = "gah-consent-panel";
    panel.setAttribute("data-gah-consent-ui", "settings");
    panel.setAttribute("aria-label", "Privacy settings");
    panel.innerHTML = [
      "<div class=\"gah-consent-card\">",
      "<h2>Privacy choices</h2>",
      "<label><input type=\"checkbox\" data-consent-field=\"analytics_storage\"> Analytics storage</label>",
      "<label><input type=\"checkbox\" data-consent-field=\"ad_storage\"> Advertising storage</label>",
      "<label><input type=\"checkbox\" data-consent-field=\"ad_user_data\"> Advertising user data</label>",
      "<label><input type=\"checkbox\" data-consent-field=\"ad_personalization\"> Personalized advertising</label>",
      "<div class=\"gah-consent-actions\"></div>",
      "</div>"
    ].join("");
    panel.querySelectorAll("[data-consent-field]").forEach(function (input) {
      input.checked = current[input.getAttribute("data-consent-field")] === "granted";
    });
    var actions = panel.querySelector(".gah-consent-actions");
    actions.appendChild(button("Cancel", "cancel", false));
    actions.appendChild(button("Save", "save", true));
    document.body.appendChild(panel);
    removeDuplicateUi();
  }

  function consentForAnalytics() {
    return currentConsent().analytics_storage === "granted";
  }

  function sendAnalyticsEvent(name, params) {
    if (!consentForAnalytics()) return;
    try {
      var eventId = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : String(Date.now()) + Math.random();
      var body = {
        event_name: name,
        event_id: eventId,
        route: window.location.pathname,
        consent: currentConsent(),
        params: Object.assign({ route: window.location.pathname, event_id: eventId }, params || {})
      };
      navigator.sendBeacon && navigator.sendBeacon("/api/analytics/event", new Blob([JSON.stringify(body)], { type: "application/json" }));
    } catch (_) {
      return;
    }
  }

  function installCtaTracking() {
    document.addEventListener("click", function (event) {
      var link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
      if (!link) return;
      var href = link.getAttribute("href") || "";
      if (/patreon\.com/i.test(href)) {
        sendAnalyticsEvent("patreon_cta_click", { cta_id: link.getAttribute("data-cta") || "patreon", destination_host: "patreon.com" });
      } else {
        try {
          var url = new URL(href, window.location.origin);
          if (url.origin !== window.location.origin && (url.protocol === "http:" || url.protocol === "https:")) {
            sendAnalyticsEvent("external_source_click", { destination_host: url.hostname });
          }
        } catch (_) {
          return;
        }
      }
    });
  }

  document.addEventListener("click", function (event) {
    var target = event.target && event.target.closest ? event.target.closest("[data-gah-consent-action]") : null;
    if (!target) return;
    var action = target.getAttribute("data-gah-consent-action");
    if (action === "accept") persistChoice("accept");
    if (action === "reject") persistChoice("reject");
    if (action === "settings") showSettings();
    if (action === "cancel") {
      closeConsentUi();
      if (!readStoredConsent()) showBanner();
    }
    if (action === "save") {
      var partial = {};
      document.querySelectorAll("[data-consent-field]").forEach(function (input) {
        partial[input.getAttribute("data-consent-field")] = input.checked ? "granted" : "denied";
      });
      persistChoice("partial", partial);
    }
  });

  applyConsent(currentConsent());
  if (!readStoredConsent()) showBanner();
  showReopenControl();
  installCtaTracking();

  window.GAHConsent = Object.freeze({
    current: currentConsent,
    reset: function () {
      try { window.localStorage.removeItem(STORAGE_KEY); } catch (_) {}
      applyConsent(DEFAULT_CONSENT);
      showBanner();
    },
    routePolicy: routePolicy
  });
})();
