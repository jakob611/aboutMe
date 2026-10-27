import type { Lang } from "./i18n";

export const MAX_PROJECT_IMAGES = 30;
export const MAX_IMAGE_CAPTION = 240;
export type SourceVisibility = "public" | "closed" | "unspecified";
export type ProjectImage = { url: string; captionEn: string; captionSl: string };
export type ProjectMediaDocument = {
  version: 2;
  images: ProjectImage[];
  coverCaptionEn: string;
  coverCaptionSl: string;
  sourceVisibility: SourceVisibility;
};
// This existing JSONB column holds legacy URLs or a versioned presentation envelope.
export type ProjectGallery = string[] | ProjectMediaDocument;

export function normalizeProjectMedia(value: unknown): ProjectMediaDocument {
  const document = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
  const entries = Array.isArray(value) ? value : document?.version === 2 && Array.isArray(document.images) ? document.images : [];
  const images = entries.flatMap((entry): ProjectImage[] => {
    if (typeof entry === "string") return [{ url: entry, captionEn: "", captionSl: "" }];
    if (!entry || typeof entry !== "object" || typeof entry.url !== "string") return [];
    return [{ url: entry.url, captionEn: typeof entry.captionEn === "string" ? entry.captionEn : "", captionSl: typeof entry.captionSl === "string" ? entry.captionSl : "" }];
  });
  return {
    version: 2, images,
    coverCaptionEn: typeof document?.coverCaptionEn === "string" ? document.coverCaptionEn : "",
    coverCaptionSl: typeof document?.coverCaptionSl === "string" ? document.coverCaptionSl : "",
    sourceVisibility: document?.sourceVisibility === "closed" || document?.sourceVisibility === "public" ? document.sourceVisibility : "unspecified",
  };
}

export function projectImageCaption(image: Pick<ProjectImage, "captionEn" | "captionSl">, lang: Lang) {
  return lang === "sl" ? image.captionSl : image.captionEn;
}

export function projectSourceVisibility(gallery: unknown, repoUrl?: string | null): SourceVisibility {
  return normalizeProjectMedia(gallery).sourceVisibility === "closed" ? "closed" : repoUrl?.trim() ? "public" : "unspecified";
}

/** Use before any public client props/API response, not just when rendering links. */
export function serializePublicProject<T extends { gallery?: unknown; repoUrl?: string | null; galleryImages?: unknown; coverCaptionEn?: unknown; coverCaptionSl?: unknown; sourceVisibility?: unknown }>(project: T) {
  // Public DTOs deliberately retain a flat gallery for old clients. Recognize
  // their matching caption metadata so another serialization does not erase it.
  const urls = project.gallery;
  const images = project.galleryImages;
  const alreadyPublic = Array.isArray(urls) && Array.isArray(images) && images.length === urls.length &&
    images.every((image, index) => image && typeof image === "object" && image.url === urls[index] && typeof image.captionEn === "string" && typeof image.captionSl === "string") &&
    typeof project.coverCaptionEn === "string" && typeof project.coverCaptionSl === "string" &&
    ["public", "closed", "unspecified"].includes(String(project.sourceVisibility));
  const media = normalizeProjectMedia(alreadyPublic ? { version: 2, images, coverCaptionEn: project.coverCaptionEn, coverCaptionSl: project.coverCaptionSl, sourceVisibility: project.sourceVisibility } : project.gallery);
  const sourceVisibility: SourceVisibility = media.sourceVisibility === "closed" ? "closed" : project.repoUrl?.trim() ? "public" : "unspecified";
  return {
    ...project,
    gallery: media.images.map(image => image.url),
    galleryImages: media.images,
    coverCaptionEn: media.coverCaptionEn,
    coverCaptionSl: media.coverCaptionSl,
    sourceVisibility,
    repoUrl: sourceVisibility === "closed" ? null : project.repoUrl,
  };
}

export function moveProjectImage(images: ProjectImage[], from: number, to: number) {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= images.length || to >= images.length) return images;
  const result = [...images];
  const [image] = result.splice(from, 1);
  result.splice(to, 0, image);
  return result;
}

/** Older editors sending URL arrays must not erase newer captions/source metadata. */
export function projectGalleryForUpdate(next: ProjectGallery | undefined, previous: unknown): ProjectGallery {
  if (next === undefined) return Array.isArray(previous) ? previous.filter((url): url is string => typeof url === "string") : normalizeProjectMedia(previous);
  if (!Array.isArray(next) || Array.isArray(previous) || !previous) return next;
  const existing = normalizeProjectMedia(previous);
  return { ...existing, images: next.map(url => existing.images.find(image => image.url === url) ?? { url, captionEn: "", captionSl: "" }) };
}
