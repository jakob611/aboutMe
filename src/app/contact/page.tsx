import { getSiteContent } from "@/lib/site-content-server";
import { Reveal } from "@/components/Reveal";
import { ContactClient } from "@/components/ContactClient";
import { getLang } from "@/lib/lang";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { inquiryFromQuery } from "@/lib/inquiry-topics";
import { verifiedInboxDelivery } from "@/lib/contact-delivery";
import { contactTurnstileHostname } from "@/lib/contact-turnstile";

type Props = { searchParams: Promise<{ subject?: string | string[]; category?: string | string[]; topic?: string | string[] }> };

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const content = await getSiteContent();
  const t = content.translation(lang);
  return { title: t.contact.title, description: t.contact.subtitle };
}

export default async function ContactPage({ searchParams }: Props) {
  const lang = await getLang();
  const content = await getSiteContent();
  const t = content.translation(lang);
  const params = await searchParams;
  const inquiry = inquiryFromQuery(params);
  // The middleware overwrites x-url; caller-supplied Host forwarding cannot configure verification.
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || "";
  const requestUrl = (await headers()).get("x-url") || "";
  const verificationAvailable = Boolean(siteKey && process.env.TURNSTILE_SECRET?.trim() &&
    (process.env.MODERATION_SECRET?.length ?? 0) >= 32 && contactTurnstileHostname(requestUrl, process.env.TURNSTILE_HOSTNAMES));
  const delivery = verifiedInboxDelivery(Boolean(process.env.DATABASE_URL), verificationAvailable);
  const contactEmail =
    /^\S+@\S+\.\S+$/.test(content.profile().email) &&
    !/@example\.(com|org|net)$/.test(content.profile().email)
      ? content.profile().email
      : "";
  const githubUrl = /^https:\/\/github\.com\/[^/]+/.test(
    content.profile().github,
  )
    ? content.profile().github
    : "";
  return (
    <section className="py-14 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="max-w-3xl">
          <p className="section-label mb-5">
            {content.text(lang, "copy.4.1")}
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
          verificationSiteKey={verificationAvailable ? siteKey : undefined}
        />
      </div>
    </section>
  );
}
