import type { Tier, Quality } from "@/lib/play-model";
import { clamp, coastHeight, coastStart, coastViewpoints, distanceToWater, walkCoast, type BoulderCollision, type Viewpoint, type Walker } from "./terrain";
import type { LightPreset } from "./seascape";

export type CoastSettings = { light: LightPreset; wind: number; tide: number; quality: Quality };
export type CoastTelemetry = { x: number; z: number; heading: number; elevation: number; water: number; distance: number };
export type CoastPose = Omit<Walker, "speed">;
export type CoastEngine = {
  settings(value: CoastSettings): void;
  move(strafe: number, forward: number, turn: number): void;
  look(yaw: number, pitch: number): void;
  visit(where: Viewpoint): void;
  pose(): CoastPose;
  throwPebble?(): void;
  dispose(): void;
};
export type CoastOptions = {
  host: HTMLDivElement;
  initial: CoastSettings;
  initialPose?: CoastPose;
  tier(value: Tier | "map"): void;
  telemetry(value: CoastTelemetry): void;
  onLost(): void;
  sound(distance: number, bearing: number, agitation: number): void;
  signal: AbortSignal;
};

export function coastSession(options: CoastOptions, stones: readonly BoulderCollision[] = []) {
  const state: Walker = { ...(options.initialPose ?? coastStart), speed: 0 };
  let config = options.initial;
  let strafe = 0, forward = 0, turn = 0, timeSinceTelemetry = 1;
  const emit = () => {
    const elevation = coastHeight(state.x, state.z);
    const distance = distanceToWater(state.x, state.z);
    options.telemetry({
      x: state.x, z: state.z, heading: ((state.yaw * 180 / Math.PI) % 360 + 360) % 360,
      elevation, water: Math.max(0, config.tide - elevation), distance,
    });
    options.sound(Math.max(0, distance - config.tide * 4), -Math.cos(state.yaw), config.wind / 12);
  };
  return {
    state,
    get config() { return config; },
    pose() { return { x: state.x, z: state.z, yaw: state.yaw, pitch: state.pitch }; },
    settings(value: CoastSettings) { config = value; timeSinceTelemetry = 1; },
    move(side: number, ahead: number, rotation: number) {
      strafe = clamp(side, -1, 1);
      forward = clamp(ahead, -1, 1);
      turn = clamp(rotation, -1, 1);
    },
    look(yaw: number, pitch: number) {
      state.yaw = (state.yaw + yaw) % (Math.PI * 2);
      state.pitch = clamp(state.pitch + pitch, -1.44, 1.29);
    },
    visit(where: Viewpoint) {
      const viewpoint = coastViewpoints.find(point => point.id === where) ?? coastStart;
      Object.assign(state, { x: viewpoint.x, z: viewpoint.z, yaw: viewpoint.yaw, pitch: viewpoint.pitch, speed: 0 });
      strafe = forward = turn = 0;
      timeSinceTelemetry = 1;
    },
    step(dt: number) {
      if (dt <= 0) { emit(); return; }
      state.yaw = (state.yaw + turn * dt * 1.24) % (Math.PI * 2);
      let seconds = dt;
      while (seconds > .0001) {
        const step = Math.min(seconds, .017);
        walkCoast(state, strafe, forward, step, config.tide, stones);
        seconds -= step;
      }
      timeSinceTelemetry += dt;
      if (timeSinceTelemetry >= .16) {
        emit();
        timeSinceTelemetry = 0;
      }
    },
  };
}

export function createCoastMap(options: CoastOptions): CoastEngine {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas 2D unavailable");
  canvas.dataset.renderer = "coast-map";
  canvas.setAttribute("aria-hidden", "true");
  options.host.appendChild(canvas);
  const map = document.createElement("canvas");
  map.width = 308;
  map.height = 402;
  const image = map.getContext("2d");
  if (!image) { canvas.remove(); throw new Error("Canvas 2D unavailable"); }
  const colors = image.createImageData(map.width, map.height);
  const heights = new Float32Array(map.width * map.height);
  const shade = new Float32Array(heights.length);
  const session = coastSession(options);
  let frame = 0, previous = 0, lastTide = NaN;
  const minX = -125, minZ = -194, horizontal = 275, vertical = 374;
  for (let row = 0; row < map.height; row++) for (let col = 0; col < map.width; col++) {
    const x = minX + (col / (map.width - 1)) * horizontal, z = minZ + row / (map.height - 1) * vertical;
    const index = row * map.width + col;
    heights[index] = coastHeight(x, z);
    shade[index] = Math.max(.65, Math.min(1.22, 1 + (coastHeight(x + 1, z + .75) - heights[index]) * .093));
  }
  const resize = new ResizeObserver(() => {
    const { width, height } = options.host.getBoundingClientRect();
    const scale = Math.min(devicePixelRatio, 1.5);
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
  });
  resize.observe(options.host);
  options.tier("map");
  const paint = (now: number) => {
    frame = requestAnimationFrame(paint);
    if (document.hidden) { previous = 0; return; }
    const dt = previous ? (now - previous) * .001 : 0;
    if (previous && dt < .028) return;
    previous = now;
    session.step(Math.min(.06, dt));
    if (session.config.tide !== lastTide) {
      lastTide = session.config.tide;
      for (let index = 0; index < heights.length; index++) {
        const y = heights[index], wet = y < lastTide;
        const contour = !wet && Math.abs(y / 3 - Math.round(y / 3)) < .047;
        const inland = clamp(y / 19, 0, 1), depth = clamp((lastTide - y) / 10, 0, 1);
        const value = (wet ? 1 : shade[index]) * (contour ? .8 : 1);
        colors.data.set([
          (wet ? 89 - depth * 58 : 160 - inland * 66) * value,
          (wet ? 145 - depth * 64 : 140 - inland * 31) * value,
          (wet ? 137 - depth * 42 : 100 - inland * 43) * value, 255,
        ], index * 4);
      }
      image.putImageData(colors, 0, 0);
    }
    const width = canvas.width, height = canvas.height;
    ctx.fillStyle = "#223c43";
    ctx.fillRect(0, 0, width, height);
    const scale = Math.min(width / horizontal, height / vertical) * .96;
    const dx = (width - horizontal * scale) / 2, dz = (height - vertical * scale) / 2;
    ctx.drawImage(map, dx, dz, horizontal * scale, vertical * scale);
    const unit = Math.min(devicePixelRatio, 1.5);
    for (const landmark of coastViewpoints) {
      ctx.beginPath();
      ctx.arc(dx + (landmark.x - minX) * scale, dz + (landmark.z - minZ) * scale, 4.8 * unit, 0, Math.PI * 2);
      ctx.fillStyle = "#203834";
      ctx.strokeStyle = "#e9d5aa";
      ctx.lineWidth = 1.1 * unit;
      ctx.fill();
      ctx.stroke();
    }
    const legendX = dx + 14 * unit, legendY = dz + vertical * scale - 22 * unit;
    ctx.strokeStyle = "#e9d5aa";
    ctx.fillStyle = "#f6e9c9";
    ctx.lineWidth = 1.3 * unit;
    ctx.font = `${10 * unit}px system-ui`;
    ctx.beginPath();
    ctx.moveTo(legendX, legendY - 3 * unit); ctx.lineTo(legendX, legendY);
    ctx.lineTo(legendX + 20 * scale, legendY); ctx.lineTo(legendX + 20 * scale, legendY - 3 * unit);
    ctx.stroke();
    ctx.fillText("20 m", legendX, legendY - 6 * unit);
    const visitor = session.state;
    ctx.save();
    ctx.translate(dx + (visitor.x - minX) * scale, dz + (visitor.z - minZ) * scale);
    ctx.rotate(visitor.yaw);
    ctx.fillStyle = "#f8e3a9";
    ctx.strokeStyle = "#1d3439";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -11); ctx.lineTo(7, 7); ctx.lineTo(0, 4); ctx.lineTo(-7, 7); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  };
  frame = requestAnimationFrame(paint);
  return {
    ...session,
    dispose() { cancelAnimationFrame(frame); resize.disconnect(); canvas.remove(); },
  };
}
