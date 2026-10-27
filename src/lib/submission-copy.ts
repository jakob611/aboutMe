import type { Lang } from "./i18n";

/** Public disclosures and verification feedback, also editable in Site content. */
export const submissionCopy: Record<Lang, Record<string, string>> = {
  en: {
    "submission.privacy": "For spam prevention, an IP identifier and approximate location are stored with new submissions and are visible only to the site admin.",
    "comments.verification.label": "Human verification",
    "comments.verification.pending": "Checking your browser…",
    "comments.verification.complete": "Verification complete.",
    "comments.verification.expired": "Verification expired. Please wait for a new check.",
    "comments.verification.error": "Verification could not load. Please refresh and try again.",
    "comments.verification.required": "Verification was not accepted. Please wait for a new check and try again.",
    "comments.unavailable": "Comment posting is currently unavailable. Please check back soon.",
    "comments.latest": "Showing the latest 200 comments.",
    "comments.refreshDelay": "Your comment was accepted. Public updates may take a little longer; please do not submit it again.",
  },
  sl: {
    "submission.privacy": "Zaradi preprečevanja neželenih objav se ob novih sporočilih shrani oznaka naslova IP in približna lokacija. Vidi ju le skrbnik strani.",
    "comments.verification.label": "Preverjanje obiskovalca",
    "comments.verification.pending": "Preverjanje brskalnika…",
    "comments.verification.complete": "Preverjanje je zaključeno.",
    "comments.verification.expired": "Preverjanje je poteklo. Počakaj na novo preverjanje.",
    "comments.verification.error": "Preverjanja ni bilo mogoče naložiti. Osveži stran in poskusi znova.",
    "comments.verification.required": "Preverjanje ni bilo sprejeto. Počakaj na novo preverjanje in poskusi znova.",
    "comments.unavailable": "Objavljanje komentarjev trenutno ni na voljo. Poskusi znova pozneje.",
    "comments.latest": "Prikazanih je zadnjih 200 komentarjev.",
    "comments.refreshDelay": "Komentar je bil sprejet. Javna objava lahko traja nekoliko dlje; ne pošiljaj ga znova.",
  },
};
