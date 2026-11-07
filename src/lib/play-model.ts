export type Quality = "auto" | "low" | "balanced" | "cinematic";
export type Tier = Exclude<Quality, "auto">;
export type Point = { x: number; z: number };
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
export const landmarks = [
  { id: "arrival", x: 0, z: 8, en: "The landing", sl: "Pristan", noteEn: "No destination required. Follow the path, or take the long way around.", noteSl: "Brez določenega cilja. Sledi poti ali zavij malo naokrog." },
  { id: "lookout", x: -6, z: -4, en: "The observatory", sl: "Razgledni stolp", noteEn: "A window cut into the sky. Try changing the light while you’re here.", noteSl: "Okno v nebo. Poskusi spremeniti svetlobo." },
  { id: "grove", x: 7, z: -3, en: "The quiet grove", sl: "Tihi gaj", noteEn: "A small clearing between the trees. A good place to do absolutely nothing.", noteSl: "Majhna jasa med drevesi. Dober kraj za trenutek brez načrtov." },
  { id: "arch", x: -7, z: 5, en: "The sun gate", sl: "Sončna vrata", noteEn: "Some doors are just there to frame the view.", noteSl: "Nekatera vrata so tu samo zato, da uokvirijo razgled." },
] as const;
export type LandmarkId = (typeof landmarks)[number]["id"];
// World-space obstacles match the architectural meshes, with a margin for the marble.
export const obstacles = [
  { x: -6, z: -7.3, hx: 2.3, hz: 1.8 },
  { x: -9.1, z: 4, hx: .65, hz: .65 }, { x: -5.0, z: 4, hx: .65, hz: .65 },
  ...[{ x: 7, z: -6 }, { x: 10, z: -2 }, { x: 9, z: -8 }, { x: 5, z: -8 }, { x: 11, z: -5 }].map(p => ({ ...p, hx: .65, hz: .65 })),
  ...[{ x: -10, z: -3 }, { x: -9, z: -5 }, { x: -11, z: 0 }, { x: 7, z: 7 }].map(p => ({ ...p, hx: .65, hz: .65 })),
];
export function walkable(point: Point) {
  return point.x * point.x + point.z * point.z < 12.9 ** 2 && !obstacles.some(o => Math.abs(point.x - o.x) < o.hx + .35 && Math.abs(point.z - o.z) < o.hz + .35);
}
/** Sliding instead of teleporting or tunnelling through obstacles. */
export function moveMarble(start: Point, dx: number, dz: number): Point {
  const length = Math.hypot(dx, dz);
  const steps = Math.max(1, Math.ceil(length / .12));
  let point = { ...start };
  for (let i = 0; i < steps; i++) {
    const next = { x: point.x + dx / steps, z: point.z + dz / steps };
    if (walkable(next)) point = next;
    else {
      if (walkable({ x: next.x, z: point.z })) point.x = next.x;
      if (walkable({ x: point.x, z: next.z })) point.z = next.z;
    }
  }
  return point;
}
