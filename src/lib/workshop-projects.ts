import { desc, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { projects } from "../db/schema";
import type { Lang } from "./i18n";
import type { WorkshopProjectLinks } from "../components/WorkshopScene";

/** One real destination for each sketch, independent of the three featured cards. */
export async function loadWorkshopProjectLinks(lang: Lang): Promise<WorkshopProjectLinks> {
  const rows = await getDb()
    .selectDistinctOn([projects.category], {
      category: projects.category,
      slug: projects.slug,
      titleEn: projects.titleEn,
      titleSl: projects.titleSl,
    })
    .from(projects)
    .where(inArray(projects.category, ["web", "android", "lego", "3d-printing"]))
    .orderBy(projects.category, desc(projects.createdAt), desc(projects.id));
  return Object.fromEntries(rows.map((project) => [project.category, {
    href: `/projects/${encodeURIComponent(project.slug)}`,
    title: lang === "sl" ? project.titleSl : project.titleEn,
  }]));
}
