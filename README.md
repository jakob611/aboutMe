# Jakob's portfolio

Bilingual Next.js portfolio using PostgreSQL (Neon) and Cloudflare Workers.

**Deployment instructions: [DEPLOYMENT.md](DEPLOYMENT.md).** Admin dashboard and
local Cloudflare preview: [ADMIN.md](ADMIN.md). This is a server-rendered
application, not a static Pages site. Do not publish `.next` as a Pages output directory.

## Development

Use Node.js 22 or 24 and npm:

```sh
npm ci
```

Copy `.env.example` to `.env` and fill in your own values. Never commit passwords.
Initialize an empty Neon database using `drizzle/0000_initial.sql` in Neon's SQL Editor
(or use `npm run db:push` locally with the correct `DATABASE_URL`). Then:

```sh
npm run dev
```

Open http://localhost:3000. Local development uses a simulated R2 bucket through
OpenNext/Wrangler; uploaded local files do not appear in production.

## Checks and deployment

```sh
npm test
npm run lint
npm run typecheck
npm run build:cloudflare
npx wrangler deploy --dry-run
```

`npm run build` builds Next.js only. `npm run build:cloudflare` also creates the
Worker and static assets. After building, `npm run preview` runs the Worker locally;
`npm run deploy` publishes the already-built Worker. Production deployment still
requires the account setup in DEPLOYMENT.md.

The isolated branch Preview is
[available here](https://codex-admin-dashboard-aboutme.tomincjakob.workers.dev).
Its authentication and R2 upload/read/delete checks passed; it has no development
database yet. See [VERIFICATION.md](VERIFICATION.md) for current acceptance and
remaining release requirements.

Database credentials are read per request, so builds need no database connection.
The application needs a runtime `DATABASE_URL` and initialized tables to load
projects, services and files, and to store contact submissions. Public collection
pages show an honest unavailable state when the database cannot be reached.
`/api/health` checks the database connection.

## Content and features

- Edit `src/lib/site.ts` for real profile links, tools and optional support links.
  The site deliberately omits invented statistics and unconfigured profiles.
- Manage real projects, publish a CV PDF and view contact messages at `/admin`,
  using UPLOAD_PASSWORD.
  The CV tab uses R2 independently of Neon; [ADMIN.md](ADMIN.md) explains publication.
  Edit the core Android, web, AI/automation and 3D printing offerings in
  `src/lib/service-offerings.ts`; these are available without a database.
  Add optional service details and additional offerings through Neon's Tables UI
  or SQL Editor. Configured prices are kept; no fallback prices are invented.
- `npm run db:seed` optionally adds **fictional example content**. It loads `.env`,
  skips existing slugs and never deletes your projects, services or comments.
- Put gallery photos in `public/gallery/` and list `/gallery/filename.jpg` URLs in
  `src/lib/gallery.ts`. Workers cannot list public assets from the filesystem.
- File uploads/downloads use R2; PostgreSQL stores metadata only.
- Set `UPLOAD_PASSWORD` to enable password-protected uploads/deletes.
- Contact offers seven enquiry categories with dependent topics and a custom Other
  subject. Service links preselect the relevant enquiry, including ongoing support.
  Existing `?subject=` links remain usable. Category, topic, custom subject and
  message fields survive the existing language-switch draft handoff.
- Optional `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY` enables browser-direct email delivery.
  With no key, configured Neon receives submissions in `contact_messages` without
  sending email; with neither configured, sending is disabled and real contact
  links remain available. See [ADMIN.md](ADMIN.md) for key setup and current limits.
- Google Drive integration is optional: configure `GOOGLE_DRIVE_API_KEY` and
  `GOOGLE_DRIVE_FOLDER_ID` for a public folder.
- Optional `BUY_ME_A_COFFEE_URL` and `KO_FI_URL` enable real support links. When
  absent, the visible Donations section explains that online donations are not
  set up yet; feedback, sharing and source exploration remain available.
- The home-page sketchbook has original web, Android, LEGO and 3D printing SVG
  scenes. It advances every four seconds. Choosing a subject pauses rotation;
  clicking anywhere except a subject control resumes it, without a Play button.
  Hidden/offscreen pages and reduced motion still suspend automatic rotation.
  The artwork opens the newest real project in its category when available,
  otherwise the category collection. Project cover/gallery images always come
  from the project records. One Contact button sits beside the language control;
  Support remains in the main navigation.
- Project categories have shareable URLs (for example `/projects?category=3d-printing`).
  Text/tag search and the image viewer run locally in the browser.
- Motion respects reduced-motion preferences; reveal effects keep server-rendered
  content visible before JavaScript loads. Visible content animates on entry and
  below-the-fold sections reveal on scroll;
  keyboard focus makes pending content visible immediately. Hover lifts and image
  zoom are limited to mouse pointers with motion enabled.
- Language selection uses a full document navigation so the page, header, footer
  and document language agree. Selection priority is URL, saved preference,
  Cloudflare country (Slovenia → Slovenian, other countries → English), then
  weighted browser language when country data is unavailable. Manual choices win
  over automatic detection. No third-party IP lookup is made.
  Contact drafts survive an explicit language switch through a one-use, tab-scoped
  session-storage handoff. Returning to another tab does not reload a draft.
- The social card source is `public/og.svg`
  and its exported PNG is `public/og.png`.

## Database changes

`drizzle.config.ts` reads `DATABASE_URL` from your local environment / `.env`.
`npm run db:generate` generates SQL from `src/db/schema.ts` without connecting.
Review SQL before applying it to an existing database. Do not run schema or seed
commands automatically on every production deployment.
