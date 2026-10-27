# Deploy aboutMe to Cloudflare Workers

For the admin dashboard and local preview, see [ADMIN.md](ADMIN.md).

The existing Cloudflare Worker is named **aboutme**. Keep that name: it matches
`wrangler.jsonc`. GitHub's repository name `aboutMe` does not need to change.

## 1. Neon: keep the database, reset the exposed password

The screenshots show a suitable setup: project `jakobtominc`, branch `production`,
database `neondb`, role `neondb_owner`, Frankfurt region. A Neon branch is independent
of a GitHub branch; `production` and `main` do not have to match.

The database password was visible in one screenshot. In Neon open **Connect**,
select `production` / `neondb` / `neondb_owner`, then **Reset password**. Copy the
new connection string with connection pooling enabled. Use the entire
`postgresql://...` URL with its real password and SSL query parameters. Do not
copy a `psql` command or a URL containing asterisks.

## 2. Create the application tables once

In Neon, open **SQL Editor** and select branch **production**, database **neondb**.
If the database is empty, open [drizzle/0000_initial.sql](drizzle/0000_initial.sql)
on GitHub, click **Raw**, copy all its SQL into the editor, and click **Run**.
This creates projects, services, comments, files and contact_messages.

Run it once, not on each deployment. If tables already exist, do not delete them
or re-run this initial migration blindly: compare the schema first. Existing
tables are not visible in the supplied screenshots, so their presence was not verified.

No sample data is required to render the site. An empty database with these tables
shows empty project/service sections. Add your real content later. Do not publish
the fictional sample projects as your own work.

## 3. Create storage for uploads

The existing private production bucket is **aboutme-uploads**; preserve it. For a
new account only, create that bucket under **R2 Object Storage → Create bucket**.
Do not enable public bucket access: the site's
API handles downloads. R2 may ask you to enable the service / enter billing details;
review what Cloudflare shows before doing so.

The repository already binds this bucket as **UPLOADS**. No R2 API keys are needed.
R2 stores uploaded files; it does not replace Neon. Do not create a D1 database.
The build itself does not access R2, but deployment requires this bucket to exist.

## 4. Add RUNTIME variables and secrets

Open **Workers & Pages → aboutme → Settings → Runtime variables and secrets**,
with **Production** selected. Current account inspection confirms DATABASE_URL
and UPLOAD_PASSWORD already exist; preserve their values. Keep the current
ADMIN_SESSION_SECRET too. Required settings:

| Type | Name | Value |
| --- | --- | --- |
| Secret | DATABASE_URL | The new complete Neon connection string |
| Secret | UPLOAD_PASSWORD | Keep your existing password; it now signs in to `/admin` as well as managing `/files` |
| Secret | ADMIN_PASSWORD | Optional fallback if UPLOAD_PASSWORD is absent; not required |
| Secret | ADMIN_SESSION_SECRET | An independent random signing secret, at least 32 characters |
| Secret | TURNSTILE_SECRET | Cloudflare Turnstile secret key, runtime only |
| Variable | TURNSTILE_HOSTNAMES | Exact intended frontend hostnames, comma-separated; no localhost in production |
| Variable | SITE_OWNER | Jakob Tominc |
| Variable | SITE_TAGLINE | Your chosen short description |
| Variable | CONTACT_EMAIL | Your contact email address |
| Variable | NEXT_PUBLIC_SITE_URL | https://jakobtominc.com, if that is the domain you own |

Save the entries. Do not prefix secrets with NEXT_PUBLIC_. Build variables and
runtime variables are separate; putting DATABASE_URL only under Builds is insufficient.
The new code does not need DATABASE_URL during builds, so remove the old build-time
copy after adding the new runtime secret. `keep_vars` in Wrangler preserves
ordinary dashboard variables; secrets stay managed in Cloudflare.

## 5. Correct the BUILD settings

Under **Settings → Builds** use:

| Setting | Value |
| --- | --- |
| Git repository | jakob611/aboutMe |
| Production branch | main |
| Root directory | / |
| Build command | npm run build:cloudflare |
| Deploy command | npm run deploy |
| Preview command (non-production branches) | npx wrangler preview |

The committed package-lock.json selects reproducible npm dependencies. Do not set
`.next` as a Pages output directory. This setup deploys a Worker.

Under **Builds → Variables and secrets**, add these ordinary build variables too:

| Name | Value |
| --- | --- |
| NEXT_PUBLIC_SITE_URL | The same exact https:// domain as above |
| SITE_OWNER | Jakob Tominc |
| SITE_TAGLINE | The same description as above |
| CONTACT_EMAIL | The same contact email as above |
| NEXT_PUBLIC_TURNSTILE_SITE_KEY | Public site key matching the Turnstile runtime secret |

These public/site settings are also consumed by statically built metadata and
client-side components. Keep them consistent with the runtime values.
Allow the intended frontend domains in the Cloudflare Turnstile widget settings.
The active contact form verifies tokens on the Worker before writing to the private
Admin inbox. It does not send Web3Forms email. Missing verification/database settings
disable sending; see [ADMIN.md](ADMIN.md) for local versus production allowlists.

The screenshot says **Configured API token unavailable**. Under the Builds API token
setting, choose **Create new token** if available, then save. Cloudflare creates
a token with the build/deployment permissions. Alternatively select an existing
valid token for this account that can deploy Workers and access R2. A token problem is a Cloudflare setting, not a Neon
password issue. Do not commit a Cloudflare token to GitHub.

### Non-production Preview setup

The branch Preview is configured separately from production. `npx wrangler
preview` is Cloudflare's current default for non-production branches. Keep the
Preview build command at `npm run build:cloudflare` in both **Previews Base** and
the existing branch Preview settings: `npm run build` creates Next output only,
so the later Preview command cannot find `.open-next/worker.js`. See
[Cloudflare's build commands](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).

This differs from this repository's `npm run preview`, which starts the local
OpenNext/Wrangler emulator. See
[OpenNext's development workflow](https://opennext.js.org/cloudflare/howtos/dev-deploy).

The active `wrangler.jsonc` now uses the confirmed private non-production bucket
`aboutme-uploads-preview` and separate rate-limit namespace `710612`:

```jsonc
{
  "previews": {
    "r2_buckets": [
      {
        "binding": "UPLOADS",
        "bucket_name": "aboutme-uploads-preview"
      }
    ],
    "ratelimits": [
      {
        "name": "ADMIN_LOGIN_LIMITER",
        "namespace_id": "710612",
        "simple": { "limit": 5, "period": 60 }
      }
    ]
  }
}
```

In the Worker's Settings, select **Previews Base** in Variables and secrets.
Dedicated Preview `UPLOAD_PASSWORD` and `ADMIN_SESSION_SECRET` bindings are
configured. Their local copies remain only in ignored `.dev.vars.preview`.
`DATABASE_URL` is intentionally absent until a development Neon branch is
available; do not copy the production connection string. Add public site settings
needed by the preview as well.
Production variables/secrets are not inherited. Base secret changes apply to new
Previews; existing ones need their own update. Follow
[Preview configuration](https://developers.cloudflare.com/workers/previews/configuration/)
and keep secret values out of source files.

Do not copy production `WORKER_SELF_REFERENCE` into `previews.services`.
Cloudflare Preview service bindings currently target a production Worker, not
its matching Preview. The current [OpenNext config](open-next.config.ts) enables
no ISR cache or revalidation queue: the installed adapter defaults those
overrides to `dummy`. Optional generated Durable Object queue code still contains
a self-reference, but that revalidation implementation is not enabled here.
The active Preview configuration therefore omits service bindings while
preserving the production binding. The deployed Preview rendered public pages,
authenticated, and served a disposable uploaded PNG successfully. If an ISR/revalidation queue
is enabled later, reevaluate isolation rather than sending those calls to
production; the platform's `ctx.exports` option still needs adapter compatibility
evaluation before use here. See
[Preview resources and service-binding limitations](https://developers.cloudflare.com/workers/previews/resources/).

The branch Preview is available at
[codex-admin-dashboard-aboutme.tomincjakob.workers.dev](https://codex-admin-dashboard-aboutme.tomincjakob.workers.dev).
Independent browser and HTTP checks passed authentication, logout, invalid-session
rejection and an isolated R2 upload/read/delete. See [VERIFICATION.md](VERIFICATION.md)
for deployment/build evidence and remaining limits. Project CRUD and the contact
inbox still need a development database for isolated CRUD testing. This historical
Preview evidence does not certify the latest production release; consult
[VERIFICATION.md](VERIFICATION.md) for its current status.

## 6. Deploy, verify, then connect the domain

After all settings above are saved, start a new build of the latest **main** commit
(not a retry pinned to the original commit). Git-connected builds may also start
automatically when main changes; an early attempt can fail until setup is complete.

1. Open the Worker's `*.workers.dev` address from its overview page.
2. `/about` should render the portfolio.
3. `/api/health` should return `{"ok":true}`. A 500 indicates a database connection
   or runtime-secret problem. This endpoint alone does not check application tables.
4. Open `/` and `/projects` to verify the tables and queries work.
5. Test one small upload on `/files`, download it, then delete it.
6. Under **Settings → Domains & Routes → Add → Custom Domain**, ensure your domain
   is assigned to this **aboutme** Worker. Inspect any existing assignment before
   replacing it. Do not delete unrelated DNS records.

The request mentioned both `jakotominc.com` and `jakobtominc.com`. Use the actual
owned domain consistently. No domain change is included in this repository.
If workers.dev shows your portfolio but the domain shows Hello World, check domain
assignment/routes. If both show Hello World, the starter Worker is still deployed.

## If a build fails

Copy the final error and the lines immediately before it. The original supplied
log stopped before the failure; dependency warnings alone did not explain it.

- Missing R2 bucket: create `aboutme-uploads` in the same Cloudflare account.
- API token unavailable/unauthorized: repair the Builds deployment token.
- Database URL missing at runtime: add DATABASE_URL to Runtime secrets.
- Relation does not exist: create the tables in the same Neon database used by the URL.
- Old build command: replace npm run build with npm run build:cloudflare.

The code has been checked without production credentials. A successful local
build/dry run does not verify your actual Neon credentials, Cloudflare account
permissions, bucket existence or custom-domain routing.
