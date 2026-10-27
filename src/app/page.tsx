import Link from "next/link";
import { FragmentLink } from "@/components/FragmentLink";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { WorkshopScene } from "@/components/WorkshopScene";
import { getLang } from "@/lib/lang";
import { loadWorkshopProjects } from "@/lib/workshop-projects";
import { homeContentDefaults } from "@/lib/home-content-defaults";
import { getSiteContent } from "@/lib/site-content-server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const content = await getSiteContent();
  return {
    title:
      content.profile().name +
      " — " +
      content.text(lang, "home.metadataTitle"),
    description: content.text(lang, "home.intro"),
  };
}

export default async function HomePage() {
  const lang = await getLang();
  const content = await getSiteContent();
  const resolved = Object.fromEntries(Object.keys(homeContentDefaults[lang]).map(key => [key, content.text(lang, key)]));
  const t = (key: string) => resolved["home." + key];
  const [workshopResult] = await Promise.allSettled([loadWorkshopProjects(lang)]);
  if (workshopResult.status === "rejected") console.error("Recent sketchbook projects could not be loaded.");
  return (
    <div>
      {content.section("home.hero") && <section className="home-hero mx-auto max-w-7xl px-5 sm:px-8">
        <div className="home-hero-copy">
          <Reveal>
            <p className="section-label hero-eyebrow">
              <span className="status-mark" aria-hidden="true" />
              {content.profile().name}
              <span className="hero-eyebrow-divider">/</span>
              {t("eyebrow")}
            </p>
          </Reveal>
          <Reveal delay={0.06}>
            <h1 className="home-hero-title">
              {[t("titleLine1"), t("titleLine2"), t("titleLine3")].map((line, i) => (
                <span
                  key={i}
                  className={i === 2 ? "hero-title-accent" : undefined}
                >
                  {line}
                </span>
              ))}
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="home-hero-intro">{t("intro")}</p>
          </Reveal>
          <Reveal delay={0.18}>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/projects" className="btn-primary">
                {t("work")}
                <ArrowUpRight size={17} />
              </Link>
              <Link href="/contact" className="btn-ghost">
                {t("contact")}
                <ArrowRight size={16} />
              </Link>
            </div>
          </Reveal>
          {(content.section("home.services") || content.section("home.about")) && <FragmentLink href={content.section("home.services") ? "#services" : "#about"} className="hero-scroll">
            <ArrowDown size={14} />
            {t("scroll")}
          </FragmentLink>}
        </div>
        <Reveal delay={0.16} y={16} className="home-hero-visual">
          <WorkshopScene lang={lang} projects={workshopResult.status === "fulfilled" ? workshopResult.value : []} copy={resolved} />
        </Reveal>
      </section>}

      {content.section("home.services") && <section id="services" className="section-rule home-services mx-auto max-w-7xl px-5 sm:px-8">
        <div className="section-heading-row">
          <Reveal>
            <p className="section-label">{t("servicesLabel")}</p>
            <h2 className="display-title mt-4">{t("servicesTitle")}</h2>
            <p className="section-intro">{t("servicesIntro")}</p>
          </Reveal>
          <Link href="/services" className="link-arrow">
            {t("serviceLink")}
            <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {content.serviceOfferings(lang).map((service, i) => (
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
      </section>}

      {content.section("home.about") && <section id="about" className="section-rule home-about mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <p className="section-label">{t("aboutLabel")}</p>
          <div className="home-about-grid">
            <h2 className="display-title">{t("aboutTitle")}</h2>
            <div>
              <p className="section-intro !mt-0">{t("aboutText")}</p>
              <Link href="/about" className="link-arrow mt-6">
                {t("aboutLink")}
                <ArrowUpRight size={17} />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>}
    </div>
  );
}
