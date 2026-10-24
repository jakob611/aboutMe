import Link from "next/link";
import { Code2, Cpu, Palette, Rocket, Shield, Sparkles, Zap } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { getLang } from "@/lib/lang";
import { translations } from "@/lib/i18n";
import { getDb } from "@/db";
import { services } from "@/db/schema";
import { asc } from "drizzle-orm";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = translations[lang];
  return { title: t.services.title, description: t.services.subtitle };
}

export default async function ServicesPage() {
  const lang = await getLang();
  const t = translations[lang];

  const servicesList = await getDb()
    .select()
    .from(services)
    .orderBy(asc(services.orderIndex));

  const iconMap: Record<string, React.ReactNode> = {
    web: <Code2 size={26} />,
    app: <Cpu size={26} />,
    design: <Palette size={26} />,
    sparkles: <Sparkles size={26} />,
    zap: <Zap size={26} />,
  };

  return (
    <section className="pt-16 sm:pt-24 pb-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">
              {t.services.title}
            </h1>
            <p className="mt-4 text-lg text-[color:var(--color-fg-muted)]">
              {t.services.subtitle}
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {servicesList.length === 0
            ? // Placeholder services when DB is empty
              [
                {
                  slug: "web",
                  icon: "web",
                  titleEn: "Websites & Web Apps",
                  titleSl: "Spletne strani in aplikacije",
                  descriptionEn:
                    "Fast, accessible, SEO-friendly sites built with Next.js, Tailwind and modern tooling.",
                  descriptionSl:
                    "Hitre, dostopne in SEO-prijazne strani z Next.js, Tailwind in modernim orodjem.",
                  priceFrom: "€800",
                },
                {
                  slug: "app",
                  icon: "app",
                  titleEn: "Mobile Apps",
                  titleSl: "Mobilne aplikacije",
                  descriptionEn:
                    "Native and cross-platform Android apps — from prototype to Play Store.",
                  descriptionSl:
                    "Native in cross-platform Android aplikacije — od prototipa do Play Store.",
                  priceFrom: "€1500",
                },
                {
                  slug: "design",
                  icon: "design",
                  titleEn: "UI / UX Design",
                  titleSl: "UI / UX oblikovanje",
                  descriptionEn:
                    "Beautiful interfaces, thoughtful flows, and design systems that scale.",
                  descriptionSl:
                    "Lepi vmesniki, premišljeni tokovi in dizajn sistemi, ki rastejo s tabo.",
                  priceFrom: "€500",
                },
              ].map((s, i) => (
                <Reveal key={s.slug} delay={i * 0.05}>
                  <ServiceCard lang={lang} service={s} icon={iconMap[s.icon] ?? <Code2 size={26} />} />
                </Reveal>
              ))
            : servicesList.map((s, i) => (
                <Reveal key={s.id} delay={i * 0.05}>
                  <ServiceCard
                    lang={lang}
                    service={s}
                    icon={iconMap[s.icon] ?? <Code2 size={26} />}
                  />
                </Reveal>
              ))}
        </div>

        {/* Why work with me */}
        <div className="mt-20">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-10">
              {t.services.whyTitle}
            </h2>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: <Zap size={24} className="text-[#f472b6]" />,
                title: t.services.why1Title,
                desc: t.services.why1,
              },
              {
                icon: <Sparkles size={24} className="text-[#22d3ee]" />,
                title: t.services.why2Title,
                desc: t.services.why2,
              },
              {
                icon: <Shield size={24} className="text-emerald-400" />,
                title: t.services.why3Title,
                desc: t.services.why3,
              },
            ].map((w, i) => (
              <Reveal key={i} delay={i * 0.05}>
                <div className="card p-6 h-full">
                  <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                    {w.icon}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{w.title}</h3>
                  <p className="text-sm text-[color:var(--color-fg-muted)] leading-relaxed">
                    {w.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="mt-12 text-center">
              <Link href="/contact" className="btn-primary">
                {t.services.getQuote} <Rocket size={15} />
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function ServiceCard({
  lang,
  service,
  icon,
}: {
  lang: "en" | "sl";
  service: {
    titleEn: string;
    titleSl: string;
    descriptionEn: string;
    descriptionSl: string;
    priceFrom?: string | null;
  };
  icon: React.ReactNode;
}) {
  const t = translations[lang].services;
  const title = lang === "sl" ? service.titleSl : service.titleEn;
  const desc = lang === "sl" ? service.descriptionSl : service.descriptionEn;
  return (
    <div className="card p-6 h-full flex flex-col">
      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#7c5cff]/30 to-[#22d3ee]/30 flex items-center justify-center mb-5 text-white">
        {icon}
      </div>
      <h3 className="font-semibold text-xl mb-3 tracking-tight">{title}</h3>
      <p className="text-sm text-[color:var(--color-fg-muted)] leading-relaxed flex-1">
        {desc}
      </p>
      {service.priceFrom && (
        <div className="mt-5 pt-5 border-t border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs text-[color:var(--color-fg-muted)] uppercase tracking-wider">
              {t.startingAt}
            </div>
            <div className="text-xl font-bold">{service.priceFrom}</div>
          </div>
          <Link href="/contact" className="btn-ghost text-sm">
            {t.getQuote}
          </Link>
        </div>
      )}
    </div>
  );
}
