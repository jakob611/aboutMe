import Link from "next/link";
import { ArrowRight, Code2, Cpu, Sparkles, Rocket, Coffee, Users, Calendar } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { ProjectCard } from "@/components/ProjectCard";
import { getLang } from "@/lib/lang";
import { translations } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";
import { db } from "@/db";
import { projects, services } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = translations[lang];
  return {
    title: `${siteConfig.name} — ${t.home.heroTitle}`,
    description: t.home.heroSubtitle,
  };
}

export default async function HomePage() {
  const lang = await getLang();
  const t = translations[lang];

  // Fetch featured projects + a few services for the home page.
  const [featuredProjects, servicesList] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(eq(projects.featured, true))
      .orderBy(desc(projects.createdAt))
      .limit(6),
    db.select().from(services).orderBy(asc(services.orderIndex)).limit(3),
  ]);

  const stats = [
    { icon: Code2, value: siteConfig.stats.apps, label: t.home.statsDev },
    { icon: Calendar, value: siteConfig.stats.years, label: t.home.statsYears },
    { icon: Users, value: siteConfig.stats.clients, label: t.home.statsClients },
    { icon: Coffee, value: siteConfig.stats.coffee, label: t.home.statsCoffee },
  ];

  return (
    <div className="relative">
      {/* HERO */}
      <section className="relative pt-16 sm:pt-24 pb-20 overflow-hidden">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 relative">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <Reveal>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs text-[color:var(--color-fg-muted)] mb-6">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
                  </span>
                  Available for new projects
                </div>
              </Reveal>
              <Reveal delay={0.05}>
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
                  <span className="text-gradient">{t.home.heroTitle}</span>
                </h1>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="mt-6 text-lg sm:text-xl text-[color:var(--color-fg-muted)] max-w-2xl leading-relaxed">
                  {t.home.heroSubtitle}
                </p>
              </Reveal>
              <Reveal delay={0.15}>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/projects" className="btn-primary">
                    {t.home.heroCta} <ArrowRight size={16} />
                  </Link>
                  <Link href="/services" className="btn-ghost">
                    {t.home.heroCta2}
                  </Link>
                </div>
              </Reveal>

              <Reveal delay={0.25}>
                <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {stats.map((s, i) => (
                    <div key={i} className="glass rounded-2xl p-4">
                      <s.icon size={18} className="text-[color:var(--color-accent-2)] mb-2" />
                      <div className="text-2xl font-bold">{s.value}+</div>
                      <div className="text-xs text-[color:var(--color-fg-muted)]">
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>

            {/* Hero visual */}
            <div className="lg:col-span-5 relative">
              <Reveal y={40}>
                <div className="relative aspect-square max-w-md mx-auto">
                  {/* Orbiting rings */}
                  <div className="absolute inset-0 rounded-full border border-white/10 animate-[spin_40s_linear_infinite]">
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-gradient-to-br from-[#7c5cff] to-[#22d3ee]" />
                  </div>
                  <div className="absolute inset-8 rounded-full border border-white/10 animate-[spin_30s_linear_infinite_reverse]">
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-[#f472b6]" />
                  </div>
                  <div className="absolute inset-16 rounded-full border border-white/10 animate-[spin_20s_linear_infinite]">
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-[#22d3ee]" />
                  </div>

                  {/* Center card */}
                  <div className="absolute inset-24 glass rounded-3xl flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#7c5cff]/30 via-transparent to-[#22d3ee]/20" />
                    <div className="relative text-center p-6">
                      <div className="text-6xl mb-2">🚀</div>
                      <div className="font-semibold text-sm">{siteConfig.name}</div>
                      <div className="text-xs text-[color:var(--color-fg-muted)] mt-1">
                        {siteConfig.tagline}
                      </div>
                    </div>
                  </div>

                  {/* Floating chips */}
                  <div className="absolute top-4 right-4 glass rounded-2xl px-3 py-2 text-xs flex items-center gap-2 animate-bounce">
                    <Sparkles size={14} className="text-[#f472b6]" /> Modern Stack
                  </div>
                  <div className="absolute bottom-4 left-4 glass rounded-2xl px-3 py-2 text-xs flex items-center gap-2">
                    <Cpu size={14} className="text-[#22d3ee]" /> Fast & Reliable
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED PROJECTS */}
      <section className="py-20 relative">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
            <Reveal>
              <div>
                <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">
                  {t.home.featuredTitle}
                </h2>
                <p className="mt-3 text-[color:var(--color-fg-muted)] max-w-2xl">
                  {t.home.featuredSubtitle}
                </p>
              </div>
            </Reveal>
            <Reveal>
              <Link href="/projects" className="btn-ghost">
                {t.home.viewAll} <ArrowRight size={15} />
              </Link>
            </Reveal>
          </div>

          {featuredProjects.length === 0 ? (
            <Reveal>
              <div className="glass rounded-2xl p-10 text-center text-[color:var(--color-fg-muted)]">
                {t.projects.noProjects}
              </div>
            </Reveal>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProjects.map((p, i) => (
                <Reveal key={p.id} delay={i * 0.05}>
                  <ProjectCard project={p} lang={lang} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SERVICES */}
      <section className="py-20 relative">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">
                {t.home.servicesTitle}
              </h2>
              <p className="mt-3 text-[color:var(--color-fg-muted)]">
                {t.home.servicesSubtitle}
              </p>
            </div>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {servicesList.map((s, i) => (
              <Reveal key={s.id} delay={i * 0.05}>
                <Link href="/services" className="card p-6 block h-full">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#7c5cff]/30 to-[#22d3ee]/30 flex items-center justify-center mb-4">
                    <ServiceIcon name={s.icon} />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">
                    {lang === "sl" ? s.titleSl : s.titleEn}
                  </h3>
                  <p className="text-sm text-[color:var(--color-fg-muted)] leading-relaxed">
                    {lang === "sl" ? s.descriptionSl : s.descriptionEn}
                  </p>
                  {s.priceFrom && (
                    <div className="mt-4 text-sm">
                      <span className="text-[color:var(--color-fg-muted)]">
                        {t.services.startingAt}
                      </span>{" "}
                      <span className="font-semibold">{s.priceFrom}</span>
                    </div>
                  )}
                </Link>
              </Reveal>
            ))}
            {servicesList.length === 0 &&
              [0, 1, 2].map((i) => (
                <Reveal key={i} delay={i * 0.05}>
                  <div className="card p-6">
                    <div className="h-12 w-12 rounded-xl bg-white/5 mb-4" />
                    <div className="h-4 w-2/3 bg-white/5 rounded mb-2" />
                    <div className="h-3 w-full bg-white/5 rounded mb-1" />
                    <div className="h-3 w-5/6 bg-white/5 rounded" />
                  </div>
                </Reveal>
              ))}
          </div>

          <Reveal>
            <div className="mt-10 text-center">
              <Link href="/services" className="btn-primary">
                {t.services.getQuote} <Rocket size={15} />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

function ServiceIcon({ name }: { name: string }) {
  const map: Record<string, React.ReactNode> = {
    web: <Code2 size={22} />,
    app: <Cpu size={22} />,
    design: <Sparkles size={22} />,
  };
  return <>{map[name] ?? <Code2 size={22} />}</>;
}
