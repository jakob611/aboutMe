import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Code2,
  Cpu,
  Palette,
  Sparkles,
  Zap,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { getLang } from "@/lib/lang";
import { translations } from "@/lib/i18n";
import { getDb } from "@/db";
import { services } from "@/db/schema";
import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title: translations[lang].services.title,
    description: translations[lang].services.subtitle,
  };
}

export default async function ServicesPage() {
  const lang = await getLang();
  const t = translations[lang];
  const sl = lang === "sl";
  let servicesList: (typeof services.$inferSelect)[] = [];
  try {
    servicesList = await getDb()
      .select()
      .from(services)
      .orderBy(asc(services.orderIndex));
  } catch {
    console.error(
      "Services could not be loaded. Check DATABASE_URL and the services table.",
    );
  }
  const iconMap: Record<string, ReactNode> = {
    web: <Code2 size={24} />,
    app: <Cpu size={24} />,
    design: <Palette size={24} />,
    sparkles: <Sparkles size={24} />,
    zap: <Zap size={24} />,
  };
  const steps = [
    { title: t.services.why1Title, detail: t.services.why1 },
    { title: t.services.why2Title, detail: t.services.why2 },
    { title: t.services.why3Title, detail: t.services.why3 },
  ];

  return (
    <section className="pt-12 sm:pt-20 pb-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <p className="section-label mb-6">
            {sl ? "Sodelovanje" : "Working together"}{" "}
            <span className="text-[color:var(--color-accent-2)]">/ 03</span>
          </p>
          <h1 className="display-title max-w-4xl">
            {t.services.title}
            <span className="text-[color:var(--color-accent-2)]">.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg sm:text-xl leading-relaxed text-[color:var(--color-fg-muted)]">
            {t.services.subtitle}
          </p>
        </Reveal>

        {servicesList.length > 0 ? (
          <div className="mt-14 sm:mt-20 grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {servicesList.map((service, i) => (
              <Reveal key={service.id} delay={i * 0.05}>
                <ServiceCard
                  lang={lang}
                  service={service}
                  icon={iconMap[service.icon] ?? <Code2 size={24} />}
                  index={i + 1}
                />
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal delay={0.08}>
            <div className="surface-panel rounded-2xl mt-14 sm:mt-20 p-7 sm:p-10 grid lg:grid-cols-12 gap-8 lg:gap-14">
              <div className="lg:col-span-7">
                <span className="section-label">
                  {sl ? "Začni z idejo" : "Start with the idea"}
                </span>
                <h2 className="text-3xl sm:text-4xl tracking-tight mt-5 mb-5">
                  {sl
                    ? "Ni treba, da imaš že celoten načrt."
                    : "You don't need the whole plan yet."}
                </h2>
                <p className="text-[color:var(--color-fg-muted)] leading-relaxed max-w-xl">
                  {sl
                    ? "Povej, kaj želiš narediti ali kaj te pri trenutni rešitvi ovira. Povezava, skica ali kratek opis so dobro izhodišče za pogovor o možnostih, obsegu in ceni."
                    : "Tell me what you want to make, or what isn't working in the current version. A link, a sketch, or a short description is a useful starting point for a conversation about options, scope, and cost."}
                </p>
                <Link href="/contact" className="btn-primary mt-7">
                  {t.services.getQuote}
                  <ArrowUpRight size={17} />
                </Link>
              </div>
              <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-white/10 pt-7 lg:pt-0 lg:pl-9 flex flex-col justify-center">
                <p className="section-label mb-5">
                  {sl ? "Kaj želiš ustvariti?" : "What are you thinking about?"}
                </p>
                {(sl
                  ? [
                      "Spletna stran ali spletno orodje",
                      "Ideja za Android aplikacijo",
                      "Izboljšava obstoječega projekta",
                    ]
                  : [
                      "A website or a web tool",
                      "An Android app idea",
                      "Improving an existing project",
                    ]
                ).map((topic) => (
                  <Link
                    key={topic}
                    href={`/contact?subject=${encodeURIComponent(topic)}`}
                    className="flex items-center justify-between gap-4 py-4 border-b border-white/10 text-sm hover:text-[color:var(--color-accent-2)] transition-colors"
                  >
                    {topic}
                    <ArrowUpRight size={16} className="shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        <div className="section-rule mt-20 sm:mt-28 pt-8">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-5 mb-12">
              <h2 className="text-3xl sm:text-4xl tracking-tight max-w-xl">
                {t.services.whyTitle}
              </h2>
              <span className="section-label">
                {sl
                  ? "Od pogovora do preizkusa"
                  : "From conversation to something you can try"}
              </span>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-9 md:gap-12">
            {steps.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.06}>
                <span className="font-mono text-sm text-[color:var(--color-accent-2)]">
                  0{i + 1}
                </span>
                <h3 className="text-xl tracking-tight mt-5 mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-[color:var(--color-fg-muted)] leading-[1.8]">
                  {step.detail}
                </p>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal>
          <div className="section-rule mt-16 sm:mt-20 pt-8 flex flex-wrap justify-between gap-6 items-center">
            <p className="max-w-xl text-[color:var(--color-fg-muted)] leading-relaxed">
              {sl
                ? "Za začetek povej, čemu je projekt namenjen. Orodja in podrobnosti lahko razčleniva skupaj."
                : "Start with what the project is for. We can work through the tools and details together."}
            </p>
            <Link href="/contact" className="link-arrow">
              {t.contact.title}
              <ArrowRight size={18} />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ServiceCard({
  lang,
  service,
  icon,
  index,
}: {
  lang: "en" | "sl";
  service: {
    titleEn: string;
    titleSl: string;
    descriptionEn: string;
    descriptionSl: string;
    priceFrom?: string | null;
  };
  icon: ReactNode;
  index: number;
}) {
  const t = translations[lang].services;
  const title = lang === "sl" ? service.titleSl : service.titleEn;
  return (
    <div className="surface-panel rounded-2xl p-7 sm:p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-10">
        <span className="text-[color:var(--color-accent-2)]">{icon}</span>
        <span className="font-mono text-xs text-[color:var(--color-fg-muted)]">
          {String(index).padStart(2, "0")}
        </span>
      </div>
      <h2 className="text-2xl tracking-tight mb-4">{title}</h2>
      <p className="text-sm leading-[1.8] text-[color:var(--color-fg-muted)] flex-1">
        {lang === "sl" ? service.descriptionSl : service.descriptionEn}
      </p>
      <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-5">
        {service.priceFrom && (
          <p className="text-sm">
            <span className="text-[color:var(--color-fg-muted)] mr-2">
              {t.startingAt}
            </span>
            {service.priceFrom}
          </p>
        )}
        <Link
          href={`/contact?subject=${encodeURIComponent(title)}`}
          className="link-arrow text-sm"
        >
          {t.getQuote}
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </div>
  );
}
