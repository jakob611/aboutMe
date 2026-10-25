"use client";

import { Languages } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { languageNavigation } from "@/lib/language-preference";

type Props = { lang: Lang; label: string };

export function LanguageSwitcher({ lang, label }: Props) {
  const next: Lang = lang === "en" ? "sl" : "en";
  const toggle = () => {
    const target = languageNavigation(window.location.href, next);
    document.cookie = target.cookie;
    // A client-router query change retains the root layout, including its old
    // translated header/footer and lang prop. Reload the document on a deliberate
    // language change so layout, page content, metadata and <html lang> agree.
    // No local pending/disabled state: browser Back may restore this document.
    window.location.assign(target.href);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        lang === "sl"
          ? `Preklopi jezik: ${label}`
          : `Switch language to ${label}`
      }
      title={label}
      className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-[color:var(--color-fg-muted)] transition-colors hover:text-[color:var(--color-fg)] disabled:opacity-50"
    >
      <Languages aria-hidden="true" size={14} />
      <span>{next.toUpperCase()}</span>
    </button>
  );
}
