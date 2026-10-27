import { CONTENT_MAX_BYTES, contentFields, migrateRetiredContentFields, type ContentValues } from "./site-content";

export const SITE_CONTENT_DRAFT_KEY = "admin-site-content-draft";
export const SITE_CONTENT_DRAFT_CLEAR_EVENT = "admin-site-content-draft-clear";
export const SITE_CONTENT_DRAFT_TTL = 2 * 60 * 60 * 1000;
type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type SiteContentDraft = { version: 1; savedAt: number; baseRevision: string | null; overrides: ContentValues };
const fields = new Map(contentFields.map(field => [field.key, field]));

/** Drafts may contain incomplete URLs or temporarily empty required text. They
 * still accept only bounded public fields; publishing performs full validation. */
function draftValues(input: unknown): ContentValues {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid draft fields.");
  const values: ContentValues = {};
  for (const [key, value] of Object.entries(input)) {
    const field = fields.get(key);
    if (!field || (field.type === "boolean" ? typeof value !== "boolean" : typeof value !== "string" || value.length > field.maxLength || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))) throw new Error("Invalid public draft field.");
    values[key] = value as string | boolean;
  }
  return values;
}
function validateDraft(value: unknown, migrate = false): SiteContentDraft {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some(key => !["version", "savedAt", "baseRevision", "overrides"].includes(key))) throw new Error("Invalid draft.");
  const draft = value as SiteContentDraft;
  if (draft.version !== 1 || !Number.isSafeInteger(draft.savedAt) || draft.savedAt < 0 || (draft.baseRevision !== null && (typeof draft.baseRevision !== "string" || !/^[a-f0-9]{32}(?:-\d+)?$/.test(draft.baseRevision)))) throw new Error("Invalid draft metadata.");
  return { version: 1, savedAt: draft.savedAt, baseRevision: draft.baseRevision, overrides: draftValues(migrate ? migrateRetiredContentFields(draft.overrides) : draft.overrides) };
}
export function clearSiteContentDraft(storage: DraftStorage) {
  try { storage.removeItem(SITE_CONTENT_DRAFT_KEY); } catch { /* Storage can be disabled. */ }
}
export function saveSiteContentDraft(storage: DraftStorage, draft: Omit<SiteContentDraft, "savedAt"> & { savedAt?: number }): boolean {
  try {
    const raw = JSON.stringify(validateDraft({ ...draft, savedAt: draft.savedAt ?? Date.now() }));
    if (new TextEncoder().encode(raw).byteLength > CONTENT_MAX_BYTES) return false;
    storage.setItem(SITE_CONTENT_DRAFT_KEY, raw);
    return true;
  } catch { return false; }
}
export function readSiteContentDraft(storage: DraftStorage, now = Date.now()): SiteContentDraft | null {
  try {
    const raw = storage.getItem(SITE_CONTENT_DRAFT_KEY);
    if (!raw) return null;
    if (raw.length > CONTENT_MAX_BYTES || new TextEncoder().encode(raw).byteLength > CONTENT_MAX_BYTES) throw new Error("Draft too large.");
    const draft = validateDraft(JSON.parse(raw), true);
    if (now < draft.savedAt || now - draft.savedAt > SITE_CONTENT_DRAFT_TTL) throw new Error("Draft expired.");
    return draft;
  } catch { clearSiteContentDraft(storage); return null; }
}
