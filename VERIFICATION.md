# Category sketchbook and private moderation — 27 October 2026

This release supersedes the earlier Latest/all-project sketchbook behavior.
There are exactly four category choices; each uses its newest posted project.
The four-second category cycle, category pause and click-away resume remain.

- [x] 135 automated tests pass; TypeScript passes; lint has zero errors and the
  existing 11 image/font advisories. Final OpenNext build and deploy dry run pass
  with 36 assets. The rebuilt local Worker is running on port 8787.
- [x] Comment removal/restoration, address blocks, private encrypted metadata,
  authentication/origin/body bounds, action-bound Turnstile-before-Neon ordering,
  public projection privacy and cache invalidation have regression coverage.
- [x] An independent critic found no source/security blocker and independently
  ran the moderation suite (17 tests) and CMS/draft suite (8 tests).
- [x] Actual browser checks show four choices without Latest, category pause and
  click-away resume, private login/logout, moderation filters, honest missing-DB
  feedback, and a real local API/R2 block fixture followed by browser unblocking.
  At 390px the moderation layout measured 382px body/document width.
- [x] The single disposable local block registry was removed with explicit local
  storage targeting. Its original absence was recorded; final authenticated read
  again returns revision null and zero blocks. No production record was changed.
- [x] Real Miniflare R2 tests used the actual cache helpers: repeated reads reuse
  one loader result, a simulator restart retains it, invalidation refreshes it,
  and a stale in-flight conditional cache fill cannot overwrite a tombstone.
  This is persistence evidence, not a production Neon latency benchmark.
- [x] Explicit read-time migration of the retired EN/SL Latest label keys preserves
  other published text and two-hour drafts, including their concurrency revision.
  Unknown fields and new writes with retired keys remain rejected.
- [x] Independent production `MODERATION_SECRET` was generated securely and stored
  in the existing Worker; readback confirms its name and existing secret bindings.
  The local key is different and remains ignored. No value was printed.
- [ ] New PR/Cloudflare branch build, merge and exact-commit production deployment.
- [ ] Production read-only browser/API checks of the new moderation and cache.

Lead-operated browser evidence was independently critiqued from screenshots/AX;
the reviewer did not operate a separate browser. Without a development Neon
database, live comment posting/removal/restoration and new request-location
capture remain untested against production. No live comment, block, project,
message or upload was created or changed during this release's acceptance.
Old submissions have no location metadata; this is shown as unavailable.
See [MODERATION.md](MODERATION.md) for caching benefits and limits.
Evidence and logs: ignored `artifacts/category-moderation-2026-10-27/`.

# Editor, content management and contact verification — 27 October 2026

Current branch: `codex/editor-content-management`. This section supersedes earlier
notes about the separate Home work section, browser-direct Web3Forms delivery,
non-editable services and missing donation configuration. Older sections below
are historical evidence from previous releases.

- [x] Full automated suite: 108/108 tests pass, including protected project CRUD
  through mocked Neon/actual Drizzle mapping, ordered bilingual captions, legacy
  gallery compatibility, closed-source public redaction, CMS conflict protection,
  bounded draft recovery and server-side Turnstile rejection paths.
- [x] TypeScript passes. ESLint has zero errors and 11 advisories: ten image
  optimization recommendations and one custom-font recommendation.
- [x] Server-render tests use Next's server-only marker alias in their test runtime
  and React's streaming renderer for nested async service cards. The production
  server/client boundary remains intact.
- [x] New editor preparation, media uploads and R2 content editing are available
  without a local database; project Save remains blocked during the database outage.
  No schema migration, production project mutation or fictional project was used.
- [x] Next 16.4.3/OpenNext 1.20.13 Worker build and Wrangler 4.152.0 deploy dry run
  pass with 36 static assets. A fresh local preview serves `/` with HTTP 200 on
  port 8787. Logs are in ignored `artifacts/editor-content-2026-10-27/`.
- [x] Lead-operated actual local browser checks passed native file uploads and
  gallery drag ordering, accessible move controls, right-click captions, cover
  caption copy, bare-domain normalization, custom-slug preservation and project
  draft recovery after refresh. Project Save stays blocked without a database.
- [x] Actual CMS publication changed both a Home eyebrow and navigation label;
  refreshed header and public Home showed both changes. Two-editor stale revision
  save was rejected with its draft intact. Use default restored both fields,
  and logout/relogin cleared project/CMS drafts. At 390px, CMS body/document
  width measured 382px. Screenshot: ignored
  `artifacts/editor-cms-2026-10-27/cms-mobile.png`.
- [x] Local fixture cleanup used Wrangler's explicit `--local` on exactly the two
  uploaded test images and newly created `site/content.v1.json`. The saved initial
  snapshot proved content was originally absent. Both media URLs return 404;
  authenticated content read returns revision null and zero overrides again.
- [x] Independent final source/security review and browser/design critique found
  no release blocker. Browser critique assessed the lead's recorded actual UI
  evidence; a separate child-operated browser session was not available.
- [ ] Actual Cloudflare token redemption, accepted private-inbox message and replay
  rejection using the owner's explicitly authorized disposable enquiry.
- [ ] Reviewed PR merge, production deployment and read-only production checks.

The active contact form sends verified messages to **Admin → Messages** and does
not send email. Runtime verification requires the secret and exact hostname
allowlist; the public site key is embedded at build time. No separate development
Neon database exists. Local R2 and tab-draft tests can verify the interaction,
but real production project-save behavior still needs the owner to use intended
content. Mocked tests cannot certify production database permissions.
The file chooser and native gallery-to-gallery drag were exercised; an external
operating-system file drop into the browser was not exercised.
The real local Turnstile widget passively reached "Verification complete";
Send remained disabled without a local database. This does not establish a stored
production contact message or replay rejection; those checks remain listed above.

# Historical repair acceptance — 25 October 2026

Local preview: http://localhost:8787. Branch: `codex/admin-dashboard`, PR #1.
Remote Preview:
[codex-admin-dashboard-aboutme.tomincjakob.workers.dev](https://codex-admin-dashboard-aboutme.tomincjakob.workers.dev).
Release remains pending development-database verification, actual throttling
acceptance and production setup.
The isolated remote Preview is deployed; authentication and R2 checks passed.

## Requested refinements — 26 October 2026

This pass supersedes the historical six-second/Play-button behavior recorded
below. The sketchbook now advances every four seconds, pauses after a subject
selection, and resumes on a click anywhere outside the subject controls. There
is no Play/Pause button. Hover and retained focus do not prevent click-away
resume; hidden/offscreen pages and reduced motion still suspend automatic
rotation. Artwork and its caption link to the newest real project per category,
independent of the three featured cards, with a category collection fallback
when no matching project is available.

One Contact CTA is restored to the right of the language control. Support stays
in the main navigation and always contains a Donations section; no payment
account is configured, so it honestly explains that online donations are not
available yet. The owner will supply the payment profile later.

- [x] 84 automated tests pass, including four-second boundaries, subject/icon
  pause, click-away resume, interruption cleanup, newest-per-category SQL ordering
  and encoded real project destinations.
- [x] TypeScript passes; lint has zero errors and the same 10 advisories.
- [x] The supplied Web3Forms public key is configured only in ignored local
  `.env.local` and the existing branch Preview's Build variables. Cloudflare
  readback confirms the masked key exists; production variables are unchanged.
- [x] Final Next 16.4.3/OpenNext 1.20.13 Worker build and Wrangler deploy dry-run
  pass with 30 assets. The rebuilt local preview is running on port 8787.
- [x] Actual browser acceptance operated by the lead orchestrator independently
  of the implementation owners. Three observed automatic intervals were 3.927,
  4.030 and 4.015 seconds. Subject selection held its scene for 14.5 seconds;
  clicking the caption resumed rotation even while the pointer remained hovered.
  No Play/Pause control remains. Clicking Android artwork reached its category
  fallback, and the single top-right Let's talk CTA opened Contact. Send is
  enabled after key setup; no message was submitted.
- [x] At 390px, client and scroll widths both measured 382px. The header retains
  language → Contact → menu order and one Contact CTA. The pre-existing 320px
  body minimum still gives a 312px client/320px scroll width at a 320px viewport;
  the header fits, but this is not claimed as a full 320px overflow pass.
- [x] Actual English/Slovenian Donations sections remain visible without a
  payment URL and retain the other support sections. The owner deferred supplying
  the donation profile. Browser evidence is saved in the ignored local
  `artifacts/refinements-2026-10-26/root-browser-report.md`,
  `rotation-evidence.json` and accompanying screenshots. The child tester's IAB
  was unavailable; source/design critique is independent of the lead UI pass.
- [ ] Actual Web3Forms provider acceptance and recipient receipt. No real email
  is sent by this verification pass.

The historical no-key/disabled-form observations below predate this setup.
Existing database, throttling, private-profile, touch and production release
requirements remain open.

## New feature integration — 25–26 October 2026

The source now includes four rotating sketchbook scenes with pause controls,
shared 3D printing project categories, one Support navigation link, four About
interests, conditional CV publication/download, seven typed enquiry categories,
and four commercial service offerings with support links. Existing configured
service prices remain; no fallback prices were added.

- [x] Integrated `npm test`: 82 passing tests, including CV authentication,
  fixed-key replacement, PDF validation, safe download headers, category input,
  typed enquiries, delivery failure handling and rotation interruption behavior.
  Undeclared oversized CV request streams stop before multipart parsing; denied
  sessions cannot consume the upload body or touch storage.
- [x] `npm run typecheck` passes.
- [x] `npm run lint` has no errors and the same 10 image/font advisories.
- [x] `npm run dev:cloudflare` rebuilt the final source with Next 16.4.3 and
  OpenNext 1.20.13; the local Worker is running on port 8787. Public CV HEAD
  returns 404 with no-store before any local publication test.
- [x] Independent desktop browser acceptance on the rebuilt local Worker; see
  the scope and evidence below.
- [x] Lead-orchestrator mobile viewport acceptance at 390×844 for the new
  Services/Contact layouts, navigation, enquiries and language draft handoff.
- [x] Final browser smoke after the contextual unavailable-message copy rebuild:
  Contact shows the new message, keeps Send disabled and retains the draft on
  SL → EN; About still has no CV link after local cleanup.
- [ ] Owner CV publication in the intended deployed environment. No owner PDF
  was supplied; no placeholder is published.
- [ ] Actual email acceptance/receipt with the owner's Web3Forms public key.
  No key is configured or real enquiry sent. Without key/Neon, sending is
  deliberately disabled; unit provider mocks do not establish email delivery.

Independent actual desktop testing at 1280×720 with reduced motion disabled
confirmed all four sketchbook scenes and wrap at approximately six-second
intervals, including intermediate vertical transitions. Manual selection/Pause,
Play, real hover alone, keyboard focus alone and offscreen suspension passed.
Header Support and footer Contact navigation worked. Website-maintenance and 3D
service CTAs opened the correct category/topic; the remaining service hrefs were
inspected in the live UI.

Contact category/topic resets, required custom Other subjects and four alternating
EN/SL switches passed with the unsent fields retained. Email was visibly present
and masked in DOM evidence; no unmasked equality claim is made. Send stayed
disabled with an honest unavailable message in the current no-key/no-Neon setup.
About showed all four interests and initially no CV link.

After public CV absence was verified, the tester selected a disposable 1,537-byte
PDF through the actual file chooser and published it in the local CV tab without
Neon. About then exposed Download CV; clicking it downloaded matching bytes. A
supporting public GET confirmed the expected PDF attachment, no-store, nosniff
and sandbox headers. Only the new
`profile/cv.pdf` object was deleted from emulated local R2. Fresh public GET
returned 404, About again had no CV link, and Admin reported no published CV;
the tester signed out. No remote fixture or owner CV was published.

Evidence is saved locally under `artifacts/features-2026-10-25/`, including
`independent-desktop-report.md`, `sketchbook-cycle.json`, `hover-actual.json`,
`keyboard-focus-pause.json`, `contact-draft-language.json`,
`cv-browser-download.json` and `cv-cleanup.json`. These ignored files are not
committed. Hidden-page and reduced-motion=true rotation behavior has automated
coverage; this desktop pass does not claim actual-browser verification of those
two conditions.

At an actual 390×844 mobile viewport, the lead orchestrator checked Services and
Contact with matching 382px client/scroll widths and no horizontal overflow.
The header had one Support link and no Contact link; choosing Support in the
menu opened `/donate` and closed the menu. Clicking the visible website-support
CTA opened a valid web/maintenance enquiry. Choosing Other required a custom
subject; typed name, email, category, topic, custom subject and message survived
EN → SL. Email presence was checked visually. Evidence includes
`mobile-contact-evidence.json`, `contact-mobile-sl.png` and `services-mobile.png`
in the same local evidence directory. After the copy-only rebuild, the reverse
SL → EN handoff retained all fields, the new unavailable message was visible,
and About still had no CV link. Fields were cleared and the viewport restored.
See `mobile-report.md` and `contact-mobile-en.png`. This is a viewport test, not
a physical touchscreen test.

CV publication uses R2 only and requires no database migration. Setup instructions
are in [ADMIN.md](ADMIN.md). The historical acceptance below predates these
feature additions; its remaining release gates still apply.

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

## Automated checks before the new feature additions

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

### Live throttling remains unverified

The deployed Preview binding was confirmed as namespace `710612` with
`simple: { limit: 5, period: 60 }`. This is a nominal five-attempt threshold per
IP per minute per Cloudflare location. Cloudflare documents approximate,
eventually consistent counts: bursts can exceed a threshold even with serial
awaited calls in one location. A strict sixth-request 429 assertion therefore
does not follow from this binding's contract. See
[Cloudflare's accuracy documentation](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/#accuracy).

An independent rapid six-request sequence and another six-request sequence
spaced two seconds apart each returned 401 `Wrong password`, including the
legacy files route. The spaced requests all reported location HAM. Seven
lead-orchestrator browser attempts within a window also showed `Wrong password`.
No 429 or shared throttled denial was observed. These bounded tests confirm
wrong-password rejection; they neither establish live throttling acceptance nor
prove an authentication defect. The existing limiter architecture was preserved.

Evidence: `artifacts/browser-final/rate-limit-preview-report.md`,
`rate-limit-preview-results.json`, `rate-limit-preview-spaced-results.json` and
`browser-rate-limit-evidence.json`. Passing session/R2 checks above do not mean
all security acceptance is complete.

## Outstanding release requirements

- [ ] Actual 429 throttling and shared denial across admin/legacy password
  routes. The configured approximate limiter and wrong-password rejection are
  verified; live enforcement was not demonstrated in the bounded tests.
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
