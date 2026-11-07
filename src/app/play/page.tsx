import type { Metadata } from "next";
import { getLang } from "@/lib/lang";
import { playCopy } from "@/lib/play-copy";
import { PlayExperience } from "@/components/play/PlayExperience";

type Props = { searchParams: Promise<{ scene?: string }> };
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const [lang, params] = await Promise.all([getLang(), searchParams]);
  const t = playCopy[lang];
  return params.scene === "paper" ? { title: t.paper, description: t.paperPitch } : { title: t.world, description: t.worldPitch };
}
export default async function PlayPage({ searchParams }: Props) {
  const lang = await getLang(), params = await searchParams;
  const mode = params.scene === "paper" ? "paper" : "world";
  return <PlayExperience key={`${lang}-${mode}`} lang={lang} initialMode={mode} />;
}
