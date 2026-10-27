"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, X } from "lucide-react";
import { ProjectCard, type Project } from "@/components/ProjectCard";
import { Reveal } from "@/components/Reveal";
import type { Lang } from "@/lib/i18n";
import { useSiteContent } from "@/components/SiteContentProvider";
import { cn } from "@/lib/utils";
import { PROJECT_CATEGORY_IDS, normalizeProjectCategory } from "@/lib/project-categories";

type Props = { projects: Project[]; lang: Lang; initialCategory?: Category };
const CATEGORIES = ["all", ...PROJECT_CATEGORY_IDS] as const;
type Category = (typeof CATEGORIES)[number];
const normalize = (text: string) =>
  text
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function ProjectsClient({
  projects,
  lang,
  initialCategory = "all",
}: Props) {
  const content = useSiteContent();
  const t = content.translation(lang).projects;
  const [active, setActive] = useState<Category>(initialCategory);
  const [query, setQuery] = useState("");
  const labels = {
    all: t.filterAll,
    ...Object.fromEntries(PROJECT_CATEGORY_IDS.map(category => [category, content.categoryLabel(lang, category)])),
  } as Record<Category, string>;
  const categoryOf = (project: Project) =>
    normalizeProjectCategory(project.category);
  const term = normalize(query.trim());
  const filtered = projects.filter(
    (project) =>
      (active === "all" || categoryOf(project) === active) &&
      (!term ||
        normalize(
          [
            project.titleEn,
            project.titleSl,
            project.summaryEn,
            project.summarySl,
            ...(project.tags ?? []),
          ].join(" "),
        ).includes(term)),
  );
  useEffect(() => {
    const restoreCategory = () => {
      const value = new URL(window.location.href).searchParams.get("category");
      setActive(
        CATEGORIES.includes(value as Category) ? (value as Category) : "all",
      );
    };
    window.addEventListener("popstate", restoreCategory);
    return () => window.removeEventListener("popstate", restoreCategory);
  }, []);
  const selectCategory = (category: Category) => {
    setActive(category);
    const url = new URL(window.location.href);
    if (category === "all") url.searchParams.delete("category");
    else url.searchParams.set("category", category);
    if (url.href !== window.location.href)
      window.history.pushState(null, "", url);
  };
  const reset = () => {
    selectCategory("all");
    setQuery("");
  };
  return (
    <>
      <Reveal>
        <div className="mt-10 flex flex-col gap-6 border-y border-white/10 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="flex flex-wrap gap-1"
            role="group"
            aria-label={content.text(lang, "projects.categoryLabel")}
          >
            {CATEGORIES.map((category) => (
              <button
                type="button"
                key={category}
                aria-pressed={active === category}
                onClick={() => selectCategory(category)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  active === category
                    ? "bg-[color:var(--color-fg)] text-[color:var(--color-bg)]"
                    : "text-[color:var(--color-fg-muted)] hover:bg-white/5 hover:text-[color:var(--color-fg)]",
                )}
              >
                {labels[category]}
                <span className="font-mono text-[10px] opacity-60">
                  {category === "all"
                    ? projects.length
                    : projects.filter(
                        (project) => categoryOf(project) === category,
                      ).length}
                </span>
              </button>
            ))}
          </div>
          <div className="relative w-full lg:max-w-64" role="search">
            <label htmlFor="project-search" className="sr-only">
              {content.text(lang, "projects.searchLabel")}
            </label>
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-fg-muted)]"
              aria-hidden="true"
            />
            <input
              id="project-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={content.text(lang, "projects.searchPlaceholder")}
              className="input !py-2 !pl-9 !pr-9 text-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label={content.text(lang, "projects.clearSearch")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[color:var(--color-fg-muted)] hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </Reveal>
      <p
        className="my-5 font-mono text-[11px] text-[color:var(--color-fg-muted)]"
        role="status"
        aria-live="polite"
      >
        {content.text(lang, "projects.showing").replaceAll("{shown}", String(filtered.length)).replaceAll("{total}", String(projects.length))}
      </p>
      {filtered.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project, index) => (
            <Reveal key={project.id} delay={Math.min(index * 0.04, 0.2)}>
              <ProjectCard project={project} lang={lang} />
            </Reveal>
          ))}
        </div>
      ) : (
        <div className="surface-panel flex min-h-64 flex-col items-start justify-center rounded-2xl p-7 sm:p-10">
          <span className="section-label">
            {content.text(lang, "projects.emptyEyebrow")}
          </span>
          <h2 className="mt-4 text-2xl font-medium tracking-tight">
            {projects.length
              ? content.text(lang, "projects.noMatches")
              : t.noProjects}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
            {projects.length
              ? content.text(lang, "projects.searchHint")
              : content.text(lang, "projects.emptyHint")}
          </p>
          {projects.length ? (
            <button
              type="button"
              onClick={reset}
              className="btn-ghost mt-6 text-sm"
            >
              {content.text(lang, "projects.clearFilters")}
              <X size={13} />
            </button>
          ) : (
            <Link href="/contact" className="link-arrow mt-6 text-sm">
              {content.text(lang, "projects.contactIdea")}
              <ArrowUpRight size={14} />
            </Link>
          )}
        </div>
      )}
    </>
  );
}
