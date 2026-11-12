(function () {
  "use strict";
  if (window.GAHConsent) return;

  var STORAGE_KEY = "gah_consent_v1";
  var sessionConsent = null;
  var cmpDecisionReady = false, cmpNotApplicable = false;
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
      var cookie = document.cookie.split('; ').find(function (v) { return v.indexOf('gah_consent_shared_v1=') === 0; });
      var raw = cookie ? decodeURIComponent(cookie.slice('gah_consent_shared_v1='.length)) : window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1 || !parsed.choice || !Number.isFinite(Date.parse(parsed.updated_at)) || Date.now() - Date.parse(parsed.updated_at) > 15552000000) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function writeStoredConsent(choice, consent) {
    try {
      var record = JSON.stringify({
        version: 1,
        choice: choice,
        consent: consent,
        updated_at: new Date().toISOString()
      });
      try { window.localStorage.setItem(STORAGE_KEY, record); } catch (_) {}
      if (/^(?:www\.)?grokarchivehub\.com$|^wiki\.grokarchivehub\.com$/.test(location.hostname)) document.cookie = 'gah_consent_shared_v1=' + encodeURIComponent(record) + '; Max-Age=15552000; Path=/; Domain=grokarchivehub.com; Secure; SameSite=Lax';
    } catch (_) {
      return false;
    }
    return true;
  }

  function applyConsent(consent) {
    var next = Object.assign({}, DEFAULT_CONSENT, consent || {});
    sessionConsent = next;
    // One runtime owns tag configuration, consent updates and pageviews.
    document.documentElement.dataset.gahConsent = JSON.stringify(next);
    loadGoogleTagIfAllowed(next);
    window.dispatchEvent(new CustomEvent("gah:consent:update", { detail: next }));
  }

  function loadGoogleTagIfAllowed(consent) {
    if (window.GAHAnalytics) window.GAHAnalytics.applyConsent(consent);
  }

  function currentConsent() {
    var stored = readStoredConsent();
    return sessionConsent || (stored && stored.consent ? Object.assign({}, DEFAULT_CONSENT, stored.consent) : Object.assign({}, DEFAULT_CONSENT));
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

  // GAH-ADSENSE-REMEDIATION-001: defer first-party UI when Google Privacy & messaging / TCF CMP is live
  function googleCmpPresent() {
    try {
      if (typeof window.__tcfapi === "function") return true;
      if (window.googlefc && window.googlefc.controlledMessagingFunction) return true;
      if (document.querySelector('script[src*="fundingchoicesmessages.google.com"], script[src*="fundingchoices"], iframe[src*="fundingchoicesmessages.google.com"]')) return true;
      if (document.documentElement && document.documentElement.getAttribute("data-google-cmp") === "active") return true;
    } catch (_) {}
    return false;
  }

  function shouldDeferToGoogleCmp() {
    var boot = window.GAH_CONSENT_BOOT || {};
    if (boot.deferToGoogleCmpWhenPresent === false || !boot.googleCmpAnalyticsEnabled || cmpNotApplicable) return false;
    return googleCmpPresent();
  }

  function showBanner() {
    if (shouldDeferToGoogleCmp()) return;
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
    window.requestAnimationFrame(updateConsentReserve);
    window.setTimeout(updateConsentReserve, 50);
    window.setTimeout(updateConsentReserve, 250);
    observeConsentBanner(wrap);
  }

  function showReopenControl() {
    if (document.querySelector("[data-gah-consent-ui]")) return;
    if (document.querySelector("[data-gah-consent-reopen]")) return;
    var reopen = document.createElement("button");
    reopen.type = "button";
    reopen.className = "gah-consent-reopen";
    reopen.setAttribute("data-gah-consent-reopen", "true");
    reopen.textContent = "Privacy choices";
    reopen.addEventListener("click", showSettings);
    document.body.appendChild(reopen);
  }

  function setConsentReserve(px) {
    var root = document.documentElement;
    var value = Math.max(0, Math.ceil(Number(px) || 0));
    if (value > 0) {
      root.style.setProperty("--gah-consent-reserve", value + "px");
      root.setAttribute("data-gah-consent-banner", "1");
    } else {
      root.style.setProperty("--gah-consent-reserve", "0px");
      root.removeAttribute("data-gah-consent-banner");
    }
    try {
      window.dispatchEvent(new Event("gah:consent:reserve"));
    } catch (_) {}
  }

  function updateConsentReserve() {
    var banner = document.querySelector("[data-gah-consent-ui='banner']");
    if (!banner || !banner.isConnected) {
      setConsentReserve(0);
      return;
    }
    var height = Math.ceil(banner.getBoundingClientRect().height);
    setConsentReserve(height > 0 ? height : 0);
  }

  function observeConsentBanner(banner) {
    if (typeof ResizeObserver !== "function") return;
    if (!observeConsentBanner.ro) {
      observeConsentBanner.ro = new ResizeObserver(function () {
        updateConsentReserve();
      });
    }
    if (banner) {
      try { observeConsentBanner.ro.observe(banner); } catch (_) {}
    }
  }

  function closeConsentUi() {
    document.querySelectorAll("[data-gah-consent-ui]").forEach(function (node) {
      node.remove();
    });
    updateConsentReserve();
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
    if (shouldDeferToGoogleCmp()) {
      window.googlefc.callbackQueue.push({CONSENT_API_READY: function () { window.googlefc.showRevocationMessage(); }});
      return;
    }
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
      if (window.GAHAnalytics) window.GAHAnalytics.event(name, params || {});
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

  window.googlefc = window.googlefc || {};
  window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
  function syncGoogleConsent() {
    var fc = window.googlefc;
    if (typeof fc.getGoogleConsentModeValues !== 'function' || !fc.ConsentModePurposeStatusEnum) return;
    var value = fc.getGoogleConsentModeValues(), types = fc.ConsentModePurposeStatusEnum;
    var status = value.analyticsStoragePurposeConsentStatus;
    if (status === types.CONSENT_MODE_PURPOSE_STATUS_NOT_APPLICABLE || status === types.CONSENT_MODE_PURPOSE_STATUS_NOT_CONFIGURED) {
      cmpNotApplicable = true;
      applyConsent(currentConsent());
      if (!readStoredConsent()) showBanner();
      showReopenControl();
      return;
    }
    if (status !== types.CONSENT_MODE_PURPOSE_STATUS_GRANTED && status !== types.CONSENT_MODE_PURPOSE_STATUS_DENIED) return;
    cmpDecisionReady = true;
    persistChoice('partial', {
      analytics_storage: status === types.CONSENT_MODE_PURPOSE_STATUS_GRANTED ? 'granted' : 'denied',
      ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'
    });
  }
  window.googlefc.callbackQueue.push({ CONSENT_MODE_DATA_READY: syncGoogleConsent });
  window.googlefc.callbackQueue.push({ CONSENT_API_READY: function () {
    if (typeof window.__tcfapi !== 'function') return;
    window.__tcfapi('addEventListener', 2, function (data, success) {
      if (success && data && data.eventStatus === 'useractioncomplete') window.googlefc.callbackQueue.push({CONSENT_MODE_DATA_READY: syncGoogleConsent});
    });
  }});

  applyConsent(shouldDeferToGoogleCmp() && !cmpDecisionReady ? DEFAULT_CONSENT : currentConsent());
  if (!readStoredConsent()) showBanner();
  showReopenControl();
  installCtaTracking();
  window.addEventListener("resize", updateConsentReserve);
  window.addEventListener("orientationchange", updateConsentReserve);
  window.addEventListener("load", updateConsentReserve);
  window.requestAnimationFrame(updateConsentReserve);
  if (document.body) document.body.setAttribute("data-gah-consent-ready", "1");
  else document.addEventListener("DOMContentLoaded", function () {
    document.body.setAttribute("data-gah-consent-ready", "1");
    updateConsentReserve();
  });

  // If Google CMP loads after our boot, remove competing first-party chrome.
  if (typeof MutationObserver === "function") {
    var cmpWatch = new MutationObserver(function () {
      if (!shouldDeferToGoogleCmp()) return;
      if (!cmpDecisionReady) applyConsent(DEFAULT_CONSENT);
      document.querySelectorAll("[data-gah-consent-ui]").forEach(function (node) {
        node.remove();
      });
      updateConsentReserve();
    });
    cmpWatch.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(function () { try { cmpWatch.disconnect(); } catch (_) {} }, 15000);
  }

  window.GAHConsent = Object.freeze({
    current: currentConsent,
    reset: function () {
      try { window.localStorage.removeItem(STORAGE_KEY); } catch (_) {}
      document.cookie = 'gah_consent_shared_v1=; Max-Age=0; Path=/; Domain=grokarchivehub.com; Secure; SameSite=Lax';
      applyConsent(DEFAULT_CONSENT);
      showBanner();
    },
    routePolicy: routePolicy
  });
})();
