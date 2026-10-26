# Local development and admin dashboard

The dashboard is at `/admin`. It manages projects (English and Slovenian),
cover/gallery uploads, a public CV PDF, and incoming contact messages. Services
are not editable through this dashboard.

A successful login remains valid in that browser for up to seven days or until
**Sign out**. Reopening `/admin` during that period intentionally reuses the signed
HTTP-only session cookie. The login URL is public; private data and actions still
require a valid session. The login and dashboard explain this persistence.

## Local setup

Install dependencies with `npm ci`. Copy `.env.example` to `.dev.vars` for
the Cloudflare preview and replace its placeholders. Wrangler reads
`.dev.vars`; this ignored file must never be committed. Use a Neon development
branch if you want to create and delete test projects without changing live data.

- `npm run dev:cloudflare` builds the production Worker and starts its local
  preview, normally at http://localhost:8787. Use localhost consistently rather
  than 127.0.0.1: Wrangler canonicalizes the local request hostname, and mixing
  the two can fail the same-origin check.
- `npm run build:cloudflare` only builds.
- `npm run dev` runs Next.js development mode. Copy the values into an ignored
  `.env.local` too if you use this mode, since Next reads environment variables
  from that file; Cloudflare bindings are initialized by `next.config.ts`.
- `npm test`, `npm run typecheck`, and `npm run lint` run the checks.

Local R2 storage is emulated and persisted under `.wrangler`. Local uploads do
not write to the live R2 bucket. A DATABASE_URL still connects to the actual Neon
branch named in that connection string; Neon is not emulated.

On this Windows machine, the roaming npm installation may mask the bundled npm.
If `npm` reports a missing `npm-cli.js`, use
`& 'C:\Program Files\nodejs\npm.cmd' run dev:cloudflare` in PowerShell.
The application does not require changing the global npm installation.

OpenNext has limited native Windows support. If its build fails with filesystem
or toolchain errors, use WSL/Linux or the existing Cloudflare build integration:
https://opennext.js.org/cloudflare

## Production variables and bindings

Keep the Neon and R2 setup in DEPLOYMENT.md. Add these as **runtime secrets** in
the existing Cloudflare Worker `aboutme`:

| Name | Purpose |
| --- | --- |
| DATABASE_URL | Complete Neon Postgres connection URL, with SSL parameters |
| ADMIN_PASSWORD | Optional fallback only when UPLOAD_PASSWORD is not set |
| ADMIN_SESSION_SECRET | A separate random signing secret of at least 32 characters |
| UPLOAD_PASSWORD | Existing password shared by `/admin` and `/files`; keep its value |

Keep all existing production variables and secrets. The only additional required
secret is ADMIN_SESSION_SECRET. The existing UPLOAD_PASSWORD is used for both
the admin login and the file-upload feature. If both UPLOAD_PASSWORD and
ADMIN_PASSWORD exist, UPLOAD_PASSWORD takes priority, so the previous upload
password still works. ADMIN_PASSWORD is only a fallback when UPLOAD_PASSWORD is
absent. Changing the effective password or ADMIN_SESSION_SECRET invalidates
existing sessions.

Cloudflare production secrets are not downloaded into local development. Set
UPLOAD_PASSWORD and ADMIN_SESSION_SECRET in your ignored local .dev.vars file
as well. Add DATABASE_URL locally to use the database features. Without it,
Projects and Messages show a configuration error after login; the CV tab still
works using the R2 binding. Never place a real password in .env.example or
wrangler.jsonc.
Generate the signing secret locally with
`node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
Do not put these values in NEXT_PUBLIC_ variables, source code or build settings.

The branch Cloudflare Preview has dedicated credentials, R2 bucket
`aboutme-uploads-preview` and limiter namespace `710612`. It has no DATABASE_URL,
so login works but project management and the inbox display a configuration
error. Independent remote checks passed login persistence, logout/Back,
invalid-session rejection, cookie flags and one disposable PNG upload/read/delete.
This does not establish successful project CRUD or contact-message delivery.
The existing production Worker still needs ADMIN_SESSION_SECRET and deployment
of the committed limiter before the new dashboard can be released there.

The committed Wrangler config binds `aboutme-uploads` as `UPLOADS` and includes
`ADMIN_LOGIN_LIMITER` (a nominal 5 password attempts per IP per minute per
Cloudflare location). Cloudflare's binding is approximate and eventually
consistent: bursts can exceed the threshold, even within one location.
No additional database migration or R2 API keys are needed for the dashboard.
Deploy the updated configuration as well as the code so the limiter is present.
The limiter namespace `710611` should be unique to this feature within the account.
See [Cloudflare's rate-limit accuracy documentation](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/#accuracy).

POST/DELETE on `/api/files` call the same limiter as admin login. This shares the
approximate budget; it does not guarantee a strict sixth-request denial.
Bounded remote tests returned wrong-password responses throughout, without 429.
Actual throttling and shared denial across those routes remain unverified; see
[VERIFICATION.md](VERIFICATION.md). Use a long, unique UPLOAD_PASSWORD for
production; a short numeric password is for testing.

ADMIN_SESSION_SECRET is read only while handling login/session requests. Its
absence prevents a successful login; it does not prevent this application's build.
Investigate a failed Cloudflare build from its actual build log rather than
assuming that adding this runtime secret will fix it.

Keep SITE_OWNER, SITE_TAGLINE, CONTACT_EMAIL and NEXT_PUBLIC_SITE_URL consistent
between build/runtime settings as described in DEPLOYMENT.md. Keep the actual
owned domain; no DNS or domain changes are required for this feature.

## Publish your CV

Sign in to `/admin`, open **CV**, choose your finished PDF (up to 10 MiB), and
select **Publish CV**. Until a PDF is published, About has no CV download button.
Publication adds **Download CV** at the bottom of About. Uploading another PDF
replaces the current document. The full document becomes public, so use the
version you intend visitors to download.

This feature stores one R2 object, `profile/cv.pdf`, without a Neon record or
migration. The server checks the PDF MIME type, nonzero size, maximum size and
PDF header. `/api/cv` returns it as `Jakob-Tominc-CV.pdf`, with attachment,
no-store and nosniff headers; replacements are not given immutable cache headers.
Admin status and publication use the existing signed session and same-origin
mutation protection. To unpublish, remove only `profile/cv.pdf` from the correct
environment's R2 bucket. Local preview storage is emulated; publishing locally
does not publish to the branch Preview or production.

No owner CV has been supplied or published as part of this implementation.

## Optional contact email delivery

On 26 October 2026 the owner's supplied public Web3Forms key was configured in
ignored local `.env.local` and the existing `codex/admin-dashboard` Preview's
Build variables. It is masked in Cloudflare's configuration API; it is still an
intentionally public form key in the browser bundle. Production Build variables
were not changed. No real email has been sent or receipt verified.

Create a form for your verified recipient address in
[Web3Forms](https://app.web3forms.com/) and copy its public access key into
`NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY`. Set it in ignored `.env.local` for a local
build, or the Cloudflare **Build variables** of the intended environment, then
rebuild. A runtime `.dev.vars` value alone cannot change an existing browser
bundle. This key is intentionally public; keep admin passwords and signing
secrets out of all `NEXT_PUBLIC_` variables.

Submissions go directly from the visitor's browser to Web3Forms. Its
[free plan currently includes 250 submissions per month](https://web3forms.com/pricing).
Its [documented server-side/proxy access requires a paid subscription and IP
safelisting](https://docs.web3forms.com/getting-started/troubleshooting), so this
site does not proxy the provider through a Worker. Some hosted subdomains may
need provider approval. Confirm the owner's intended domain and recipient with
one authorized real enquiry after configuration; no real email delivery is
claimed by the automated tests or current preview checks.

Without a public key, a configured Neon database receives enquiries in the
existing private inbox. With neither configured, the form explains that sending
is unavailable and disables its submit button; configured email/GitHub links
remain available. A failed provider request retains the draft and does not fall
back to Neon, avoiding duplicate delivery. Success requires the provider's
explicit `success: true`, which acknowledges acceptance rather than inbox receipt.

## Image behavior

Uploads accept JPEG, PNG, WebP, GIF and AVIF files up to 12 MiB each and check
their file headers. Image URLs use `/api/media/projects/...`; other R2 keys cannot
be read through that route. New uploads are public images once their URL is known.

Removing a photo changes the project only after **Save project**. Cancelling the
editor leaves the published project unchanged. R2 objects are deliberately retained
when an image is detached, an editor is cancelled, or a project is deleted, so
shared URLs stay valid and a storage outage cannot turn a successful database save
into a reported failure. You may remove confirmed unused objects in the Cloudflare
R2 dashboard; retained objects continue to consume storage.

## Verification after configuring secrets

1. Open `/admin`: signed-out visitors should see only the login form.
2. Sign in, create a temporary project with both languages, upload a cover and
   gallery photo, then Save. Check its public project page.
3. Edit and save it. Remove a gallery photo and cancel: the public image should
   remain. Remove and save: it should disappear from the project.
4. After authorizing a disposable enquiry, verify the configured delivery path:
   with Web3Forms, check provider acceptance and actual recipient receipt; with
   no form key and a configured Neon database, open **Messages → Refresh** to
   see the enquiry. Web3Forms sends directly and does not also write the inbox.
5. Delete the temporary project, sign out, and verify `/api/admin/messages`
   returns 401.

Automated tests mock Neon and R2 and do not certify production account
permissions, secrets, table availability, or domain routing.
