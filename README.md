# Personal Portfolio Website

A modern, bilingual (English/Slovene) personal portfolio website built with Next.js 15, Tailwind CSS, Drizzle ORM, and PostgreSQL. Designed for Cloudflare deployment.

## ✨ Features

### 🌐 Bilingual Support
- **Automatic language detection** based on visitor IP (Slovene for Slovenia, English for everyone else)
- **Manual language switcher** in the navbar
- Persistent language preference via cookies
- Full content translation for both languages

### 📱 Pages
- **Home** — Hero section, featured projects, services preview, stats
- **Projects** — Filterable grid of all projects with categories (Android, LEGO, Web, Other)
- **Project Detail** — Full project page with gallery, description, and **comment section**
- **About** — Bio, skills, photo gallery, stats
- **Services** — Service offerings with pricing
- **Files** — Public downloads + password-protected uploads + Google Drive integration
- **Contact** — Contact form with validation
- **Donate** — Support page with Buy Me a Coffee / Ko-fi links + open-source highlights

### 🎨 Design & UX
- **Modern dark theme** with glassmorphism and gradient accents
- **Smooth animations** using Framer Motion (scroll reveals, transitions)
- **Fully responsive** — mobile-first design
- **Fast loading** — optimized images, server components, minimal JS
- **Accessible** — semantic HTML, ARIA labels, keyboard navigation

### 🚀 SEO & AI Optimization
- **Metadata API** on every page (title, description, Open Graph, Twitter cards)
- **JSON-LD structured data** (Person, CreativeWork schemas)
- **Dynamic sitemap.xml** and **robots.txt**
- **Semantic HTML** with proper heading hierarchy
- **Alt text** on all images
- **Canonical URLs** and language alternates

### 🔐 File Management
- **Public downloads** — anyone can download uploaded files
- **Password-protected uploads** — set `UPLOAD_PASSWORD` in `.env`
- **File metadata** — size, upload date, description
- **Delete functionality** (admin, password-protected)
- **Google Drive integration** — sync specific public folder files

### 💬 Comments
- Comment section under each project
- Name + optional email + content
- Stored in database, displayed immediately

### 📦 Database
- **PostgreSQL** with **Drizzle ORM**
- Tables: `projects`, `comments`, `files`, `services`, `contact_messages`
- Type-safe queries, migrations via `drizzle-kit`

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Edit `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
   UPLOAD_PASSWORD=your-secret-password
   SITE_OWNER=Your Name
   SITE_TAGLINE=Developer · Creator · Builder
   CONTACT_EMAIL=hello@example.com
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   
   # Optional: Google Drive integration
   GOOGLE_DRIVE_API_KEY=
   GOOGLE_DRIVE_FOLDER_ID=
   ```

3. **Push database schema:**
   ```bash
   npx drizzle-kit push
   ```

4. **Seed sample data (optional):**
   ```bash
   node --env-file=.env -r tsx/cjs src/db/seed.ts
   ```

5. **Run development server:**
   ```bash
   npm run dev
   ```

6. **Open** [http://localhost:3000](http://localhost:3000)

---

## 🎨 Customization

### Site Configuration
Edit `src/lib/site.ts`:
```ts
export const siteConfig = {
  name: "Your Name",
  tagline: "Your Tagline",
  email: "your@email.com",
  socials: {
    github: "https://github.com/yourusername",
    linkedin: "https://linkedin.com/in/yourusername",
    // ...
  },
  buyMeACoffee: "https://buymeacoffee.com/yourusername",
  skills: ["Next.js", "React", "TypeScript", /* ... */],
  stats: { apps: 12, years: 8, clients: 24, coffee: 1430 },
};
```

### Adding Projects
Add projects via the database or create an admin panel. Each project needs:
- `slug` (URL-friendly ID)
- `titleEn` / `titleSl` (bilingual titles)
- `summaryEn` / `summarySl` (short descriptions)
- `descriptionEn` / `descriptionSl` (full descriptions, supports `\n\n` for paragraphs)
- `category` (`android`, `lego`, `web`, `other`)
- `tags` (array of strings)
- `coverImage` (URL or path)
- `gallery` (array of image URLs)
- `linkUrl` (live demo / Play Store link)
- `repoUrl` (GitHub link)
- `featured` (boolean)

### Adding Services
Similar to projects, services need bilingual titles and descriptions, an icon name (`web`, `app`, `design`, `zap`, `sparkles`), and optional `priceFrom`.

### Gallery Photos
Drop images into `/public/gallery/` and they'll appear on the About page automatically.

### Google Drive Integration
1. Create a Google Cloud project and enable the Drive API
2. Create an API key
3. Create a public folder in Google Drive ("Anyone with the link")
4. Set `GOOGLE_DRIVE_API_KEY` and `GOOGLE_DRIVE_FOLDER_ID` in `.env`
5. Files in that folder will appear on the Files page

---

## 🌍 Deployment

### Cloudflare Pages
1. Connect your Git repository to Cloudflare Pages
2. Set build command: `npm run build`
3. Set output directory: `.next`
4. Add environment variables in Cloudflare dashboard
5. Deploy!

### Environment Variables for Production
```env
DATABASE_URL=postgresql://...
UPLOAD_PASSWORD=...
SITE_OWNER=...
CONTACT_EMAIL=...
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
GOOGLE_DRIVE_API_KEY=... (optional)
GOOGLE_DRIVE_FOLDER_ID=... (optional)
```

### Database
Use a managed PostgreSQL service (Neon, Supabase, Railway, etc.) and update `DATABASE_URL`.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with navbar, footer, metadata
│   ├── page.tsx            # Home page
│   ├── about/page.tsx
│   ├── projects/
│   │   ├── page.tsx        # Projects grid
│   │   └── [slug]/page.tsx # Project detail + comments
│   ├── services/page.tsx
│   ├── files/page.tsx
│   ├── contact/page.tsx
│   ├── donate/page.tsx
│   ├── api/
│   │   ├── files/          # Upload, download, list, delete
│   │   ├── projects/       # List, detail, comments
│   │   ├── contact/        # Contact form
│   │   ├── drive/          # Google Drive sync
│   │   └── services/       # Services list
│   ├── sitemap.ts          # Dynamic sitemap
│   └── robots.ts           # robots.txt
├── components/
│   ├── Navbar.tsx          # Sticky navbar with mobile menu
│   ├── Footer.tsx          # Footer with links
│   ├── LanguageSwitcher.tsx
│   ├── ProjectCard.tsx
│   ├── ProjectsClient.tsx  # Client-side filtering
│   ├── CommentSection.tsx
│   ├── FilesClient.tsx     # Upload/download UI
│   ├── ContactClient.tsx
│   └── Reveal.tsx          # Scroll animation wrapper
├── db/
│   ├── index.ts            # Drizzle client
│   ├── schema.ts           # Database tables
│   └── seed.ts             # Sample data seeder
├── lib/
│   ├── i18n.ts             # Translations (EN/SL)
│   ├── lang.ts             # Language detection
│   ├── site.ts             # Site config
│   └── utils.ts            # Helpers (cn, formatBytes, etc.)
└── middleware.ts           # IP-based language detection
```

---

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS 4
- **Database:** PostgreSQL + Drizzle ORM
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Type Safety:** TypeScript
- **Deployment:** Cloudflare Pages (recommended)

---

## 📝 License

MIT — use it for your own portfolio!

---

## 🙏 Credits

Built with ❤️ using modern web technologies. Feel free to fork, customize, and make it your own!
