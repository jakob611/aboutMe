export type Quality = "auto" | "low" | "balanced" | "cinematic";
export type Tier = Exclude<Quality, "auto">;
export const qualitySettings = {
  low: { pixelRatio: .85, pixels: 350_000, shadow: 0, reflections: false, fps: 30 },
  balanced: { pixelRatio: 1.2, pixels: 850_000, shadow: 1024, reflections: false, fps: 60 },
  cinematic: { pixelRatio: 1.6, pixels: 1_500_000, shadow: 2048, reflections: true, fps: 60 },
} as const;
export function initialTier(device: { memory?: number; cores?: number; coarse: boolean; saveData?: boolean }): Tier {
  if (device.saveData || (device.memory !== undefined && device.memory <= 4) || (device.cores !== undefined && device.cores <= 4)) return "low";
  if (device.coarse) return "balanced";
  return (device.memory ?? 8) >= 8 && (device.cores ?? 8) >= 8 ? "cinematic" : "balanced";
}
export function slowerTier(tier: Tier, averageMs: number): Tier {
  if (tier === "cinematic" && averageMs > 27) return "balanced";
  if (tier === "balanced" && averageMs > 38) return "low";
  return tier;
}
