(function () {
  'use strict';
  if (window.GAHAnalytics) return;
  var boot = window.GAH_CONSENT_BOOT || {};
  var id = boot.ga4MeasurementId || '';
  var allowedHost = /^(grokarchivehub\.com|www\.grokarchivehub\.com|wiki\.grokarchivehub\.com)$/.test(location.hostname);
  var automation = /(?:GAH[- /](?:Monitor|Analytics-Audit)|HeadlessChrome|Playwright|Lighthouse|Googlebot|bingbot)/i.test(navigator.userAgent || '');
  var excluded = /^(?:\/api(?:\/|$)|\/admin(?:\/|$)|\/login(?:\/|$)|\/account(?:\/|$)|\/frontdoor\/|\/cdn-cgi\/)/.test(location.pathname);
  var eligible = allowedHost && !automation && !excluded && boot.googleTagEnabled === true && /^G-[A-Z0-9]+$/.test(id);
  var granted = false, configured = false, loading = false, navigation = 0, sentNavigation = -1;
  var previous = document.referrer || '', current = location.href;
  var debug = new URL(location.href).searchParams.get('gah_debug') === '1';
  var engagementTimer;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  function state(value) { document.documentElement.setAttribute('data-gah-analytics', value); }
  function safeUrl(value) {
    if (!value) return '';
    try {
      var u = new URL(value, location.origin), out = new URL(u.origin + u.pathname);
      // Preserve bounded campaign attribution, never search text, tokens or arbitrary query strings.
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_content'].forEach(function (key) {
        var v = u.searchParams.get(key);
        if (v && /^[A-Za-z0-9_. -]{1,80}$/.test(v)) out.searchParams.set(key, v);
      });
      if (/^\/pdf-lite(?:\.html)?$/.test(u.pathname) && /^EFTA\d{8}$/.test(u.searchParams.get('id') || '')) out.searchParams.set('id', u.searchParams.get('id'));
      return /^https?:$/.test(u.protocol) ? out.href : '';
    } catch (_) { return ''; }
  }
  function documentId() { return (location.pathname.match(/EFTA\d{8}/i) || [])[0] || (/^EFTA\d{8}$/.test(new URL(location.href).searchParams.get('id') || '') ? new URL(location.href).searchParams.get('id') : ''); }
  function event(name, params) {
    if (!eligible || !granted || !configured) return;
    window.gtag('event', name, Object.assign({ send_to: id, page_location: safeUrl(location.href) }, debug ? {debug_mode:true,traffic_type:'gah_operations'} : {}, params || {}));
  }
  function pageview() {
    if (!eligible || !granted || !configured || sentNavigation === navigation) return;
    sentNavigation = navigation;
    var params = {page_location: safeUrl(location.href), page_referrer: safeUrl(previous), page_title: document.title.replace(/[\w.+-]+@[\w.-]+/g, '[redacted]').slice(0, 160)};
    event('page_view', params);
    state('pageview-queued');
    if (/^\/pdf-lite(?:\.html)?$/.test(location.pathname)) event('pdf_view', {document_id: documentId(), viewer: 'pdf-lite'});
    clearTimeout(engagementTimer);
    if (documentId()) engagementTimer = setTimeout(function () {
      if (!document.hidden) event('evidence_engagement', {document_id: documentId(), engagement_time_msec: 30000});
    }, 30000);
  }
  function clearAnalyticsCookies() {
    document.cookie.split(';').forEach(function (part) {
      var name = part.trim().split('=')[0];
      if (!/^_ga(?:_|$)|^_gid$|^_gat/.test(name)) return;
      ['', '; Domain=grokarchivehub.com', '; Domain=' + location.hostname].forEach(function (domain) {
        document.cookie = name + '=; Max-Age=0; Path=/; Secure; SameSite=Lax' + domain;
      });
    });
  }
  function applyConsent(consent) {
    granted = !!consent && consent.analytics_storage === 'granted';
    window['ga-disable-' + id] = !eligible || !granted;
    var next = {analytics_storage: granted ? 'granted' : 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'};
    // Advertising remains disabled until the independent approval and route gates pass.
    window.gtag('consent', 'update', next);
    if (!granted) { clearTimeout(engagementTimer); clearAnalyticsCookies(); state(eligible ? 'consent-denied' : 'excluded'); return; }
    if (!eligible) { state('excluded'); return; }
    if (configured) { pageview(); return; }
    if (loading) return;
    loading = true;
    var script = document.createElement('script');
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    script.setAttribute('data-gah-google-tag', 'true');
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    script.onerror = function () { loading = false; state('tag-load-failed'); script.remove(); };
    script.onload = function () {
      if (configured) return;
      configured = true;
      window.gtag('js', new Date());
      window.gtag('config', id, Object.assign({send_page_view: false, cookie_domain: 'grokarchivehub.com', allow_google_signals: false, allow_ad_personalization_signals: false, page_location: safeUrl(location.href), page_referrer: safeUrl(previous)}, debug ? {debug_mode:true,traffic_type:'gah_operations'} : {}));
      pageview();
    };
    state('tag-loading');
    document.head.appendChild(script);
  }
  function navigationKey(value) {
    var u = new URL(value);
    u.hash = '';
    // Diagnostic and CMP URL cleanup does not represent another content navigation.
    ['gah_debug', 'gtm_debug', 'gtm_preview', 'gtm_auth', 'fc', 'fctype'].forEach(function (key) { u.searchParams.delete(key); });
    return u.href;
  }
  function navigate() {
    if (navigationKey(location.href) === navigationKey(current)) { current = location.href; return; }
    previous = current; current = location.href; navigation++; pageview();
  }
  ['pushState', 'replaceState'].forEach(function (method) {
    var original = history[method];
    history[method] = function () { var result = original.apply(this, arguments); navigate(); return result; };
  });
  window.addEventListener('popstate', navigate);
  window.addEventListener('pageshow', function (e) { if (e.persisted) { navigation++; pageview(); } });
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var u; try { u = new URL(a.href, location.origin); } catch (_) { return; }
    if (/\.pdf$/i.test(u.pathname) || /\/pdf-lite(?:\.html)?$/.test(u.pathname)) event('evidence_source_click', {document_id: documentId(), destination_host: u.hostname, viewer: /pdf-lite/.test(u.pathname) ? 'pdf-lite' : 'source-pdf'});
  });
  state(eligible ? 'awaiting-consent' : 'excluded');
  window.GAHAnalytics = Object.freeze({applyConsent: applyConsent, event: function (name, params) {
    if (!/^(?:external_source_click|patreon_cta_click|evidence_source_click)$/.test(name)) return;
    var safe = {};
    ['document_id','destination_host','viewer','cta_id'].forEach(function (key) {
      var value = String((params || {})[key] || '');
      if (value && /^[A-Za-z0-9_.-]{1,100}$/.test(value)) safe[key] = value;
    });
    event(name, safe);
  }});
})();
