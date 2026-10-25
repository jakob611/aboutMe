# Portfolio review — 25 October 2026

The portfolio now has a personal workshop direction: clearer typography, restrained
graphite/ivory/sage colors, original interactive sketches and practical bilingual
copy. Production readiness is not established by a successful local build alone.
This review covers the source and automated checks; browser permissions have
prevented a new visual inspection of the live site or Cloudflare logs.

## Deployment

- `ADMIN_SESSION_SECRET` is a runtime signing secret. A missing value prevents
  successful login; this application does not require it during the build.
- Keep `UPLOAD_PASSWORD`, `DATABASE_URL`, site settings and the `UPLOADS` binding.
  The existing upload password is also the admin password.
- Cloudflare's check on the admin PR failed. GitHub exposes no diagnostic log,
  and Cloudflare account access was unavailable. The cause remains unknown;
  adding a runtime signing secret is not evidence that the build failure is fixed.
- Production Neon health and public project-list requests passed in the earlier
  deployment check. Live admin writes and contact-message access remain unverified.

## Security changes included in the PR

- Signed, expiring HTTP-only sessions, Secure cookies in production, SameSite
  protection, same-origin checks and server-side authorization on admin APIs.
- Login and legacy file-upload/delete requests share the same Cloudflare
  password-attempt limit. The legacy endpoints can no longer bypass that budget.
- Public comment API responses and server-to-client comment props select only
  id, author, content and date. Private email addresses are not returned.
- Project input and image-header validation, restricted project-image serving,
  private admin caching headers, and escaped JSON-LD script contents.
- Scoped overrides patch glob and Miniflare's undici dependencies without
  downgrading the Cloudflare adapter. PostCSS is updated within version 8.5.

## Remaining priorities

1. Replace the short numeric test password with a long, unique production
   UPLOAD_PASSWORD. Per-IP, per-location throttling does not make a six-digit
   credential strong against distributed guessing. Changing the password also
   invalidates existing admin sessions.
2. Add anti-spam controls and stricter server validation to contact submissions
   and public comments. Those public write endpoints are still open to automation.
3. The full dependency audit still reports four moderate findings in development
   tools, including drizzle-kit and esbuild. The cited esbuild issues concern
   its development server; this app does not use that server to serve the Worker.
   Avoid forcing npm's suggested downgrade of drizzle-kit. The audit excluding
   dev dependencies reports zero known vulnerabilities after the targeted fixes.
4. Resolve the Cloudflare check and verify all three admin features against the
   actual Neon database and R2 bucket before treating the release as verified.

## Content and design

- Removed fabricated statistics, placeholder profile/payment links, fictional
  service fallback prices and empty emoji photo galleries. Configured real
  service prices and project records are preserved.
- Default identity and GitHub point to verified Jakob Tominc / jakob611 values.
  Unconfigured contact/social/payment links are omitted.
- Added an interactive SVG sketchbook for web, Android and LEGO, with links to
  the corresponding project categories. These are illustrations, not fake
  screenshots of finished projects. No stock portrait or fictional project was added.
- Refined About, Services, Contact, Files and Support while preserving their routes.
  Service inquiries prefill the contact subject. Project text/tag search, counted
  filters, shareable category URLs and an accessible native gallery were added.
- Restored substantive Android, web, and AI/automation offerings on Services and
  the home preview. Core descriptions no longer depend on Neon being present.
  Configured custom titles, descriptions and prices remain available in native
  expandable details; distinct database offerings remain separate.
- Reveal animation is progressive enhancement: server-rendered content stays
  visible without JavaScript, and motion respects reduced-motion preferences.
  Offscreen content gets a prepared scroll reveal; keyboard focus cancels pending
  effects. Card lift, image zoom and hover feedback have been restored. Initially
  visible content stays visible during hydration.
- Language switching performs a document navigation, updating page, header,
  footer, metadata and document language together. Client-router query changes
  previously retained a stale root layout and switch target. The translation icon
  is restored. Manual choices override country/browser detection, browser language
  quality weights are respected, and unrelated cookies (including admin sessions)
  are retained. Restored documents and other-tab cookie changes are reconciled
  before stale layout/prefetch state can mix languages on later navigation.
- Added a real `/og.png` share preview, its editable SVG source, and an SVG icon.
- Missing local database configuration now gives clear public unavailable states
  instead of crashing the main collection pages. This does not verify live data.

Real project images, descriptions and any personal photographs still need to come
from the owner. Those will make the collection more distinctive than additional
decoration or invented marketing claims.

## Checks

50 automated tests pass, covering shared password throttling, private-comment
fields, and failure to mint sessions without a signing secret. TypeScript and
ESLint pass without errors. The Cloudflare Worker builds and starts locally with
the updated dependencies. New regressions cover language selection and repeated
navigation targets, bilingual services/footer rendering, scroll reveal lifecycle,
combined project filters and file-uploader responses that must remain locked.
These are source/component tests; browser click/visual checks remain blocked by
the saved localhost permission. Database integration tests mock Neon; they do not
certify production credentials, permissions or existing table contents.
