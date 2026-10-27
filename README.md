# Jakob's portfolio

Bilingual Next.js portfolio using PostgreSQL (Neon) and Cloudflare Workers.

**Deployment instructions: [DEPLOYMENT.md](DEPLOYMENT.md).** Admin dashboard and
local Cloudflare preview: [ADMIN.md](ADMIN.md). This is a server-rendered
application, not a static Pages site. Do not publish `.next` as a Pages output directory.

Comment removal, address blocks, private request information and the comment
cache: [MODERATION.md](MODERATION.md).

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

- Use `/admin` → **Site content** for public English/Slovenian wording, profile
  links, services and section visibility. Published R2 overrides apply on the next
  page load; source defaults remain the fallback. Credentials and code are managed
  separately.
- Manage real projects, publish a CV PDF and view contact messages at `/admin`,
  using UPLOAD_PASSWORD.
  The CV tab uses R2 independently of Neon; [ADMIN.md](ADMIN.md) explains publication.
  Core service descriptions and optional prices are editable in Site content and
  available without a database. Additional database-backed offerings remain in
  Neon. Project images support file drops, reordering and bilingual captions;
  **Not open source** hides the repository URL publicly while keeping it privately.
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
- Contact submissions require server-side Cloudflare Turnstile verification and
  go to **Admin → Messages** in Neon. The active form does not send email. Missing
  database or verification configuration disables sending while preserving direct
  contact links. See [ADMIN.md](ADMIN.md) for setup.
- Google Drive integration is optional: configure `GOOGLE_DRIVE_API_KEY` and
  `GOOGLE_DRIVE_FOLDER_ID` for a public folder.
- Support links to the owner's Ko-fi page, `https://ko-fi.com/jakobtominc`.
  Its floating Support button opens the official Ko-fi panel on this page only;
  the panel loads after a click and is removed on close or navigation. A normal
  Ko-fi link remains available when embedded content is blocked. Optional
  `BUY_ME_A_COFFEE_URL` adds another link; `KO_FI_URL` overrides the profile link.
- The home-page sketchbook presents newest real projects with their images,
  summaries and actions, using category artwork when no project is available.
  It advances every four seconds. Choosing a category pauses rotation;
  clicking anywhere except a subject control resumes it, without a Play button.
  Hidden/offscreen pages and reduced motion still suspend automatic rotation.
  Project artwork opens its project; fallback artwork opens the category
  collection. Project cover/gallery images always come
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
