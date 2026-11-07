import type { Lane, RunAction } from "@/lib/arcade";
import type { Quality, Tier } from "@/lib/play-model";

export type Mode = "world" | "paper";
export type Phase = "ready" | "playing" | "paused" | "finished";
export type Feedback = "light" | "hit" | "clear" | "finish" | "chapter" | "perfect" | "miss";
export type Snapshot = { score: number; chapter: number; lives: number; lights: number; distance: number; shots: number; hits: number; chain: number; wind: number; won: boolean; points: number; lane: Lane };
export const emptySnapshot: Snapshot = { score: 0, chapter: 0, lives: 3, lights: 0, distance: 0, shots: 0, hits: 0, chain: 0, wind: 0, won: false, points: 0, lane: 0 };
export type Game = {
  reset(): void;
  play(value: boolean): void;
  dispose(): void;
  run?(action: RunAction): void;
  aim?(aim: number, power: number): void;
  clearAim?(): void;
  toss?(aim: number, power: number): void;
  quality?(value: Quality): void;
};
export type GameOptions = {
  host: HTMLDivElement; quality: Quality;
  onTier(tier: Tier | "2d"): void;
  onUpdate(snapshot: Partial<Snapshot>, event?: Feedback): void;
  onEnd(): void;
  onLost(): void;
};
