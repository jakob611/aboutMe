"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useSiteContent } from "./SiteContentProvider";
import type { SourceVisibility } from "@/lib/project-media";

export type Project = {
  id: number;
  slug: string;
  titleEn: string;
  titleSl: string;
  summaryEn: string;
  summarySl: string;
  category: string;
  coverImage: string | null;
  linkUrl: string | null;
  repoUrl: string | null;
  tags: string[] | null;
  sourceVisibility?: SourceVisibility;
};
type Props = { project: Project; lang: Lang; featured?: boolean };
const categoryAccents: Record<string, string> = {
  android: "#91b99e",
  lego: "#d4ac79",
  web: "#8ab9c2",
  "3d-printing": "#c4b08c",
  other: "#aaa0c9",
};

export function ProjectCard({ project, lang, featured }: Props) {
  const content = useSiteContent();
  const title = lang === "sl" ? project.titleSl : project.titleEn;
  const summary = lang === "sl" ? project.summarySl : project.summaryEn;
  const category = content.categoryLabel(lang, project.category);
  const accent = categoryAccents[project.category] ?? categoryAccents.other;
  return (
    <Link
      href={`/projects/${project.slug}`}
      className={cn(
        "project-card group block h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.015]",
        featured && "md:col-span-2",
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden border-b border-white/10 bg-[#14171b]">
        {project.coverImage ? (
          <img
            src={project.coverImage}
            alt=""
            width={960}
            height={600}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out"
          />
        ) : (
          <div
            className="absolute inset-0 flex flex-col justify-between p-6 sm:p-7"
            aria-hidden="true"
          >
            <div
              className="absolute inset-0 opacity-[0.09]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, #cbd5e1 1px, transparent 1px), linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            <span className="relative font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
              {project.category} / {String(project.id).padStart(2, "0")}
            </span>
            <div className="relative flex items-end justify-between gap-6">
              <span
                className="line-clamp-2 min-w-0 max-w-[80%] text-2xl font-medium tracking-tight [overflow-wrap:anywhere] sm:text-3xl"
                style={{ color: accent }}
              >
                {title}
              </span>
              <span
                className="mb-1 h-12 w-1 shrink-0 rounded-full"
                style={{ background: accent }}
              />
            </div>
          </div>
        )}
        <span
          className="project-card-arrow absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-sm group-hover:bg-white group-hover:text-black"
          aria-hidden="true"
        >
          <ArrowUpRight size={17} />
        </span>
      </div>
      <div className="p-5 sm:p-6">
        <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-[color:var(--color-fg-muted)]">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: accent }}
          />
          {category}
          {project.sourceVisibility === "closed" && <span className="ml-auto rounded border border-white/15 px-2 py-1 text-[9px] normal-case tracking-normal">{content.text(lang, "projects.closed")}</span>}
        </div>
        <h3 className="min-w-0 text-xl font-medium tracking-tight text-[color:var(--color-fg)] [overflow-wrap:anywhere]">
          {title}
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[color:var(--color-fg-muted)] [overflow-wrap:anywhere]">
          {summary}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-white/[0.07] pt-4 text-[11px] text-[color:var(--color-fg-muted)]">
          {(project.tags ?? []).slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="min-w-0 max-w-full [overflow-wrap:anywhere]"
            >
              {tag}
            </span>
          ))}
          <span className="ml-auto inline-flex items-center gap-1.5 text-[color:var(--color-fg)]">
            {content.text(lang, "projects.notes")}
            <ArrowUpRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}
