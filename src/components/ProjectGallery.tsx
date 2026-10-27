"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Expand, X } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { projectImageCaption, type ProjectImage } from "@/lib/project-media";
import { useSiteContent } from "./SiteContentProvider";

type Props = { images: (string | ProjectImage)[]; title: string; lang: Lang };

export function ProjectGallery({ images, title, lang }: Props) {
  const content = useSiteContent();
  const copy = (key: string) => content.text(lang, "gallery." + key);
  const entries = images.map(image => typeof image === "string" ? { url: image, captionEn: "", captionSl: "" } : image);
  const caption = (index: number) => projectImageCaption(entries[index], lang);
  const dialog = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const count = images.length;
  useEffect(() => {
    if (active !== null && !dialog.current?.open) dialog.current?.showModal();
  }, [active]);
  const close = () => dialog.current?.close();
  const previous = () =>
    setActive((index) => (index === null ? null : (index + count - 1) % count));
  const next = () =>
    setActive((index) => (index === null ? null : (index + 1) % count));

  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {entries.map((image, index) => (
          <figure key={`${image.url}-${index}`} className="min-w-0">
          <a
            href={image.url}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => {
              if (
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return;
              if (dialog.current?.showModal) {
                event.preventDefault();
                setActive(index);
              }
            }}
            className="group relative block overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]"
            aria-label={
              `${copy("enlarge")} ${index + 1}: ${caption(index) || title}`
            }
          >
            <img
              src={image.url}
              alt={caption(index) || `${title} — ${index + 1}`}
              loading="lazy"
              width={900}
              height={600}
              className="h-full max-h-96 w-full object-contain transition-transform duration-500 motion-safe:group-hover:scale-[1.02]"
            />
            <span
              className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white"
              aria-hidden="true"
            >
              <Expand size={13} />
            </span>
          </a>
          {caption(index) && <figcaption className="mt-3 text-sm leading-relaxed text-[color:var(--color-fg-muted)] [overflow-wrap:anywhere]">{caption(index)}</figcaption>}
          </figure>
        ))}
      </div>
      <dialog
        ref={dialog}
        onClose={() => setActive(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        onKeyDown={(event) => {
          if (count > 1 && event.key === "ArrowLeft") {
            event.preventDefault();
            previous();
          }
          if (count > 1 && event.key === "ArrowRight") {
            event.preventDefault();
            next();
          }
        }}
        aria-label={
          `${copy("images")}: ${title}`
        }
        className="fixed inset-0 m-auto max-h-[94dvh] w-[min(94vw,1100px)] overflow-auto rounded-2xl border border-white/20 bg-[#101317] p-3 text-white shadow-2xl backdrop:bg-black/90 sm:p-5"
      >
        {active !== null && (
          <div className="flex min-h-0 flex-col">
            <div className="mb-4 flex items-center justify-between gap-4">
              <p className="truncate text-sm">
                {title}
                <span className="ml-3 font-mono text-xs text-white/50">
                  {active + 1} / {count}
                </span>
              </p>
              <button
                type="button"
                onClick={close}
                className="shrink-0 rounded-full border border-white/15 p-2 hover:bg-white/10"
                aria-label={
                  copy("close")
                }
              >
                <X size={18} />
              </button>
            </div>
            <img
              src={entries[active].url}
              alt={caption(active) || `${title} — ${active + 1}`}
              className="max-h-[70dvh] w-full object-contain"
            />
            {caption(active) && <p className="mt-4 text-sm leading-relaxed text-white/80 [overflow-wrap:anywhere]" aria-live="polite">{caption(active)}</p>}
            {count > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={previous}
                  className="btn-ghost text-sm"
                >
                  <ArrowLeft size={14} />
                  {copy("previous")}
                </button>
                <span className="hidden font-mono text-[10px] text-white/40 sm:inline">
                  ← → / ESC
                </span>
                <button
                  type="button"
                  onClick={next}
                  className="btn-ghost text-sm"
                >
                  {copy("next")}
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
