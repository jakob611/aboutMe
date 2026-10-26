import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Code2, Calendar } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { CommentSection } from "@/components/CommentSection";
import { getLang } from "@/lib/lang";
import { translations } from "@/lib/i18n";
import { getDb } from "@/db";
import { projects, comments } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";
import { publicCommentFields } from "@/lib/public-comments";
import { ProjectGallery } from "@/components/ProjectGallery";
import { projectCategoryLabel } from "@/lib/project-categories";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const lang = await getLang();
  const [row] = await getDb()
    .select()
    .from(projects)
    .where(eq(projects.slug, slug));
  if (!row) return { title: "Not found" };
  const title = lang === "sl" ? row.titleSl : row.titleEn;
  const description = lang === "sl" ? row.summarySl : row.summaryEn;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: row.coverImage ? [{ url: row.coverImage }] : undefined,
    },
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const lang = await getLang();
  const t = translations[lang];

  const [project] = await getDb()
    .select()
    .from(projects)
    .where(eq(projects.slug, slug));
  if (!project) notFound();

  const projectComments = await getDb()
    .select(publicCommentFields)
    .from(comments)
    .where(and(eq(comments.projectId, project.id), eq(comments.approved, true)))
    .orderBy(desc(comments.createdAt));

  const title = lang === "sl" ? project.titleSl : project.titleEn;
  const summary = lang === "sl" ? project.summarySl : project.summaryEn;
  const description =
    lang === "sl" ? project.descriptionSl : project.descriptionEn;
  const catLabel = projectCategoryLabel(project.category, lang);

  // Structured data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: title,
    description: summary,
    url: `${siteConfig.url}/projects/${project.slug}`,
    image: project.coverImage || undefined,
    author: { "@type": "Person", name: siteConfig.name },
    datePublished: project.createdAt.toISOString(),
    keywords: (project.tags ?? []).join(", "),
  };

  return (
    <article className="pt-12 pb-24 sm:pt-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        <Reveal>
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-sm text-[color:var(--color-fg-muted)] hover:text-white mb-8"
          >
            <ArrowLeft size={14} />{" "}
            {t.projects.backToProjects.replace(/^←\s*/, "")}
          </Link>
        </Reveal>

        <Reveal>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="section-label">{catLabel}</span>
            <span className="text-xs text-[color:var(--color-fg-muted)] inline-flex items-center gap-1">
              <Calendar size={12} />{" "}
              {project.createdAt.toLocaleDateString(
                lang === "sl" ? "sl-SI" : "en-GB",
                { year: "numeric", month: "long", day: "numeric" },
              )}
            </span>
          </div>
          <h1 className="display-title max-w-3xl">{title}</h1>
          <p className="mt-4 text-lg text-[color:var(--color-fg-muted)] max-w-3xl leading-relaxed">
            {summary}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {project.linkUrl && (
              <a
                href={project.linkUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
              >
                {project.linkLabel || t.projects.visit}{" "}
                <ExternalLink size={15} />
              </a>
            )}
            {project.repoUrl && (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost"
              >
                {t.projects.code} <Code2 size={15} />
              </a>
            )}
          </div>
        </Reveal>

        {project.coverImage && (
          <Reveal delay={0.1}>
            <img
              src={project.coverImage}
              alt={title}
              width={1400}
              height={900}
              className="mt-10 max-h-[75vh] w-full rounded-2xl border border-white/10 bg-white/[0.02] object-contain"
            />
          </Reveal>
        )}

        {project.gallery && project.gallery.length > 0 && (
          <ProjectGallery images={project.gallery} title={title} lang={lang} />
        )}

        <Reveal delay={0.15}>
          <div className="section-rule mt-12 grid gap-6 pt-8 sm:grid-cols-[140px_1fr]">
            <h2 className="section-label">
              {lang === "sl" ? "O projektu" : "Project notes"}
            </h2>
            <div>
              {description.split("\n\n").map((p, i) => (
                <p
                  key={i}
                  className="text-[color:var(--color-fg-muted)] leading-relaxed mb-4"
                >
                  {p}
                </p>
              ))}
            </div>
          </div>
        </Reveal>

        {project.tags && project.tags.length > 0 && (
          <Reveal delay={0.2}>
            <div className="mt-10 flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-xs border border-white/10 text-[color:var(--color-fg-muted)]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </Reveal>
        )}

        {/* COMMENTS */}
        <div className="mt-16">
          <CommentSection
            slug={project.slug}
            initialComments={projectComments}
            lang={lang}
          />
        </div>
      </div>
    </article>
  );
}
