import { coastHeight } from "./terrain";

export type PebblePose = { x: number; z: number; yaw: number; pitch: number };
type Vector = { x: number; y: number; z: number };
export type Pebble = Vector & { velocity: Vector; radius: number; thickness: number; age: number; state: "air" | "rest" | "sunk"; skips: number };
export type WaterImpact = { x: number; z: number; speed: number; skipped: boolean };
const gravity = 9.80665;

export function launchPebble(pose: PebblePose, eye: number, power = .72): Pebble {
  const direction = { x: Math.sin(pose.yaw), z: -Math.cos(pose.yaw) };
  const pitch = Math.max(-.88, Math.min(.76, pose.pitch));
  const speed = 5.3 + Math.max(0, Math.min(1, power)) * 13.4;
  const horizontal = Math.cos(pitch) * speed;
  return {
    x: pose.x + direction.x * .42 + direction.z * -.13,
    y: eye - .55 + Math.sin(pitch) * .30,
    z: pose.z + direction.z * .42 + direction.x * .13,
    velocity: { x: horizontal * direction.x, y: Math.sin(pitch) * speed + .51, z: horizontal * direction.z },
    radius: .039, thickness: .018, age: 0, state: "air", skips: 0,
  };
}

export function stepPebble(stone: Pebble, dt: number, tide: number, ground = coastHeight): WaterImpact | undefined {
  if (stone.state !== "air" || dt <= 0) return;
  const v = stone.velocity;
  const speed = Math.hypot(v.x, v.y, v.z);
  const drag = 1 / (1 + .0105 * speed * dt);
  const x = stone.x + v.x * dt, y = stone.y + v.y * dt - .5 * gravity * dt * dt, z = stone.z + v.z * dt;
  v.x *= drag; v.z *= drag; v.y = v.y * drag - gravity * dt;
  stone.age += dt;
  const clearance = (px: number, py: number, pz: number) => py - Math.max(ground(px, pz), tide) - stone.thickness / 2;
  if (clearance(x, y, z) > 0) {
    stone.x = x; stone.y = y; stone.z = z;
    if (stone.age > 14) stone.state = "sunk";
    return;
  }
  const dx = x - stone.x, dy = y - stone.y, dz = z - stone.z;
  let outside = 0, inside = 1;
  for (let i = 0; i < 8; i++) {
    const fraction = (outside + inside) * .5;
    if (clearance(stone.x + dx * fraction, stone.y + dy * fraction, stone.z + dz * fraction) > 0) outside = fraction;
    else inside = fraction;
  }
  stone.x += dx * outside;
  stone.z += dz * outside;
  const height = ground(stone.x, stone.z);
  stone.y = Math.max(height, tide) + stone.thickness / 2;
  const horizontal = Math.hypot(v.x, v.z);
  if (height >= tide - .01) {
    const span = .055;
    const nx = ground(stone.x - span, stone.z) - ground(stone.x + span, stone.z);
    const ny = span * 2;
    const nz = ground(stone.x, stone.z - span) - ground(stone.x, stone.z + span);
    const normalLength = Math.hypot(nx, ny, nz);
    const normalSpeed = (nx * v.x + ny * v.y + nz * v.z) / normalLength;
    if (normalSpeed < -1.3 && speed > 2) {
      const impulse = -.86 * normalSpeed / normalLength;
      v.x = v.x * .61 + nx * impulse;
      v.y = v.y * .61 + ny * impulse;
      v.z = v.z * .61 + nz * impulse;
      stone.y += .001;
    } else stone.state = "rest";
    return;
  }
  // A fast, shallow approach with a roughly 20° disc tilt can rebound.
  // The loss at impact is an approximation, not a solved fluid interaction.
  const incidence = Math.atan2(Math.abs(v.y), horizontal);
  const skipped = horizontal > 4.4 && incidence < .48 && v.y < -.18;
  if (skipped) {
    v.y = Math.max(.62, Math.abs(v.y) * .42); v.x *= .72; v.z *= .72; stone.skips++;
  } else stone.state = "sunk";
  return { x: stone.x, z: stone.z, speed, skipped };
}
