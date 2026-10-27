import { getSiteContent } from "@/lib/site-content-server";
import Link from "next/link";
import { FragmentLink } from "@/components/FragmentLink";
import { BrandLogo } from "@/components/BrandLogo";
import { ArrowUp, ArrowUpRight, Mail } from "lucide-react";
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

export async function Footer({ lang, t }: Props) {
  const content = await getSiteContent();
  const year = new Date().getFullYear();
  const email =
    /^\S+@\S+\.\S+$/.test(content.profile().email) &&
    !/@example\.(com|org|net)$/.test(content.profile().email)
      ? content.profile().email
      : "";
  const profiles = [
    { label: content.text(lang, "copy.1.1"), url: content.profile().github },
    { label: content.text(lang, "copy.1.2"), url: content.profile().linkedin },
    { label: content.text(lang, "copy.1.3"), url: content.profile().instagram },
    { label: content.text(lang, "copy.1.4"), url: content.profile().twitter },
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
              {content.profile().name}
              <span
                aria-hidden="true"
                className="text-[color:var(--color-accent-2)]"
              >
                .
              </span>
            </span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
            {content.text(lang, "copy.1.5")}
          </p>
        </div>
        <div className="md:col-span-3">
          <h2 className="section-label mb-5">
            {content.text(lang, "copy.1.6")}
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
            {content.text(lang, "copy.1.7")}
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
                    {content.text(lang, "copy.1.8")}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-white/[0.08] px-5 py-6 text-xs text-[color:var(--color-fg-muted)] sm:px-8">
        <p>
          © {year} {content.profile().name}
        </p>
        <FragmentLink
          href="#top"
          className="inline-flex items-center gap-2 transition-colors hover:text-[color:var(--color-fg)]"
        >
          {content.text(lang, "copy.1.9")}
          <ArrowUp aria-hidden="true" size={13} />
        </FragmentLink>
      </div>
    </footer>
  );
}
