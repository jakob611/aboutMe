import { Reveal } from "@/components/Reveal";
import { FilesClient } from "@/components/FilesClient";
import { getLang } from "@/lib/lang";
import { translations } from "@/lib/i18n";
import { getDb } from "@/db";
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
  let allFiles: (typeof files.$inferSelect)[] = [];
  let unavailable = false;
  try {
    allFiles = await getDb()
      .select()
      .from(files)
      .orderBy(desc(files.createdAt));
  } catch {
    unavailable = true;
    console.error("Could not load the public file library.");
  }

  return (
    <section className="py-14 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="max-w-3xl">
          <p className="section-label mb-5">
            {lang === "sl"
              ? "Knjižnica / uporabne stvari"
              : "Library / useful things"}
          </p>
          <h1 className="display-title">{t.files.title}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[color:var(--color-fg-muted)]">
            {lang === "sl"
              ? "Datoteke, viri in drugi materiali, ki jih lahko preneseš in uporabiš. Brez računa."
              : "Files, resources, and other materials to download and use. No account needed."}
          </p>
        </Reveal>
        <FilesClient
          key={unavailable ? "unavailable" : "available"}
          initialFiles={allFiles}
          lang={lang}
          unavailable={unavailable}
        />
      </div>
    </section>
  );
}
