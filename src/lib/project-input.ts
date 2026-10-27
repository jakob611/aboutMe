import { z } from "zod";
import { slugify } from "@/lib/utils";
import { mediaKeyFromUrl } from "@/lib/media";
import { PROJECT_CATEGORY_IDS } from "@/lib/project-categories";
import { MAX_IMAGE_CAPTION, MAX_PROJECT_IMAGES } from "@/lib/project-media";

/** Accept explicit web URLs or unambiguous bare domains, never other schemes. */
export function normalizeProjectLink(value: string): string | null {
  const text = value.trim();
  if (!text) return "";
  if (/[\s\\]/.test(text) || text.startsWith("//")) return null;
  const explicit = /^https?:\/\//i.test(text);
  if (!explicit && (text.includes("://") || text.includes("@"))) return null;
  try {
    const url = new URL(explicit ? text : `https://${text}`);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
    if (!explicit && !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(url.hostname)) return null;
    return url.href;
  } catch { return null; }
}

const webUrl = (value: string) => {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password; }
  catch { return false; }
};
const link = z.string().trim().max(500, "Use at most 500 characters.")
  .refine(value => normalizeProjectLink(value) !== null, "Enter a valid web link, for example glowupp.org or https://glowupp.org.")
  .transform(value => normalizeProjectLink(value)!)
  .refine(value => value.length <= 500, "The complete URL must fit within 500 characters.");
const image = z.string().trim().max(500).refine(value =>
  !value || webUrl(value) || mediaKeyFromUrl(value) !== null ||
  (/^\/(?!\/)/.test(value) && !value.includes("..") && !/[\\\s?#]/.test(value) && !value.startsWith("/api/")),
  "Use a project image or a public image URL");
const requiredText = (max: number) => z.string().trim().min(1, "This field is required.").max(max, `Use at most ${max} characters.`);
const caption = z.string().trim().max(MAX_IMAGE_CAPTION, `Use at most ${MAX_IMAGE_CAPTION} characters.`).default("");
export const projectMediaInputSchema = z.object({
  version: z.literal(2),
  images: z.array(z.object({ url: image.refine(Boolean, "Choose an image."), captionEn: caption, captionSl: caption })).max(MAX_PROJECT_IMAGES),
  coverCaptionEn: caption,
  coverCaptionSl: caption,
  sourceVisibility: z.enum(["public", "closed", "unspecified"]).default("unspecified"),
});

export const projectInputSchema = z.object({
  slug: z.string().trim().max(120).optional(),
  titleEn: requiredText(200), titleSl: requiredText(200),
  summaryEn: requiredText(2000), summarySl: requiredText(2000),
  descriptionEn: requiredText(50000), descriptionSl: requiredText(50000),
  category: z.enum(PROJECT_CATEGORY_IDS),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  coverImage: image.optional().nullable(),
  gallery: z.union([z.array(image.refine(Boolean)).max(MAX_PROJECT_IMAGES), projectMediaInputSchema]).optional(),
  linkUrl: link.optional().nullable(), linkLabel: z.string().trim().max(100).optional().nullable(),
  repoUrl: link.optional().nullable(), featured: z.boolean().optional(),
}).superRefine((input, context) => {
  const slug = slugify(input.slug || input.titleEn);
  if (slug.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) context.addIssue({ code: "custom", path: ["slug"], message: "Use a slug containing letters, numbers and single hyphens." });
});

export type ProjectInput = z.infer<typeof projectInputSchema>;
export type ProjectFieldErrors = Record<string, string[]>;
export function projectFieldErrors(issues: readonly z.ZodIssue[]): ProjectFieldErrors {
  const fields: ProjectFieldErrors = {};
  const append = (entries: readonly z.ZodIssue[]) => {
    for (const issue of entries) {
      if (issue.code === "invalid_union") { for (const errors of issue.errors) append(errors); }
      else (fields[issue.path.map(String).join(".") || "form"] ??= []).push(issue.message);
    }
  };
  append(issues);
  return fields;
}

export function toProjectRow(input: ProjectInput) {
  const slug = slugify(input.slug || input.titleEn);
  if (slug.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Invalid slug");
  return {
    ...input, slug,
    tags: [...new Set(input.tags ?? [])],
    gallery: Array.isArray(input.gallery) ? [...new Set(input.gallery)] : input.gallery ?? [],
    coverImage: input.coverImage || "", linkUrl: input.linkUrl || "",
    linkLabel: input.linkLabel || "", repoUrl: input.repoUrl || "", featured: Boolean(input.featured),
  };
}

/** Bound authenticated editor requests before parsing, including chunked bodies. */
export async function readProjectJson(request: Request): Promise<{ ok: true; value: unknown } | { ok: false; status: 400 | 413 }> {
  const limit = 1024 * 1024;
  if (Number(request.headers.get("content-length")) > limit) return { ok: false, status: 413 };
  const reader = request.body?.getReader();
  if (!reader) return { ok: false, status: 400 };
  let size = 0, text = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); return { ok: false, status: 413 }; }
      text += decoder.decode(value, { stream: true });
    }
    return { ok: true, value: JSON.parse(text + decoder.decode()) as unknown };
  } catch { return { ok: false, status: 400 }; }
  finally { reader.releaseLock(); }
}
