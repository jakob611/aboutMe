import { aimShot, makePaper, paperLandingTime, paperRim, paperRound, paperTarget, paperWind, shotAt, stepPaper, throwPaper, type Paper, type Shot } from "@/lib/arcade";
import { createCanvas, ellipse, polygon } from "./arcade-canvas";
import type { Game, GameOptions } from "./arcade-types";

type Vec = [number, number];
type Fleck = { x: number; y: number; dx: number; dy: number; age: number; color: string };
const colors = ["#ffe29b", "#f28e65", "#8ee7cb", "#f8f0d7"];
function grad(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, b: number, stops: [number, string][]) {
  const gradient = ctx.createLinearGradient(x, y, a, b);
  for (const [at, color] of stops) gradient.addColorStop(at, color);
  return gradient;
}
const grain = (n: number) => { const x = Math.sin(n * 125.6 + 21) * 43758.5453; return x - Math.floor(x); };
function paperBall(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, angle: number, fold: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.scale(r * (1.58 - .58 * fold), r * (.79 + .21 * fold));
  const points: Vec[] = [[-.77,-.53],[-.28,-.97],[.35,-.92],[.86,-.57],[.94,-.02],[.68,.7],[.21,.99],[-.36,.82],[-.85,.51],[-1,.02]];
  polygon(ctx, "#e6d9b6", points);
  const triangles: [number, number, number, string][] = [[0,1,9,"#f9f3da"],[1,2,9,"#f7efd5"],[2,3,4,"#fff5df"],[2,4,9,"#d6c5a0"],[4,5,9,"#efddb5"],[5,6,9,"#baab8c"],[6,7,9,"#fff0d4"],[7,8,9,"#d3bd99"]];
  const mid: Vec = [.1, -.04];
  for (const [a,b,c,color] of triangles) polygon(ctx, color, [points[a], points[b], c === 9 ? mid : points[c]]);
  polygon(ctx, "#f3e6c6", [points[9], points[0], mid, points[8]]);
  ctx.strokeStyle = "#74749963"; ctx.lineWidth = .04;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(-.76, -.32 + i * .22); ctx.lineTo(-.16, -.27 + i * .22); ctx.lineTo(.21, -.44 + i * .28); ctx.lineTo(.58, -.37 + i * .31); ctx.stroke();
  }
  ctx.restore();
}

function drawCourt(ctx: CanvasRenderingContext2D, w: number, h: number, s: Paper, aim: Shot | null, particles: Fleck[], reduced: boolean) {
  const round = paperRound(s.shots);
  const y0 = h * .305, kx = Math.min(w * 1.78, h * 2.5), ky = h * 1.37;
  const proj = (x: number, y: number, d: number): Vec => [w / 2 + x * kx / (d + 7), y0 + (3.72 - y) * ky / (d + 7)];
  const wall = grad(ctx, 0, 0, 0, h * .62, [[0,"#26334e"],[.54,"#3d4e68"],[1,"#293b52"]]);
  ctx.fillStyle = wall; ctx.fillRect(0, 0, w, h);
  const base = h * .415;
  const floor = grad(ctx, 0, base, 0, h, [[0,"#bb896b"],[.54,"#ac7756"],[1,"#67483f"]]);
  ctx.fillStyle = floor; ctx.fillRect(0, base, w, h - base);
  ctx.fillStyle = "#1d2b42"; ctx.fillRect(0, base - 5, w, 7);
  ctx.fillStyle = "#bbc4bd52"; ctx.fillRect(0, base - 5, w, 1);
  for (let i = -20; i <= 20; i++) {
    const x = w / 2 + i * (w * .046 + 4);
    ctx.beginPath(); ctx.moveTo(w / 2 + (x - w / 2) * .29, base + 2); ctx.lineTo(x, h);
    ctx.strokeStyle = i % 3 === 0 ? "#50322c60" : "#efbc882d"; ctx.lineWidth = i % 3 === 0 ? 2 : 1; ctx.stroke();
  }
  for (let i = 0; i < 65; i++) {
    const x = grain(i) * w, y = base + grain(i + 32) * (h - base);
    ellipse(ctx, i % 2 ? "#f7cda526" : "#51333125", x, y, 2 + grain(i + 13) * 16, .4 + grain(i + 35) * .7);
  }
  ctx.save();
  ctx.strokeStyle = "#fff0c051"; ctx.lineWidth = Math.max(1, w * .004);
  ctx.setLineDash([6, 7]);
  const [arcX, arcY] = proj(0, 0, 8);
  ctx.beginPath(); ctx.ellipse(arcX, arcY + 9, kx * .205, h * .082, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  const [markX, markY] = proj(0, 0, 2.9);
  ctx.beginPath(); ctx.moveTo(markX - w * .11, markY); ctx.lineTo(markX + w * .11, markY); ctx.stroke();
  ctx.restore();

  const wx = w * .055, wy = h * .116, ww = Math.min(w * .32, h * .39), wh = h * .249;
  ctx.fillStyle = "#16253d"; ctx.fillRect(wx - 6, wy - 6, ww + 12, wh + 14);
  ctx.fillStyle = grad(ctx, wx, wy, wx, wy + wh, [[0,"#7a6f9c"],[.48,"#de9994"],[1,"#ffd89d"]]); ctx.fillRect(wx, wy, ww, wh);
  ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
  ellipse(ctx, "#ffe0a5", wx + ww * .61, wy + wh * .43, wh * .117, wh * .117);
  polygon(ctx, "#a77b87", [[wx,wy+wh*.81],[wx+ww*.21,wy+wh*.68],[wx+ww*.36,wy+wh*.75],[wx+ww*.78,wy+wh*.63],[wx+ww,wy+wh*.69],[wx+ww,wy+wh],[wx,wy+wh]]);
  polygon(ctx, "#696080", [[wx,wy+wh*.91],[wx+ww*.38,wy+wh*.79],[wx+ww*.54,wy+wh*.86],[wx+ww,wy+wh*.72],[wx+ww,wy+wh],[wx,wy+wh]]);
  for (let i = 1; i < 3; i++) { ctx.fillStyle = "#31415b"; ctx.fillRect(wx + ww * i / 3 - 1.5, wy, 3, wh); }
  ctx.fillStyle = "#31415b"; ctx.fillRect(wx, wy + wh * .53, ww, 3); ctx.restore();
  ctx.fillStyle = "#ddd5ad"; ctx.fillRect(wx - 7, wy + wh + 1, ww + 14, 4);
  polygon(ctx, grad(ctx, 0, base, w * .8, h * .84, [[0,"#ffd99264"],[1,"#ffc16e10"]]), [[wx,base+1],[wx+ww,base+1],[w*.83,h*.87],[w*.35,h*.91]]);
  for (let i = 1; i <= 2; i++) polygon(ctx, "#6d4a5c21", [[wx+ww*i/3,base+1],[wx+ww*i/3+3,base+1],[w*(.35+i*.16)+10,h*.9],[w*(.35+i*.16),h*.9]]);

  const posterW = Math.min(w * .20, h * .235), posterH = posterW * 1.02;
  const px = w * .89 - posterW, py = h * .162;
  ctx.save(); ctx.translate(px + posterW / 2, py + posterH / 2); ctx.rotate(.045);
  ctx.fillStyle = "#192b40"; ctx.fillRect(-posterW / 2 - 3, -posterH / 2 - 3, posterW + 6, posterH + 6);
  ctx.fillStyle = "#dba768"; ctx.fillRect(-posterW / 2, -posterH / 2, posterW, posterH);
  ctx.strokeStyle = "#9c563f"; ctx.lineWidth = 1; ctx.strokeRect(-posterW * .42, -posterH * .42, posterW * .84, posterH * .84);
  ctx.fillStyle = "#593d43"; ctx.textAlign = "center"; ctx.font = `bold ${posterW * .19}px Georgia`; ctx.fillText("PAPER", 0, -posterH * .08);
  ctx.font = `bold ${posterW * .22}px Georgia`; ctx.fillText("CLUB", 0, posterH * .14);
  for (let i = -1; i <= 1; i++) ellipse(ctx, "#9c563f", i * posterW * .087, posterH * .29, posterW * .017, posterW * .017);
  ctx.restore();

  const target = paperTarget(s), d = target.d;
  const [bx, by] = proj(target.x, 1.48, d), [fx, fy] = proj(target.x, 0, d), rx = paperRim * kx / (7 + d), ry = rx * .245;
  const [railX, railY] = proj(0, .03, d);
  if (round) {
    ctx.fillStyle = "#583f49"; ctx.fillRect(railX - rx * 4.7, railY - 4, rx * 9.4, 7);
    ctx.fillStyle = "#dfb886"; ctx.fillRect(railX - rx * 4.7, railY - 4, rx * 9.4, 2);
    for (let i = -4; i <= 4; i++) { ctx.fillStyle = "#433243"; ctx.fillRect(railX + i * rx, railY - 2, 2, 4); }
  }
  ellipse(ctx, "#63454578", fx + rx * .48, fy + ry * .47, rx * 1.53, ry * 1.24);
  const fall = (s.last === "perfect" || s.last === "hit") && !!s.shot && !reduced ? Math.max(0, s.flight - paperLandingTime(s.shot)) : 0;
  const bump = fall ? Math.sin(fall * 23) * Math.max(0, 1 - fall * 2.2) * rx * .1 : 0;
  const basket = (front: boolean) => {
    const r = rx * 1.13 + bump;
    if (!front) {
      ellipse(ctx, "#34384e", bx, by + ry * .14, r, ry);
      ellipse(ctx, s.last && s.last !== "miss" && s.shot ? "#53624d" : "#222a41", bx, by, r * .92, ry * .82);
      ctx.beginPath(); ctx.ellipse(bx, by, r, ry, 0, Math.PI, Math.PI * 2);
      ctx.lineWidth = Math.max(2, r * .085); ctx.strokeStyle = "#ecd29b"; ctx.stroke();
      return;
    }
    const bottom = fy - ry * .12, lower = r * .73;
    ctx.beginPath(); ctx.moveTo(bx - r, by);
    ctx.bezierCurveTo(bx - r * .62, by + ry * 1.29, bx + r * .62, by + ry * 1.29, bx + r, by);
    ctx.lineTo(fx + lower, bottom); ctx.quadraticCurveTo(fx, bottom + ry * 1.59, fx - lower, bottom); ctx.closePath();
    ctx.fillStyle = grad(ctx, bx - r, by, bx + r, by, [[0,"#a96b4a"],[.3,"#e0ab6e"],[.6,"#b7754c"],[1,"#754b43"]]); ctx.fill();
    ctx.save(); ctx.clip();
    for (let i = -8; i <= 8; i++) {
      ctx.beginPath(); ctx.moveTo(bx + i * r * .123, by); ctx.lineTo(fx + i * lower * .123, bottom + ry);
      ctx.strokeStyle = i % 2 ? "#6b4d4759" : "#ffe0a472"; ctx.lineWidth = Math.max(1, r * .041); ctx.stroke();
    }
    for (let i = 1; i <= 11; i++) {
      const y = by + i / 11 * (bottom - by);
      ctx.beginPath(); ctx.moveTo(bx - r, y); ctx.quadraticCurveTo(bx, y + ry * 1.55, bx + r, y);
      ctx.strokeStyle = i % 2 ? "#6b4d474f" : "#ffe0a469"; ctx.lineWidth = Math.max(1, r * .037); ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(bx, by, r, ry, 0, 0, Math.PI); ctx.lineWidth = Math.max(2, r * .088); ctx.strokeStyle = "#f1c689"; ctx.stroke();
    ctx.fillStyle = "#455068";
    ctx.beginPath(); ctx.roundRect(bx-r*.29, by+(bottom-by)*.42, r*.58, r*.27, 2); ctx.fill();
    ctx.fillStyle = "#ffdfa5"; ctx.font = `bold ${r * .20}px monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("0" + (round + 1), bx, by+(bottom-by)*.42+r*.14);
  };
  basket(false);
  if (aim && !s.shot) {
    const landing = paperLandingTime(aim);
    for (let i = 2; i < 16; i++) {
      const dot = shotAt(aim, i / 15 * landing);
      const [x, y] = proj(dot.x, dot.y, dot.d);
      ellipse(ctx, i === 15 ? "#ffdf8b" : "#ffedb4bd", x, y, i === 15 ? 5 : 2.3, i === 15 ? 5 : 2.3);
    }
  }
  const ball = s.shot ? shotAt(s.shot, s.flight) : { x: 0, y: 1.12, d: .4 };
  if (ball.y > -.1) {
    const [x, y] = proj(ball.x, ball.y, ball.d), [sx, sy] = proj(ball.x, 0, ball.d);
    const r = Math.max(5, Math.min(40, kx * .39 / (ball.d + 7)));
    const visible = s.last === "perfect" || s.last === "hit" ? Math.max(0, 1 - fall * 5) : 1;
    if (visible > 0) {
      ellipse(ctx, "#37293659", sx, Math.min(h * .98, sy), r * .99, r * .25);
      ctx.save(); ctx.globalAlpha = visible;
      const fold = s.shots && !s.shot && !reduced ? Math.min(1, Math.max(.12, (s.clock - s.settle) * 3.6)) : 1;
      paperBall(ctx, x, y, r, s.shot ? s.flight * 6.1 : -.27 * fold, fold);
      ctx.restore();
    }
  }
  basket(true);
  if (!reduced) for (const fleck of particles) {
    const opacity = Math.max(0, 1 - fleck.age / .78);
    ctx.save(); ctx.globalAlpha = opacity; ctx.translate(bx + fleck.x, by + fleck.y); ctx.rotate(fleck.age * fleck.dx * .08);
    ctx.fillStyle = fleck.color; ctx.fillRect(-2.7, -1.25, 5.4, 2.5); ctx.restore();
  }
  ctx.fillStyle = grad(ctx, 0, h * .85, 0, h, [[0,"#292e3a00"],[1,"#171d32aa"]]); ctx.fillRect(0, h * .85, w, h * .15);
}

export function createPaperGame(options: GameOptions): Game {
  const canvas = createCanvas(options.host, "paper-2d");
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  let state = makePaper(), active = false, last = "", dirty = true, aim: [number, number] | null = null;
  let particles: Fleck[] = [];
  options.onTier("2d");
  canvas.loop((ctx, w, h, dt, resized) => {
    if (!active && !dirty && !resized) return;
    const events = active ? stepPaper(state, dt) : [];
    const s = state, wind = paperWind(s);
    for (const event of events) if ((event === "hit" || event === "perfect") && !preference.matches) {
      particles = Array.from({ length: event === "perfect" ? 25 : 14 }, (_, i) => ({
        x: 0, y: 0, dx: (grain(i + s.shots * 32) - .5) * 260,
        dy: -72 - grain(i + 39) * 175, age: 0, color: colors[i % colors.length],
      }));
    }
    if (active) particles = particles.filter(p => { p.x += p.dx * dt; p.y += p.dy * dt; p.dy += 420 * dt; p.age += dt; return p.age < .78; });
    drawCourt(ctx, w, h, s, aim && aimShot(...aim, wind), particles, preference.matches);
    dirty = false;
    const snapshot = { shots: s.shots, hits: s.hits, score: s.score, chain: s.chain, chapter: paperRound(s.shots), wind: Math.round(wind * 5) / 5, won: s.hits >= 6, points: s.lastPoints };
    const key = JSON.stringify(snapshot), event = events.at(-1);
    if (last !== key || event) { last = key; options.onUpdate(snapshot, event); }
    if (s.done && active) { active = false; options.onEnd(); }
  });
  return {
    reset() { state = makePaper(); aim = null; particles = []; last = ""; dirty = true; },
    play(value) { active = value && !state.done; if (!active) aim = null; dirty = true; },
    aim(x, p) { if (active && !state.shot) { aim = [x, p]; dirty = true; } },
    clearAim() { aim = null; dirty = true; },
    toss(x, p) { aim = null; if (active) throwPaper(state, aimShot(x, p, paperWind(state))); dirty = true; },
    dispose: canvas.dispose,
  };
}
