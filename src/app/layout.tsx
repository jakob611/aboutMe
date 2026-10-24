export const dynamic = "force-dynamic";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { siteConfig } from "@/lib/site";
import { getLang } from "@/lib/lang";
import { translations } from "@/lib/i18n";

export const viewport: Viewport = {
  themeColor: "#07070c",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = translations[lang];
  const title = `${siteConfig.name} — ${t.brand}`;
  const description = siteConfig.tagline;
  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: title, template: `%s · ${siteConfig.name}` },
    description,
    applicationName: siteConfig.name,
    authors: [{ name: siteConfig.name, url: siteConfig.url }],
    creator: siteConfig.name,
    publisher: siteConfig.name,
    alternates: { canonical: "./", languages: { en: "/?lang=en", sl: "/?lang=sl" } },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      title,
      description,
      url: siteConfig.url,
      locale: lang === "sl" ? "sl_SI" : "en_US",
      images: [
        {
          url: `${siteConfig.url}/og.png`,
          width: 1200,
          height: 630,
          alt: siteConfig.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
    keywords: [
      "developer",
      "portfolio",
      "android",
      "lego",
      "web development",
      "full-stack",
      "slovenia",
    ],
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const lang = await getLang();
  const t = translations[lang];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: siteConfig.name,
    url: siteConfig.url,
    jobTitle: siteConfig.tagline,
    sameAs: Object.values(siteConfig.socials).filter(Boolean),
    email: siteConfig.email,
  };

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#07070c" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="mesh-bg min-h-screen relative grain">
        <Navbar key={lang} lang={lang} t={t} />
        <main className="relative z-10 page-fade">{children}</main>
        <Footer lang={lang} t={t} />
      </body>
    </html>
  );
}
