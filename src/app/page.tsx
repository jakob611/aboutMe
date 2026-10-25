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
import { serviceOfferings } from "@/lib/service-offerings";
import { getDb } from "@/db";
import { projects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
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
      "Android apps, websites, and AI tools that take repetitive work off your hands. Here's where I can help.",
    serviceLink: "Explore services",
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
      "Android aplikacije, spletne strani in AI orodja, ki ti olajšajo ponavljajoče se delo. Pri tem ti lahko pomagam.",
    serviceLink: "Več o storitvah",
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
  const [projectResult] = await Promise.allSettled([loadProjects()]);
  const selectedProjects =
    projectResult.status === "fulfilled" ? projectResult.value : [];
  if (projectResult.status === "rejected")
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
        <div className="grid gap-4 md:grid-cols-3">
          {serviceOfferings[lang].map((service, i) => (
            <Reveal key={service.id} delay={i * 0.06}>
              <Link
                href={`/services#${service.id}`}
                className="service-preview surface-panel interactive-card"
              >
                <span className="section-label">0{i + 1}</span>
                <h3>{service.title}</h3>
                <p>{service.summary}</p>
                <ArrowUpRight size={21} aria-hidden="true" />
              </Link>
            </Reveal>
          ))}
        </div>
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
