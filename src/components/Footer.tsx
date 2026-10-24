import Link from "next/link";
import { Code2, Briefcase, MessageCircle, Camera, Mail, Heart } from "lucide-react";
import { siteConfig } from "@/lib/site";
import type { Translation, Lang } from "@/lib/i18n";

type Props = { lang: Lang; t: Translation };

export function Footer({ lang, t }: Props) {
  const year = new Date().getFullYear();
  return (
    <footer className="relative z-10 mt-24 border-t border-white/5 bg-[color-mix(in_oklab,var(--color-bg)_80%,transparent)]">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-14 grid md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c5cff] to-[#22d3ee] text-white text-sm font-bold">
              {siteConfig.name.charAt(0).toUpperCase()}
            </span>
            <span className="font-semibold tracking-tight">
              {siteConfig.name}
            </span>
          </div>
          <p className="text-[color:var(--color-fg-muted)] max-w-md">
            {t.footer.tagline}
          </p>
          <p className="text-[color:var(--color-fg-muted)] mt-1 text-sm">
            {siteConfig.tagline}
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider text-[color:var(--color-fg-muted)]">
            {t.nav.projects}
          </h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/projects" className="hover:text-white">{t.projects.title}</Link></li>
            <li><Link href="/services" className="hover:text-white">{t.services.title}</Link></li>
            <li><Link href="/files" className="hover:text-white">{t.files.title}</Link></li>
            <li><Link href="/donate" className="hover:text-white">{t.nav.donate}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider text-[color:var(--color-fg-muted)]">
            {t.contact.title}
          </h4>
          <ul className="space-y-2 text-sm text-[color:var(--color-fg-muted)]">
            <li>
              <a
                href={`mailto:${siteConfig.email}`}
                className="inline-flex items-center gap-2 hover:text-white"
              >
                <Mail size={14} /> {siteConfig.email}
              </a>
            </li>
            <li>
              <a
                href={siteConfig.socials.github}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 hover:text-white"
              >
                <Code2 size={14} /> GitHub
              </a>
            </li>
            <li>
              <a
                href={siteConfig.socials.linkedin}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 hover:text-white"
              >
                <Briefcase size={14} /> LinkedIn
              </a>
            </li>
            <li>
              <a
                href={siteConfig.socials.twitter}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 hover:text-white"
              >
                <MessageCircle size={14} /> Twitter
              </a>
            </li>
            <li>
              <a
                href={siteConfig.socials.instagram}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 hover:text-white"
              >
                <Camera size={14} /> Instagram
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/5">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[color:var(--color-fg-muted)]">
          <p>
            © {year} {siteConfig.name}. {t.footer.rights}
          </p>
          <p className="inline-flex items-center gap-1.5">
            {t.footer.builtWith.replace("❤️", "")}
            <Heart size={14} className="text-[#f472b6]" fill="#f472b6" />
          </p>
        </div>
      </div>
    </footer>
  );
}
