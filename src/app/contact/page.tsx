import { Reveal } from "@/components/Reveal";
import { ContactClient } from "@/components/ContactClient";
import { getLang } from "@/lib/lang";
import { translations } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";
import type { Metadata } from "next";
import { inquiryFromQuery } from "@/lib/inquiry-topics";
import { contactDelivery } from "@/lib/contact-delivery";

type Props = { searchParams: Promise<{ subject?: string | string[]; category?: string | string[]; topic?: string | string[] }> };

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = translations[lang];
  return { title: t.contact.title, description: t.contact.subtitle };
}

export default async function ContactPage({ searchParams }: Props) {
  const lang = await getLang();
  const t = translations[lang];
  const params = await searchParams;
  const inquiry = inquiryFromQuery(params);
  // Web3Forms access keys are deliberately public. Email sends directly from the browser.
  const delivery = contactDelivery(process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY, Boolean(process.env.DATABASE_URL));
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
          key={JSON.stringify(inquiry)}
          lang={lang}
          t={t}
          contactEmail={contactEmail}
          githubUrl={githubUrl}
          initialInquiry={inquiry}
          delivery={delivery}
        />
      </div>
    </section>
  );
}
