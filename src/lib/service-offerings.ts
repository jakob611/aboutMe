import type { Lang } from "@/lib/i18n";

export type ServiceOffering = {
  id: "android" | "web" | "automation";
  title: string;
  summary: string;
  description: string;
  includes: readonly string[];
  example: string;
  inquiry: string;
};

export function coreServiceIdFromSlug(
  slug: string,
): ServiceOffering["id"] | undefined {
  const normalized = slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const aliases: Record<string, ServiceOffering["id"]> = {
    android: "android",
    app: "android",
    apps: "android",
    mobile: "android",
    "mobile-apps": "android",
    "android-apps": "android",
    "android-development": "android",
    "android-app-development": "android",
    web: "web",
    website: "web",
    websites: "web",
    "web-development": "web",
    "websites-web-apps": "web",
    ai: "automation",
    automation: "automation",
    "ai-automation": "automation",
    "ai-and-automation": "automation",
  };
  return Object.hasOwn(aliases, normalized) ? aliases[normalized] : undefined;
}

// These describe the work visitors can ask about, not completed client projects.
// Keep this core catalog available even when the optional database list is empty.
export const serviceOfferings = {
  en: [
    {
      id: "android",
      title: "Android app development",
      summary:
        "New apps, working prototypes, and improvements to existing Android projects.",
      description:
        "A useful Android app starts with a clear job to do. I can help turn your idea into screens, connected data, and a version you can put on a device and try.",
      includes: [
        "App screens, navigation, and interface improvements",
        "Local data, API connections, and account features where needed",
        "Fixes, testing, and preparation for a test build or release",
      ],
      example:
        "A small app for recording a routine, keeping track of information, or making an everyday task easier.",
      inquiry: "Discuss an Android app",
    },
    {
      id: "web",
      title: "Web development",
      summary:
        "Personal websites, business pages, and web apps with the functions you actually need.",
      description:
        "From a straightforward website to a tool with forms, accounts, or a dashboard. The structure and features should fit your content and the people using it.",
      includes: [
        "Responsive pages that work on phones and larger screens",
        "Forms, databases, content management, and integrations",
        "Improvements to an existing site's layout, speed, or usability",
      ],
      example:
        "A website that explains your work clearly and lets you update projects or receive enquiries without editing code.",
      inquiry: "Discuss a website",
    },
    {
      id: "automation",
      title: "AI & automation",
      summary:
        "Less repetitive work: connect your tools and use AI where it makes a task easier.",
      description:
        "Start with the task you keep doing by hand. We can look at what can follow a clear rule, where AI might help, and which decisions should stay with you.",
      includes: [
        "Connections between forms, spreadsheets, APIs, and other tools",
        "Help with sorting, extracting, or summarising information",
        "Drafts and assisted workflows with a clear review step",
      ],
      example:
        "An enquiry form that organises incoming messages and prepares a draft reply for you to review.",
      inquiry: "Discuss an automation",
    },
  ],
  sl: [
    {
      id: "android",
      title: "Razvoj Android aplikacij",
      summary:
        "Nove aplikacije, delujoči prototipi in izboljšave obstoječih Android projektov.",
      description:
        "Uporabna Android aplikacija se začne z jasnim namenom. Pomagam ti lahko idejo pretvoriti v zaslone, povezane podatke in različico, ki jo lahko namestiš na napravo in preizkusiš.",
      includes: [
        "Zasloni aplikacije, navigacija in izboljšave vmesnika",
        "Lokalni podatki, povezave z API-ji in uporabniški računi po potrebi",
        "Popravki, preizkušanje in priprava testne ali končne različice",
      ],
      example:
        "Manjša aplikacija za beleženje rutine, urejanje podatkov ali poenostavitev vsakodnevnega opravila.",
      inquiry: "Pogovor o Android aplikaciji",
    },
    {
      id: "web",
      title: "Spletni razvoj",
      summary:
        "Osebne in poslovne spletne strani ter spletne aplikacije s funkcijami, ki jih potrebuješ.",
      description:
        "Od preproste predstavitvene strani do orodja z obrazci, računi ali nadzorno ploščo. Zgradba in funkcije naj sledijo tvoji vsebini in ljudem, ki bodo stran uporabljali.",
      includes: [
        "Prilagodljive strani za telefone in večje zaslone",
        "Obrazci, podatkovne zbirke, urejanje vsebine in povezave z drugimi orodji",
        "Izboljšave postavitve, hitrosti ali uporabnosti obstoječe strani",
      ],
      example:
        "Spletna stran, ki jasno predstavi tvoje delo ter omogoča urejanje projektov in prejemanje povpraševanj brez poseganja v kodo.",
      inquiry: "Pogovor o spletni strani",
    },
    {
      id: "automation",
      title: "AI in avtomatizacija",
      summary:
        "Manj ponavljajočega dela: povezave med orodji in pomoč umetne inteligence tam, kjer je uporabna.",
      description:
        "Začneva pri opravilu, ki ga vedno znova delaš ročno. Pogledava, kaj lahko sledi jasnim pravilom, kje bi pomagala umetna inteligenca in katere odločitve naj ostanejo pri tebi.",
      includes: [
        "Povezave med obrazci, preglednicami, API-ji in drugimi orodji",
        "Pomoč pri razvrščanju, izluščevanju ali povzemanju informacij",
        "Osnutki in podprti delovni postopki z jasnim korakom za pregled",
      ],
      example:
        "Obrazec za povpraševanje, ki uredi prejeta sporočila in pripravi osnutek odgovora, da ga lahko pregledaš.",
      inquiry: "Pogovor o avtomatizaciji",
    },
  ],
} as const satisfies Record<Lang, readonly ServiceOffering[]>;

export const servicePageCopy = {
  en: {
    coreLabel: "What I can help with",
    includes: "What that can include",
    example: "A possible starting point",
    details: "More about this service",
    detailsPricing: "Details & pricing",
    scope:
      "A new project or one part of an existing one: both are a good place to start. Scope, price, and any ongoing costs are agreed before the work begins.",
    additionalTitle: "Other services",
    additionalIntro: "More specific ways we can work together.",
    workingLabel: "From conversation to something you can try",
    closing:
      "Tell me what you need it to do, who will use it, and what you already have. A short description or a reference link is enough for a first conversation.",
  },
  sl: {
    coreLabel: "Pri čem lahko pomagam",
    includes: "Kaj lahko to vključuje",
    example: "Možno izhodišče",
    details: "Več o tej storitvi",
    detailsPricing: "Podrobnosti in cene",
    scope:
      "Nov projekt ali samo del obstoječega: oboje je dobro izhodišče. O obsegu, ceni in morebitnih tekočih stroških se dogovoriva pred začetkom dela.",
    additionalTitle: "Druge storitve",
    additionalIntro: "Še nekaj bolj specifičnih možnosti za sodelovanje.",
    workingLabel: "Od pogovora do preizkusa",
    closing:
      "Povej, kaj naj rešitev naredi, komu je namenjena in kaj že imaš. Za prvi pogovor zadošča kratek opis ali povezava do primera.",
  },
} as const;
