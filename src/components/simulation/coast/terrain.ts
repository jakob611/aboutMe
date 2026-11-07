/** World coordinates and heights use metres. +X is inland and -Z is north. */
export const coastBounds = { minX: -115, maxX: 134, minZ: -171, maxZ: 165 };
export const eyeHeight = 1.68;
export const walkingSpeed = 1.52;
export const coastStart = { x: 15.8, z: 34, yaw: -.366, pitch: -.061 };

export const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
export const lerp = (a: number, b: number, mix: number) => a + (b - a) * mix;
const easing = (t: number) => t * t * (3 - 2 * t);
export function smoothstep(a: number, b: number, value: number) {
  return easing(clamp((value - a) / (b - a), 0, 1));
}
const bell = (z: number, centre: number, width: number) => Math.exp(-(((z - centre) / width) ** 2));
export function shoreline(z: number) {
  return 6 + .036 * z + 3.7 * Math.sin(z * .036) + 1.65 * Math.sin(z * .096)
    - 34 * bell(z, -68, 24) - 26 * bell(z, 101, 29) + 9 * bell(z, 6, 29)
    + .44 * Math.sin(z * .32) + .22 * Math.sin(z * .79);
}
export function distanceToWater(x: number, z: number) {
  return (x - shoreline(z)) / Math.hypot(1, (shoreline(z + .2) - shoreline(z - .2)) / .4);
}
const coastHash = (x: number, z: number) => {
  const n = Math.sin(x * 127.1 + z * 311.7 + 17.7) * 43758.5453123;
  return n - Math.floor(n);
};
export function terrainNoise(x: number, z: number) {
  const ix = Math.floor(x), iz = Math.floor(z), tx = easing(x - ix), tz = easing(z - iz);
  return lerp(lerp(coastHash(ix, iz), coastHash(ix + 1, iz), tx),
    lerp(coastHash(ix, iz + 1), coastHash(ix + 1, iz + 1), tx), tz);
}

export function coastHeight(x: number, z: number) {
  const d = x - shoreline(z);
  if (d < 0) {
    return .18 * d + .010 * d * Math.min(16, -d)
      + .33 * smoothstep(1.5, 7, -d) * (terrainNoise(x * .11, z * .11) - .5);
  }
  const cove = bell(z, 33, 28);
  const path = 4.3 + cove * 3.9 + 2 * Math.sin(z * .062) + .7 * Math.sin(z * .16);
  const incline = Math.max(bell(z, 125, 18), bell(z, -126, 17));
  const cliff = Math.max(3, 12 + 13 * bell(z, -61, 37) + 8.6 * bell(z, 83, 37) - 5.6 * cove);
  const cliffTop = path + 9 + incline * 17;
  const bank = smoothstep(path, cliffTop, d);
  const undulation = 2.65 * (terrainNoise(x * .11, z * .115) - .5)
    + .83 * (terrainNoise(x * .38, z * .25) - .5)
    + .24 * (terrainNoise(x * 1.2, z * 1.2) - .5);
  const strata = Math.sin((d - path) * 2.1 + z * .19) * .24 * (1 - incline);
  const floor = .215 * Math.min(d, 6) + .046 * Math.max(0, d - 6);
  return floor + bank * cliff + undulation * (.06 + .94 * smoothstep(path - 1.8, cliffTop + 2, d)) * smoothstep(0, 1.05, d)
    + (strata + .4 * (terrainNoise(x * .47, z * .39) - .5)) * smoothstep(0, 5, d);
}

export function terrainSlope(x: number, z: number, step = .45) {
  return Math.hypot(coastHeight(x + step, z) - coastHeight(x - step, z),
    coastHeight(x, z + step) - coastHeight(x, z - step)) / (step * 2);
}

export type Walker = { x: number; z: number; yaw: number; pitch: number; speed: number };
export type BoulderCollision = { x: number; z: number; radius: number };
export const coastViewpoints = [
  { id: "cove", ...coastStart },
  { id: "shelf", x: shoreline(-28) + 3.3, z: -28, yaw: -.43, pitch: -.025 },
  { id: "headland", x: shoreline(-80) + 18.8, z: -80, yaw: -1.10, pitch: -.185 },
] as const;
export type Viewpoint = (typeof coastViewpoints)[number]["id"];

export function walkCoast(
  state: Walker,
  strafe: number,
  forward: number,
  dt: number,
  tide: number,
  stones: readonly BoulderCollision[],
) {
  const magnitude = Math.hypot(strafe, forward);
  const scale = Math.min(1, 1 / (magnitude || 1));
  const headingX = Math.sin(state.yaw), headingZ = -Math.cos(state.yaw);
  const h = coastHeight(state.x, state.z);
  const waterDepth = Math.max(0, tide - h);
  const stride = walkingSpeed * (1 - clamp(waterDepth / .54, 0, 1) * .65) * dt * scale;
  const dx = (headingX * forward - headingZ * strafe) * stride;
  const dz = (headingZ * forward + headingX * strafe) * stride;
  let x = state.x, z = state.z;
  function canMove(nx: number, nz: number) {
    if (nx < coastBounds.minX + 3 || nx > coastBounds.maxX - 2 || nz < coastBounds.minZ + 3 || nz > coastBounds.maxZ - 3) return false;
    const currentHeight = coastHeight(x, z);
    const nextHeight = coastHeight(nx, nz);
    const rise = nextHeight - currentHeight;
    if (rise > Math.hypot(nx - x, nz - z) * .93 || rise < -Math.hypot(nx - x, nz - z) * 1.15) return false;
    // If the tide rises around a stationary visitor, uphill movement remains available.
    if (nextHeight + 1e-8 < Math.min(tide - .44, currentHeight)) return false;
    return !stones.some(stone => {
      const nextDistance = Math.hypot(nx - stone.x, nz - stone.z);
      return nextDistance < stone.radius + .22 && nextDistance < Math.hypot(x - stone.x, z - stone.z);
    });
  }
  if (magnitude > .01) {
    if (canMove(x + dx, z + dz)) {
      x += dx;
      z += dz;
    } else {
      if (dx && canMove(x + dx, z)) x += dx;
      if (dz && canMove(x, z + dz)) z += dz;
    }
  }
  const travelled = Math.hypot(x - state.x, z - state.z);
  state.x = x;
  state.z = z;
  state.speed = dt > 0 ? travelled / dt : 0;
  return travelled;
}
