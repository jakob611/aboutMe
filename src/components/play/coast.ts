import { coastCurve, coastLength, course, laneWidth, makeRun, runAction, stepRun, type Run } from "@/lib/arcade";
import { createCanvas, ellipse, polygon } from "./arcade-canvas";
import type { Game, GameOptions } from "./arcade-types";

function drawLightCoast(ctx: CanvasRenderingContext2D, w: number, h: number, s: Run, t: number) {
  const horizon = h * .33;
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, ["#646eab", "#6b5088", "#343e6c"][s.chapter]);
  sky.addColorStop(1, "#f7b28e");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  ellipse(ctx, "#ffda9b", w * .22, horizon * .67, h * .049, h * .049);
  const water = ctx.createLinearGradient(0, horizon, 0, h);
  water.addColorStop(0, "#ac8c9d"); water.addColorStop(1, "#214c55");
  ctx.fillStyle = water; ctx.fillRect(0, horizon, w, h - horizon);
  for (let i = 0; i < 12; i++) {
    const x = ((i * .397 + .15) % 1) * w;
    const r = h * (.016 + i % 3 * .016);
    polygon(ctx, i % 2 ? "#8f748b" : "#75677b", [[x - r * 2.4, horizon + r * .19], [x - r, horizon - r * .52], [x - r * .21, horizon - r * .65], [x + r * .34, horizon - r * .32], [x + r * 2.3, horizon + r * .21]]);
  }
  for (let i = 0; i < 27; i++) {
    const f = ((i * .137) % 1) ** 2;
    const y = horizon + f * h * .64;
    const x = ((i * .297 + t * .002) % 1) * w;
    ellipse(ctx, i % 3 ? "#dfb39a44" : "#eddac888", x, y, (3 + f * 52), .6 + f * 1.2);
  }
  const f = Math.max(h * .26, Math.min(w * .43, h * .69));
  const project = (x: number, d: number, y = 0): [number, number] => {
    const z = Math.max(-4.6, d - s.d);
    const scale = 8 / (8 + z);
    return [w / 2 + (x + coastCurve(d) - coastCurve(s.d) - s.x * .44) * f * .20 * scale, horizon + (h * .42 - y * f * .2) * scale];
  };
  for (let i = 47; i >= 0; i--) {
    const d = Math.floor(s.d / 2.8) * 2.8 + i * 2.8 - 2.8, d2 = d + 2.8;
    const quad = (x1: number, x2: number, c: string) => polygon(ctx, c, [project(x1, d), project(x2, d), project(x2, d2), project(x1, d2)]);
    quad(-6.1, 6.1, i % 2 ? "#977b57" : "#a48b62");
    quad(-4.12, 4.12, "#e1ab7b"); quad(-3.98, 3.98, i % 2 ? "#996653" : "#a16b55");
    if ((Math.round(d / 2.8) % 2) === 0) for (const side of [-1, 1]) quad(side * 1.2 - .04, side * 1.2 + .04, "#deb28a");
    if (i % 3 === 0) for (const side of [-1, 1]) {
      const x = side * 5.1, size = 1.7 + Math.sin(d * .55) ** 2 * 2;
      polygon(ctx, "#325149", [project(x - .59, d), project(x + .59, d), project(x + .05, d, size)]);
      polygon(ctx, "#41664e", [project(x - .59, d), project(x + .05, d, size), project(x + .07, d)]);
    }
  }
  for (let i = course.length - 1; i >= 0; i--) {
    const item = course[i], d = item.d;
    if (d < s.d + .28 || d > s.d + 115) continue;
    const x = item.lane * laneWidth;
    if (item.kind === "barrier") {
      polygon(ctx, "#b9452f", [project(x - 1, d), project(x + 1, d), project(x + 1, d, .78), project(x - 1, d, .78)]);
      for (let j = -2; j <= 2; j++) polygon(ctx, "#ffd192", [project(x + j * .32, d, .13), project(x + j * .32 + .12, d, .13), project(x + j * .32 + .23, d, .65), project(x + j * .32 + .11, d, .65)]);
    } else {
      const y = 1.12 + Math.sin(t * 5 + d) * .14;
      polygon(ctx, "#ffcf5d", [project(x, d, y + .47), project(x + .35, d, y), project(x, d, y - .47), project(x - .35, d, y)]);
      polygon(ctx, "#fff1a8", [project(x, d, y + .47), project(x + .35, d, y), project(x, d, y)]);
    }
  }
  const [x, y] = project(s.x, s.d, s.air);
  const size = Math.max(15, f * .18);
  ellipse(ctx, "#392e4166", x, project(s.x, s.d)[1] + size * .17, size * 1.17, size * .32);
  ctx.save(); ctx.translate(x, y); ctx.rotate((s.x - s.lane * laneWidth) * .13); ctx.globalAlpha = s.shield && Math.sin(t * 26) < -.4 ? .52 : 1;
  ellipse(ctx, "#292c36", -size * .72, -size * .12, size * .37, size * .44);
  ellipse(ctx, "#292c36", size * .72, -size * .12, size * .37, size * .44);
  polygon(ctx, "#40d6b4", [[-size, -size * .25], [-size * .57, -size * .87], [size * .57, -size * .87], [size, -size * .25], [size * .71, size * .14], [-size * .71, size * .14]]);
  polygon(ctx, "#103f54", [[-size * .52, -size * .47], [-size * .32, -size * .8], [size * .32, -size * .8], [size * .52, -size * .47]]);
  ellipse(ctx, "#ffdc93", -size * .63, -size * .05, size * .18, size * .10);
  ellipse(ctx, "#ffdc93", size * .63, -size * .05, size * .18, size * .10);
  ctx.restore();
}

export async function createCoast(options: GameOptions, flat = false): Promise<Game> {
  let state = makeRun(), active = false, dirty = true, last = "", time = 0;
  function tick(dt: number) {
    const events = active ? stepRun(state, dt) : [];
    if (state.done) active = false;
    const s = state, distance = Math.floor(s.d);
    const next = [s.score, s.chapter, s.lives, s.lights, s.chain, distance, s.lane].join(",");
    const event = events.at(-1);
    if (next !== last || event) {
      last = next;
      options.onUpdate({ score: s.score, chapter: s.chapter, lives: s.lives, lights: s.lights, chain: s.chain, distance, lane: s.lane, won: s.d >= coastLength }, event);
    }
    if (state.done && events.length) options.onEnd();
    if (active) time += dt;
    return event;
  }
  let view: Awaited<ReturnType<typeof import("./coast-render")["createCoastView"]>> | undefined;
  let canvas: ReturnType<typeof createCanvas> | undefined;
  if (!flat) {
    try { view = (await import("./coast-render")).createCoastView(options); }
    catch { options.host.querySelector("canvas")?.remove(); }
  }
  if (view) {
    const renderer = view;
    renderer.tick(dt => {
      const wasActive = active;
      const event = tick(dt); renderer.render(state, time, active, event);
      const redraw = dirty || wasActive; dirty = false; return redraw;
    });
  } else {
    options.onTier("2d");
    canvas = createCanvas(options.host, "coast-2d");
    canvas.loop((ctx, w, h, dt, resized) => {
      if (!active && !dirty && !resized) return;
      tick(dt); drawLightCoast(ctx, w, h, state, time); dirty = false;
    });
  }
  return {
    reset() { state = makeRun(); last = ""; time = 0; dirty = true; canvas?.invalidate(); },
    play(value) { active = value && !state.done; dirty = true; },
    run(action) { if (active) runAction(state, action); },
    quality(value) { view?.quality(value); dirty = true; },
    dispose() { view?.dispose(); canvas?.dispose(); },
  };
}
