import Link from "next/link";
import { FragmentLink } from "@/components/FragmentLink";
import { BrandLogo } from "@/components/BrandLogo";
import { ArrowUp, ArrowUpRight, Mail } from "lucide-react";
import { siteConfig } from "@/lib/site";
import type { Translation, Lang } from "@/lib/i18n";

type Props = { lang: Lang; t: Translation };

function isProfile(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.pathname !== "/";
  } catch {
    return false;
  }
}

export function Footer({ lang, t }: Props) {
  const year = new Date().getFullYear();
  const email =
    /^\S+@\S+\.\S+$/.test(siteConfig.email) &&
    !/@example\.(com|org|net)$/.test(siteConfig.email)
      ? siteConfig.email
      : "";
  const profiles = [
    { label: "GitHub", url: siteConfig.socials.github },
    { label: "LinkedIn", url: siteConfig.socials.linkedin },
    { label: "Instagram", url: siteConfig.socials.instagram },
    { label: "X", url: siteConfig.socials.twitter },
  ].filter((profile) => isProfile(profile.url));

  return (
    <footer className="relative z-10 mt-20 border-t border-white/10">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 sm:px-8 md:grid-cols-12 md:py-20">
        <div className="md:col-span-6">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-2xl font-medium tracking-[-0.04em]"
          >
            <BrandLogo size={44} />
            <span>
              {siteConfig.name}
              <span
                aria-hidden="true"
                className="text-[color:var(--color-accent-2)]"
              >
                .
              </span>
            </span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
            {lang === "sl"
              ? "Projekti, poskusi in ideje, ki dobivajo obliko. Na zaslonu in zunaj njega."
              : "Projects, experiments, and ideas taking shape. On screen and away from it."}
          </p>
        </div>
        <div className="md:col-span-3">
          <h2 className="section-label mb-5">
            {lang === "sl" ? "Razišči" : "Explore"}
          </h2>
          <ul className="space-y-3 text-sm text-[color:var(--color-fg-muted)]">
            {[
              { href: "/projects", label: t.nav.projects },
              { href: "/about", label: t.nav.about },
              { href: "/services", label: t.nav.services },
              { href: "/files", label: t.nav.files },
              { href: "/donate", label: t.nav.donate },
            ].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="transition-colors hover:text-[color:var(--color-fg)]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-3">
          <h2 className="section-label mb-5">
            {lang === "sl" ? "Ostaniva v stiku" : "Find me"}
          </h2>
          <ul className="space-y-3 text-sm text-[color:var(--color-fg-muted)]">
            <li>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 transition-colors hover:text-[color:var(--color-fg)]"
              >
                {t.nav.contact}
                <ArrowUpRight aria-hidden="true" size={13} />
              </Link>
            </li>
            {email && (
              <li>
                <a
                  href={`mailto:${email}`}
                  className="inline-flex max-w-full items-center gap-2 break-all transition-colors hover:text-[color:var(--color-fg)]"
                >
                  <Mail aria-hidden="true" size={13} className="shrink-0" />
                  {email}
                </a>
              </li>
            )}
            {profiles.map((profile) => (
              <li key={profile.label}>
                <a
                  href={profile.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 transition-colors hover:text-[color:var(--color-fg)]"
                >
                  {profile.label}
                  <ArrowUpRight aria-hidden="true" size={13} />
                  <span className="sr-only">
                    {lang === "sl"
                      ? "Odpre se v novem zavihku"
                      : "Opens in a new tab"}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-white/[0.08] px-5 py-6 text-xs text-[color:var(--color-fg-muted)] sm:px-8">
        <p>
          © {year} {siteConfig.name}
        </p>
        <FragmentLink
          href="#top"
          className="inline-flex items-center gap-2 transition-colors hover:text-[color:var(--color-fg)]"
        >
          {lang === "sl" ? "Na vrh" : "Back to top"}
          <ArrowUp aria-hidden="true" size={13} />
        </FragmentLink>
      </div>
    </footer>
  );
}
