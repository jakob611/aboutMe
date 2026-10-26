import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Coffee,
  GitBranch,
  MessageSquare,
  Share2,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { getLang } from "@/lib/lang";
import { translations } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title: translations[lang].donate.title,
    description: translations[lang].donate.subtitle,
  };
}

export default async function DonatePage() {
  const lang = await getLang();
  const t = translations[lang];
  const sl = lang === "sl";
  const hasPaymentLink = Boolean(siteConfig.buyMeACoffee || siteConfig.koFi);
  const ways = [
    {
      icon: MessageSquare,
      title: sl ? "Povej, kaj bi izboljšal" : "Tell me what could be better",
      text: sl
        ? "Si našel napako ali imaš idejo? Konkreten primer pomaga bolj kot splošna pohvala."
        : "Found a bug or have an idea? A concrete example is more useful than a general compliment.",
      href: "/contact",
      label: sl ? "Pošlji sporočilo" : "Send a note",
    },
    {
      icon: Share2,
      title: sl ? "Preizkusi in deli" : "Try something. Pass it on.",
      text: sl
        ? "Če najdeš projekt, ki bi komu koristil, mu pošlji povezavo. To je že pomoč."
        : "If you find a project that someone else could use, send them the link. That helps too.",
      href: "/projects",
      label: sl ? "Razišči projekte" : "Explore projects",
    },
    {
      icon: GitBranch,
      title: sl ? "Poglej v kodo" : "Look through the code",
      text: sl
        ? "Odpri repozitorij, zastavi vprašanje ali predlagaj spremembo. Majhen prispevek je še vedno prispevek."
        : "Open a repository, ask a question, or suggest a change. A small contribution is still a contribution.",
      href: siteConfig.socials.github,
      label: sl ? "Odpri GitHub" : "Open GitHub",
    },
  ];

  return (
    <section className="pt-12 sm:pt-20 pb-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <p className="section-label mb-6">
            {sl ? "Hvala za zanimanje" : "Thanks for being here"}{" "}
            <span className="text-[color:var(--color-accent-2)]">/ 06</span>
          </p>
          <h1 className="display-title max-w-4xl">
            {t.donate.title}
            <span className="text-[color:var(--color-accent-2)]">.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg sm:text-xl leading-relaxed text-[color:var(--color-fg-muted)]">
            {t.donate.subtitle}
          </p>
        </Reveal>

        <div className="mt-14 sm:mt-20 grid md:grid-cols-3 gap-5">
          {ways.map(({ icon: Icon, title, text, href, label }, i) => (
            <Reveal key={title} delay={i * 0.05}>
              <div className="surface-panel rounded-2xl p-7 sm:p-8 h-full flex flex-col">
                <Icon
                  size={24}
                  strokeWidth={1.4}
                  className="text-[color:var(--color-accent-2)] mb-8"
                />
                <h2 className="text-xl tracking-tight mb-4">{title}</h2>
                <p className="text-sm text-[color:var(--color-fg-muted)] leading-[1.8] flex-1">
                  {text}
                </p>
                {href.startsWith("https:") ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="link-arrow text-sm mt-8"
                  >
                    {label}
                    <ArrowUpRight size={16} />
                  </a>
                ) : (
                  <Link href={href} className="link-arrow text-sm mt-8">
                    {label}
                    <ArrowRight size={16} />
                  </Link>
                )}
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <section
            id="donations"
            aria-labelledby="donations-title"
            className="section-rule mt-16 sm:mt-20 pt-8 flex flex-col sm:flex-row justify-between sm:items-center gap-6"
          >
            <div>
              <p className="section-label mb-3">
                {sl ? "Če želiš prispevati" : "If you'd like to contribute"}
              </p>
              <h2 id="donations-title" className="text-2xl tracking-tight mb-3">
                {sl ? "Donacije" : "Donations"}
              </h2>
              <p className="text-sm text-[color:var(--color-fg-muted)] max-w-lg">
                {t.donate.coffeeHint}
              </p>
            </div>
            {hasPaymentLink ? (
              <div className="flex flex-wrap gap-3">
                {siteConfig.buyMeACoffee && (
                  <a
                    href={siteConfig.buyMeACoffee}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary"
                  >
                    <Coffee size={16} />
                    Buy Me a Coffee
                    <ArrowUpRight size={16} />
                  </a>
                )}
                {siteConfig.koFi && (
                  <a
                    href={siteConfig.koFi}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost"
                  >
                    Ko-fi
                    <ArrowUpRight size={16} />
                  </a>
                )}
              </div>
            ) : (
              <p className="max-w-sm text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                {sl
                  ? "Spletne donacije še niso na voljo. Moje delo lahko podpreš tudi na zgoraj opisane načine."
                  : "Online donations are not set up yet. You can still support my work in the ways above."}
              </p>
            )}
          </section>
        </Reveal>

        {siteConfig.openSource.length > 0 && (
          <div className="section-rule mt-16 sm:mt-20 pt-8">
            <Reveal>
              <h2 className="text-3xl tracking-tight">{t.donate.ossTitle}</h2>
              <p className="mt-3 max-w-2xl text-[color:var(--color-fg-muted)] leading-relaxed">
                {t.donate.ossSubtitle}
              </p>
            </Reveal>
            <div className="mt-8">
              {siteConfig.openSource.map((repo) => (
                <Reveal key={repo.name}>
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-6 py-7 border-y border-white/10 hover:border-[color:var(--color-accent-2)]/40 transition-colors"
                  >
                    <div>
                      <h3 className="text-xl tracking-tight flex items-center gap-3">
                        <span className="font-mono text-[color:var(--color-accent-2)]">
                          /
                        </span>
                        {repo.name}
                      </h3>
                      <p className="mt-3 text-sm text-[color:var(--color-fg-muted)] max-w-xl leading-relaxed">
                        {sl ? repo.descriptionSl : repo.descriptionEn}
                      </p>
                    </div>
                    <span className="link-arrow shrink-0 text-sm">
                      {sl ? "Izvorna koda" : "View source"}
                      <ArrowUpRight
                        size={17}
                        className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                      />
                    </span>
                  </a>
                </Reveal>
              ))}
            </div>
          </div>
        )}

        <Reveal>
          <p className="mt-14 text-sm text-[color:var(--color-fg-muted)]">
            {t.donate.thanks}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
