# Header responsiveness — October 23, 2026

At a 1,348px viewport, the shared header's Support GAH link extended to x=1,397. The full desktop navigation activated at 1,100px even though the fixed brand, navigation, search and support controls exceeded the header's 1,280px container. Hidden horizontal overflow concealed the problem rather than fitting the controls.

The shared `header-responsive-063.css` supplement keeps the compact navigation below 1,440px, shows inline search from 721px, and allows the wide header container to grow to 1,600px. Header controls have 44px minimum heights, and open compact navigation can scroll within the available viewport. Content, membership access, consent settings and ad approval are unchanged.

The Worker registers and injects the fresh stylesheet URL across the existing shared shell, without replacing older base styles or depending on a cache purge. Repeated enhancement does not duplicate the new stylesheet.

`frontdoor/responsive-check-063.html` is an unlinked, noindex maintenance fixture. It loads the actual same-origin public site in a frame at selectable CSS viewport widths, including 320, 375, 430, 768, 1,024, 1,348, 1,440 and 1,600px. It supports homepage, search and investigation journeys. This is responsive-layout testing, not physical-phone or mobile-performance certification.

Automated checks cover stylesheet delivery and shell integration on the homepage, a trust page and an investigation, plus consent/ad-loader regressions. Browser checks use the fixture to inspect control bounds and exercise the menu, search and article navigation. The prior deployment can be redeployed to roll back; the change adds one scoped stylesheet and a shell link rather than altering content routing.
