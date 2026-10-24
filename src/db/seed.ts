/**
 * Seeds the database with example projects and services so the portfolio
 * looks alive on first deploy. Run after `npx drizzle-kit push`:
 *
 *   npx tsx src/db/seed.ts
 */
import { getDb } from "@/db";
import { projects, services } from "@/db/schema";


async function seed() {
  console.log("🌱 Seeding projects + services…");

  // Optional sample data: never delete existing projects or their comments.

  await getDb().insert(services).values([
    {
      slug: "websites",
      icon: "web",
      titleEn: "Websites & Web Apps",
      titleSl: "Spletne strani in aplikacije",
      descriptionEn:
        "Fast, accessible, SEO-friendly sites built with Next.js, Tailwind and modern tooling. From landing pages to full SaaS dashboards.",
      descriptionSl:
        "Hitre, dostopne in SEO-prijazne strani z Next.js, Tailwind in modernim orodjem. Od ciljnih strani do celih SaaS nadzornih plošč.",
      priceFrom: "€800",
      orderIndex: 1,
    },
    {
      slug: "mobile-apps",
      icon: "app",
      titleEn: "Mobile Apps",
      titleSl: "Mobilne aplikacije",
      descriptionEn:
        "Native and cross-platform Android apps — from prototype to Play Store. Kotlin, Jetpack Compose, Firebase, Room.",
      descriptionSl:
        "Native in cross-platform Android aplikacije — od prototipa do Play Store. Kotlin, Jetpack Compose, Firebase, Room.",
      priceFrom: "€1500",
      orderIndex: 2,
    },
    {
      slug: "ui-design",
      icon: "design",
      titleEn: "UI / UX Design",
      titleSl: "UI / UX oblikovanje",
      descriptionEn:
        "Beautiful interfaces, thoughtful flows, and design systems that scale. Figma, prototypes, handoff docs.",
      descriptionSl:
        "Lepi vmesniki, premišljeni tokovi in dizajn sistemi, ki rastejo s tabo. Figma, prototipi, dokumentacija.",
      priceFrom: "€500",
      orderIndex: 3,
    },
    {
      slug: "automation",
      icon: "zap",
      titleEn: "Automation & APIs",
      titleSl: "Avtomatizacija in API-ji",
      descriptionEn:
        "Custom integrations, internal tools and REST / GraphQL APIs that glue your stack together.",
      descriptionSl:
        "Integracije po meri, interna orodja in REST / GraphQL API-ji, ki povežejo tvoj sklad.",
      priceFrom: "€600",
      orderIndex: 4,
    },
  ]).onConflictDoNothing();

  await getDb().insert(projects).values([
    {
      slug: "taskflow-android",
      titleEn: "TaskFlow — Android productivity app",
      titleSl: "TaskFlow — Android aplikacija za produktivnost",
      summaryEn:
        "A minimalist to-do app with offline sync, widgets and Material You theming.",
      summarySl:
        "Minimalistična to-do aplikacija z offline sinhronizacijo, widgeti in Material You temo.",
      descriptionEn:
        "TaskFlow is a focused productivity companion for Android. It supports offline-first sync via Room + WorkManager, home-screen widgets, dynamic colour theming and a distraction-free UI.\n\nBuilt in Kotlin with Jetpack Compose and a modular architecture, it ships with 15+ unit tests and CI on GitHub Actions.",
      descriptionSl:
        "TaskFlow je osredotočen spremljevalec za produktivnost na Androidu. Podpira offline-first sinhronizacijo prek Room + WorkManager, widgete na domačem zaslonu, dinamično barvno temo in nevsiljiv vmesnik.\n\nZgrajen v Kotlinu z Jetpack Compose in modularno arhitekturo, dobavljen z 15+ unit testi in CI na GitHub Actions.",
      category: "android",
      tags: ["Kotlin", "Jetpack Compose", "Room", "Firebase"],
      linkUrl: "https://play.google.com/store",
      repoUrl: "https://github.com/",
      featured: true,
    },
    {
      slug: "lego-modular-city",
      titleEn: "Modular City Block",
      titleSl: "Modularni mestni blok",
      summaryEn:
        "A 5-building modular LEGO city block with working lights and a hidden tram line.",
      summarySl:
        "Modularni LEGO mestni blok s petimi stavbami, delujočimi lučkami in skrito tramvaj progo.",
      descriptionEn:
        "A 3-month build inspired by the LEGO Modular Buildings series. Includes a café, bookstore, cinema, apartments and a rooftop observatory.\n\nCustom lighting is wired through BrickLink-compatible LEDs with a single USB-C power supply.",
      descriptionSl:
        "Trimesečna gradnja, navdihnjena z LEGO Modular Buildings serijo. Vključuje kavarno, knjigarno, kino, stanovanja in observatorij na strehi.\n\nRazsvetljava po meri je speljana prek BrickLink-kompatibilnih LED diod z enim USB-C napajalnikom.",
      category: "lego",
      tags: ["LEGO", "Modular", "Lighting", "MOC"],
      gallery: [],
      featured: true,
    },
    {
      slug: "portfolio-starter",
      titleEn: "Open-source Portfolio Starter",
      titleSl: "Odprtokodni predloga za portfelj",
      summaryEn:
        "A Next.js 15 + Tailwind + Drizzle template for developer portfolios, bilingual-ready.",
      summarySl:
        "Next.js 15 + Tailwind + Drizzle predloga za razvijalce, pripravljena za dva jezika.",
      descriptionEn:
        "This very site is also an open-source starter template. It includes bilingual support (Slovene / English), password-protected file uploads, a Google Drive sync endpoint and commentable project pages.\n\nClone it, edit `src/lib/site.ts`, drop your projects in the DB and deploy.",
      descriptionSl:
        "Ta stran je tudi odprtokodna predloga. Vključuje dvojezično podporo (slovenščina / angleščina), z geslom zaščiteno nalaganje datotek, sinhronizacijo z Google Drive in strani projektov s komentarji.\n\nKloniraj, uredi `src/lib/site.ts`, dodaj projekte v bazo in objavi.",
      category: "web",
      tags: ["Next.js", "Tailwind", "Drizzle", "TypeScript"],
      linkUrl: "https://github.com/",
      repoUrl: "https://github.com/",
      featured: true,
    },
    {
      slug: "lego-medieval-castle",
      titleEn: "Medieval Castle MOC",
      titleSl: "Srednjeveški grad (MOC)",
      summaryEn:
        "A 2,400-piece medieval castle with drawbridge, siege tower and dungeon.",
      summarySl:
        "Srednjeveški grad z 2.400 delci, dvižnim mostom, oblegalnim stolpom in ječo.",
      descriptionEn:
        "My biggest LEGO MOC so far. The drawbridge is functional, the siege tower rolls on hidden wheels, and the dungeon includes a secret escape tunnel.\n\nDesigned in Stud.io, then built with parts from BrickLink.",
      descriptionSl:
        "Moj največji LEGO MOC doslej. Dvižni most deluje, oblegalni stolp se kotali na skritih kolesih, ječa pa vključuje skrivni pobeg.\n\nOblikovan v Stud.io, nato zgrajen iz delov z BrickLink.",
      category: "lego",
      tags: ["LEGO", "MOC", "Castle", "Stud.io"],
      featured: false,
    },
  ]).onConflictDoNothing();

  console.log("✅ Seed complete.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
