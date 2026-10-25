# Repair acceptance — 25 October 2026

Local preview: http://localhost:8787. Branch: `codex/admin-dashboard`, PR #1.
Remote Preview:
[codex-admin-dashboard-aboutme.tomincjakob.workers.dev](https://codex-admin-dashboard-aboutme.tomincjakob.workers.dev).
Release remains pending development-database verification and production setup.
The isolated remote Preview is deployed; authentication and R2 checks passed.

## Implemented

- Entry reveals now include content in the initial viewport. Scroll reveals start
  only upon intersection; observer/API failure leaves content readable. Keyboard
  focus and reduced-motion changes cancel animation immediately.
- Card borders/backgrounds and keyboard focus give feedback with reduced motion;
  lifts and image zoom remain limited to motion-enabled mouse use.
- Login and dashboard explain the existing seven-day saved session. Authentication
  duration, credentials, signed-cookie validation and rate limits are unchanged.
- Explicit language changes preserve the unsent Contact fields through a one-use,
  tab-scoped session-storage handoff. Its payload is bounded and removed on read;
  handoffs older than five minutes are refused. No autosave, localStorage or server
  storage is used. Blocked browser storage does not break language navigation.
- Returning to a tab or Back does not reload a Contact draft or overwrite another
  tab's saved preference. Intentional navigation with a conflicting cookie loads
  a fresh document so page, header and footer retain a consistent language.
- Same-page skip/scroll/top links use Next's routing-aware Link rather than
  creating native fragment history entries outside the router. The skip link
  explicitly focuses the main element because Next's fragment scrolling leaves
  focus untouched. A shared fragment wrapper scrolls repeated identical targets,
  which Next otherwise treats as a no-op; CSS controls reduced-motion behavior.
  Native href and focusable-main fallbacks remain without JS.

## Automated checks on the integrated source

- [x] `npm test`: 59 passing tests, including all private admin read/mutation
  operations with missing, forged, tampered and signed-expired sessions. Tests
  confirm rejected requests do not touch Neon/R2; they are not live browser proof.
- [x] `npm run typecheck`.
- [x] `npm run lint`: no errors; 10 existing image/font advisories.
- [x] `npm run dev:cloudflare`: rebuilt Next 16.4.3/OpenNext 1.20.13 Worker and
  restarted only the repository's existing preview. New preview remains running.
- [x] `wrangler deploy --dry-run`: packaged Worker and expected R2/service/limiter
  bindings successfully. This did not deploy or validate production access.

## Browser acceptance

Independent testers checked the rebuilt Worker through the normal in-app browser.
No source-only check is counted as browser acceptance.

- [x] Contact EN → SL → EN → SL → EN retained the entered Name, Subject and
  Message exactly; the disposable email remained visibly present. Header, footer
  and document language agreed after each switch; the subject URL was retained.
  Email values are masked by the browser's DOM inspection, so that field was
  judged from the visible screenshot, not a false unmasked equality assertion.
- [x] Admin initially reopened the existing signed-in dashboard. Sign out showed
  login, and signed-out `/api/admin/projects` and `/api/admin/messages` displayed
  `Unauthorized` without private payloads. A wrong password produced an error;
  the configured existing local credential signed in successfully.
- [x] Reload and reopening preserved that valid session. After another sign out,
  reload and Back displayed login without dashboard controls. Local authenticated
  admin consistently showed the missing-database warning, rather than claiming
  that the project's real data was empty.
- [x] Home, About, Services, Projects, Files, Support (`/donate`) and Contact
  rendered through actual navigation without a crash. Projects and Files showed
  explicit unavailable states. Home's Android sketchbook selection changed its
  art, heading, description and project link to `category=android`.
- [x] The final public-page sequence returned no browser console warnings/errors.
- [x] A separate independent test of the final rebuilt fragment fix passed:
  first Tab reached the skip link, Enter focused `MAIN#main-content`, a Home
  service link opened `/services#android`, and Back/Forward restored matching
  Home/Services content. The service target was 95.58px below the viewport top,
  beneath the sticky header's 81px bottom edge.
- [x] First and repeated hero-scroll activation positioned the selected-work
  target at 96.20px. First/repeated footer clicks and footer keyboard Enter
  returned to scrollY 0; About navigation followed by Back restored Home at
  `/#top`. No mobile or normal-motion claim comes from these desktop checks.

This was a signed-out state in the available browser, not an isolated fresh
private profile: that context-control API is unavailable. Invalid-cookie checks
also passed against the remote Preview using real HTTP requests, as recorded
below; they were not browser cookie injection.
The first final pass omitted hash/focus checks. A follow-up keyboard browser check
confirmed skip-to-main and a visible two-pixel CTA focus outline, then exposed a
history regression: skip to `/#main-content`, follow a service anchor, and Back
could change URL/title to Home while leaving Services rendered. Ordinary
Home → About → Back worked. Installed Next 16.4.3 source ignores null-state
popstate entries, which native fragment anchors can create outside its patched
History API. The shared fragment repair above passed the independent rebuilt
browser regression, including repeated same-URL activation that plain Link
otherwise treats as a no-op.

Populated project filters, details and galleries, actual downloads and successful
contact submission were not exercised. These data-dependent interactions require
local Neon configuration; automated filter/file tests are supporting evidence only.

Representative desktop evidence is saved locally under `artifacts/browser-final/`,
including `contact-en-draft-final.jpg`, `contact-sl-draft-final.jpg`,
`home-android-sketchbook.jpg`, `admin-dashboard-config.jpg` and
`admin-signed-out.jpg`. The full local tester report is
`artifacts/browser-final/independent-browser-report.md`. Fragment/focus evidence
is in `fragment-final-report.md`, with `hero-repeat.jpg`,
`footer-keyboard-top.jpg` and `history-home-fragment.jpg` in the same directory.
These local evidence files are excluded from Git.

Baseline actual browser: desktop Home, Services and Contact rendered; deliberate
SL → EN Contact switch cleared the unsent name/message before this repair.
The browser reported reduced motion enabled, fine pointer and hover support,
with no console errors. This explains disabled animation in this test browser;
it does not establish the owner's browser setting.

### Normal-motion follow-up

After the owner enabled Windows animation effects, an independent tester opened
a fresh ordinary in-app browser tab on the final local Worker. The browser
reported reduced-motion false, hover support and a fine pointer at 1280×720.
No media emulation, DOM mutation or forced animation was used.

- [x] Home reload visibly progressed from partial opacity/vertical translation
  to fully opaque, untransformed hero content. Ordinary scrolling revealed its
  lower heading and service cards.
- [x] Real pointer hover lifted the Android service card by approximately 6px
  and changed its border.
- [x] About reload and scrolling showed entry and lower-section reveals that
  settled fully visible. Tab exposed a visible two-pixel skip-link focus outline.

Evidence: `artifacts/browser-final/independent-motion-brief.md`,
`independent-motion-evidence.json`, `independent-about-focus.png` and
`independent-about-scroll.png`. This pass verifies desktop motion only.

### Responsive viewport follow-up

Lead-orchestrator browser QA used a verified 390×844 viewport on the final local
Worker; this succeeded after the earlier ineffective viewport requests.

- [x] Home, About, Services, Contact, Projects, Files, Support and signed-out
  Admin rendered with document scrollWidth 382px and no horizontal overflow.
  Projects/Files retained explicit unavailable-data states; Admin's login and
  seven-day session notice fit the viewport.
- [x] Mobile menu links close the menu. Escape closes it and returns keyboard
  focus to its toggle.
- [x] Contact EN → SL → EN retained all four unsent fields, with email verified
  visually. Document language and labels agreed; the draft was cleared without
  submission.

This establishes responsive layout and pointer/keyboard interaction at an actual
mobile viewport, not physical touch-device behavior. Evidence is in
`artifacts/browser-final/mobile-report.md`, `mobile-evidence.json`,
`home-mobile.png`, `services-mobile.png`, `contact-mobile.png`,
`contact-mobile-sl.png` and `admin-mobile.png`.

## Cloudflare dependency-install repair

The owner supplied the actual log for build
`449a4449-053d-45c5-904a-6b91cb4f99af`: npm 10.9.2 stopped before the application
build with `EUSAGE`, reporting locked `undici@7.30.1` did not satisfy
`undici@7.29.1`. The exact failure was reproduced in an isolated directory using
the committed package files and npm 10.9.2.

The broad `miniflare` override was changed to the installed prerelease's explicit
`miniflare@5.20261019.2-beta` key. npm 10.9.2 then applies the override correctly.
The lockfile remains byte-identical and retains patched `undici@7.30.1`; regenerating
the lockfile with the broad override instead downgraded it to 7.29.1, so that was
not used. Installed application dependency versions already match this lockfile.
No preview dependency or runtime code changed for this repair.

Clean-install verification runs in package-only scratch directories, leaving
the active preview and its `node_modules` intact. A local success verifies this
install failure is addressed; it does not verify a new Cloudflare deployment.

- [x] npm 10.9.2 full `npm ci --progress=false --no-audit --no-fund` completed
  successfully in an isolated directory, including dependency lifecycle scripts;
  671 packages installed. Installed Miniflare's undici is 7.30.1.
- [x] npm 11.21.1 clean installation also completed in a separate directory;
  665 packages installed. npm 11 reported its install-script approval advisories.
- [x] Both clean installs retained the original lockfile unchanged. These were
  Windows/Node 24.10.0 checks, not a Linux/Node 24.22.1 Cloudflare deployment.

The owner then supplied the next Cloudflare log for build
`9b8f980e-834b-4737-84a3-1912269cafe4`: dependency installation and the Next/OpenNext
application build succeeded. The later `npx wrangler preview` step failed because
the non-production Preview needs its own R2/rate-limit configuration and safe
resources. Preview is the current non-production command, not a typo to replace
with a production deployment. Those resources have since been configured without
altering production, as recorded below.

## Isolated remote Preview acceptance

The committed Preview configuration uses `aboutme-uploads-preview` and limiter
namespace `710612`, separate from production's `aboutme-uploads` and committed
namespace `710611`. Dedicated Preview UPLOAD_PASSWORD and ADMIN_SESSION_SECRET
are present; DATABASE_URL is absent. Local secret copies remain only in ignored
`.dev.vars.preview`. No production credentials were copied into Preview.

Manual branch deployment `42025799-f2fb-4a47-a8fb-1a17e20a0cfa` succeeded.
An independent tester then opened the stable origin normally in the in-app
browser and completed the following actual remote checks:

- [x] Home, Services and Contact render; unavailable project data is explicit.
- [x] First visit to Admin shows login. Wrong password fails; dedicated Preview
  credentials sign in; reload preserves the seven-day session.
- [x] Sign out, reload and navigation/Back show login without dashboard controls.
  Signed-out projects/messages APIs display Unauthorized without private data.
- [x] Browser warning/error console is empty at the end of this sequence.
- [x] Real HTTP requests with missing, forged, signature-byte-tampered and signed
  expired cookies return 401 from projects GET, messages GET and upload POST.
  Private responses use `Cache-Control: private, no-store`.
- [x] Actual login cookie has Secure, HttpOnly, SameSite=Strict, Path=/ and
  Max-Age=604800; logout clears it. No cookie/credential values were saved.
- [x] One disposable 68-byte PNG uploaded to the Preview bucket and downloaded
  byte-for-byte through its media URL with image/png, nosniff and immutable
  public cache headers. Only that new object was deleted; a subsequent
  cache-busted read returned 404.

The authenticated dashboard displays its database-configuration error and
disables Add project. Placeholder counts do not establish an empty real database.
Project CRUD, saved cover/gallery associations and the contact inbox remain
unverified until a development Neon branch is configured. No migrations, contact
submissions, sample projects or production mutations were performed.

Secret-free evidence is in `artifacts/browser-final/remote-preview-report.md`
and `remote-preview-api-results.json`, alongside screenshots. A corrected tamper
fixture changes actual signature bytes; an earlier base64 padding alias did not
and is explicitly excluded from invalid-signature evidence in that report.

### Cloudflare Builds rerun

The later automatic branch build had retained `npm run build`, which creates
Next output only; its Preview step failed because `.open-next/worker.js` was
absent. Using the Cloudflare plugin, only the build commands for Previews Base
and the existing `codex/admin-dashboard` Preview were changed to
`npm run build:cloudflare`. Readback confirmed both deploy commands remained
`npx wrangler preview`; production retained `npm run build:cloudflare` and
`npm run deploy`. Variables and secrets were not changed by this correction.

- [x] Actual Cloudflare build `8a4fb352-9d0b-4bcc-99c6-7d718df09366`, explicitly
  targeting branch commit `b5a3dfcc58173f6c211a7ea05523689d48dd4b58`, finished
  with outcome `success` at 2026-10-25 17:15:58 UTC.
- [x] Remote npm 10.9.2 / Node 24.22.1 dependency installation completed.
  OpenNext generated `.open-next/worker.js`, Preview deployment completed,
  and the final build log reported success.
- [x] GitHub's `Workers Builds: aboutme` check run `121236010464` on that commit
  is completed with conclusion `success` and no annotations. Its details link
  points to the same Cloudflare build.
- [x] The stable Preview URL is unchanged. This rerun's unique deployment URL is
  [e4a8c67c-aboutme.tomincjakob.workers.dev](https://e4a8c67c-aboutme.tomincjakob.workers.dev).

The earlier independent remote browser/HTTP acceptance ran on manual deployment
`42025799`, not this later CI deployment. A subsequent lead-orchestrator smoke
check opened the stable Preview after the CI deployment: Home rendered in the
country-selected Slovenian language, switching to English produced matching
URL/document language and heading, and Admin showed login without authenticated
dashboard controls. The warning/error console was empty. This smoke check did
not repeat the earlier authenticated HTTP/R2 acceptance. No production deploy or
merge occurred.

An independent final critic found no actionable issue in the documentation/PR
description and reviewed the mobile screenshots without visible clipping or
overlap. That critique used the saved reports and supplied build evidence; it
was not another independent Cloudflare/GitHub metadata query.

## Outstanding release requirements

- [ ] Physical touch-device behavior. The verified mobile viewport checks above
  used pointer and keyboard interaction, not a physical touchscreen.
- [ ] An isolated fresh private-session browser test. Signed-out testing of the
  available shared browser context does not verify a fresh private profile.
- [ ] Live project CRUD, cover/gallery upload and contact inbox. The local preview
  has no DATABASE_URL, so unavailable local data is not evidence about production.
- [ ] Production cookies, cache behavior, credentials and Neon/R2 end-to-end
  operations. Unit coverage and local packaging do not verify production.

No migrations, sample data, production mutations, broad storage cleanup or
production deployment were performed. The single new Preview test object was
removed. Keep existing production runtime secrets/bindings. Do not merge until
required release verification is resolved.
