/**
 * Centralised site configuration.
 * Tweak these to personalise the whole site without digging into pages.
 */
export const siteConfig = {
  name: process.env.SITE_OWNER || "Jakob Tominc",
  tagline: process.env.SITE_TAGLINE || "Android, web & LEGO projects",
  email: process.env.CONTACT_EMAIL || "",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://jakobtominc.com").replace(
    /\/$/,
    "",
  ),

  // Social / donation links. Fill them in as you set them up.
  socials: {
    github: "https://github.com/jakob611",
    linkedin: "",
    twitter: "",
    instagram: "",
  },

  // Donation / support page
  buyMeACoffee: process.env.BUY_ME_A_COFFEE_URL || "",
  koFi: process.env.KO_FI_URL || "",

  // Highlighted open-source projects shown on the /donate page
  openSource: [
    {
      name: "aboutMe",
      descriptionEn:
        "The source behind this website: projects, files and a place to get in touch.",
      descriptionSl:
        "Izvorna koda te spletne strani: projekti, datoteke in prostor za stik.",
      url: "https://github.com/jakob611/aboutMe",
    },
  ],

  // Skills shown on the About page
  skills: [
    "Next.js",
    "React",
    "TypeScript",
    "PostgreSQL",
    "Drizzle ORM",
    "Tailwind CSS",
    "Android / Kotlin",
    "Firebase",
    "Cloudflare",
  ],
} as const;

export type SiteConfig = typeof siteConfig;
