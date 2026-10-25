import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Code2,
  Palette,
  Smartphone,
  Workflow,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { getLang } from "@/lib/lang";
import { translations, type Lang } from "@/lib/i18n";
import {
  coreServiceIdFromSlug,
  serviceOfferings,
  servicePageCopy,
  type ServiceOffering,
} from "@/lib/service-offerings";
import { getDb } from "@/db";
import { services } from "@/db/schema";
import { asc } from "drizzle-orm";
import type { Metadata } from "next";

type ServiceRow = typeof services.$inferSelect;

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
  const copy = servicePageCopy[lang];
  let servicesList: ServiceRow[] = [];
  try {
    servicesList = await getDb()
      .select()
      .from(services)
      .orderBy(asc(services.orderIndex));
  } catch {
    console.error(
      "Optional service details could not be loaded; core services remain available.",
    );
  }
  const additionalServices = servicesList.filter(
    (service) => !coreServiceIdFromSlug(service.slug),
  );
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
            {lang === "sl" ? "Sodelovanje" : "Working together"}
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

        <section
          aria-labelledby="core-services-title"
          className="mt-14 sm:mt-20"
        >
          <Reveal>
            <h2 id="core-services-title" className="section-label mb-6">
              {copy.coreLabel}
            </h2>
          </Reveal>
          <div className="grid gap-5 lg:grid-cols-3">
            {serviceOfferings[lang].map((offering, index) => (
              <Reveal key={offering.id} delay={index * 0.05}>
                <CoreServiceCard
                  lang={lang}
                  offering={offering}
                  index={index + 1}
                  details={servicesList.filter(
                    (service) =>
                      coreServiceIdFromSlug(service.slug) === offering.id,
                  )}
                />
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="max-w-3xl mt-7 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
              {copy.scope}
            </p>
          </Reveal>
        </section>

        {additionalServices.length > 0 && (
          <section
            className="section-rule mt-16 sm:mt-20 pt-8"
            aria-labelledby="additional-services-title"
          >
            <Reveal>
              <h2
                id="additional-services-title"
                className="text-3xl tracking-tight"
              >
                {copy.additionalTitle}
              </h2>
              <p className="mt-3 text-[color:var(--color-fg-muted)]">
                {copy.additionalIntro}
              </p>
            </Reveal>
            <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {additionalServices.map((service, index) => (
                <Reveal key={service.id} delay={index * 0.04}>
                  <AdditionalServiceCard lang={lang} service={service} />
                </Reveal>
              ))}
            </div>
          </section>
        )}

        <section
          aria-labelledby="working-together-title"
          className="section-rule mt-20 sm:mt-24 pt-8"
        >
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-5 mb-10">
              <h2
                id="working-together-title"
                className="text-3xl sm:text-4xl tracking-tight max-w-xl"
              >
                {t.services.whyTitle}
              </h2>
              <span className="section-label">{copy.workingLabel}</span>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {steps.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.05}>
                <span className="font-mono text-sm text-[color:var(--color-accent-2)]">
                  0{index + 1}
                </span>
                <h3 className="text-xl tracking-tight mt-4 mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-[color:var(--color-fg-muted)] leading-[1.8]">
                  {step.detail}
                </p>
              </Reveal>
            ))}
          </div>
        </section>

        <Reveal>
          <div className="section-rule mt-14 sm:mt-16 pt-8 flex flex-wrap justify-between gap-6 items-center">
            <p className="max-w-2xl text-[color:var(--color-fg-muted)] leading-relaxed">
              {copy.closing}
            </p>
            <Link href="/contact" className="btn-primary">
              {t.services.getQuote}
              <ArrowRight size={17} />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function CoreServiceCard({
  lang,
  offering,
  index,
  details,
}: {
  lang: Lang;
  offering: ServiceOffering;
  index: number;
  details: ServiceRow[];
}) {
  const Icon = { android: Smartphone, web: Code2, automation: Workflow }[
    offering.id
  ];
  const copy = servicePageCopy[lang];
  return (
    <article
      id={offering.id}
      aria-labelledby={offering.id + "-title"}
      className="interactive-card surface-panel rounded-2xl p-6 sm:p-7 h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-7">
        <Icon
          size={25}
          strokeWidth={1.5}
          className="text-[color:var(--color-accent-2)]"
          aria-hidden="true"
        />
        <span className="font-mono text-xs text-[color:var(--color-fg-muted)]">
          0{index}
        </span>
      </div>
      <h3
        id={offering.id + "-title"}
        className="text-2xl tracking-tight leading-tight mb-4"
      >
        {offering.title}
      </h3>
      <p className="text-[.9375rem] leading-[1.8] text-[color:var(--color-fg-muted)]">
        {offering.description}
      </p>
      <div className="mt-7">
        <p className="section-label mb-4">{copy.includes}</p>
        <ul className="space-y-3 text-sm leading-relaxed">
          {offering.includes.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="mt-[.6em] h-1 w-1 rounded-full bg-[color:var(--color-accent-2)] shrink-0"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-7 border-t border-white/10 pt-5">
        <p className="text-xs text-[color:var(--color-fg-muted)] mb-2">
          {copy.example}
        </p>
        <p className="text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
          {offering.example}
        </p>
      </div>
      {details.length > 0 && (
        <details className="mt-5 border-t border-white/10 pt-4 text-sm">
          <summary className="cursor-pointer text-[color:var(--color-fg)] py-1">
            {details.some((detail) => detail.priceFrom)
              ? copy.detailsPricing
              : copy.details}
          </summary>
          <div className="mt-4 space-y-5">
            {details.map((detail) => (
              <div key={detail.id}>
                <h4 className="font-medium mb-2">
                  {lang === "sl" ? detail.titleSl : detail.titleEn}
                </h4>
                <p className="text-[color:var(--color-fg-muted)] leading-relaxed">
                  {lang === "sl" ? detail.descriptionSl : detail.descriptionEn}
                </p>
                {detail.priceFrom && (
                  <p className="mt-3">
                    {translations[lang].services.startingAt} {detail.priceFrom}
                  </p>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
      <div className="mt-auto pt-7">
        <Link
          href={`/contact?subject=${encodeURIComponent(offering.title)}`}
          className="link-arrow text-sm"
        >
          {offering.inquiry}
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </article>
  );
}

function AdditionalServiceCard({
  lang,
  service,
}: {
  lang: Lang;
  service: ServiceRow;
}) {
  const title = lang === "sl" ? service.titleSl : service.titleEn;
  const Icon = service.icon === "design" ? Palette : Code2;
  return (
    <article className="interactive-card surface-panel rounded-2xl p-7 h-full flex flex-col">
      <Icon
        size={24}
        strokeWidth={1.5}
        className="text-[color:var(--color-accent-2)] mb-6"
        aria-hidden="true"
      />
      <h3 className="text-2xl tracking-tight mb-4">{title}</h3>
      <p className="text-sm leading-[1.8] text-[color:var(--color-fg-muted)] flex-1">
        {lang === "sl" ? service.descriptionSl : service.descriptionEn}
      </p>
      <div className="mt-7 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
        {service.priceFrom && (
          <p className="text-sm">
            {translations[lang].services.startingAt} {service.priceFrom}
          </p>
        )}
        <Link
          href={`/contact?subject=${encodeURIComponent(title)}`}
          className="link-arrow text-sm"
        >
          {translations[lang].services.getQuote}
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </article>
  );
}
