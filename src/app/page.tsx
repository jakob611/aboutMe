import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Blocks,
  Code2,
  Smartphone,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { ProjectCard } from "@/components/ProjectCard";
import { WorkshopScene } from "@/components/WorkshopScene";
import { getLang } from "@/lib/lang";
import { siteConfig } from "@/lib/site";
import { getDb } from "@/db";
import { projects, services } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import type { Metadata } from "next";

const copy = {
  en: {
    eyebrow: "A personal workshop",
    title: ["Code, bricks,", "and the bits", "in between."],
    intro:
      "I'm Jakob. This is where I share the websites, Android projects and LEGO builds I'm working on—and the ideas behind them.",
    work: "Explore my work",
    contact: "Have an idea?",
    scroll: "A little further down",
    workLabel: "01 / The work",
    workTitle: "Things taking shape.",
    workIntro:
      "Projects, experiments and the lessons that come with making them.",
    all: "All projects",
    emptyTitle: "There's more on the workbench.",
    empty:
      "I'm putting this collection together. In the meantime, you can explore my public repositories on GitHub.",
    unavailable:
      "The project collection is temporarily unavailable. You can still explore my public work on GitHub.",
    github: "Find me on GitHub",
    servicesLabel: "02 / Working together",
    servicesTitle: "Got something in mind?",
    servicesIntro:
      "A website, an app, or something that doesn't quite fit a category. Start with what you want to make.",
    serviceLink: "Explore services",
    discuss: "Tell me about your idea",
    serviceEmpty:
      "No fixed packages here. Tell me what you're trying to do, who it's for, and what already exists. We can work out the next step from there.",
    aboutLabel: "03 / Behind the projects",
    aboutTitle: "Different materials. Same curiosity.",
    aboutText:
      "Some ideas start with a screen. Others start with a handful of bricks. This site brings both sides of making into one place.",
    aboutLink: "A little about me",
  },
  sl: {
    eyebrow: "Osebna delavnica",
    title: ["Koda, kocke", "in vse", "vmes."],
    intro:
      "Sem Jakob. Tukaj zbiram svoje spletne in Android projekte, LEGO stvaritve ter ideje, ki nastajajo ob njih.",
    work: "Razišči moje delo",
    contact: "Imaš idejo?",
    scroll: "Malo nižje je več",
    workLabel: "01 / Projekti",
    workTitle: "Ideje dobivajo obliko.",
    workIntro: "Projekti, poskusi in vse, kar se naučim med ustvarjanjem.",
    all: "Vsi projekti",
    emptyTitle: "Na delovni mizi nastaja še več.",
    empty:
      "Zbirko projektov še pripravljam. Medtem lahko moje javne repozitorije raziščeš na GitHubu.",
    unavailable:
      "Zbirka projektov trenutno ni dosegljiva. Moje javno delo lahko še vedno raziščeš na GitHubu.",
    github: "Najdeš me na GitHubu",
    servicesLabel: "02 / Sodelovanje",
    servicesTitle: "Kaj želiš ustvariti?",
    servicesIntro:
      "Spletno stran, aplikacijo ali nekaj, kar ne spada čisto v nobeno kategorijo. Začniva pri tvoji ideji.",
    serviceLink: "Več o storitvah",
    discuss: "Povej mi svojo idejo",
    serviceEmpty:
      "Brez vnaprej določenih paketov. Povej mi, kaj želiš narediti, komu je namenjeno in kaj že obstaja. Od tam lahko poiščeva naslednji korak.",
    aboutLabel: "03 / Za projekti",
    aboutTitle: "Različni materiali. Ista radovednost.",
    aboutText:
      "Nekatere ideje se začnejo pred zaslonom. Druge s pestjo kock. Ta stran združuje obe plati ustvarjanja.",
    aboutLink: "Nekaj o meni",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title:
      siteConfig.name +
      " — " +
      (lang === "sl" ? "Projekti in ideje" : "Projects & ideas"),
    description: copy[lang].intro,
  };
}

async function loadProjects() {
  const db = getDb();
  const selected = await db
    .select()
    .from(projects)
    .where(eq(projects.featured, true))
    .orderBy(desc(projects.createdAt))
    .limit(3);
  return selected.length
    ? selected
    : db.select().from(projects).orderBy(desc(projects.createdAt)).limit(3);
}

export default async function HomePage() {
  const lang = await getLang();
  const t = copy[lang];
  const [projectResult, serviceResult] = await Promise.allSettled([
    loadProjects(),
    (async () =>
      getDb()
        .select()
        .from(services)
        .orderBy(asc(services.orderIndex))
        .limit(3))(),
  ]);
  const selectedProjects =
    projectResult.status === "fulfilled" ? projectResult.value : [];
  const serviceRows =
    serviceResult.status === "fulfilled" ? serviceResult.value : [];
  if (
    projectResult.status === "rejected" ||
    serviceResult.status === "rejected"
  )
    console.error(
      "Home collection could not be loaded; check the database runtime configuration.",
    );

  return (
    <div>
      <section className="home-hero mx-auto max-w-7xl px-5 sm:px-8">
        <div className="home-hero-copy">
          <Reveal>
            <p className="section-label hero-eyebrow">
              <span className="status-mark" aria-hidden="true" />
              {siteConfig.name}
              <span className="hero-eyebrow-divider">/</span>
              {t.eyebrow}
            </p>
          </Reveal>
          <Reveal delay={0.06}>
            <h1 className="home-hero-title">
              {t.title.map((line, i) => (
                <span
                  key={line}
                  className={i === 2 ? "hero-title-accent" : undefined}
                >
                  {line}
                </span>
              ))}
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="home-hero-intro">{t.intro}</p>
          </Reveal>
          <Reveal delay={0.18}>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/projects" className="btn-primary">
                {t.work}
                <ArrowUpRight size={17} />
              </Link>
              <Link href="/contact" className="btn-ghost">
                {t.contact}
                <ArrowRight size={16} />
              </Link>
            </div>
          </Reveal>
          <a href="#selected-work" className="hero-scroll">
            <ArrowDown size={14} />
            {t.scroll}
          </a>
        </div>
        <Reveal delay={0.16} y={16} className="home-hero-visual">
          <WorkshopScene lang={lang} />
        </Reveal>
      </section>

      <section
        id="selected-work"
        className="section-rule home-work mx-auto max-w-7xl px-5 sm:px-8"
      >
        <div className="section-heading-row">
          <Reveal>
            <p className="section-label">{t.workLabel}</p>
            <h2 className="display-title mt-4">{t.workTitle}</h2>
            <p className="section-intro">{t.workIntro}</p>
          </Reveal>
          <Link href="/projects" className="link-arrow">
            {t.all}
            <ArrowUpRight size={17} />
          </Link>
        </div>
        {selectedProjects.length ? (
          <div className="grid gap-5 md:grid-cols-3">
            {selectedProjects.map((project, i) => (
              <Reveal key={project.id} delay={i * 0.07}>
                <ProjectCard project={project} lang={lang} />
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal>
            <div className="home-empty-work surface-panel">
              <div>
                <p className="section-label">
                  {lang === "sl" ? "V nastajanju" : "A collection in progress"}
                </p>
                <h3>{t.emptyTitle}</h3>
                <p>
                  {projectResult.status === "rejected"
                    ? t.unavailable
                    : t.empty}
                </p>
                <a
                  href={siteConfig.socials.github}
                  className="link-arrow"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t.github}
                  <ArrowUpRight size={16} />
                </a>
              </div>
              <div className="work-index" aria-hidden="true">
                <span>
                  <Code2 /> Web
                </span>
                <span>
                  <Smartphone /> Android
                </span>
                <span>
                  <Blocks /> LEGO
                </span>
              </div>
            </div>
          </Reveal>
        )}
      </section>

      <section className="section-rule home-services mx-auto max-w-7xl px-5 sm:px-8">
        <div className="section-heading-row">
          <Reveal>
            <p className="section-label">{t.servicesLabel}</p>
            <h2 className="display-title mt-4">{t.servicesTitle}</h2>
            <p className="section-intro">{t.servicesIntro}</p>
          </Reveal>
          <Link href="/services" className="link-arrow">
            {t.serviceLink}
            <ArrowUpRight size={17} />
          </Link>
        </div>
        {serviceRows.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            {serviceRows.map((service, i) => (
              <Reveal key={service.id} delay={i * 0.06}>
                <Link
                  href="/services"
                  className="service-preview surface-panel"
                >
                  <span className="section-label">0{i + 1}</span>
                  <h3>{lang === "sl" ? service.titleSl : service.titleEn}</h3>
                  <p>
                    {lang === "sl"
                      ? service.descriptionSl
                      : service.descriptionEn}
                  </p>
                  <ArrowUpRight size={21} aria-hidden="true" />
                </Link>
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal>
            <div className="home-inquiry surface-panel">
              <p>{t.serviceEmpty}</p>
              <Link href="/contact" className="btn-primary">
                {t.discuss}
                <ArrowUpRight size={17} />
              </Link>
            </div>
          </Reveal>
        )}
      </section>

      <section className="section-rule home-about mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <p className="section-label">{t.aboutLabel}</p>
          <div className="home-about-grid">
            <h2 className="display-title">{t.aboutTitle}</h2>
            <div>
              <p className="section-intro !mt-0">{t.aboutText}</p>
              <Link href="/about" className="link-arrow mt-6">
                {t.aboutLink}
                <ArrowUpRight size={17} />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
