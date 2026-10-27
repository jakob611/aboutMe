import type { Lang } from "./i18n";

/** Public, editable labels; verification tokens and settings never enter content storage. */
export const contactVerificationCopy: Record<Lang, Record<string, string>> = {
  en: {
    "contact.verification.label": "Human verification",
    "contact.verification.pending": "Checking your browser…",
    "contact.verification.complete": "Verification complete.",
    "contact.verification.expired": "Verification expired. A new check is starting.",
    "contact.verification.error": "Verification could not load. Check your connection and reload, or use the email link below.",
    "contact.verification.required": "Please wait for verification before sending. If a check appears, complete it and try again.",
  },
  sl: {
    "contact.verification.label": "Preverjanje obiskovalca",
    "contact.verification.pending": "Preverjam brskalnik…",
    "contact.verification.complete": "Preverjanje je končano.",
    "contact.verification.expired": "Preverjanje je poteklo. Začenja se novo.",
    "contact.verification.error": "Preverjanja ni bilo mogoče naložiti. Preveri povezavo in osveži stran ali uporabi spodnjo e-poštno povezavo.",
    "contact.verification.required": "Pred pošiljanjem počakaj na preverjanje. Če se prikaže preverjanje, ga opravi in poskusi znova.",
  },
};
