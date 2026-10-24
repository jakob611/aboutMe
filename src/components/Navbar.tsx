"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { Translation, Lang } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

type Props = { lang: Lang; t: Translation };

export function Navbar({ lang, t }: Props) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links: { href: string; label: string }[] = [
    { href: "/", label: t.nav.home },
    { href: "/projects", label: t.nav.projects },
    { href: "/about", label: t.nav.about },
    { href: "/services", label: t.nav.services },
    { href: "/files", label: t.nav.files },
    { href: "/contact", label: t.nav.contact },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "backdrop-blur-xl bg-[color-mix(in_oklab,var(--color-bg)_75%,transparent)] border-b border-white/5"
          : "bg-transparent"
      )}
    >
      <nav className="mx-auto max-w-7xl px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="group flex items-center gap-2 font-semibold text-lg"
          aria-label={siteConfig.name}
        >
          <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c5cff] to-[#22d3ee] text-white shadow-lg shadow-[#7c5cff]/30 transition-transform group-hover:scale-105">
            <span className="text-sm font-bold">
              {siteConfig.name.charAt(0).toUpperCase()}
            </span>
          </span>
          <span className="hidden sm:inline tracking-tight">
            {siteConfig.name}
          </span>
        </Link>

        <ul className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="relative px-3.5 py-2 rounded-full text-sm text-[color:var(--color-fg-muted)] hover:text-white transition-colors"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <LanguageSwitcher lang={lang} label={t.common.switchLang} />
          <Link href="/contact" className="btn-primary hidden sm:inline-flex text-sm">
            {t.services.getQuote}
          </Link>
          <button
            aria-label="Toggle menu"
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        className={cn(
          "md:hidden overflow-hidden transition-[max-height,opacity] duration-300",
          open ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <ul className="px-5 pb-5 flex flex-col gap-1">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-3 rounded-xl text-[color:var(--color-fg-muted)] hover:text-white hover:bg-white/5"
              >
                {l.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/donate"
              onClick={() => setOpen(false)}
              className="block px-4 py-3 rounded-xl text-[color:var(--color-fg-muted)] hover:text-white hover:bg-white/5"
            >
              {t.nav.donate}
            </Link>
          </li>
        </ul>
      </div>
    </header>
  );
}
