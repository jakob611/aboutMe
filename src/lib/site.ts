/**
 * Centralised site configuration.
 * Tweak these to personalise the whole site without digging into pages.
 */
export const siteConfig = {
  name: process.env.SITE_OWNER ?? "Your Name",
  tagline: process.env.SITE_TAGLINE ?? "Developer · Creator · Builder",
  email: process.env.CONTACT_EMAIL ?? "hello@example.com",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    ""
  ),

  // Social / donation links. Fill them in as you set them up.
  socials: {
    github: "https://github.com/",
    linkedin: "https://linkedin.com/",
    twitter: "https://twitter.com/",
    instagram: "https://instagram.com/",
  },

  // Donation / support page
  buyMeACoffee: "https://www.buymeacoffee.com/",
  koFi: "", // e.g. https://ko-fi.com/you

  // Highlighted open-source projects shown on the /donate page
  openSource: [
    {
      name: "your-open-source-repo",
      descriptionEn:
        "A small utility you released to help other developers ship faster.",
      descriptionSl:
        "Majhno orodje, ki si ga objavil, da drugi razvijalci hitreje gradijo.",
      url: "https://github.com/",
    },
  ],

  // Skills shown on the About page
  skills: [
    "Next.js",
    "React",
    "TypeScript",
    "Node.js",
    "PostgreSQL",
    "Drizzle ORM",
    "Tailwind CSS",
    "Android / Kotlin",
    "Firebase",
    "Docker",
    "Cloudflare",
    "UI / UX",
  ],

  // Stats shown on the home page hero strip
  stats: {
    apps: 12,
    years: 8,
    clients: 24,
    coffee: 1430,
  },
} as const;

export type SiteConfig = typeof siteConfig;
