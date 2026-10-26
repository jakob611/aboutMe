import Link from "next/link";
import { ArrowUpRight, Blocks, Box, Code2, Download, Smartphone } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { BrandLogo } from "@/components/BrandLogo";
import { galleryImages } from "@/lib/gallery";
import { getLang } from "@/lib/lang";
import { translations } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";
import { getCVMetadata } from "@/lib/cv";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title: translations[lang].about.title,
    description: translations[lang].about.subtitle,
  };
}

export default async function AboutPage() {
  const lang = await getLang();
  const t = translations[lang];
  const sl = lang === "sl";
  let cvPublished = false;
  try { cvPublished = (await getCVMetadata()).published; }
  catch { /* About remains available when storage is unavailable. */ }
  const interests = [
    {
      title: "Android",
      icon: Smartphone,
      detail: sl
        ? "Ideje, ki jih lahko vzameš s seboj."
        : "Ideas you can take with you.",
    },
    {
      title: sl ? "Splet" : "Web",
      icon: Code2,
      detail: sl
        ? "Od prve strani do delujočega orodja."
        : "From a first page to a working tool.",
    },
    {
      title: "LEGO",
      icon: Blocks,
      detail: sl
        ? "Oblike, povezave in razmišljanje z rokami."
        : "Shapes, connections, and thinking with your hands.",
    },
    {
      title: sl ? "3D-tisk" : "3D printing",
      icon: Box,
      detail: sl
        ? "Raziskovanje poti od ideje do fizične oblike."
        : "Exploring the path from an idea to a physical form.",
    },
  ];

  return (
    <section className="pt-12 sm:pt-20 pb-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <div className="section-label mb-6">
            {sl ? "Nekaj o meni" : "A little context"}{" "}
            <span className="text-[color:var(--color-accent-2)]">/ 01</span>
          </div>
          <h1 className="display-title max-w-4xl">
            {t.about.title}
            <span className="text-[color:var(--color-accent-2)]">.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg sm:text-xl leading-relaxed text-[color:var(--color-fg-muted)]">
            {t.about.subtitle}
          </p>
        </Reveal>

        <div className="mt-14 sm:mt-20 grid lg:grid-cols-12 gap-10 lg:gap-20 items-start">
          <div className="lg:col-span-7 space-y-6 text-base sm:text-lg leading-[1.8] text-[color:var(--color-fg-muted)]">
            <Reveal delay={0.04}>
              <p>{t.about.paragraph1}</p>
            </Reveal>
            <Reveal delay={0.08}>
              <p>{t.about.paragraph2}</p>
            </Reveal>
            <Reveal delay={0.12}>
              <p>{t.about.paragraph3}</p>
            </Reveal>
            <Reveal delay={0.16}>
              <div className="flex flex-wrap gap-5 pt-4">
                <Link
                  href="/projects"
                  className="link-arrow text-[color:var(--color-fg)]"
                >
                  {t.home.heroCta}
                  <ArrowUpRight size={17} />
                </Link>
                <a
                  href={siteConfig.socials.github}
                  target="_blank"
                  rel="noreferrer"
                  className="link-arrow"
                >
                  GitHub
                  <ArrowUpRight size={17} />
                </a>
              </div>
            </Reveal>
          </div>

          <Reveal className="lg:col-span-5" delay={0.1}>
            <aside className="surface-panel rounded-2xl p-7 sm:p-9 relative overflow-hidden">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
                <span className="section-label">
                  {sl ? "Na moji mizi" : "On my desk"}
                </span>
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full bg-[color:var(--color-accent-2)]"
                />
              </div>
              <div className="py-10 space-y-2 text-5xl sm:text-6xl font-medium tracking-[-0.06em] leading-[1.04]">
                <p>{sl ? "Koda." : "Code."}</p>
                <p className="text-[color:var(--color-fg-muted)]">
                  {sl ? "Zasloni." : "Screens."}
                </p>
                <p>{sl ? "Kocke." : "Bricks."}</p>
              </div>
              <div className="pt-5 border-t border-white/10 flex items-end justify-between gap-4">
                <div>
                  <p className="font-medium">{siteConfig.name}</p>
                  <p className="text-xs text-[color:var(--color-fg-muted)] mt-1">
                    jakobtominc.com
                  </p>
                </div>
                <BrandLogo size={44} />
              </div>
            </aside>
          </Reveal>
        </div>

        <div className="section-rule mt-20 sm:mt-28 pt-8">
          <Reveal>
            <h2 className="section-label mb-8">
              {sl
                ? "Štiri različna izhodišča"
                : "Four different starting points"}
            </h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
            {interests.map(({ title, icon: Icon, detail }, i) => (
              <Reveal key={title} delay={i * 0.05}>
                <div className="flex items-center justify-between mb-5">
                  <Icon
                    size={24}
                    strokeWidth={1.4}
                    className="text-[color:var(--color-accent-2)]"
                  />
                  <span className="font-mono text-xs text-[color:var(--color-fg-muted)]">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="text-2xl tracking-tight mb-3">{title}</h3>
                <p className="text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  {detail}
                </p>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="section-rule mt-16 sm:mt-20 pt-8">
          <Reveal>
            <h2 className="section-label mb-6">{t.about.skillsTitle}</h2>
            <div className="flex flex-wrap gap-x-7 gap-y-4">
              {siteConfig.skills.map((skill) => (
                <span
                  key={skill}
                  className="text-sm text-[color:var(--color-fg-muted)] border-b border-white/15 pb-1"
                >
                  {skill}
                </span>
              ))}
            </div>
          </Reveal>
        </div>

        {galleryImages.length > 0 && (
          <div className="section-rule mt-20 pt-8">
            <Reveal>
              <h2 className="text-3xl tracking-tight">
                {t.about.galleryTitle}
              </h2>
              <p className="mt-3 mb-8 text-[color:var(--color-fg-muted)]">
                {t.about.galleryHint}
              </p>
            </Reveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {galleryImages.map((src, i) => (
                <Reveal key={src} delay={i * 0.04}>
                  <img
                    src={src}
                    alt={
                      sl
                        ? `Utrinek iz delavnice ${i + 1}`
                        : `A detail from the workshop ${i + 1}`
                    }
                    loading="lazy"
                    width={800}
                    height={600}
                    className="w-full aspect-[4/3] object-cover rounded-xl border border-white/10"
                  />
                </Reveal>
              ))}
            </div>
          </div>
        )}
        {cvPublished && (
          <div className="section-rule mt-16 sm:mt-20 pt-8">
            <Reveal>
              <div className="flex flex-wrap items-center justify-between gap-5">
                <h2 className="section-label">{sl ? "Življenjepis" : "Curriculum vitae"}</h2>
                <a href="/api/cv" download="Jakob-Tominc-CV.pdf" className="btn-ghost text-sm">
                  <Download size={15} aria-hidden="true" />
                  {sl ? "Prenesi CV" : "Download CV"}
                </a>
              </div>
            </Reveal>
          </div>
        )}
      </div>
    </section>
  );
}
