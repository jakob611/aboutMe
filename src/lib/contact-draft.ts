/** One-use, per-tab handoff for an explicit language switch, never an autosave. */
export const LANGUAGE_CHANGE_EVENT = "site:language-change";
const DRAFT_KEY = "contact-language-handoff";
const MAX_AGE = 5 * 60 * 1000;

export type ContactDraft = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function route(url: string) {
  const target = new URL(url);
  target.searchParams.delete("lang");
  return target.pathname + target.search + target.hash;
}

function validDraft(value: unknown): value is ContactDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  return Object.entries({ name: 120, email: 200, subject: 200, message: 10000 })
    .every(([key, limit]) => typeof draft[key] === "string" && draft[key].length <= limit);
}

export function saveContactDraft(storage: DraftStorage, href: string, draft: ContactDraft, now = Date.now()) {
  try {
    storage.removeItem(DRAFT_KEY);
    if (validDraft(draft)) {
      storage.setItem(DRAFT_KEY, JSON.stringify({ route: route(href), at: now, draft }));
    }
  } catch {
    // Storage may be disabled. Language navigation must still work.
  }
}

export function takeContactDraft(storage: DraftStorage, href: string, now = Date.now()): ContactDraft | null {
  try {
    const raw = storage.getItem(DRAFT_KEY);
    storage.removeItem(DRAFT_KEY);
    if (!raw || raw.length > 65000) return null;
    const handoff = JSON.parse(raw);
    const age = now - handoff.at;
    return handoff.route === route(href) && Number.isFinite(age) && age >= 0 && age <= MAX_AGE && validDraft(handoff.draft)
      ? handoff.draft
      : null;
  } catch {
    return null;
  }
}
