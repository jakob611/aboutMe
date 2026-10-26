# Branding, sketchbook and Support refinement — 26 October 2026

Preview: http://localhost:8787. These are bounded refinements on the existing
`codex/admin-dashboard` branch. See VERIFICATION.md for the earlier repair and
its remaining production verification requirements.

## Changes

- The supplied owner logo is restored in the shared header/footer, About identity
  and application icon assets. Existing page sections, real content and links stay
  intact. The social preview keeps its existing 1200×630 layout and artwork;
  its small identity mark now uses the same supplied logo.
- Sketchbook scenes have clearer outline drawing and restrained subject accents;
  the existing four-second rotation and click-to-pause/click-away-to-resume behavior
  are preserved. Reduced-motion users see the static artwork.
- Support has a blue/white floating button that opens the official Ko-fi panel for
  `jakobtominc`. The regular donation link remains available in the Donations
  section and inside the panel as a fallback.
  The blue is darkened from the supplied snippet to give its white text sufficient
  contrast. A validated single-profile configuration drives both widget and link;
  a non-profile configuration keeps its regular link without mounting a widget.
- The panel is mounted only on Support and its iframe is created only when opened.
  Native dialog behavior provides modal focus, Escape and focus return; close and
  backdrop clicks remove the iframe. Route unmount closes the dialog. No global
  vendor overlay script, listeners or timers are installed.

The iframe URL is the one constructed by the current official
[Ko-fi overlay script](https://storage.ko-fi.com/cdn/scripts/overlay-widget.js):
`https://ko-fi.com/jakobtominc/?hidefeed=true&widget=true&embed=true`.
The official [widget documentation](https://help.ko-fi.com/hc/en-us/articles/360018381678-Ko-fi-tip-widget)
describes the floating button and embeddable tip panel. Payment and account
settings are untouched; this work does not submit a payment.

## Integrated checks

- [x] 86 automated tests pass, including the real Support fallback link and no
  eager third-party frame/script in server-rendered Support markup.
- [x] TypeScript passes.
- [x] ESLint has no errors and ten existing image/font advisories.
- [x] Final Next 16.4.3/OpenNext 1.20.13 Worker build completed with the frozen
  source and assets; the preview remains running at http://localhost:8787.
- [x] `wrangler deploy --dry-run` passed: 34 asset files, Worker 8932.73 KiB
  (1996.44 KiB gzip), expected R2, self-reference, login-limiter and asset bindings.
  This packages locally and does not deploy or verify remote runtime configuration.
- [x] Final rebuilt Worker browser interactions and measurements listed below.
- [x] Independent critic reviewed the final source, timing evidence and desktop/
  mobile screenshots with no blocking findings after the contrast and recipient
  consistency fixes.

## Actual browser evidence

The lead orchestrator operated the rebuilt local Worker in a real browser after
the implementation owners froze their changes. A separate critic reviews that
evidence; this is not a claim that the implementation authors independently
tested their own work or that a second critic repeated every browser action.

- Header, footer and About logos loaded at 36, 44 and 44 CSS pixels respectively,
  from the supplied 240-pixel asset. Icon/apple-icon metadata points to the new PNG
  assets. The social image's wider layout is preserved.
- Android outline samples changed from stroke-dashoffset 0.935609 to zero during
  one 1.1-second draw. The four actual selected-tab backgrounds match their sage,
  violet, sand and blue-gray accents; inactive outlines reported no animation.
  This temporal evidence is in `outline-motion.json` and `category-accents.json`.
  The existing Web → Android → LEGO → 3D cycle measured 3.934, 3.968 and 4.029
  seconds between scenes (`preserved-cycle.json`).
- The third-party frame loaded the actual Support Jakob Tominc form. No field was
  filled, Tip button clicked or payment submitted. Close, Escape and backdrop
  dismissal each left zero panel frames and returned focus to the Support trigger.
- Native Back while the panel was open returned Home with no widget, dialog or
  frame and no retained scroll lock. Forward returned Support with one trigger,
  a closed dialog and no frame. The Slovenian title, close label and fallback
  translated correctly.
- At real viewport widths of 390 and 320 CSS pixels, the dialog measured 358 and
  288 pixels wide respectively. Screenshots record the loaded panel at both sizes.

Local evidence is retained under `artifacts/branding-kofi-2026-10-26/`, including
`outline-motion.json`, `category-accents.json`, `kofi-lifecycle.json`, and the
desktop/mobile screenshots. These local QA artifacts are excluded from Git.

The embedded provider generated Cloudflare challenge warnings/errors, including
a NaN log. All twenty captured warning/error entries came from
`https://challenges.cloudflare.com`; no first-party entry occurred in that
captured set. This is not an empty-console claim or a guarantee about all prior
console history (`console-summary.json`). The browser report is retained at
`artifacts/branding-kofi-2026-10-26/browser-report.md`.

This pass did not independently test `prefers-reduced-motion: reduce` in the
browser. Rotation preference gating has automated coverage; the new static
outline fallback CSS was source-reviewed only. Physical touchscreen interaction,
payment completion and production deployment are not verified by these checks.
