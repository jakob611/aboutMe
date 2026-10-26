import type { Lang } from "./i18n";

const label = (en: string, sl: string) => ({ en, sl });
export const inquiryCategories = [
  { id: "web", label: label("Websites & web apps", "Spletne strani in aplikacije"), topics: [
    { id: "development", label: label("Web development", "Spletni razvoj") },
    { id: "design", label: label("Web design", "Oblikovanje spletne strani") },
    { id: "maintenance", label: label("Maintenance & ongoing support", "Vzdrževanje in stalna podpora") },
    { id: "improvements", label: label("Fixes & improvements", "Popravki in izboljšave") },
  ] },
  { id: "apps", label: label("Apps", "Aplikacije"), topics: [
    { id: "android", label: label("Android app development", "Razvoj Android aplikacije") },
    { id: "prototype", label: label("App idea or prototype", "Ideja ali prototip aplikacije") },
    { id: "maintenance", label: label("Maintenance & ongoing support", "Vzdrževanje in stalna podpora") },
    { id: "improvements", label: label("Fixes & improvements", "Popravki in izboljšave") },
  ] },
  { id: "3d", label: label("3D printing ideas", "Ideje za 3D tisk"), topics: [
    { id: "printing", label: label("Discuss a print", "Povpraševanje o tisku") },
    { id: "model", label: label("Model or prototype idea", "Ideja za model ali prototip") },
  ] },
  { id: "lego", label: label("LEGO ideas", "LEGO ideje"), topics: [
    { id: "build", label: label("Build idea", "Ideja za sestavljanje") },
    { id: "collaboration", label: label("Creative collaboration", "Ustvarjalno sodelovanje") },
  ] },
  { id: "projects", label: label("An existing project", "Obstoječi projekt"), topics: [
    { id: "question", label: label("Project question", "Vprašanje o projektu") },
    { id: "bug", label: label("Report a problem", "Prijava težave") },
    { id: "support", label: label("Support or further development", "Podpora ali nadaljnji razvoj") },
  ] },
  { id: "automation", label: label("AI & automation", "AI in avtomatizacija"), topics: [
    { id: "workflow", label: label("Workflow automation", "Avtomatizacija delovnega postopka") },
    { id: "integration", label: label("AI or tool integration", "Povezava AI ali drugih orodij") },
    { id: "maintenance", label: label("Maintenance & ongoing support", "Vzdrževanje in stalna podpora") },
  ] },
  { id: "other", label: label("Other", "Drugo"), topics: [] },
] as const;

export type InquiryCategory = typeof inquiryCategories[number]["id"];
export type InquirySelection = { category: InquiryCategory | ""; topic: string; customSubject: string };
export const emptyInquiry: InquirySelection = { category: "", topic: "", customSubject: "" };
export function findInquiryCategory(value: string) {
  return inquiryCategories.find((category) => category.id === value);
}
export function isInquiryTopic(category: string, topic: string): boolean {
  return topic === "other" || Boolean(findInquiryCategory(category)?.topics.some((item) => item.id === topic));
}
export function needsCustomSubject(selection: InquirySelection): boolean {
  return selection.category === "other" || selection.topic === "other";
}
export function validInquiry(selection: InquirySelection): boolean {
  return Boolean(findInquiryCategory(selection.category)) &&
    (selection.category === "other" || isInquiryTopic(selection.category, selection.topic)) &&
    (!needsCustomSubject(selection) || Boolean(selection.customSubject.trim()));
}
export function inquirySubject(selection: InquirySelection, lang: Lang): string {
  const category = findInquiryCategory(selection.category);
  if (!category) return "";
  if (needsCustomSubject(selection)) return `${category.label[lang]}: ${selection.customSubject.trim()}`.slice(0, 200);
  const topic = category.topics.find((item) => item.id === selection.topic);
  return topic ? `${category.label[lang]}: ${topic.label[lang]}` : "";
}

export function inquiryFromQuery(params: { category?: string | string[]; topic?: string | string[]; subject?: string | string[] }): InquirySelection {
  const category = typeof params.category === "string" ? findInquiryCategory(params.category) : undefined;
  const subject = typeof params.subject === "string" ? params.subject.trim().slice(0, 160) : "";
  if (category) return {
    category: category.id,
    topic: category.id === "other" ? "" : typeof params.topic === "string" && isInquiryTopic(category.id, params.topic) ? params.topic : "",
    customSubject: subject,
  };
  if (!subject) return { ...emptyInquiry };
  const normalized = subject.toLowerCase();
  const known: [RegExp, InquiryCategory, string][] = [
    [/^(android(?: app development| apps)?|apps?|razvoj android aplikacij)$/, "apps", "android"],
    [/^(web(?: development)?|websites?|spletni razvoj|spletne strani)$/, "web", "development"],
    [/^(ai(?: &| and)? automation|ai in avtomatizacija|automation|avtomatizacija)$/, "automation", "workflow"],
    [/^(3d(?: printing| tisk)?)$/, "3d", "printing"],
    [/^lego(?: ideas| ideje)?$/, "lego", "build"],
  ];
  const match = known.find(([pattern]) => pattern.test(normalized));
  return match ? { category: match[1], topic: match[2], customSubject: "" } : { category: "other", topic: "", customSubject: subject };
}

export function serviceInquiryHref(id: "android" | "web" | "automation" | "printing", support = false) {
  const selection = { android: "apps&topic=android", web: "web&topic=development", automation: "automation&topic=workflow", printing: "3d&topic=printing" };
  if (support && id !== "printing") return `/contact?category=${id === "android" ? "apps" : id}&topic=maintenance`;
  return `/contact?category=${selection[id]}`;
}
