import { Reveal } from "@/components/Reveal";
import { ContactClient } from "@/components/ContactClient";
import { getLang } from "@/lib/lang";
import { translations } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";
import type { Metadata } from "next";

type Props = { searchParams: Promise<{ subject?: string | string[] }> };

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = translations[lang];
  return { title: t.contact.title, description: t.contact.subtitle };
}

export default async function ContactPage({ searchParams }: Props) {
  const lang = await getLang();
  const t = translations[lang];
  const params = await searchParams;
  const subject =
    typeof params.subject === "string"
      ? params.subject.trim().slice(0, 200)
      : "";
  const contactEmail =
    /^\S+@\S+\.\S+$/.test(siteConfig.email) &&
    !/@example\.(com|org|net)$/.test(siteConfig.email)
      ? siteConfig.email
      : "";
  const githubUrl = /^https:\/\/github\.com\/[^/]+/.test(
    siteConfig.socials.github,
  )
    ? siteConfig.socials.github
    : "";
  return (
    <section className="py-14 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="max-w-3xl">
          <p className="section-label mb-5">
            {lang === "sl"
              ? "Kontakt / začetek pogovora"
              : "Contact / start a conversation"}
          </p>
          <h1 className="display-title">{t.contact.title}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[color:var(--color-fg-muted)]">
            {t.contact.subtitle}
          </p>
        </Reveal>
        <ContactClient
          key={subject}
          lang={lang}
          t={t}
          contactEmail={contactEmail}
          githubUrl={githubUrl}
          initialSubject={subject}
        />
      </div>
    </section>
  );
}
