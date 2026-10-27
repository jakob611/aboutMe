"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Coffee, X } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import type { KoFiProfile } from "@/lib/kofi-profile";
import { useSiteContent } from "@/components/SiteContentProvider";

/** Only mounted on Support. The official panel is loaded only when opened. */
export function KoFiWidget({ lang, profile }: { lang: Lang; profile: KoFiProfile }) {
  const content = useSiteContent();
  const handle = profile.href.slice("https://ko-fi.com/".length);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    return () => dialog?.close();
  }, []);

  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          dialogRef.current?.showModal();
          setOpen(true);
        }}
        aria-haspopup="dialog"
        aria-controls="kofi-support-panel"
        className="fixed bottom-5 left-5 z-40 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#0079a8] px-5 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[#00668f] focus-visible:outline-white"
      >
        <Coffee aria-hidden="true" size={20} />
        {content.text(lang, "support.widget.button")}
      </button>
      <dialog
        ref={dialogRef}
        id="kofi-support-panel"
        aria-labelledby="kofi-support-title"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className="fixed inset-0 m-auto h-[min(42rem,calc(100svh-2rem))] max-h-[calc(100svh-2rem)] w-[calc(100vw-2rem)] max-w-[25rem] overflow-hidden rounded-2xl border border-white/15 bg-[color:var(--color-bg)] p-0 text-[color:var(--color-fg)] shadow-2xl backdrop:bg-black/55 sm:inset-auto sm:bottom-5 sm:left-5 sm:m-0"
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <h2 id="kofi-support-title" className="text-sm font-medium">
              {content.text(lang, "support.widget.title")}
              <span className="mt-0.5 block text-xs text-[color:var(--color-fg-muted)]">@{handle}</span>
            </h2>
            <button
              type="button"
              onClick={close}
              autoFocus
              aria-label={content.text(lang, "support.widget.close")}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[color:var(--color-fg-muted)] transition-colors hover:bg-white/10 hover:text-white"
            >
              <X aria-hidden="true" size={20} />
            </button>
          </div>
          {open && (
            <iframe
              src={profile.panelUrl}
              title={`Ko-fi — ${handle}`}
              className="min-h-0 w-full flex-1 border-0 bg-white"
            />
          )}
          <p className="shrink-0 border-t border-white/10 px-4 py-3 text-xs leading-relaxed text-[color:var(--color-fg-muted)]">
            {content.text(lang, "support.widget.fallback")}{" "}
            <a
              href={profile.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[color:var(--color-fg)] underline underline-offset-4"
            >
              {content.text(lang, "support.widget.open")}
              <ArrowUpRight aria-hidden="true" size={12} />
            </a>
          </p>
        </div>
      </dialog>
    </>
  );
}
