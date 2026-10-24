"use client";

import { useState } from "react";
import { ProjectCard, type Project } from "@/components/ProjectCard";
import { Reveal } from "@/components/Reveal";
import { translations, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Props = { projects: Project[]; lang: Lang };

const CATEGORIES = ["all", "android", "lego", "web", "other"] as const;

export function ProjectsClient({ projects, lang }: Props) {
  const t = translations[lang].projects;
  const [active, setActive] = useState<(typeof CATEGORIES)[number]>("all");

  const labels: Record<string, string> = {
    all: t.filterAll,
    android: t.filterAndroid,
    lego: t.filterLego,
    web: t.filterWeb,
    other: t.filterOther,
  };

  const filtered =
    active === "all"
      ? projects
      : projects.filter((p) => p.category === active);

  return (
    <>
      <Reveal>
        <div className="mt-10 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors border",
                active === cat
                  ? "bg-white text-black border-white"
                  : "bg-white/5 text-[color:var(--color-fg-muted)] border-white/10 hover:bg-white/10 hover:text-white"
              )}
            >
              {labels[cat]}
            </button>
          ))}
        </div>
      </Reveal>

      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length === 0 ? (
          <div className="sm:col-span-2 lg:col-span-3 glass rounded-2xl p-10 text-center text-[color:var(--color-fg-muted)]">
            {t.noProjects}
          </div>
        ) : (
          filtered.map((p, i) => (
            <Reveal key={p.id} delay={Math.min(i * 0.05, 0.3)}>
              <ProjectCard project={p} lang={lang} />
            </Reveal>
          ))
        )}
      </div>
    </>
  );
}
