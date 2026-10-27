import { Reveal } from "@/components/Reveal";
import { ProjectsClient } from "@/components/ProjectsClient";
import { getLang } from "@/lib/lang";
import { getDb } from "@/db";
import { projects } from "@/db/schema";
import { desc } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { isProjectCategory } from "@/lib/project-categories";
import { serializePublicProject } from "@/lib/project-media";
import { getSiteContent } from "@/lib/site-content-server";

type Props = { searchParams: Promise<{ category?: string | string[] }> };

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = (await getSiteContent()).translation(lang);
  return {
    title: t.projects.title,
    description: t.projects.subtitle,
  };
}

export default async function ProjectsPage({ searchParams }: Props) {
  const lang = await getLang();
  const content = await getSiteContent();
  const t = content.translation(lang);

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
              {content.text(lang, "projects.eyebrow")}
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
              {content.text(lang, "projects.unavailableEyebrow")}
            </p>
            <h2 className="mt-4 text-2xl font-medium tracking-tight">
              {content.text(lang, "projects.unavailableTitle")}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
              {content.text(lang, "projects.unavailableHint")}
            </p>
            {content.profile().github && <a
              href={content.profile().github}
              target="_blank"
              rel="noreferrer"
              className="link-arrow mt-6 inline-flex items-center gap-2 text-sm"
            >
              {content.text(lang, "projects.github")}
              <ArrowUpRight size={14} />
            </a>}
            <Link
              href="/contact"
              className="ml-6 inline-flex text-sm text-[color:var(--color-fg-muted)] hover:text-white"
            >
              {content.text(lang, "projects.getInTouch")}
            </Link>
          </div>
        ) : (
          <ProjectsClient
            key={initialCategory}
            projects={allProjects.map(serializePublicProject)}
            lang={lang}
            initialCategory={initialCategory}
          />
        )}
      </div>
    </section>
  );
}
