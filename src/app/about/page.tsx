import { galleryImages } from "@/lib/gallery";
import { Code2, Cpu, Palette, Rocket, Sparkles } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { getLang } from "@/lib/lang";
import { translations } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = translations[lang];
  return { title: t.about.title, description: t.about.subtitle };
}

export default async function AboutPage() {
  const lang = await getLang();
  const t = translations[lang];
  const gallery = galleryImages;

  return (
    <section className="pt-16 sm:pt-24 pb-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">
              {t.about.title}
            </h1>
            <p className="mt-4 text-lg text-[color:var(--color-fg-muted)]">
              {t.about.subtitle}
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 space-y-5">
            <Reveal delay={0.05}>
              <p className="text-lg text-[color:var(--color-fg-muted)] leading-relaxed">
                {t.about.paragraph1}
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-lg text-[color:var(--color-fg-muted)] leading-relaxed">
                {t.about.paragraph2}
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="text-lg text-[color:var(--color-fg-muted)] leading-relaxed">
                {t.about.paragraph3}
              </p>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="mt-10">
                <h2 className="text-2xl font-bold mb-5 flex items-center gap-2">
                  <Sparkles size={20} className="text-[#f472b6]" />
                  {t.about.skillsTitle}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {siteConfig.skills.map((skill, i) => (
                    <span
                      key={skill}
                      className="px-3.5 py-1.5 rounded-full text-sm border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-5">
            <Reveal y={30}>
              <div className="relative glass rounded-3xl p-8 overflow-hidden">
                <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#7c5cff]/20 blur-3xl" />
                <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[#22d3ee]/20 blur-3xl" />
                <div className="relative text-center">
                  <div className="inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-[#7c5cff] to-[#22d3ee] text-white text-3xl font-bold shadow-xl shadow-[#7c5cff]/30 mb-5">
                    {siteConfig.name.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="text-2xl font-bold">{siteConfig.name}</h3>
                  <p className="text-[color:var(--color-fg-muted)] mt-1">
                    {siteConfig.tagline}
                  </p>
                </div>

                <div className="relative mt-8 grid grid-cols-2 gap-3">
                  <Stat icon={<Code2 size={18} />} label={t.home.statsDev} value={siteConfig.stats.apps} />
                  <Stat icon={<Rocket size={18} />} label={t.home.statsYears} value={siteConfig.stats.years} />
                  <Stat icon={<Palette size={18} />} label={t.home.statsClients} value={siteConfig.stats.clients} />
                  <Stat icon={<Cpu size={18} />} label={t.home.statsCoffee} value={siteConfig.stats.coffee} />
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Gallery */}
        <Reveal>
          <div className="mt-20">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              {t.about.galleryTitle}
            </h2>
            <p className="text-[color:var(--color-fg-muted)] mb-6 text-sm">
              {t.about.galleryHint}
            </p>
            {gallery.length === 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {["📸", "🧱", "💻", "🏔️", "☕", "🎨"].map((emoji, i) => (
                  <div
                    key={i}
                    className="aspect-[4/3] rounded-2xl border border-dashed border-white/15 bg-white/[0.02] flex items-center justify-center text-5xl opacity-40"
                  >
                    {emoji}
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {gallery.map((src, i) => (
                  <Reveal key={src} delay={i * 0.05}>
                    <img
                      src={src}
                      alt={`Gallery ${i + 1}`}
                      loading="lazy"
                      className="w-full aspect-[4/3] object-cover rounded-2xl border border-white/10"
                    />
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
      <div className="text-[#22d3ee] mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}+</div>
      <div className="text-xs text-[color:var(--color-fg-muted)]">{label}</div>
    </div>
  );
}
