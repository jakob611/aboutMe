import type { LandmarkId, Quality, Tier } from "@/lib/play-model";
import type { Lang } from "@/lib/i18n";
export type Mode = "world" | "paper";
export type Engine = {
  dispose(): void;
  setQuality(quality: Quality): void;
  pause(paused: boolean): void;
  light(amount: number): void;
  ring(): void;
  move(x: number, z: number): void;
  travel(id: LandmarkId): void;
  reframe(): void;
  paper(action: "open" | "crumple" | "toss" | "reset", index?: number): void;
  write(text: string): void;
};
export type Options = {
  host: HTMLDivElement; quality: Quality; lang: Lang;
  notes: readonly string[];
  onTier(tier: Tier): void;
  onPlace(id: LandmarkId): void;
  onPaper(index: number, state?: "opened" | "folded" | "thrown"): void;
  onError(): void;
};
