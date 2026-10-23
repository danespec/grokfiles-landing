# Homepage organization and image weight — October 23, 2026

The homepage now opens with the existing Hold the Letter featured investigation, followed by three clear paths: latest reporting, archive search, and research guides. Repeated full-width announcements become three compact dated news cards, a secondary Trump historical-series strip, and expandable source updates. Six investigation cards remain visible; 31 additional reports retain ordinary HTML links in an expandable list. Original article/source/navigation destinations are preserved. Community, scope, and research resources are grouped into shorter sections; unsupported project percentage meters are omitted from the homepage.

The original images remain available as picture fallbacks and on other routes. Homepage AVIF derivatives use the same visual assets, with no generated or altered evidence. Measured file bytes:

| Image | Original | Homepage AVIF |
| --- | ---: | ---: |
| Hero desk | 262,923 | 44,009 |
| Pinboard card | 354,869 | 32,109 |
| Barak archive card | 1,626,924 | 14,053 |
| Total | 2,244,716 | 90,171 |

This is a 96.0% reduction for these three image files, not a measured reduction in whole-page load time. Below-fold card images are lazy-loaded with explicit dimensions; the hero receives high fetch priority. The new CSS is scoped to the homepage. Shared navigation, consent, ad approval, routes and security headers remain intact. The homepage sitemap lastmod advances to October 23.

Tests cover the actual Worker response, a single leading H1/hero, retained pre-change link destinations, visible and expandable reporting, native search, unique IDs, image dimensions/lazy loading/AVIF payload limits, indexability, CSP and the disabled ad loader. Organic discovery, Trump series, discovery hubs, responsive header and reader rendering regression checks pass. Physical-phone testing and throttled mobile-performance certification remain separate limitations.

Rollback: redeploy main commit `edc663ea11ac931f8e6c1fb82618a1d7f6e31a39`.
