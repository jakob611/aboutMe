import { Reveal } from "@/components/Reveal";
import { ProjectCard } from "@/components/ProjectCard";
import { ProjectsClient } from "@/components/ProjectsClient";
import { getLang } from "@/lib/lang";
import { translations } from "@/lib/i18n";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { desc } from "drizzle-orm";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = translations[lang];
  return {
    title: t.projects.title,
    description: t.projects.subtitle,
  };
}

export default async function ProjectsPage() {
  const lang = await getLang();
  const t = translations[lang];

  const allProjects = await db
    .select()
    .from(projects)
    .orderBy(desc(projects.createdAt));

  return (
    <section className="pt-16 sm:pt-24 pb-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">
              {t.projects.title}
            </h1>
            <p className="mt-4 text-lg text-[color:var(--color-fg-muted)]">
              {t.projects.subtitle}
            </p>
          </div>
        </Reveal>

        <ProjectsClient projects={allProjects} lang={lang} />
      </div>
    </section>
  );
}
