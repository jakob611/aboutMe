import type { Metadata } from "next";
import { getLang } from "@/lib/lang";
import { playCopy } from "@/lib/play-copy";
import { PlayExperience } from "@/components/play/PlayExperience";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return { title: "Stillwater · " + playCopy[lang].world, description: playCopy[lang].intro };
}
export default async function PlayPage({ searchParams }: { searchParams: Promise<{ scene?: string }> }) {
  const lang = await getLang(), params = await searchParams;
  return <PlayExperience key={lang} lang={lang} initialMode={params.scene === "paper" ? "paper" : "world"} />;
}
