import { translations, type Lang, type Translation } from "./i18n";
import { serviceOfferings, servicePageCopy, type ServiceOffering } from "./service-offerings";
import { homeContentDefaults, homeSectionDefaults } from "./home-content-defaults";
import { publicCopyFields } from "./public-copy-defaults";
import { siteConfig } from "./site";
import { inquiryCategories } from "./inquiry-topics";
import { getProjectCategoryLabels, isProjectCategory } from "./project-categories";
import { contactVerificationCopy } from "./contact-verification-copy";

export type ContentValue = string | boolean;
export type ContentValues = Record<string, ContentValue>;
export type ContentField = { key: string; group: string; label: string; lang?: Lang; type: "text" | "url" | "email" | "boolean"; defaultValue: ContentValue; maxLength: number; optional?: boolean };
const fields: ContentField[] = [];
function fieldLabel(path: string) {
  return path.split(".").map(part => part.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/-/g, " ")).join(" · ");
}
function strings(value: unknown, prefix: string, group: string, lang: Lang) {
  if (typeof value === "string") fields.push({ key: prefix, group, lang, label: fieldLabel(prefix.split(".").slice(2).join(".")), type: "text", defaultValue: value, maxLength: 6000 });
  else if (value && typeof value === "object") for (const [key, child] of Object.entries(value)) {
    if (key !== "id") strings(child, `${prefix}.${key}`, group, lang);
  }
}
for (const lang of ["en", "sl"] as const) {
  for (const [section, values] of Object.entries(translations[lang])) {
    // The old Home translations no longer render the homepage. Its one reused
    // About button is registered separately below rather than exposing dead fields.
    if (section === "home") continue;
    strings(values, `i18n.${lang}.${section}`, section === "nav" || section === "common" || section === "brand" ? "Navigation & common labels" : section === "donate" ? "Support" : section[0].toUpperCase() + section.slice(1), lang);
  }
  for (const offering of serviceOfferings[lang]) strings(offering, `offering.${lang}.${offering.id}`, "Services", lang);
  strings(servicePageCopy[lang], `serviceCopy.${lang}`, "Services", lang);
  for (const [key, value] of Object.entries(homeContentDefaults[lang])) fields.push({ key: `${lang}.${key}`, group: key.startsWith("workshop.") ? "Sketchbook" : key.startsWith("gallery.") ? "Project gallery" : key.startsWith("projects.") ? "Projects" : "Home", lang, label: fieldLabel(key), type: "text", defaultValue: value, maxLength: 6000 });
  for (const [key, value] of Object.entries(contactVerificationCopy[lang])) fields.push({ key: `${lang}.${key}`, group: "Contact", lang, label: fieldLabel(key), type: "text", defaultValue: value, maxLength: 6000 });
}
for (const [key, value] of Object.entries(homeSectionDefaults)) fields.push({ key: `section.${key}`, group: "Section visibility", label: fieldLabel(key), type: "boolean", defaultValue: value, maxLength: 0 });
for (const key of ["about.interests", "about.skills", "about.gallery", "about.cv", "services.offerings", "services.process", "services.additional", "contact.prompts", "support.ways", "support.donations", "support.opensource", "files.downloads", "files.drive", "projects.comments"]) fields.push({ key: `section.${key}`, group: "Section visibility", label: fieldLabel(key), type: "boolean", defaultValue: true, maxLength: 0 });
for (const [key, value, type] of [
  ["name", "Jakob Tominc", "text"], ["tagline", "Android, web, LEGO & 3D printing projects", "text"], ["email", "", "email"], ["github", "https://github.com/jakob611", "url"], ["linkedin", "", "url"], ["instagram", "", "url"], ["twitter", "", "url"], ["buyMeACoffee", "", "url"], ["koFi", "https://ko-fi.com/jakobtominc", "url"],
] as const) fields.push({ key: `profile.${key}`, group: "Public profile & links", label: key, type, defaultValue: value, maxLength: type === "text" ? 240 : 2000, optional: key !== "name" && key !== "tagline" });
fields.push(...publicCopyFields.map(field => ({ ...field, group: field.group === "services" ? "Services" : field.group })));
for (const [key, en, sl] of [
  ["support.widget.button", "Support me", "Podpri me"],
  ["support.widget.title", "Support on Ko-fi", "Podpora na Ko-fi"],
  ["support.widget.close", "Close support panel", "Zapri podporno okno"],
  ["support.widget.fallback", "Panel not loading?", "Se okno ne naloži?"],
  ["support.widget.open", "Open Ko-fi", "Odpri Ko-fi"],
  ["layout.skip", "Skip to content", "Preskoči na vsebino"],
  ["about.work", "See my work", "Poglej moje delo"],
  ["about.galleryImage", "A detail from the workshop {number}", "Utrinek iz delavnice {number}"],
  ["projects.categoryLabel", "Project category", "Vrsta projekta"],
  ["projects.eyebrow", "Work & experiments", "Delo & poskusi"],
  ["projects.github", "GitHub", "GitHub"],
  ["projects.notFound", "Not found", "Ni najdeno"],
  ["projects.noComments", "No comments yet.", "Komentarjev še ni."],
  ["projects.searchLabel", "Search projects", "Išči po projektih"],
  ["projects.searchPlaceholder", "Title, tool, idea …", "Naslov, orodje, ideja …"],
  ["projects.clearSearch", "Clear search", "Počisti iskanje"],
  ["projects.showing", "Showing {shown} of {total}", "Prikazano: {shown} od {total}"],
  ["projects.emptyEyebrow", "Room for the next idea", "Prostor za nove ideje"],
  ["projects.noMatches", "Nothing matches this selection.", "Ni zadetkov za ta izbor."],
  ["projects.searchHint", "Try another search, or take a look at the full collection.", "Poskusi drug izraz ali si oglej vse projekte."],
  ["projects.emptyHint", "This is where apps, web projects and physical builds will have their own notes and images.", "Tukaj bodo zbrani opisi aplikacij, spletnih projektov in drugih izdelkov."],
  ["projects.clearFilters", "Clear filters", "Počisti filtre"],
  ["projects.contactIdea", "Talk about an idea", "Pogovoriva se o ideji"],
  ["projects.unavailableEyebrow", "Collection currently unavailable", "Zbirka trenutno ni dosegljiva"],
  ["projects.unavailableTitle", "The code is still on GitHub.", "Koda je še vedno na GitHubu."],
  ["projects.unavailableHint", "Project notes could not be loaded right now. You can still browse my repositories in the meantime.", "Opisov projektov trenutno ni mogoče naložiti. Medtem lahko pregledaš moje repozitorije."],
  ["projects.getInTouch", "Get in touch", "Stopi v stik"],
] as const) for (const lang of ["en", "sl"] as const) fields.push({ key: `${lang}.${key}`, group: key.startsWith("support") ? "Support" : key.startsWith("projects") ? "Projects" : key.startsWith("about") ? "About" : "Navigation & common labels", lang, label: en, type: "text", defaultValue: lang === "en" ? en : sl, maxLength: 240 });
for (const lang of ["en", "sl"] as const) for (const [category, label] of Object.entries(getProjectCategoryLabels(lang))) fields.push({ key: `${lang}.category.${category}`, group: "Project categories", lang, label: `Category · ${category}`, type: "text", defaultValue: label, maxLength: 48 });
for (const [index, value] of siteConfig.skills.entries()) fields.push({ key: `profile.skill.${index}`, group: "About", label: `Tool / skill ${index + 1}`, type: "text", defaultValue: value, optional: true, maxLength: 100 });
for (const [index, repo] of siteConfig.openSource.entries()) for (const [name, value] of Object.entries(repo)) fields.push({ key: `opensource.${index}.${name}`, group: "Support", label: `Open-source project ${index + 1} · ${name}`, type: name === "url" ? "url" : "text", defaultValue: value, optional: name === "url", maxLength: 2000 });
for (const lang of ["en", "sl"] as const) {
  for (const category of inquiryCategories) {
    fields.push({ key: `${lang}.inquiry.${category.id}`, group: "Contact topics", lang, label: category.label.en, type: "text", defaultValue: category.label[lang], maxLength: 120 });
    for (const topic of category.topics) fields.push({ key: `${lang}.inquiry.${category.id}.${topic.id}`, group: "Contact topics", lang, label: `${category.label.en} · ${topic.label.en}`, type: "text", defaultValue: topic.label[lang], maxLength: 120 });
  }
  for (const offering of serviceOfferings[lang]) fields.push({ key: `${lang}.price.${offering.id}`, group: "Services", lang, label: `${offering.title} · price / budget (optional)`, type: "text", defaultValue: "", optional: true, maxLength: 240 });
}
export const contentFields: readonly ContentField[] = fields;
const registry = new Map(fields.map(field => [field.key, field]));
if (registry.size !== fields.length) throw new Error("Duplicate public content field.");
export const CONTENT_MAX_BYTES = 256 * 1024;
export const defaultContentValues: ContentValues = Object.fromEntries(fields.map(field => [field.key, field.defaultValue]));
export function validateContentOverrides(input: unknown): ContentValues {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Content must be an object.");
  const result: ContentValues = {};
  for (const [key, value] of Object.entries(input)) {
    const field = registry.get(key);
    if (!field || ["__proto__", "constructor", "prototype"].includes(key)) throw new Error(`Unknown content field: ${key.slice(0, 100)}`);
    if (field.type === "boolean") { if (typeof value !== "boolean") throw new Error(`Choose on or off for ${field.label}.`); }
    else {
      if (typeof value !== "string" || value.length > field.maxLength || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new Error(`Invalid text for ${field.label}.`);
      if (!field.optional && !value.trim()) throw new Error(`${field.label} cannot be empty.`);
      if (field.type === "url" && value) { let url: URL; try { url = new URL(value); } catch { throw new Error(`Use a complete HTTPS URL for ${field.label}.`); } if (url.protocol !== "https:" || url.username || url.password) throw new Error(`Use a public HTTPS URL for ${field.label}.`); }
      if (field.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error("Use a valid public email address.");
    }
    result[key] = value as ContentValue;
  }
  return result;
}
function overlay<T>(value: T, prefix: string, values: ContentValues): T {
  if (typeof value === "string") return (values[prefix] ?? value) as T;
  if (Array.isArray(value)) return value.map((child, index) => overlay(child, `${prefix}.${index}`, values)) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, key === "id" ? child : overlay(child, `${prefix}.${key}`, values)])) as T;
  return value;
}
export function createSiteContent(overrides: ContentValues = {}) {
  const values = { ...defaultContentValues, ...overrides };
  return {
    overrides,
    values,
    text(lang: Lang, key: string, fallback = "") { const value = values[`${lang}.${key}`]; return typeof value === "string" ? value : fallback; },
    section(key: string) { return values[`section.${key}`] !== false; },
    categoryLabel(lang: Lang, category: string) { return isProjectCategory(category) ? String(values[`${lang}.category.${category}`]) : category; },
    skills() { return siteConfig.skills.map((_, index) => String(values[`profile.skill.${index}`])).filter(Boolean); },
    openSource() { return siteConfig.openSource.map((repo, index) => overlay(repo, `opensource.${index}`, values)).filter(repo => repo.url); },
    price(lang: Lang, id: ServiceOffering["id"]) { return String(values[`${lang}.price.${id}`] ?? ""); },
    hasPriceOverride(lang: Lang, id: ServiceOffering["id"]) { return Object.hasOwn(overrides, `${lang}.price.${id}`); },
    inquiryLabel(lang: Lang, category: string, topic?: string) { return String(values[`${lang}.inquiry.${category}${topic ? `.${topic}` : ""}`] ?? ""); },
    translation(lang: Lang): Translation { return overlay(translations[lang], `i18n.${lang}`, values); },
    serviceOfferings(lang: Lang): readonly ServiceOffering[] { return serviceOfferings[lang].map(offering => overlay(offering, `offering.${lang}.${offering.id}`, values)); },
    servicePageCopy(lang: Lang) { return overlay(servicePageCopy[lang], `serviceCopy.${lang}`, values); },
    profile() { return { name: String(values["profile.name"]), tagline: String(values["profile.tagline"]), email: String(values["profile.email"]), github: String(values["profile.github"]), linkedin: String(values["profile.linkedin"]), instagram: String(values["profile.instagram"]), twitter: String(values["profile.twitter"]), buyMeACoffee: String(values["profile.buyMeACoffee"]), koFi: String(values["profile.koFi"]) }; },
  };
}
export type SiteContent = ReturnType<typeof createSiteContent>;

/** JSON embedded in an HTML script must not contain an HTML closing tag. */
export function serializeSiteStructuredData(value: Record<string, unknown>): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
