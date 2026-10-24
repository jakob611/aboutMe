"use client";

import { Suspense, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Globe2 } from "lucide-react";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";

type Props = { lang: Lang; label: string };

export function LanguageSwitcher(props: Props) {
  return (
    <Suspense
      fallback={
        <span className="inline-flex h-9 items-center gap-1.5 px-2 text-xs text-[color:var(--color-fg-muted)]">
          <Globe2 aria-hidden="true" size={14} />
          {props.lang === "en" ? "SL" : "EN"}
        </span>
      }
    >
      <LanguageSwitcherInner {...props} />
    </Suspense>
  );
}

function LanguageSwitcherInner({ lang, label }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const toggle = () => {
    const next: Lang = lang === "en" ? "sl" : "en";
    const params = new URLSearchParams(searchParams.toString());
    params.set("lang", next);
    // The cookie makes the choice available to server components on this request.
    document.cookie = `${LANG_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
    startTransition(() =>
      router.replace(
        `${pathname}?${params.toString()}${window.location.hash}`,
        { scroll: false },
      ),
    );
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={
        lang === "sl"
          ? `Preklopi jezik: ${label}`
          : `Switch language to ${label}`
      }
      aria-busy={pending}
      title={label}
      className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-[color:var(--color-fg-muted)] transition-colors hover:text-[color:var(--color-fg)] disabled:opacity-50"
    >
      <Globe2 aria-hidden="true" size={14} />
      <span>{lang === "en" ? "SL" : "EN"}</span>
    </button>
  );
}
