import { asc, desc, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { projects } from "../db/schema";
import type { Lang } from "./i18n";
import { serializePublicProject, projectImageCaption } from "./project-media";
import { workshopSubjects, type WorkshopProject } from "./workshop-slides";

/** Newest record per category, even when another category has many newer posts. */
export async function loadWorkshopProjects(lang: Lang): Promise<WorkshopProject[]> {
  const rows = await getDb().selectDistinctOn([projects.category], {
    id: projects.id, slug: projects.slug, category: projects.category,
    titleEn: projects.titleEn, titleSl: projects.titleSl,
    summaryEn: projects.summaryEn, summarySl: projects.summarySl,
    coverImage: projects.coverImage, gallery: projects.gallery,
    linkUrl: projects.linkUrl, repoUrl: projects.repoUrl,
  }).from(projects).where(inArray(projects.category, [...workshopSubjects]))
    .orderBy(asc(projects.category), desc(projects.createdAt), desc(projects.id));
  return rows.map(row => {
    const project = serializePublicProject(row);
    const closed = project.sourceVisibility === "closed";
    const coverCaption = lang === "sl" ? project.coverCaptionSl : project.coverCaptionEn;
    const images = [
      ...(project.coverImage ? [{ url: project.coverImage, caption: coverCaption }] : []),
      ...project.galleryImages.map(image => ({ url: image.url, caption: projectImageCaption(image, lang) })),
    ].filter((image, index, list) => list.findIndex(other => other.url === image.url) === index);
    return {
      id: project.id, href: `/projects/${encodeURIComponent(project.slug)}`,
      category: project.category, title: lang === "sl" ? project.titleSl : project.titleEn,
      summary: (lang === "sl" ? project.summarySl : project.summaryEn).slice(0, 300),
      images: images.slice(0, 1), linkUrl: project.linkUrl || null,
      repoUrl: closed ? null : project.repoUrl || null, closed,
    };
  });
}
