# GAH-PHOTOS-045 — Restore public gallery initialization and thumbnail alt text

## Verified root cause
- A read-only Chrome 155 DOM audit against the production /photos page on 2026-10-13 returned **zero** rendered img elements at 390px and 1365px, despite healthy first-page API/thumbnail/media responses.
- The served /photos page is reverse-proxied from the Wiki's original /photos/incoming-visual/index.html. The trusted inline gallery initializer is returned as a Cloudflare Rocket-Loader transformed script with type matching a randomized 12–64-character hexadecimal prefix and the suffix -text/javascript. That MIME is not executable by the browser.
- The apex Worker deliberately removes Rocket Loader's upstream helper, so the transformed script is never recovered. It sets the page status to Loading and neither initializes the first page nor supplies alt text. The Gallery visual API bridge cannot help if the original script hasn't defined its shared binding variables.
- The gallery's 1,000-item first-page data source and individual images exist and respond successfully. No evidence rows are missing due to this client-side issue.
- Historical upstream card templates contain image tags without alt text. This is an accessibility and on-page SEO issue.

## Exact-route mitigation
- Only on /photos, identify the trusted inline script by both literal incoming-visual SLUG assignment and function card(x). Restore ordinary type=text/javascript if the original source has already been converted by Rocket Loader; set data-cfasync=false to prevent re-transformation.
- The function does **not** restore scripts that have unrelated content or unknown MIME; it does not touch other routes.
- Add neutral, already-published EFTA ID-derived alt text to source thumbnails. Do not put faces, personal identity, conduct, or source-authentication claims in alt text.
- Keep the existing source-qualification warning, no additional private publication, source-image paths unchanged, /photos index,follow unchanged, AD-EXCLUDE unchanged, Cloudflare Access and WAF unchanged.

## Live-browser simulation evidence before merge
- Using Chrome DevTools against actual unmodified production HTML, an isolated DOM-only substitution executed the trusted initializer and let the gallery load:
  - 390px: before 0 rendered gallery img elements, after 1,000 with neutral alt text; zero broken images, zero horizontal overflow.
  - 1365px: same after-result 1,000 rendered images with alt text; zero broken images, zero horizontal overflow.
- This verified interaction is not itself a deployment; live acceptance must independently confirm identical behavior with the merged Worker without any DevTools injection.
- Private run reports are stored under ~/. _gah_builds/GAH-REN-FINAL-QA-20261013-private with mode 0600, not Git.

## Delivery gates
- Isolated unit test checks only known initializer script is executable, untouched unrelated scripts remain disabled, image source and EFTA-derived alt output preserved, idempotent behavior, ads disabled.
- Full regression against the current publishing branch; independent GitHub CI; staging remains Cloudflare Access protected; publish only after inspecting package byte differences and ensuring parallel previous release is included; production Chrome mobile+desktop with 1,000 loaded images and alts.
- Do not close privacy/copyright/source-authentication human gates under #77 or #35 on the strength of a working gallery.
