# Admin dashboard and local development

Sign in at `/admin` with the existing `UPLOAD_PASSWORD`. The dashboard manages
projects, public site content, the CV PDF and private contact messages. Sessions
last up to seven days or until **Sign out**. Signed HTTP-only cookies, same-origin
mutation checks and server authentication protect private actions.
`ADMIN_PASSWORD` is a fallback only when `UPLOAD_PASSWORD` is absent.

## Local setup

Run `npm ci`, then configure ignored `.dev.vars` for the Cloudflare preview.
Next development/build values belong in ignored `.env.local` when needed.
Never commit real credentials. A `DATABASE_URL` connects to the actual Neon branch
named by that URL; it is not emulated. There is no separate development database
currently: do not point disposable editor tests at production.

| Command | Purpose |
| --- | --- |
| `npm run dev:cloudflare` | Build OpenNext and start the local Worker, normally localhost:8787 |
| `npm run build:cloudflare` | Generate `.open-next/worker.js` and assets |
| `npm run preview` | Run an existing Worker build locally |
| `npm run dev` | Next.js development mode |
| `npm test`, `npm run typecheck`, `npm run lint` | Automated checks |

Use `localhost` consistently; mixing it with 127.0.0.1 can fail same-origin checks.
Local R2 persists under `.wrangler` and does not write to the live bucket unless
remote bindings are explicitly enabled. The committed bindings default to local.
Without a database, project records and Messages cannot load. New project drafts
and local image uploads remain available, but **Save project** is blocked. Site
content and CV use R2 independently of Neon.

On this machine, use `& 'C:\Program Files\nodejs\npm.cmd' run dev:cloudflare`
in PowerShell if the roaming npm installation reports a missing `npm-cli.js`.
In Command Prompt use `"C:\Program Files\nodejs\npm.cmd" run dev:cloudflare`.
OpenNext has limited native Windows support; use WSL/Linux for toolchain failures.

## Runtime configuration

Keep the existing Worker `aboutme`, database, buckets, variables and passwords.
See [DEPLOYMENT.md](DEPLOYMENT.md) for Builds configuration.

| Name | Type and purpose |
| --- | --- |
| `DATABASE_URL` | Secret; complete Neon connection URL |
| `UPLOAD_PASSWORD` | Secret; existing admin/file password |
| `ADMIN_PASSWORD` | Optional secret fallback |
| `ADMIN_SESSION_SECRET` | Secret; independent random signing value, at least 32 characters |
| `TURNSTILE_SECRET` | Secret; Cloudflare Turnstile secret key |
| `TURNSTILE_HOSTNAMES` | Runtime variable; comma-separated exact frontend hostnames |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public build setting; Cloudflare Turnstile site key |

Set the public Turnstile site key before rebuilding. Runtime changes cannot
replace a previously built browser bundle. Keep the secret out of NEXT_PUBLIC_
variables, source, command arguments and logs. Production's exact hostname allowlist
must contain only intended production frontends. Use a separate local allowlist
such as `localhost,127.0.0.1`; never include localhost in the production value.
Add intended hostnames to the widget's Cloudflare settings too.

Changing the effective admin password or signing secret invalidates sessions.
`ADMIN_LOGIN_LIMITER` is Cloudflare's approximate per-location login/file-mutation
limiter, not a strict global counter. Production uses R2 `aboutme-uploads`; branch
Previews use `aboutme-uploads-preview`, separate credentials and a limiter namespace.
These editor changes require no database migration or R2 API key.

## Projects and images

Both language versions save together. Bare domains such as `glowupp.org` become
`https://glowupp.org/`. Invalid links show field errors without clearing the form.
An unsaved project draft stays in this tab for up to two hours. Save, Cancel and
Sign out clear it. Browser storage restrictions can prevent recovery; the editor
reports whether it stored the draft.

Drop a cover or gallery files onto their area, or use the file picker. Uploads
accept JPEG, PNG, WebP, GIF and AVIF with matching file headers, up to 12 MiB each
and 30 gallery photos. Drag a gallery photo onto another to reorder, or use
**Earlier/Later** with a keyboard or touch. **Edit captions** is always visible;
right-clicking an image is an additional shortcut. Captions allow 240 characters
per language. **Use as cover** copies that image's captions.

**Not open source** shows the closed-source state and removes repository URLs
from public API responses and client props. The authenticated editor retains that
URL. Legacy projects without a repository remain unspecified. Metadata uses the
existing gallery JSONB column; old URL arrays remain readable. **Featured** retains
its existing marker; the Home sketchbook selects newest projects.

Image changes publish only after **Save project**. Detached images, cancelled
uploads and deleted projects retain their R2 objects so shared URLs remain valid.
Remove confirmed unused objects manually from the correct bucket when desired.
Uploaded project images are public once their URL is known.

## Site content

Open **Site content**, choose a language and section, or search public wording.
Existing public text, profile links, core service copy/prices, category labels,
section visibility and form labels are editable. **Save changes** publishes all
changes together; public pages use them on their next load. **Discard changes**
returns to the loaded version; **Reload published** retrieves the latest version.
Concurrent saves are rejected rather than overwriting another editor's work.
Review the unsaved draft before reloading after a conflict.
Unpublished content drafts stay in this tab for up to two hours across dashboard
tabs, navigation and refresh. Recovery keeps the original published revision so
an old draft cannot overwrite newer content. Save, Discard and Sign out clear it;
storage restrictions can prevent recovery and are reported by the editor.

Only registered fields and typed values are accepted. This editor cannot execute
HTML/JavaScript, change application layout, configure credentials or add new
service database records. Overrides use fixed R2 object `site/content.v1.json`;
removing it restores source defaults. Local publication affects local storage only.

## CV publication

Open **CV**, choose the intended public PDF (up to 10 MiB), then **Publish CV**.
About shows **Download CV** only after publication. Replacements update
`profile/cv.pdf`; no Neon record is needed. The server checks MIME, size and PDF
header. `/api/cv` uses attachment, no-store and nosniff headers. Remove that object
from the correct environment to unpublish. Local publication does not affect
production.

## Verified contact inbox

The active form submits to `/api/contact`, storing accepted enquiries in existing
private table `contact_messages`. Read them under **Messages → Refresh**. It does
not send email, even if a legacy Web3Forms public key remains configured. A free
browser-direct provider path cannot enforce this server-side gate; adding email
requires a separately reviewed delivery path.

Before inserting a message, the server redeems its Cloudflare Turnstile token and
checks success, action `contact` and exact configured frontend hostname. Missing,
expired, invalid or replayed tokens and verification outages cannot bypass this
gate. Failed sends retain the enquiry text and reset verification. Missing database
or verification configuration disables sending while preserving contact links.

Automated tests mock Neon, R2 and Siteverify. They do not certify production
permissions, real token redemption or real database saves. See
[VERIFICATION.md](VERIFICATION.md) for recorded browser/release evidence and limits.
With no development database, the owner should test production editor saves and
uploads using intended real content.
