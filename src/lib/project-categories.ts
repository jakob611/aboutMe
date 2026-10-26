import type { Lang } from "@/lib/i18n";

export const PROJECT_CATEGORY_IDS = [
  "android", "lego", "web", "3d-printing", "other",
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORY_IDS)[number];

const labels: Record<Lang, Record<ProjectCategory, string>> = {
  en: { android: "Android", lego: "LEGO", web: "Web", "3d-printing": "3D printing", other: "Other" },
  sl: { android: "Android", lego: "LEGO", web: "Splet", "3d-printing": "3D-tisk", other: "Drugo" },
};

export function getProjectCategoryLabels(lang: Lang): Record<ProjectCategory, string> {
  return labels[lang];
}

export function isProjectCategory(value: unknown): value is ProjectCategory {
  return typeof value === "string" && PROJECT_CATEGORY_IDS.includes(value as ProjectCategory);
}

/** Older/custom categories remain discoverable under Other. */
export function normalizeProjectCategory(value: string): ProjectCategory {
  return isProjectCategory(value) ? value : "other";
}

/** Preserve the display name of older/custom categories. */
export function projectCategoryLabel(value: string, lang: Lang): string {
  return isProjectCategory(value) ? labels[lang][value] : value;
}
