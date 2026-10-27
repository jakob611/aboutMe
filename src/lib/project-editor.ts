import type { projects } from "@/db/schema";
import { slugify } from "./utils";
import { normalizeProjectCategory, type ProjectCategory } from "./project-categories";
import { normalizeProjectMedia, type ProjectMediaDocument } from "./project-media";

export type AdminProject = Omit<typeof projects.$inferSelect, "createdAt"> & { createdAt: string };
export type ProjectEditorForm = {
  slug: string; titleEn: string; titleSl: string; summaryEn: string; summarySl: string;
  descriptionEn: string; descriptionSl: string; category: ProjectCategory; tags: string;
  coverImage: string; gallery: ProjectMediaDocument; linkUrl: string; linkLabel: string;
  repoUrl: string; featured: boolean;
};
export function emptyProjectForm(): ProjectEditorForm {
  return { slug: "", titleEn: "", titleSl: "", summaryEn: "", summarySl: "", descriptionEn: "", descriptionSl: "", category: "web", tags: "", coverImage: "", gallery: normalizeProjectMedia([]), linkUrl: "", linkLabel: "", repoUrl: "", featured: false };
}
export function projectFormFromRecord(project: AdminProject): ProjectEditorForm {
  return {
    slug: project.slug, titleEn: project.titleEn, titleSl: project.titleSl,
    summaryEn: project.summaryEn, summarySl: project.summarySl,
    descriptionEn: project.descriptionEn, descriptionSl: project.descriptionSl,
    category: normalizeProjectCategory(project.category), tags: (project.tags ?? []).join(", "),
    coverImage: project.coverImage ?? "", gallery: normalizeProjectMedia(project.gallery),
    linkUrl: project.linkUrl ?? "", linkLabel: project.linkLabel ?? "", repoUrl: project.repoUrl ?? "", featured: Boolean(project.featured),
  };
}
export function projectPayloadFromForm(form: ProjectEditorForm) {
  return { ...form, tags: form.tags.split(",").map(tag => tag.trim()).filter(Boolean) };
}

/** Keep suggesting a new slug until the owner supplies their own. */
export function updateProjectForm<K extends keyof ProjectEditorForm>(form: ProjectEditorForm, key: K, value: ProjectEditorForm[K], isNew: boolean): ProjectEditorForm {
  const next = { ...form, [key]: value };
  if (isNew && key === "titleEn" && (!form.slug || form.slug === slugify(form.titleEn))) next.slug = slugify(String(value));
  return next;
}

export const PROJECT_DRAFT_KEY = "admin-project-draft";
export const PROJECT_DRAFT_CLEAR_EVENT = "admin-project-draft-clear";
type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type ProjectDraft = { projectId: number | "new"; savedAt: number; form: ProjectEditorForm };
const DRAFT_AGE = 2 * 60 * 60 * 1000;

export function clearProjectDraft(storage: DraftStorage) {
  try { storage.removeItem(PROJECT_DRAFT_KEY); } catch { /* Storage can be disabled. */ }
}
export function saveProjectDraft(storage: DraftStorage, draft: ProjectDraft) {
  try {
    const raw = JSON.stringify(draft);
    if (raw.length > 500000) return false;
    storage.setItem(PROJECT_DRAFT_KEY, raw);
    return true;
  } catch { return false; }
}
export function readProjectDraft(storage: DraftStorage, now = Date.now()): ProjectDraft | null {
  try {
    const raw = storage.getItem(PROJECT_DRAFT_KEY);
    if (!raw) return null;
    if (raw.length > 500000) { clearProjectDraft(storage); return null; }
    const draft = JSON.parse(raw) as ProjectDraft;
    if ((draft.projectId !== "new" && (!Number.isSafeInteger(draft.projectId) || draft.projectId <= 0)) ||
      typeof draft.savedAt !== "number" || now < draft.savedAt || now - draft.savedAt > DRAFT_AGE || !validDraftForm(draft.form)) {
      clearProjectDraft(storage); return null;
    }
    return draft;
  } catch { clearProjectDraft(storage); return null; }
}
function validDraftForm(value: unknown): value is ProjectEditorForm {
  if (!value || typeof value !== "object") return false;
  const form = value as Record<string, unknown>;
  const fields = { slug: 120, titleEn: 200, titleSl: 200, summaryEn: 2000, summarySl: 2000, descriptionEn: 50000, descriptionSl: 50000, category: 60, tags: 1000, coverImage: 500, linkUrl: 500, linkLabel: 100, repoUrl: 500 };
  if (!Object.entries(fields).every(([key, max]) => typeof form[key] === "string" && form[key].length <= max) || typeof form.featured !== "boolean") return false;
  const gallery = form.gallery as ProjectMediaDocument | undefined;
  return Boolean(gallery?.version === 2 && Array.isArray(gallery.images) && gallery.images.length <= 30 &&
    ["public", "closed", "unspecified"].includes(gallery.sourceVisibility) &&
    [gallery.coverCaptionEn, gallery.coverCaptionSl].every(caption => typeof caption === "string" && caption.length <= 240) &&
    gallery.images.every(image => typeof image.url === "string" && image.url.length <= 500 && [image.captionEn, image.captionSl].every(caption => typeof caption === "string" && caption.length <= 240)));
}
