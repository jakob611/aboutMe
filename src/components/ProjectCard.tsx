import Link from "next/link";
import { ExternalLink, Code2 } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { translations } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type Project = {
  id: number;
  slug: string;
  titleEn: string;
  titleSl: string;
  summaryEn: string;
  summarySl: string;
  category: string;
  coverImage: string | null;
  linkUrl: string | null;
  repoUrl: string | null;
  tags: string[] | null;
};

type Props = { project: Project; lang: Lang; featured?: boolean };

const categoryColors: Record<string, string> = {
  android: "from-emerald-500/30 to-emerald-500/5 text-emerald-300 border-emerald-400/20",
  lego: "from-amber-500/30 to-amber-500/5 text-amber-300 border-amber-400/20",
  web: "from-sky-500/30 to-sky-500/5 text-sky-300 border-sky-400/20",
  other: "from-fuchsia-500/30 to-fuchsia-500/5 text-fuchsia-300 border-fuchsia-400/20",
};

export function ProjectCard({ project, lang, featured }: Props) {
  const t = translations[lang].categories;
  const title = lang === "sl" ? project.titleSl : project.titleEn;
  const summary = lang === "sl" ? project.summarySl : project.summaryEn;
  const cat = project.category || "other";
  const catLabel = (t as Record<string, string>)[cat] ?? cat;
  const colorClass = categoryColors[cat] ?? categoryColors.other;

  return (
    <Link
      href={`/projects/${project.slug}`}
      className={cn(
        "card relative block overflow-hidden group",
        featured && "md:col-span-2"
      )}
    >
      {/* Cover / gradient */}
      <div
        className={cn(
          "relative aspect-[16/10] w-full bg-gradient-to-br",
          colorClass
        )}
      >
        {project.coverImage ? (
          <img
            src={project.coverImage}
            alt={title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-70">
            {cat === "android" ? "📱" : cat === "lego" ? "🧱" : cat === "web" ? "🌐" : "✨"}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-black/40 backdrop-blur border border-white/10">
          {catLabel}
        </span>
      </div>

      <div className="p-5">
        <h3 className="font-semibold text-lg tracking-tight line-clamp-1">
          {title}
        </h3>
        <p className="text-sm text-[color:var(--color-fg-muted)] mt-1.5 line-clamp-2">
          {summary}
        </p>
        {project.tags && project.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {project.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-[11px] border border-white/10 text-[color:var(--color-fg-muted)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="mt-4 flex items-center gap-3 text-sm">
          {project.linkUrl && (
            <span className="inline-flex items-center gap-1 text-[color:var(--color-fg-muted)] group-hover:text-white transition-colors">
              <ExternalLink size={14} /> {translations[lang].projects.visit}
            </span>
          )}
          {project.repoUrl && (
            <span className="inline-flex items-center gap-1 text-[color:var(--color-fg-muted)] group-hover:text-white transition-colors">
              <Code2 size={14} /> {translations[lang].projects.code}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
