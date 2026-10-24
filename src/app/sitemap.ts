import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { db } from "@/db";
import { projects } from "@/db/schema";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const staticPages = [
    "",
    "/projects",
    "/about",
    "/services",
    "/files",
    "/contact",
    "/donate",
  ];

  let projectSlugs: string[] = [];
  try {
    const rows = await db.select({ slug: projects.slug, updatedAt: projects.createdAt }).from(projects);
    projectSlugs = rows.map((r) => r.slug);
  } catch {
    // DB may not be ready during build – fail soft.
  }

  const now = new Date();

  const entries: MetadataRoute.Sitemap = [];
  for (const p of staticPages) {
    entries.push(
      { url: `${base}${p}`, lastModified: now, changeFrequency: "weekly", priority: p === "" ? 1 : 0.8 },
      { url: `${base}${p}?lang=en`, lastModified: now, changeFrequency: "weekly", priority: p === "" ? 0.9 : 0.7 },
      { url: `${base}${p}?lang=sl`, lastModified: now, changeFrequency: "weekly", priority: p === "" ? 0.9 : 0.7 }
    );
  }
  for (const slug of projectSlugs) {
    entries.push(
      { url: `${base}/projects/${slug}`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
      { url: `${base}/projects/${slug}?lang=en`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
      { url: `${base}/projects/${slug}?lang=sl`, lastModified: now, changeFrequency: "monthly", priority: 0.6 }
    );
  }
  return entries;
}
