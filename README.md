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

Database credentials are read per request, so builds need no database connection.
The application needs a runtime `DATABASE_URL` and initialized tables to load
projects, services and files, and to store contact submissions. Public collection
pages show an honest unavailable state when the database cannot be reached.
`/api/health` checks the database connection.

## Content and features

- Edit `src/lib/site.ts` for real profile links, tools and optional support links.
  The site deliberately omits invented statistics and unconfigured profiles.
- Manage real projects and view contact messages at `/admin`, using UPLOAD_PASSWORD.
  Add service records through Neon's Tables UI or SQL Editor.
- `npm run db:seed` optionally adds **fictional example content**. It loads `.env`,
  skips existing slugs and never deletes your projects, services or comments.
- Put gallery photos in `public/gallery/` and list `/gallery/filename.jpg` URLs in
  `src/lib/gallery.ts`. Workers cannot list public assets from the filesystem.
- File uploads/downloads use R2; PostgreSQL stores metadata only.
- Set `UPLOAD_PASSWORD` to enable password-protected uploads/deletes.
- Contact submissions are saved in `contact_messages`; they do not send email.
- Google Drive integration is optional: configure `GOOGLE_DRIVE_API_KEY` and
  `GOOGLE_DRIVE_FOLDER_ID` for a public folder.
- Optional `BUY_ME_A_COFFEE_URL` and `KO_FI_URL` enable real support links. When
  absent, the support page offers feedback, sharing and source exploration.
- The home-page sketchbook is an original SVG illustration, not a portfolio
  screenshot. Project cover/gallery images always come from the project records.
- Project categories have shareable URLs (for example `/projects?category=android`).
  Text/tag search and the image viewer run locally in the browser.
- Motion respects reduced-motion preferences; reveal effects keep server-rendered
  content visible before JavaScript loads. The social card source is `public/og.svg`
  and its exported PNG is `public/og.png`.

## Database changes

`drizzle.config.ts` reads `DATABASE_URL` from your local environment / `.env`.
`npm run db:generate` generates SQL from `src/db/schema.ts` without connecting.
Review SQL before applying it to an existing database. Do not run schema or seed
commands automatically on every production deployment.
