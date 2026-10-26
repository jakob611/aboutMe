import { Reveal } from "@/components/Reveal";
import { ProjectsClient } from "@/components/ProjectsClient";
import { getLang } from "@/lib/lang";
import { translations } from "@/lib/i18n";
import { getDb } from "@/db";
import { projects } from "@/db/schema";
import { desc } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { isProjectCategory } from "@/lib/project-categories";

type Props = { searchParams: Promise<{ category?: string | string[] }> };

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = translations[lang];
  return {
    title: t.projects.title,
    description: t.projects.subtitle,
  };
}

export default async function ProjectsPage({ searchParams }: Props) {
  const lang = await getLang();
  const t = translations[lang];

  const category = (await searchParams).category;
  const initialCategory = isProjectCategory(category) ? category : "all";
  let allProjects: (typeof projects.$inferSelect)[] = [];
  let unavailable = false;
  try {
    allProjects = await getDb()
      .select()
      .from(projects)
      .orderBy(desc(projects.createdAt));
  } catch {
    unavailable = true;
    console.error(
      "Project collection unavailable; check database configuration.",
    );
  }

  return (
    <section className="pt-14 pb-24 sm:pt-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <div className="max-w-3xl">
            <p className="section-label mb-5">
              01 /{" "}
              {lang === "sl" ? "Delo in raziskovanje" : "Work & experiments"}
            </p>
            <h1 className="display-title">{t.projects.title}</h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[color:var(--color-fg-muted)] sm:text-lg">
              {t.projects.subtitle}
            </p>
          </div>
        </Reveal>

        {unavailable ? (
          <div className="surface-panel mt-10 rounded-2xl p-7 sm:p-10">
            <p className="section-label">
              {lang === "sl"
                ? "Zbirka trenutno ni dosegljiva"
                : "Collection currently unavailable"}
            </p>
            <h2 className="mt-4 text-2xl font-medium tracking-tight">
              {lang === "sl"
                ? "Koda je še vedno na GitHubu."
                : "The code is still on GitHub."}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
              {lang === "sl"
                ? "Opisov projektov trenutno ni mogoče naložiti. Medtem si lahko ogledaš moje repozitorije."
                : "Project notes could not be loaded right now. You can still browse my repositories in the meantime."}
            </p>
            <a
              href="https://github.com/jakob611"
              target="_blank"
              rel="noreferrer"
              className="link-arrow mt-6 inline-flex items-center gap-2 text-sm"
            >
              GitHub
              <ArrowUpRight size={14} />
            </a>
            <Link
              href="/contact"
              className="ml-6 inline-flex text-sm text-[color:var(--color-fg-muted)] hover:text-white"
            >
              {lang === "sl" ? "Kontakt" : "Get in touch"}
            </Link>
          </div>
        ) : (
          <ProjectsClient
            key={initialCategory}
            projects={allProjects}
            lang={lang}
            initialCategory={initialCategory}
          />
        )}
      </div>
    </section>
  );
}
