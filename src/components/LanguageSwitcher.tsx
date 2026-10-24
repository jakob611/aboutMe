"use client";

import { Suspense, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Languages } from "lucide-react";
import type { Lang } from "@/lib/i18n";

type Props = {
  lang: Lang;
  label: string;
};

export function LanguageSwitcher(props: Props) {
  return (
    <Suspense
      fallback={
        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm border border-white/10">
          <Languages size={15} className="opacity-80" />
          <span className="font-medium">{props.label}</span>
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
    const params = new URLSearchParams(searchParams?.toString());
    params.set("lang", next);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
      router.refresh();
    });
  };

  return (
    <button
      onClick={toggle}
      disabled={pending}
      aria-label={label}
      title={label}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-60"
    >
      <Languages size={15} className="opacity-80" />
      <span className="font-medium">{label}</span>
    </button>
  );
}
