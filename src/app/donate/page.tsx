import Link from "next/link";
import { Coffee, Code2, Heart, Star, ExternalLink } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { getLang } from "@/lib/lang";
import { translations } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = translations[lang];
  return { title: t.donate.title, description: t.donate.subtitle };
}

export default async function DonatePage() {
  const lang = await getLang();
  const t = translations[lang];

  return (
    <section className="pt-16 sm:pt-24 pb-20">
      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#f472b6] to-[#7c5cff] shadow-lg shadow-[#f472b6]/30 mb-5">
              <Coffee size={28} className="text-white" />
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">
              {t.donate.title}
            </h1>
            <p className="mt-4 text-lg text-[color:var(--color-fg-muted)]">
              {t.donate.subtitle}
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-12 glass rounded-3xl p-8 sm:p-10 text-center">
            <div className="text-6xl mb-4">☕</div>
            <p className="text-[color:var(--color-fg-muted)] mb-6 max-w-md mx-auto">
              {t.donate.thanks}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href={siteConfig.buyMeACoffee}
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
              >
                <Coffee size={16} /> {t.donate.coffee}
              </a>
              {siteConfig.koFi && (
                <a
                  href={siteConfig.koFi}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost"
                >
                  <Heart size={16} /> Ko-fi
                </a>
              )}
            </div>
            <p className="mt-6 text-xs text-[color:var(--color-fg-muted)]">
              {t.donate.coffeeHint}
            </p>
          </div>
        </Reveal>

        {/* Open source */}
        <div className="mt-20">
          <Reveal>
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-4xl font-bold flex items-center justify-center gap-2">
                <Code2 size={24} /> {t.donate.ossTitle}
              </h2>
              <p className="mt-3 text-[color:var(--color-fg-muted)]">
                {t.donate.ossSubtitle}
              </p>
            </div>
          </Reveal>

          <div className="grid sm:grid-cols-2 gap-4">
            {siteConfig.openSource.map((repo, i) => (
              <Reveal key={repo.name} delay={i * 0.05}>
                <div className="card p-6 h-full flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <Code2 size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{repo.name}</div>
                      <div className="text-xs text-[color:var(--color-fg-muted)] truncate">
                        {repo.url}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-[color:var(--color-fg-muted)] leading-relaxed flex-1">
                    {lang === "sl" ? repo.descriptionSl : repo.descriptionEn}
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-ghost text-sm"
                    >
                      <Star size={14} /> {t.donate.star}
                    </a>
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[color:var(--color-fg-muted)] hover:text-white inline-flex items-center gap-1"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal>
          <div className="mt-16 text-center">
            <Link href="/contact" className="btn-primary">
              {t.services.getQuote}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
