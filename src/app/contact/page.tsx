import { Reveal } from "@/components/Reveal";
import { ContactClient } from "@/components/ContactClient";
import { getLang } from "@/lib/lang";
import { translations } from "@/lib/i18n";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = translations[lang];
  return { title: t.contact.title, description: t.contact.subtitle };
}

export default async function ContactPage() {
  const lang = await getLang();
  const t = translations[lang];
  return (
    <section className="pt-16 sm:pt-24 pb-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">
              {t.contact.title}
            </h1>
            <p className="mt-4 text-lg text-[color:var(--color-fg-muted)]">
              {t.contact.subtitle}
            </p>
          </div>
        </Reveal>
        <ContactClient lang={lang} t={t} />
      </div>
    </section>
  );
}
