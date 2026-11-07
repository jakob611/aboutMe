export type Lane = -1 | 0 | 1;
export type RunObject = { d: number; lane: Lane; kind: "light" | "barrier" };
export const lanes: Lane[] = [-1, 0, 1];
export const laneWidth = 2.45;
export const coastLength = 540;
export const coastChapters = [0, 180, 360] as const;
export const coastCurve = (d: number) => 4 * Math.sin(d * .024) + 2 * Math.sin(d * .058);
export const coastHeight = (d: number) => .9 * Math.sin(d * .036) + .42 * Math.sin(d * .076);
const sections = [
  ["...","..*","..*","..*",".*.","**.",".*.","!.*","..*","..*",".*.","*..","*!.","*..",".*.","!*!","***","..."],
  ["...","*..","*!.","*..","*.!",".*.","..*","!!*","..*","!*.",".*.","*!*","*..","!..","!*.","!!*","***","..."],
  ["...","..*","!.*",".!*","..*",".*!","!*.","*!!","*..","*!.","!*.","!!*","..*","!*!",".*.","!!!","***","..."],
] as const;
export const course: RunObject[] = sections.flatMap((section, c) =>
  section.flatMap((row, i) => lanes.flatMap((lane, l) => {
    const code = row[l];
    return code === "." ? [] : [{ d: c * 180 + (i + 1) * 9, lane, kind: code === "*" ? "light" as const : "barrier" as const }];
  })),
);
export type RunAction = "left" | "right" | "jump";
export const makeRun = () => ({ d: 0, x: 0, lane: 0 as Lane, air: 0, vy: 0, chapter: 0, lives: 3, lights: 0, chain: 0, score: 0, shield: 0, next: 0, done: false });
export type Run = ReturnType<typeof makeRun>;
export function runAction(s: Run, action: RunAction) {
  if (s.done) return;
  if (action === "jump") { if (s.air === 0) s.vy = 8.9; return; }
  s.lane = Math.max(-1, Math.min(1, s.lane + (action === "left" ? -1 : 1))) as Lane;
}
export type RunEvent = "light" | "hit" | "clear" | "finish" | "chapter";
export function stepRun(s: Run, dt: number): RunEvent[] {
  if (s.done) return [];
  const events: RunEvent[] = [];
  s.d += (15 + s.chapter * 3.4) * dt;
  s.x += (s.lane * laneWidth - s.x) * (1 - Math.exp(-12 * dt));
  if (s.air || s.vy) {
    s.air += s.vy * dt;
    s.vy -= 21 * dt;
    if (s.air <= 0) { s.air = 0; s.vy = 0; }
  }
  s.shield = Math.max(0, s.shield - dt);
  while (s.next < course.length && course[s.next].d <= s.d + .28) {
    const item = course[s.next++];
    if (Math.abs(s.x - item.lane * laneWidth) > .87) continue;
    if (item.kind === "light") {
      s.lights++; s.chain++; s.score += 50 + Math.min(s.chain - 1, 5) * 10;
      events.push("light");
    } else if (s.air > .79) {
      s.score += 25;
      events.push("clear");
    } else if (!s.shield) {
      s.lives--; s.chain = 0; s.shield = 1.4; events.push("hit");
      if (!s.lives) { s.done = true; return events; }
    }
  }
  if (s.d >= coastLength) {
    s.d = coastLength; s.done = true; s.score += s.lives * 150; events.push("finish");
  } else if (s.chapter < 2 && s.d >= coastChapters[s.chapter + 1]) {
    s.chapter++; events.push("chapter");
  }
  return events;
}

export const paperThrows = 10;
export const paperRim = .73;
export const paperHeight = 1.48;
export const paperDepth = 8;
export type Shot = { vx: number; vy: number; vd: number; wind: number };
export const makePaper = () => ({ shots: 0, hits: 0, chain: 0, score: 0, clock: 0, roundClock: 0, shot: null as Shot | null, flight: 0, last: null as null | "hit" | "perfect" | "miss", lastPoints: 0, settle: 0, done: false });
export type Paper = ReturnType<typeof makePaper>;
export const paperRound = (n: number) => n < 3 ? 0 : n < 6 ? 1 : 2;
export const paperWind = (s: Paper) => paperRound(s.shots) < 2 ? 0 : Math.cos(s.roundClock * 1.3) * .95;
export function paperTarget(s: Paper) {
  const round = paperRound(s.shots);
  return { x: round ? Math.sin(s.roundClock * (round === 2 ? 1.55 : 1.22)) * (round === 2 ? 2.05 : 1.55) : 0, d: paperDepth };
}
export const paperLandingTime = (shot: Shot) => (shot.vy + Math.sqrt(shot.vy ** 2 - 16 * (paperHeight - 1.12))) / 8;
export const shotAt = (shot: Shot, t: number) => ({
  x: shot.vx * t + .5 * shot.wind * t * t,
  y: 1.12 + shot.vy * t - 4 * t * t,
  d: .4 + shot.vd * t,
});
export function aimShot(aim: number, power: number, wind: number): Shot {
  const p = Math.max(.18, Math.min(1.25, power));
  const vy = 4.75 + 1.4 * p;
  const landingTime = paperLandingTime({ vx: 0, vy, vd: 0, wind });
  return { vx: Math.max(-3.9, Math.min(3.9, aim)) / landingTime, vy, vd: (4.2 + 4.65 * p) / landingTime, wind };
}
export const powerFromDrag = (up: number, unit: number) => Math.max(.18, Math.min(1.25, up / Math.max(1, unit)));
export function throwPaper(s: Paper, shot: Shot) {
  if (s.done || s.shot) return false;
  s.shot = shot; s.flight = 0; s.last = null; s.settle = 0; s.lastPoints = 0;
  return true;
}
export type PaperEvent = "hit" | "perfect" | "miss" | "chapter" | "finish";
export function stepPaper(s: Paper, dt: number): PaperEvent[] {
  if (s.done) return [];
  const events: PaperEvent[] = [];
  const priorClock = s.roundClock;
  s.clock += dt; s.roundClock += dt;
  if (!s.shot) return events;
  const prior = s.flight;
  s.flight += dt;
  const landing = paperLandingTime(s.shot);
  if (prior < landing && s.flight >= landing) {
    const ball = shotAt(s.shot, landing);
    const target = paperTarget({ ...s, roundClock: priorClock + landing - prior });
    const error = Math.hypot(ball.x - target.x, ball.d - target.d);
    s.last = error < .24 ? "perfect" : error < paperRim ? "hit" : "miss";
    if (s.last !== "miss") {
      s.hits++; s.chain++;
      s.lastPoints = (s.last === "perfect" ? 125 : 100) + Math.min(5, s.chain - 1) * 25;
      s.score += s.lastPoints;
    } else s.chain = 0;
    events.push(s.last);
  }
  if (s.flight >= landing + .47) {
    const round = paperRound(s.shots);
    s.shots++; s.shot = null; s.settle = s.clock;
    if (s.shots === paperThrows) { s.done = true; events.push("finish"); }
    else if (paperRound(s.shots) !== round) { s.roundClock = 0; events.push("chapter"); }
  }
  return events;
}
