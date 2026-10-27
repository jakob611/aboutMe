import { SiteContentProvider } from "@/components/SiteContentProvider";
import { getSiteContent } from "@/lib/site-content-server";
import { serializeSiteStructuredData } from "@/lib/site-content";
export const dynamic = "force-dynamic";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FragmentLink } from "@/components/FragmentLink";
import { siteConfig } from "@/lib/site";
import { getLang } from "@/lib/lang";

export const viewport: Viewport = {
  themeColor: "#111513",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const content = await getSiteContent();
  const t = content.translation(lang);
  const title = `${content.profile().name} — ${t.brand}`;
  const description = content.profile().tagline;
  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: title, template: `%s · ${content.profile().name}` },
    description,
    applicationName: content.profile().name,
    authors: [{ name: content.profile().name, url: siteConfig.url }],
    creator: content.profile().name,
    publisher: content.profile().name,
    alternates: {
      canonical: "./",
      languages: { en: "/?lang=en", sl: "/?lang=sl" },
    },
    openGraph: {
      type: "website",
      siteName: content.profile().name,
      title,
      description,
      url: siteConfig.url,
      locale: lang === "sl" ? "sl_SI" : "en_US",
      images: [
        {
          url: `${siteConfig.url}/og.png`,
          width: 1200,
          height: 630,
          alt: content.profile().name,
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

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const lang = await getLang();
  const content = await getSiteContent();
  const t = content.translation(lang);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: content.profile().name,
    url: siteConfig.url,
    jobTitle: content.profile().tagline,
    sameAs: [content.profile().github, content.profile().linkedin, content.profile().instagram, content.profile().twitter].filter(Boolean),
    email: content.profile().email || undefined,
  };

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#111513" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeSiteStructuredData(jsonLd),
          }}
        />
      </head>
      <body id="top" className="mesh-bg min-h-screen relative grain">
        <FragmentLink href="#main-content" className="skip-link" focusTarget>
          {content.text(lang, "layout.skip")}
        </FragmentLink>
        <SiteContentProvider values={content.overrides}>
        <Navbar key={lang} name={content.profile().name} lang={lang} t={t} />
        <main
          id="main-content"
          tabIndex={-1}
          className="relative z-10 page-fade"
        >
          {children}
        </main>
        <Footer lang={lang} t={t} />
        </SiteContentProvider>
      </body>
    </html>
  );
}
