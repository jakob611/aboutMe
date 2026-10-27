"use client";
import { useSiteContent } from "@/components/SiteContentProvider";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BrandLogo } from "@/components/BrandLogo";
import type { Translation, Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { synchronizeDocumentLanguage } from "@/lib/language-lifecycle";

type Props = { lang: Lang; t: Translation; name: string };

export function Navbar({ lang, t, name }: Props) {
  const content = useSiteContent();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const links = [
    { href: "/", label: t.nav.home },
    { href: "/projects", label: t.nav.projects },
    { href: "/about", label: t.nav.about },
    { href: "/services", label: t.nav.services },
    { href: "/files", label: t.nav.files },
    { href: "/donate", label: t.nav.donate },
  ];
  const isCurrent = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");
  useEffect(
    () =>
      synchronizeDocumentLanguage(lang, {
        document,
        browser: window,
      }),
    [lang],
  );

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !headerRef.current?.contains(event.target)
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [open]);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape" || !open) return;
    event.preventDefault();
    setOpen(false);
    toggleRef.current?.focus();
  };

  return (
    <header
      ref={headerRef}
      onKeyDown={handleKeyDown}
      className="sticky top-0 z-50 border-b border-white/[0.08] bg-[color:var(--color-bg)]/90 backdrop-blur-xl"
    >
      <nav
        aria-label={content.text(lang, "copy.0.1")}
        className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-5 sm:px-8"
      >
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="group flex shrink-0 items-center gap-3"
          aria-label={`${name} — ${t.nav.home}`}
        >
          <BrandLogo />
          <span className="hidden text-sm font-medium tracking-tight sm:inline">
            {name}
          </span>
        </Link>
        <ul className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={isCurrent(link.href) ? "page" : undefined}
                className={cn(
                  "relative block rounded-md px-3 py-2 text-[13px] transition-colors",
                  isCurrent(link.href)
                    ? "bg-white/[0.05] text-[color:var(--color-fg)]"
                    : "text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]",
                )}
              >
                {link.label}
                {isCurrent(link.href) && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 -bottom-1 h-px bg-[color:var(--color-accent-2)]"
                  />
                )}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher lang={lang} label={t.common.switchLang} />
          <Link
            href="/contact"
            onClick={() => setOpen(false)}
            className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-md border border-white/15 px-3 py-2 text-xs font-medium transition-colors hover:border-white/35 sm:px-3.5"
          >
            <span className="sm:hidden">{t.nav.contact}</span>
            <span className="hidden sm:inline">
              {content.text(lang, "copy.0.2")}
            </span>
            <ArrowUpRight aria-hidden="true" size={14} />
          </Link>
          <button
            ref={toggleRef}
            type="button"
            aria-label={
              open
                ? content.text(lang, "copy.0.3")
                : content.text(lang, "copy.0.4")
            }
            aria-expanded={open}
            aria-controls="mobile-navigation"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/15 lg:hidden"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? (
              <X aria-hidden="true" size={18} />
            ) : (
              <Menu aria-hidden="true" size={18} />
            )}
          </button>
        </div>
      </nav>
      {open && (
        <nav
          id="mobile-navigation"
          aria-label={
            content.text(lang, "copy.0.5")
          }
          className="border-t border-white/[0.08] bg-[color:var(--color-bg)] lg:hidden"
        >
          <ul className="mx-auto grid max-w-7xl gap-1 px-5 py-4 sm:px-8">
            {links.map(
              (link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    aria-current={isCurrent(link.href) ? "page" : undefined}
                    className={cn(
                      "flex items-center justify-between rounded-md px-3 py-3 text-sm transition-colors hover:bg-white/[0.04]",
                      isCurrent(link.href)
                        ? "bg-white/[0.05] text-[color:var(--color-accent-2)]"
                        : "text-[color:var(--color-fg-muted)]",
                    )}
                  >
                    {link.label}
                    <ArrowUpRight aria-hidden="true" size={14} />
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
