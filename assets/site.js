(() => {
  if (window.__BARAK_SITE_JS_V1__) return;
  window.__BARAK_SITE_JS_V1__ = true;

  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  document.querySelectorAll(".primary-nav a[href]").forEach((link) => {
    const href = (link.getAttribute("href") || "").replace(/\/+$/, "");
    if (!href) return;
    if (path === href || (href !== "/barak" && path.startsWith(href + "/"))) {
      link.setAttribute("aria-current", "page");
    }
  });
})();