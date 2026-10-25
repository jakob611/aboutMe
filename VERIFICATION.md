# Repair acceptance — 25 October 2026

Preview: http://localhost:8787. Branch: `codex/admin-dashboard`, PR #1.
Release is pending. The supplied Cloudflare log identified a dependency-install
failure; the compatibility repair still needs a successful Cloudflare rerun.

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

This was a signed-out state in the available browser, not an isolated fresh
private profile: that context-control API is unavailable. Forged/tampered/expired
cookie operations are covered by automated tests, not browser cookie injection.
Hash navigation, keyboard-focus behavior, populated project filters, details and
galleries, actual downloads and successful contact submission were not exercised
in this final browser pass. The data-dependent interactions require local Neon
configuration; automated filter/file tests are supporting evidence only.

Representative desktop evidence is saved locally under `artifacts/browser-final/`,
including `contact-en-draft-final.jpg`, `contact-sl-draft-final.jpg`,
`home-android-sketchbook.jpg`, `admin-dashboard-config.jpg` and
`admin-signed-out.jpg`. The full local tester report is
`artifacts/browser-final/independent-browser-report.md`; these local evidence
files are excluded from Git.

Baseline actual browser: desktop Home, Services and Contact rendered; deliberate
SL → EN Contact switch cleared the unsent name/message before this repair.
The browser reported reduced motion enabled, fine pointer and hover support,
with no console errors. This explains disabled animation in this test browser;
it does not establish the owner's browser setting.

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

## Outstanding release requirements

- [ ] Visible entry/scroll/hover motion under `no-preference` in a real browser.
  The available browser exposes no media emulation. Reduced-motion behavior can
  be inspected, but successful motion acceptance cannot be inferred from it.
- [ ] Mobile/touch checks: the browser viewport setter reported success while
  `innerWidth` and screenshots stayed 1280×720. These are not mobile evidence.
- [ ] Browser keyboard-focus and hash-navigation checks, plus an isolated fresh
  private-session test. Existing unit checks do not replace this acceptance.
- [ ] Live project CRUD, cover/gallery upload and contact inbox. The local preview
  has no DATABASE_URL, so unavailable local data is not evidence about production.
- [ ] Successful Cloudflare build/check rerun with the dependency override repair.
  The actual supplied log diagnosed an npm 10.9.2 override/lock validation failure,
  not a missing runtime ADMIN_SESSION_SECRET. Cloudflare CLI remains signed out.
- [ ] Production cookies, cache behavior, credentials and Neon/R2 end-to-end
  operations. Unit coverage and local packaging do not verify production.

No migrations, sample data, production mutations, storage cleanup or deployment
were performed. Keep existing runtime secrets/bindings. Do not merge until the
Cloudflare failure and required release verification are resolved.
