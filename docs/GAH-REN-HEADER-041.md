# REN production browser and crawl audit (2026-10-13)

The live sitemap's 137 routes and 39 separately linked public utility routes returned HTTP 200. The sitemap pages had required titles, H1s, canonical URLs, viewport metadata and no unexpected indexing directives in this structural check.

Chrome 155 viewport tests on eight routes exposed a shared desktop header overflow of 43–120px at width 1365px, while 390px and 768px had none. The primary navigation, mini-search and action links compete for width. A CSS-only browser simulation passed 15 checks over widths 1100, 1199, 1200, 1365 and 1600 across the homepage, photos and research index.

This changes only the Worker HTML shell: hide the duplicate header mini-search on desktop and use the existing compact navigation through 1199px. Search remains in main navigation and accessible via the mobile menu. Local regression: 41 of 41 suites pass. Independently validate via GitHub CI, protected staging, and production Chrome.

Unresolved research and editorial issues remain #35, #36, #9, #31, #33, #37 and #77. Payments #57 remain deferred. HTML/browser acceptance does not establish original-email authenticity, mobile accessibility certification, Google indexing, or AdSense approval. Private analytics are kept outside GitHub. Preserve public indexing of the photo archive.
