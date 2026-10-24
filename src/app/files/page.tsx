import { Reveal } from "@/components/Reveal";
import { FilesClient } from "@/components/FilesClient";
import { getLang } from "@/lib/lang";
import { translations } from "@/lib/i18n";
import { db } from "@/db";
import { files } from "@/db/schema";
import { desc } from "drizzle-orm";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = translations[lang];
  return { title: t.files.title, description: t.files.subtitle };
}

export default async function FilesPage() {
  const lang = await getLang();
  const t = translations[lang];

  const allFiles = await db.select().from(files).orderBy(desc(files.createdAt));

  return (
    <section className="pt-16 sm:pt-24 pb-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">
              {t.files.title}
            </h1>
            <p className="mt-4 text-lg text-[color:var(--color-fg-muted)]">
              {t.files.subtitle}
            </p>
          </div>
        </Reveal>

        <FilesClient initialFiles={allFiles} lang={lang} />
      </div>
    </section>
  );
}
