import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Code2, Calendar } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { CommentSection } from "@/components/CommentSection";
import { getLang } from "@/lib/lang";
import { getDb } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { siteConfig } from "@/lib/site";
import { getCachedComments } from "@/lib/get-comments";
import { contactTurnstileHostname } from "@/lib/contact-turnstile";
import { ProjectGallery } from "@/components/ProjectGallery";
import { serializeSiteStructuredData } from "@/lib/site-content";
import { serializePublicProject } from "@/lib/project-media";
import { getSiteContent } from "@/lib/site-content-server";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const lang = await getLang();
  const [row] = await getDb()
    .select()
    .from(projects)
    .where(eq(projects.slug, slug));
  if (!row) return { title: (await getSiteContent()).text(lang, "projects.notFound") };
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
  const content = await getSiteContent();
  const t = content.translation(lang);

  const [row] = await getDb()
    .select()
    .from(projects)
    .where(eq(projects.slug, slug));
  if (!row) notFound();
  const project = serializePublicProject(row);

  const commentsVisible = content.section("projects.comments");
  const projectComments = commentsVisible ? await getCachedComments(project.id) : [];
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || "";
  // Proxy overwrites x-url with the real incoming URL before rendering.
  const requestUrl = (await headers()).get("x-url") || "";
  const verificationAvailable = Boolean(siteKey && process.env.TURNSTILE_SECRET?.trim() && (process.env.MODERATION_SECRET?.length ?? 0) >= 32 &&
    contactTurnstileHostname(requestUrl, process.env.TURNSTILE_HOSTNAMES));

  const title = lang === "sl" ? project.titleSl : project.titleEn;
  const summary = lang === "sl" ? project.summarySl : project.summaryEn;
  const description =
    lang === "sl" ? project.descriptionSl : project.descriptionEn;
  const catLabel = content.categoryLabel(lang, project.category);
  const coverCaption = lang === "sl" ? project.coverCaptionSl : project.coverCaptionEn;

  // Structured data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: title,
    description: summary,
    url: `${siteConfig.url}/projects/${project.slug}`,
    image: project.coverImage || undefined,
    author: { "@type": "Person", name: content.profile().name },
    datePublished: project.createdAt.toISOString(),
    keywords: (project.tags ?? []).join(", "),
  };

  return (
    <article className="pt-12 pb-24 sm:pt-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeSiteStructuredData(jsonLd),
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
            {project.repoUrl && project.sourceVisibility !== "closed" && (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost"
              >
                {t.projects.code} <Code2 size={15} />
              </a>
            )}
            {project.sourceVisibility === "closed" && <span className="inline-flex items-center rounded-lg border border-white/15 px-4 py-2 text-sm text-[color:var(--color-fg-muted)]">{content.text(lang, "projects.closed")}</span>}
          </div>
        </Reveal>

        {project.coverImage && (
          <Reveal delay={0.1}>
            <figure className="mt-10">
            <img
              src={project.coverImage}
              alt={coverCaption || title}
              width={1400}
              height={900}
              className="max-h-[75vh] w-full rounded-2xl border border-white/10 bg-white/[0.02] object-contain"
            />
            {coverCaption && <figcaption className="mt-3 text-sm leading-relaxed text-[color:var(--color-fg-muted)] [overflow-wrap:anywhere]">{coverCaption}</figcaption>}
            </figure>
          </Reveal>
        )}

        {project.galleryImages.length > 0 && (
          <ProjectGallery images={project.galleryImages} title={title} lang={lang} />
        )}

        <Reveal delay={0.15}>
          <div className="section-rule mt-12 grid gap-6 pt-8 sm:grid-cols-[140px_1fr]">
            <h2 className="section-label">
              {content.text(lang, "projects.notes")}
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
            key={project.slug}
            slug={project.slug}
            initialComments={projectComments}
            lang={lang}
            verificationSiteKey={verificationAvailable ? siteKey : undefined}
          />
        </div>
      </div>
    </article>
  );
}
