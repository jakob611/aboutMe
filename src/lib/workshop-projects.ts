import { desc } from "drizzle-orm";
import { getDb } from "../db";
import { projects } from "../db/schema";
import type { Lang } from "./i18n";
import { serializePublicProject, projectImageCaption } from "./project-media";
import type { WorkshopProject } from "./workshop-slides";

/** Only public fields of the newest real records cross the client boundary. */
export async function loadWorkshopProjects(lang: Lang): Promise<WorkshopProject[]> {
  const rows = await getDb().select({
    id: projects.id, slug: projects.slug, category: projects.category,
    titleEn: projects.titleEn, titleSl: projects.titleSl,
    summaryEn: projects.summaryEn, summarySl: projects.summarySl,
    coverImage: projects.coverImage, gallery: projects.gallery,
    linkUrl: projects.linkUrl, repoUrl: projects.repoUrl,
  }).from(projects).orderBy(desc(projects.createdAt), desc(projects.id)).limit(12);
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
      images, linkUrl: project.linkUrl || null,
      repoUrl: closed ? null : project.repoUrl || null, closed,
    };
  });
}
