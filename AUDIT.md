# Application audit — 28 October 2026

The lead coordinated two specialist source reviews and a separate verification/release critic, and tested the actual site in the browser. No critical or high-severity application defect was identified in the reviewed paths. This is a bounded audit, not a guarantee that all bugs or vulnerabilities have been found.

## Defects repaired

- Login JSON, public file multipart bodies and admin image multipart bodies now have limits enforced while reading the stream. Missing or understated `Content-Length` cannot bypass the limit. Existing authentication, origin checks, password-attempt limiting and file size limits remain in place. Excess bodies return 413 before storage.
- Public file uploads validate filename, MIME and description lengths before storage. A valid long filename no longer makes the generated UUID-prefixed storage name exceed the database's 255-character column. Its original download name is retained.
- Long unbroken public/admin comment names and content wrap inside their cards. A mobile browser fixture using the real rendered component and built CSS reproduced a 19,912-pixel page before the fix and a 382-pixel page afterwards at a 390-pixel viewport.
- Project detail tags already beginning with `#` no longer display a second hash. Stored project content is unchanged.

## Verification

| Area | Evidence |
| --- | --- |
| Automated checks | 147 tests pass; TypeScript passes; ESLint has zero errors and 11 existing image/font advisories. Fresh Next/OpenNext build and Wrangler deployment dry run pass. |
| Dependency advisories | `npm audit --omit=dev`: zero findings. Full audit: four moderate package findings, zero high/critical, in development-only esbuild dependency chains. |
| Authentication | All six admin read APIs reject absent and forged sessions with 401 and private/no-store responses. Owner login and private reads succeed. Production session cookie is Secure, HttpOnly and SameSite=Strict. Browser logout followed by reload returns to login. |
| Write boundaries | Unauthenticated admin writes are rejected. Authenticated cross-origin project writes and cross-origin contact/comment submissions are rejected. Private moderation, comment-cache and CMS object paths return 404 through public media. |
| Forms | Live contact category/subtopic/custom subject and EN→SL→EN navigation work. Contact draft choices survive the language switch. Contact and comment Turnstile widgets reach verified state without manual CAPTCHA interaction. |
| Admin | Live editor loads existing cover/gallery and fields without layout overflow. Site content loads. No project or CMS save was sent to production. |
| Local Worker | An actual streamed oversized login returns 413. The Files password probe remains compatible. A disposable local PNG uploads, serves with image/png and is then removed from local R2; its URL returns 404 after cleanup. |
| Public browser | Home categories and pause/resume, project gallery next/Escape, language navigation, Files password unlock, mobile navigation/Escape and embedded Ko-fi panel loading checked. Seven public pages fit a 390-pixel viewport; no broken loaded images observed. No payment was attempted. |

The reviewer inspected the source changes, reran the checks independently and critiqued the lead's browser evidence. Browser interaction was performed by the lead, separately from the specialists who implemented the fixes. Detailed sanitized logs and screenshots are in the locally ignored `artifacts/audit-2026-10-28/` directory.

## Remaining limits and maintenance

- Development-only esbuild advisories remain in Drizzle tooling/tsx transitive dependencies. Their affected development HTTP-server modes were not found in application code, and OpenNext/Wrangler resolve a patched esbuild. Do not run `npm audit fix --force`: npm proposes an unsuitable major Drizzle rollback. Revisit with a compatible tooling update. See [the cross-origin development-server advisory](https://github.com/advisories/GHSA-67mh-4wv8-2f99) and [the Windows development-server advisory](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr).
- Project saves use last-write-wins. Editing the same project in two tabs, or saving an older recovered draft, can overwrite a newer edit. CMS saves already check revisions. Use one editor tab per project until project conflict detection is added.
- Contact/comments use server-validated Turnstile and reversible address blocks. There is no additional per-address posting quota; verification is not a guarantee against a human or token-capable spammer.
- There is no separate development Neon database. Database mutation behavior is covered by controlled Neon HTTP/Drizzle fixtures; this audit did not create/delete live projects/comments/messages, publish CMS edits, upload production files/CVs, test a real-token replay, or complete a donation. Maximum-size 50 MiB uploads and production memory behavior were not load-tested.
- Comment cache hits reduce comment queries, but project queries still reach Neon. No new evidence establishes faster loading or a lower bill.

No schema migration, credential rotation, new paid service or production content change is required for these repairs. Deployment/PR identity and post-deployment verification belong in the release PR so this audit does not claim a release before it happens.
