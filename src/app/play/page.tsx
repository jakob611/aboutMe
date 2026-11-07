import type { Metadata } from "next";
import { getLang } from "@/lib/lang";
import { simulationCopy } from "@/lib/simulation-copy";
import { SimulationShell } from "@/components/simulation/SimulationShell";

type Props = { searchParams: Promise<{ scene?: string }> };
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const [lang, params] = await Promise.all([getLang(), searchParams]);
  const t = simulationCopy[lang];
  const paper = params.scene === "paper";
  const route = paper ? "/play?scene=paper" : "/play";
  const language = (value: string) => `${route}${paper ? "&" : "?"}lang=${value}`;
  return {
    title: paper ? t.paper : t.world,
    description: paper ? t.paperDescription : t.worldDescription,
    alternates: { canonical: route, languages: { en: language("en"), sl: language("sl") } },
  };
}
export default async function PlayPage({ searchParams }: Props) {
  const lang = await getLang(), params = await searchParams;
  const mode = params.scene === "paper" ? "paper" : "world";
  return <SimulationShell key={`${lang}-${mode}`} lang={lang} mode={mode} />;
}
