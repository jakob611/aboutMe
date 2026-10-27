import { SiteSection } from "@/components/SiteContentProvider";
import { getSiteContent } from "@/lib/site-content-server";
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
import { KoFiWidget } from "@/components/KoFiWidget";
import { getLang } from "@/lib/lang";
import { koFiProfile } from "@/lib/kofi-profile";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const content = await getSiteContent();
  return {
    title: content.translation(lang).donate.title,
    description: content.translation(lang).donate.subtitle,
  };
}

export default async function DonatePage() {
  const lang = await getLang();
  const content = await getSiteContent();
  const t = content.translation(lang);
  const sl = lang === "sl";
  const hasPaymentLink = Boolean(content.profile().buyMeACoffee || content.profile().koFi);
  const profile = koFiProfile(content.profile().koFi);
  const ways = [
    {
      icon: MessageSquare,
      title: content.text(lang, "copy.6.1"),
      text: content.text(lang, "copy.6.2"),
      href: "/contact",
      label: content.text(lang, "copy.6.3"),
    },
    {
      icon: Share2,
      title: content.text(lang, "copy.6.4"),
      text: content.text(lang, "copy.6.5"),
      href: "/projects",
      label: content.text(lang, "copy.6.6"),
    },
    {
      icon: GitBranch,
      title: content.text(lang, "copy.6.7"),
      text: content.text(lang, "copy.6.8"),
      href: content.profile().github,
      label: content.text(lang, "copy.6.9"),
    },
  ];

  return (
    <section className="pt-12 sm:pt-20 pb-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <p className="section-label mb-6">
            {content.text(lang, "copy.6.10")}{" "}
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

        <SiteSection name="support.ways"><div className="mt-14 sm:mt-20 grid md:grid-cols-3 gap-5">
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
        </div></SiteSection>

        <Reveal>
          <SiteSection name="support.donations"><section
            id="donations"
            aria-labelledby="donations-title"
            className="section-rule mt-16 sm:mt-20 pt-8 flex flex-col sm:flex-row justify-between sm:items-center gap-6"
          >
            <div>
              <p className="section-label mb-3">
                {content.text(lang, "copy.6.11")}
              </p>
              <h2 id="donations-title" className="text-2xl tracking-tight mb-3">
                {content.text(lang, "copy.6.12")}
              </h2>
              <p className="text-sm text-[color:var(--color-fg-muted)] max-w-lg">
                {t.donate.coffeeHint}
              </p>
            </div>
            {hasPaymentLink ? (
              <div className="flex flex-wrap gap-3">
                {content.profile().buyMeACoffee && (
                  <a
                    href={content.profile().buyMeACoffee}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary"
                  >
                    <Coffee size={16} />
                    {content.text(lang, "copy.6.13")}<ArrowUpRight size={16} />
                  </a>
                )}
                {content.profile().koFi && (
                  <a
                    href={content.profile().koFi}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost"
                  >
                    {content.text(lang, "copy.6.14")}<ArrowUpRight size={16} />
                  </a>
                )}
              </div>
            ) : (
              <p className="max-w-sm text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                {content.text(lang, "copy.6.15")}
              </p>
            )}
          </section></SiteSection>
        </Reveal>

        {content.section("support.opensource") && content.openSource().length > 0 && (
          <div className="section-rule mt-16 sm:mt-20 pt-8">
            <Reveal>
              <h2 className="text-3xl tracking-tight">{t.donate.ossTitle}</h2>
              <p className="mt-3 max-w-2xl text-[color:var(--color-fg-muted)] leading-relaxed">
                {t.donate.ossSubtitle}
              </p>
            </Reveal>
            <div className="mt-8">
              {content.openSource().map((repo) => (
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
                      {content.text(lang, "copy.6.16")}
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
      {content.section("support.donations") && profile && <KoFiWidget lang={lang} profile={profile} />}
    </section>
  );
}
