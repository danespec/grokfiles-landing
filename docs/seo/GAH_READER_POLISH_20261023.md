# Reader rendering and accessibility — October 23, 2026

A fresh 178-page production sweep found 25 missing skip-link targets, duplicate IDs on two financial investigations, and duplicate shared stylesheet links on 121 pages. All 178 responded with HTTP 200, one H1 and main landmark, image alt attributes, and parseable structured-data JSON.

The duplicate IDs were caused by a more consequential rendering defect: `String.replace` interpreted dollar amounts in generated share titles as replacement tokens. In the JPMorgan nine-SAR article, `$1.28` inserted the first captured article group into four share controls, producing repeated content and controls over 5,000px wide. The repricing article was also affected. Both article and main fallback insertion now use replacement callbacks so titles remain literal. Title, description, and generated head-tag insertion also use callbacks; regression tests demonstrated that prefix/suffix replacement tokens could otherwise duplicate document sections there.

The shared shell supplies a missing main ID, makes the target programmatically focusable, and points its skip link to the existing main ID where one is present. Base stylesheet normalization retains one current copy after legacy route styles. Editorial text, canonicals, ad approval, source access, and security headers remain unchanged.

Regression coverage includes financial titles and all JavaScript dollar replacement tokens, article and main insertion paths, the two affected production source files, repeated enhancement, alternate main IDs, stylesheet counts, and the disabled ad loader. Browser checks cover keyboard menu activation, header search, source navigation, and rendered share control structure.

Limits: this is not a physical-phone or throttled mobile performance certification. The PageSpeed API refused the request with quota exhaustion; GSC Wizard refused because its trial expired. Direct Search Console currently requires sign-in, so manual-action/security reports remain unverified. The homepage also references an eagerly loaded 1.63MB PNG; that is a performance optimization candidate, not a measured Core Web Vitals failure.

Rollback: redeploy main commit `004a13f9507c5f49ed048995a6943fdf264a7bca` if this renderer-only correction regresses a route.
