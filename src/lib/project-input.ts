import { z } from "zod";
import { slugify } from "@/lib/utils";
import { mediaKeyFromUrl } from "@/lib/media";

const webUrl = (value: string) => {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password; }
  catch { return false; }
};
const link = z.string().trim().max(500).refine(value => !value || webUrl(value), "Use an http or https URL");
const image = z.string().trim().max(500).refine(value =>
  !value || webUrl(value) || mediaKeyFromUrl(value) !== null ||
  (/^\/(?!\/)/.test(value) && !value.includes("..") && !/[\\\s?#]/.test(value) && !value.startsWith("/api/")),
  "Use a project image or a public image URL");
const requiredText = (max: number) => z.string().trim().min(1).max(max);

export const projectInputSchema = z.object({
  slug: z.string().trim().max(120).optional(),
  titleEn: requiredText(200), titleSl: requiredText(200),
  summaryEn: requiredText(2000), summarySl: requiredText(2000),
  descriptionEn: requiredText(50000), descriptionSl: requiredText(50000),
  category: z.enum(["android", "lego", "web", "other"]),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  coverImage: image.optional().nullable(),
  gallery: z.array(image.refine(Boolean)).max(30).optional(),
  linkUrl: link.optional().nullable(), linkLabel: z.string().trim().max(100).optional().nullable(),
  repoUrl: link.optional().nullable(), featured: z.boolean().optional(),
});

export type ProjectInput = z.infer<typeof projectInputSchema>;

export function toProjectRow(input: ProjectInput) {
  const slug = slugify(input.slug || input.titleEn);
  if (slug.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Invalid slug");
  return {
    ...input, slug,
    tags: [...new Set(input.tags ?? [])], gallery: [...new Set(input.gallery ?? [])],
    coverImage: input.coverImage || "", linkUrl: input.linkUrl || "",
    linkLabel: input.linkLabel || "", repoUrl: input.repoUrl || "", featured: Boolean(input.featured),
  };
}
