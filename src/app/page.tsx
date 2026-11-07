import Link from "next/link";
import { FragmentLink } from "@/components/FragmentLink";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { WorkshopScene } from "@/components/WorkshopScene";
import { BrickPlayground } from "@/components/BrickPlayground";
import styles from "./home.module.css";
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
          {(content.section("home.experiments") || content.section("home.services") || content.section("home.about")) && <FragmentLink href={content.section("home.experiments") ? "#playground" : content.section("home.services") ? "#services" : "#about"} className="hero-scroll">
            <ArrowDown size={14} />
            {content.section("home.experiments") ? t("playNav") : t("scroll")}
          </FragmentLink>}
        </div>
        <Reveal delay={0.16} y={16} className="home-hero-visual">
          <WorkshopScene lang={lang} projects={workshopResult.status === "fulfilled" ? workshopResult.value : []} copy={resolved} />
        </Reveal>
      </section>}

      {content.section("home.experiments") && <section id="playground" className={styles.experiments} aria-labelledby="home-play-heading">
        <div className={styles.experimentIntro}><p className="section-label">{t("playLabel")}</p><h2 id="home-play-heading">{t("playTitle")}</h2><p>{t("playIntro")}</p></div>
        <div className={styles.experimentLinks}>
          <Link href="/play" className={styles.worldLink}><div className={styles.islandArt} aria-hidden="true"><span /><span /><span /></div><span><span>01 / STILLWATER RUSH</span><strong>{t("playWorld")}</strong></span><ArrowUpRight size={21} /></Link>
          <Link href="/play?scene=paper" className={styles.paperLink}><div className={styles.paperArt} aria-hidden="true"><span /><span /></div><span><span>02 / PAPER LEAGUE</span><strong>{t("playPaper")}</strong></span><ArrowUpRight size={21} /></Link>
        </div>
      </section>}

      {content.section("home.services") && <section id="services" className={`${styles.services} home-services mx-auto max-w-7xl px-5 sm:px-8`}>
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
        <div className={styles.serviceList}>
          {content.serviceOfferings(lang).map((service, i) => (
            <Reveal key={service.id} delay={i * 0.06}>
              <Link
                href={`/services#${service.id}`}
                className={styles.service}
              >
                <span className={styles.number}>0{i + 1}</span>
                <div><h3>{service.title}</h3><p>{service.summary}</p></div>
                <ArrowUpRight size={21} aria-hidden="true" />
              </Link>
            </Reveal>
          ))}
        </div>
      </section>}

      {content.section("home.about") && <section id="about" className="section-rule home-about mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <p className="section-label">{t("aboutLabel")}</p>
          <div className={styles.about}>
            <div className={styles.aboutCopy}>
              <h2 className="display-title">{t("aboutTitle")}</h2>
              <p className="section-intro !mt-0">{t("aboutText")}</p>
              <Link href="/about" className="link-arrow mt-6">
                {t("aboutLink")}
                <ArrowUpRight size={17} />
              </Link>
            </div>
            {content.section("home.playground") && <BrickPlayground lang={lang} copy={resolved} />}
          </div>
        </Reveal>
      </section>}
    </div>
  );
}
