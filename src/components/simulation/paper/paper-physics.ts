/** Metres, seconds and kilograms. The solver is an interactive shell approximation. */
export const A4_WIDTH = 0.210;
export const A4_LENGTH = 0.297;
export const PAPER_MASS = A4_WIDTH * A4_LENGTH * 0.080;
export const GRAVITY = 9.80665;
export const STEP = 1 / 120;
export const TABLE_HALF_WIDTH = 0.38;
export const TABLE_HALF_DEPTH = 0.30;
export const TABLE_CONTACT = 0.00065;
export const DESK_PROPS = {
  pencil: { x: .162, z: -.034, height: .004, angle: -.15 },
  ruler: { x: -.072, z: -.182, height: .0013, angle: .075 },
  notebook: { x: -.224, z: .081, height: .0128, angle: -.21 },
} as const;
const LAYERS = 0.0026;
const SELF_SPACING = 0.005;
const LATTICE_X = 19;
const LATTICE_Z = 27;

export type Point = { x: number; y: number; z: number };
type Tool = "fold" | "unfold" | "crumple" | "smooth";
type Constraint = { a: number; b: number; length: number; rest: number; stiffness: number };
type Hand = { node: number; position: Point; velocity: Point };
type Press = { tool: Tool; time: number; origin: Point; start: Float32Array; angle: number };

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const ease = (n: number) => { const x = clamp(n, 0, 1); return x * x * (3 - 2 * x); };
const random = (i: number) => {
  const n = Math.sin(i * 127.1 + 17.5) * 43758.5453123;
  return n - Math.floor(n);
};

const notebookCos = Math.cos(DESK_PROPS.notebook.angle), notebookSin = Math.sin(DESK_PROPS.notebook.angle);
const rulerCos = Math.cos(DESK_PROPS.ruler.angle), rulerSin = Math.sin(DESK_PROPS.ruler.angle);

/** Contact envelope of the rigid objects resting on the desk. */
export function deskContactHeight(x: number, z: number) {
  const { pencil, ruler, notebook } = DESK_PROPS;
  const bookX = x - notebook.x, bookZ = z - notebook.z;
  if (Math.abs(bookX) < .06 && Math.abs(bookZ) < .066) {
    const along = Math.abs(bookX * notebookCos - bookZ * notebookSin);
    const across = Math.abs(bookX * notebookSin + bookZ * notebookCos);
    if (along <= .044 && across <= .054) return notebook.height + TABLE_CONTACT;
  }
  const rulerX = x - ruler.x, rulerZ = z - ruler.z;
  if (Math.abs(rulerX) < .086 && Math.abs(rulerZ) < .02
    && Math.abs(rulerX * rulerCos - rulerZ * rulerSin) <= .082
    && Math.abs(rulerX * rulerSin + rulerZ * rulerCos) <= .010) return ruler.height + TABLE_CONTACT;
  const pencilZ = z - pencil.z;
  if (Math.abs(pencilZ) < .087) {
    const shaft = Math.abs(x - pencil.x + Math.tan(pencil.angle) * pencilZ);
    const radius = Math.abs(pencilZ) < .071 ? .0041 : .0041 * (1 - (Math.abs(pencilZ) - .071) / .016);
    if (shaft <= radius) return pencil.height + Math.sqrt(radius * radius - shaft * shaft) + TABLE_CONTACT;
  }
  return TABLE_CONTACT;
}

export class PaperSheet {
  readonly columns = LATTICE_X;
  readonly rows = LATTICE_Z;
  readonly count = this.columns * this.rows;
  readonly positions = new Float32Array(this.count * 3);
  readonly previous = new Float32Array(this.count * 3);
  readonly planar = new Float32Array(this.count * 3);
  readonly creases = new Float32Array(this.count);
  readonly triangles = new Uint16Array((this.columns - 1) * (this.rows - 1) * 6);
  readonly uv = new Float32Array(this.count * 2);
  readonly outlines: number[] = [];
  readonly foldMemory = [0, 0];
  private readonly links: Constraint[] = [];
  private readonly flexion: Constraint[] = [];
  private readonly tension: Constraint[] = [];
  private readonly contactBuckets = new Map<number, number[]>();
  private readonly bucketPool: number[][] = [];
  private readonly cellX = new Int16Array(this.count);
  private readonly cellY = new Int16Array(this.count);
  private readonly cellZ = new Int16Array(this.count);
  private readonly handReach = new Float32Array(this.count);
  private press: Press | null = null;
  private hand: Hand | null = null;
  private time = 0;
  private quiet = 0;
  private turbulence = 0;
  private moving = true;
  private folded = false;
  private turn = -0.13;
  private wind = 0;
  private passes = 5;
  private pressureCount = 0;
  private shapeX = 0;
  private shapeZ = 0;
  private majorAxis = true;

  constructor() {
    let face = 0;
    const index = (x: number, z: number) => z * this.columns + x;
    const add = (target: Constraint[], a: number, b: number, stiffness: number) => {
      const length = Math.hypot(this.planar[a * 3] - this.planar[b * 3], this.planar[a * 3 + 2] - this.planar[b * 3 + 2]);
      target.push({ a, b, length, rest: length, stiffness });
    };
    for (let z = 0; z < this.rows; z++) {
      for (let x = 0; x < this.columns; x++) {
        const node = index(x, z);
        this.uv[node * 2] = x / (this.columns - 1);
        this.uv[node * 2 + 1] = 1 - z / (this.rows - 1);
        const px = (this.uv[node * 2] - .5) * A4_WIDTH;
        const pz = (.5 - this.uv[node * 2 + 1]) * A4_LENGTH;
        const jitter = x > 0 && x < this.columns - 1 && z > 0 && z < this.rows - 1;
        // Break up perfectly regular buckling without moving the edge or fold axis.
        this.planar[node * 3] = px + (jitter && x !== (this.columns - 1) / 2 ? (random(node) - .5) * .0019 : 0);
        this.planar[node * 3 + 2] = pz + (jitter && z !== (this.rows - 1) / 2 ? (random(node + 53) - .5) * .0019 : 0);
      }
    }
    for (let z = 0; z < this.rows; z++) {
      for (let x = 0; x < this.columns; x++) {
        const node = index(x, z);
        if (x < this.columns - 1) add(this.links, node, index(x + 1, z), .98);
        if (z < this.rows - 1) add(this.links, node, index(x, z + 1), .98);
        if (x < this.columns - 1 && z < this.rows - 1) {
          const right = index(x + 1, z);
          const below = index(x, z + 1);
          const diagonal = index(x + 1, z + 1);
          if ((x + z) % 2 === 0) {
            add(this.links, node, diagonal, .94);
            this.triangles.set([node, below, diagonal, node, diagonal, right], face);
          } else {
            add(this.links, right, below, .94);
            this.triangles.set([node, below, right, right, below, diagonal], face);
          }
          face += 6;
        }
        if (x < this.columns - 2) add(this.flexion, node, index(x + 2, z), .18);
        if (z < this.rows - 2) add(this.flexion, node, index(x, z + 2), .19);
        if (x < this.columns - 2 && z < this.rows - 2) {
          add(this.flexion, node, index(x + 2, z + 2), .085);
          add(this.flexion, index(x + 2, z), index(x, z + 2), .085);
        }
        for (const span of [2, 4, 8]) {
          if (x + span < this.columns) add(this.tension, node, index(x + span, z), .9);
          if (z + span < this.rows) add(this.tension, node, index(x, z + span), .9);
        }
      }
    }
    for (let x = 0; x < this.columns; x++) this.outlines.push(index(x, 0));
    for (let z = 1; z < this.rows; z++) this.outlines.push(index(this.columns - 1, z));
    for (let x = this.columns - 2; x >= 0; x--) this.outlines.push(index(x, this.rows - 1));
    for (let z = this.rows - 2; z > 0; z--) this.outlines.push(index(0, z));
    this.reset();
  }

  get awake() { return this.moving; }
  get holding() { return this.hand !== null; }
  get forming() { return this.press !== null; }
  get isFolded() { return this.folded; }

  setPasses(passes: number) { this.passes = passes; }

  setWind(fanStrength: number) {
    this.wind = clamp(fanStrength, 0, 1) * 4;
    this.wake();
  }

  reset() {
    this.hand = null;
    this.press = null;
    this.folded = false;
    this.turn = -0.13;
    this.pressureCount = 0;
    this.creases.fill(0);
    this.foldMemory.fill(0);
    for (const bend of this.flexion) bend.rest = bend.length;
    for (let node = 0; node < this.count; node++) {
      const i = node * 3;
      const x = this.planar[i];
      const z = this.planar[i + 2];
      this.positions[i] = x * Math.cos(this.turn) - z * Math.sin(this.turn);
      this.positions[i + 1] = TABLE_CONTACT + 0.0075 * ((x / A4_WIDTH) ** 2 + (z / A4_LENGTH) ** 2);
      this.positions[i + 2] = x * Math.sin(this.turn) + z * Math.cos(this.turn);
    }
    this.previous.set(this.positions);
    this.wake();
  }

  point(node: number): Point {
    const i = node * 3;
    return { x: this.positions[i], y: this.positions[i + 1], z: this.positions[i + 2] };
  }

  centre(): Point {
    let x = 0, y = 0, z = 0;
    for (let i = 0; i < this.positions.length; i += 3) {
      x += this.positions[i]; y += this.positions[i + 1]; z += this.positions[i + 2];
    }
    return { x: x / this.count, y: y / this.count, z: z / this.count };
  }

  grab(node: number, position: Point) {
    if (this.press || node < 0 || node >= this.count) return false;
    this.hand = { node, position, velocity: { x: 0, y: 0, z: 0 } };
    const i = node * 3;
    for (let j = 0; j < this.count; j++) {
      this.handReach[j] = 1.012 * Math.hypot(this.planar[j * 3] - this.planar[i], this.planar[j * 3 + 2] - this.planar[i + 2]);
    }
    this.wake();
    return true;
  }

  pull(position: Point, seconds: number) {
    if (!this.hand) return;
    const target = {
      x: clamp(position.x, -TABLE_HALF_WIDTH + .028, TABLE_HALF_WIDTH - .028),
      y: clamp(position.y, TABLE_CONTACT, .32),
      z: clamp(position.z, -TABLE_HALF_DEPTH + .028, TABLE_HALF_DEPTH - .028),
    };
    const dt = clamp(seconds, .008, .15);
    const previous = this.hand.position;
    const velocity = this.hand.velocity;
    const mix = .56;
    velocity.x += (clamp((target.x - previous.x) / dt, -2.2, 2.2) - velocity.x) * mix;
    velocity.y += (clamp((target.y - previous.y) / dt, -2.2, 2.2) - velocity.y) * mix;
    velocity.z += (clamp((target.z - previous.z) / dt, -2.2, 2.2) - velocity.z) * mix;
    this.hand.position = target;
    this.wake();
  }

  release(inertia = true) {
    if (!this.hand) return;
    const { node, velocity } = this.hand;
    const hold = this.point(node);
    this.hand = null;
    for (let i = 0; i < this.count; i++) {
      const p = i * 3;
      const distance = Math.hypot(this.positions[p] - hold.x, this.positions[p + 1] - hold.y, this.positions[p + 2] - hold.z);
      const transmission = inertia ? .82 * Math.exp(-distance * 13) : 0;
      if (!transmission) continue;
      this.previous[p] = this.positions[p] - velocity.x * STEP * transmission;
      this.previous[p + 1] = this.positions[p + 1] - velocity.y * STEP * transmission;
      this.previous[p + 2] = this.positions[p + 2] - velocity.z * STEP * transmission;
    }
    this.wake();
  }

  tool(tool: Tool, alternateAxis = false) {
    if (this.press || this.hand) return false;
    if (tool === "fold") this.majorAxis = !alternateAxis;
    const center = this.centre();
    const limit = (n: number, span: number) => clamp(n, -span + .165, span - .165);
    const origin = { x: limit(center.x, TABLE_HALF_WIDTH), y: center.y, z: limit(center.z, TABLE_HALF_DEPTH) };
    this.press = { tool, time: 0, origin, start: this.positions.slice(), angle: this.turn };
    if (tool === "crumple") {
      this.pressureCount++;
      this.shapeX = (random(this.pressureCount * 3) - .5) * .021;
      this.shapeZ = (random(this.pressureCount * 7) - .5) * .021;
      this.folded = false;
    }
    this.wake();
    return true;
  }

  toss() {
    if (this.press || this.hand) return false;
    const center = this.centre();
    // The same impulse lifts a compact ball higher. Its reduced projected
    // area also produces less air drag during free flight.
    const destinationX = center.x > .025 ? -.13 : .125;
    const destinationZ = center.z > -.01 ? -.095 : .08;
    for (let i = 0; i < this.positions.length; i += 3) {
      const offsetX = this.positions[i] - center.x;
      const offsetZ = this.positions[i + 2] - center.z;
      this.positions[i + 1] += .012;
      this.previous[i] = this.positions[i] - (4.1 * (destinationX - center.x) - offsetZ * 2) * STEP;
      this.previous[i + 1] = this.positions[i + 1] - (1.5 + offsetZ * 1.8) * STEP;
      this.previous[i + 2] = this.positions[i + 2] - (4.1 * (destinationZ - center.z) + offsetX * 2) * STEP;
    }
    this.turbulence = .65;
    this.wake();
    return true;
  }

  private wake() { this.moving = true; this.quiet = 0; }

  private solve(constraints: Constraint[], handIndex: number, reverse = false) {
    const p = this.positions;
    for (let i = 0; i < constraints.length; i++) {
      const c = constraints[reverse ? constraints.length - 1 - i : i];
      const a = c.a * 3, b = c.b * 3;
      const dx = p[b] - p[a], dy = p[b + 1] - p[a + 1], dz = p[b + 2] - p[a + 2];
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (distance < 1e-8) continue;
      const factor = c.stiffness * (1 - c.rest / distance);
      const aScale = c.a === handIndex ? 0 : c.b === handIndex ? factor : factor * .5;
      const bScale = c.b === handIndex ? 0 : c.a === handIndex ? factor : factor * .5;
      p[a] += dx * aScale; p[a + 1] += dy * aScale; p[a + 2] += dz * aScale;
      p[b] -= dx * bScale; p[b + 1] -= dy * bScale; p[b + 2] -= dz * bScale;
    }
  }

  private rememberBends(rate: number, threshold: number) {
    const p = this.positions;
    for (const bend of this.flexion) {
      const a = bend.a * 3, b = bend.b * 3;
      const length = Math.hypot(p[a] - p[b], p[a + 1] - p[b + 1], p[a + 2] - p[b + 2]);
      const ratio = length / bend.length;
      if (ratio >= threshold) continue;
      bend.rest += (Math.max(bend.length * .33, length) - bend.rest) * rate;
      const trace = clamp((1 - ratio) * 1.25, 0, 1);
      this.creases[bend.a] = Math.max(this.creases[bend.a], trace);
      this.creases[bend.b] = Math.max(this.creases[bend.b], trace);
    }
  }

  private contacts() {
    const p = this.positions;
    for (let i = 0; i < p.length; i += 3) {
      p[i] = clamp(p[i], -TABLE_HALF_WIDTH, TABLE_HALF_WIDTH);
      p[i + 2] = clamp(p[i + 2], -TABLE_HALF_DEPTH, TABLE_HALF_DEPTH);
      p[i + 1] = Math.max(deskContactHeight(p[i], p[i + 2]), p[i + 1]);
    }
  }

  private gripTethers(handIndex: number) {
    if (handIndex < 0) return;
    const p = this.positions;
    const grip = handIndex * 3;
    for (let i = 0; i < p.length; i += 3) {
      if (i === grip) continue;
      const x = p[i] - p[grip], y = p[i + 1] - p[grip + 1], z = p[i + 2] - p[grip + 2];
      const distance = Math.hypot(x, y, z);
      const reach = this.handReach[i / 3];
      if (distance <= reach) continue;
      const correction = 1 - reach / distance;
      p[i] -= x * correction;
      p[i + 1] -= y * correction;
      p[i + 2] -= z * correction;
    }
  }

  private distributeTension(handIndex: number) {
    if (handIndex < 0) return;
    const p = this.positions;
    // Chords cannot be longer than their material path. These one-way
    // constraints distribute tension without resisting folds or compression.
    for (const link of this.tension) {
      const a = link.a * 3, b = link.b * 3;
      const x = p[b] - p[a], y = p[b + 1] - p[a + 1], z = p[b + 2] - p[a + 2];
      const squared = x * x + y * y + z * z;
      const maximum = link.length * 1.006;
      if (squared <= maximum * maximum) continue;
      const force = .91 * (1 - maximum / Math.sqrt(squared));
      const first = link.a === handIndex ? 0 : link.b === handIndex ? force : force * .5;
      const second = link.b === handIndex ? 0 : link.a === handIndex ? force : force * .5;
      p[a] += x * first; p[a + 1] += y * first; p[a + 2] += z * first;
      p[b] -= x * second; p[b + 1] -= y * second; p[b + 2] -= z * second;
    }
  }

  private selfContact(handIndex: number) {
    const p = this.positions;
    const cellSize = SELF_SPACING * 1.5;
    const key = (x: number, y: number, z: number) => (x + 128) + (y + 4) * 256 + (z + 128) * 131072;
    for (const bucket of this.contactBuckets.values()) {
      bucket.length = 0;
      this.bucketPool.push(bucket);
    }
    this.contactBuckets.clear();
    for (let node = 0; node < this.count; node++) {
      const i = node * 3;
      const x = this.cellX[node] = Math.floor(p[i] / cellSize);
      const y = this.cellY[node] = Math.floor(p[i + 1] / cellSize);
      const z = this.cellZ[node] = Math.floor(p[i + 2] / cellSize);
      const hash = key(x, y, z);
      let bucket = this.contactBuckets.get(hash);
      if (!bucket) {
        bucket = this.bucketPool.pop() ?? [];
        this.contactBuckets.set(hash, bucket);
      }
      bucket.push(node);
    }
    for (let node = 0; node < this.count; node++) {
      const a = node * 3;
      const x = this.cellX[node], y = this.cellY[node], z = this.cellZ[node];
      const gx = node % this.columns, gz = Math.floor(node / this.columns);
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          for (let oz = -1; oz <= 1; oz++) {
            const bucket = this.contactBuckets.get(key(x + ox, y + oy, z + oz));
            if (!bucket) continue;
            for (const other of bucket) {
              if (other <= node) continue;
              const ox = other % this.columns, oz = Math.floor(other / this.columns);
              if (Math.abs(gx - ox) <= 1 && Math.abs(gz - oz) <= 1) continue;
              if (this.folded && this.majorAxis && Math.abs(gx + ox - (this.columns - 1)) <= 1 && Math.abs(gz - oz) <= 1) continue;
              if (this.folded && !this.majorAxis && Math.abs(gz + oz - (this.rows - 1)) <= 1 && Math.abs(gx - ox) <= 1) continue;
              const b = other * 3;
              const dx = p[b] - p[a], dy = p[b + 1] - p[a + 1], dz = p[b + 2] - p[a + 2];
              const distance2 = dx * dx + dy * dy + dz * dz;
              if (distance2 >= SELF_SPACING ** 2) continue;
              const distance = Math.sqrt(distance2);
              const factor = distance > 1e-8 ? .5 * (SELF_SPACING / distance - 1) : 0;
              const separationY = distance < 1e-8 ? .0015 : dy * factor;
              if (node !== handIndex) { p[a] -= dx * factor; p[a + 1] -= separationY; p[a + 2] -= dz * factor; }
              if (other !== handIndex) { p[b] += dx * factor; p[b + 1] += separationY; p[b + 2] += dz * factor; }
            }
          }
        }
      }
    }
  }

  private foldedContact(handIndex: number) {
    if (!this.folded) return;
    const p = this.positions;
    const width = this.columns, rows = this.rows;
    const centreX = (width - 1) / 2, centreZ = (rows - 1) / 2;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < width; col++) {
        const flap = this.majorAxis ? col - centreX : row - centreZ;
        if (flap <= 0) continue;
        const mirroredX = this.majorAxis ? width - 1 - col : col;
        const mirroredZ = this.majorAxis ? row : rows - 1 - row;
        const node = row * width + col, lower = mirroredZ * width + mirroredX;
        if (node === handIndex) continue;
        const a = lower * 3, b = node * 3;
        const x0 = (mirroredX > 0 ? lower - 1 : lower) * 3;
        const x1 = (mirroredX < width - 1 ? lower + 1 : lower) * 3;
        const z0 = (mirroredZ > 0 ? lower - width : lower) * 3;
        const z1 = (mirroredZ < rows - 1 ? lower + width : lower) * 3;
        const ex = p[x1] - p[x0], ey = p[x1 + 1] - p[x0 + 1], ez = p[x1 + 2] - p[x0 + 2];
        const fx = p[z1] - p[z0], fy = p[z1 + 1] - p[z0 + 1], fz = p[z1 + 2] - p[z0 + 2];
        let nx = fy * ez - fz * ey, ny = fz * ex - fx * ez, nz = fx * ey - fy * ex;
        const area = Math.hypot(nx, ny, nz);
        if (area < 1e-8) continue;
        nx /= area; ny /= area; nz /= area;
        const dx = p[b] - p[a], dy = p[b + 1] - p[a + 1], dz = p[b + 2] - p[a + 2];
        const gap = dx * nx + dy * ny + dz * nz;
        const lateral = dx * dx + dy * dy + dz * dz - gap * gap;
        if (lateral > .012 ** 2 || gap >= .00165) continue;
        const depth = Math.min(.007, .00165 - gap);
        p[b] += nx * depth; p[b + 1] += ny * depth; p[b + 2] += nz * depth;
      }
    }
  }

  private guided(press: Press) {
    const p = this.positions;
    const { tool, origin, angle, time, start } = press;
    const flatDuration = tool === "smooth" ? .66 : .43;
    const foldDuration = .68;
    const initiallyFolded = tool === "unfold";
    const turn = initiallyFolded ? (1 - ease(time / foldDuration)) * Math.PI
      : tool === "fold" ? ease((time - flatDuration) / foldDuration) * Math.PI
      : 0;
    const blending = initiallyFolded ? ease(time / .17) : ease(time / flatDuration);
    const cos = Math.cos(angle), sin = Math.sin(angle);
    for (let node = 0; node < this.count; node++) {
      const i = node * 3;
      let x = this.planar[i];
      let z = this.planar[i + 2];
      let y = TABLE_CONTACT;
      const flap = this.majorAxis ? x : z;
      if (flap > 0 && turn > 0) {
        if (this.majorAxis) x = flap * Math.cos(turn);
        else z = flap * Math.cos(turn);
        y += flap * Math.sin(turn) + LAYERS * ease(flap * 165) * ease(turn / 2);
      }
      if (tool === "smooth" || tool === "unfold") {
        y += this.creases[node] * (.0027 + random(node + 23) * .0028) * Math.cos(x * 89 - z * 81) ** 2;
      }
      const targetX = origin.x + x * cos - z * sin;
      const targetZ = origin.z + x * sin + z * cos;
      p[i] = start[i] + (targetX - start[i]) * blending;
      p[i + 1] = start[i + 1] + (y - start[i + 1]) * blending;
      p[i + 2] = start[i + 2] + (targetZ - start[i + 2]) * blending;
    }
    const end = tool === "fold" ? flatDuration + foldDuration : tool === "smooth" ? flatDuration : foldDuration;
    this.contacts();
    if (time < end) return;
    if (tool === "fold") {
      this.rememberBends(.99, .92);
      this.folded = true;
      this.foldMemory[this.majorAxis ? 0 : 1] = 1;
    } else {
      for (const bend of this.flexion) bend.rest += (bend.length - bend.rest) * .8;
      this.folded = false;
    }
    this.previous.set(p);
    this.press = null;
  }

  private compact(press: Press) {
    const t = ease((press.time - .08) / 1.1);
    const maxRadius = .18 - .141 * t;
    const p = this.positions;
    const centerX = press.origin.x + this.shapeX;
    const centerY = TABLE_CONTACT + .039 * t;
    const centerZ = press.origin.z + this.shapeZ;
    for (let i = 0; i < p.length; i += 3) {
      const x = p[i] - centerX, y = p[i + 1] - centerY, z = p[i + 2] - centerZ;
      const d = Math.hypot(x, y, z);
      const jaw = maxRadius * (.92 + random(i + this.pressureCount * 13) * .16);
      if (d <= jaw) continue;
      const force = .42 * (1 - jaw / d);
      p[i] -= x * force; p[i + 1] -= y * force; p[i + 2] -= z * force;
    }
  }

  step(dt = STEP) {
    if (!this.moving) return false;
    this.time += dt;
    const p = this.positions;
    const last = this.previous;
    const press = this.press;
    if (press) {
      press.time += dt;
      if (press.tool !== "crumple") {
        this.guided(press);
        return true;
      }
    }

    const grip = this.hand?.node ?? -1;
    const accelerated = dt * dt;
    this.turbulence = Math.max(0, this.turbulence - dt);
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < p.length; i += 3) {
      minX = Math.min(minX, p[i]); maxX = Math.max(maxX, p[i]);
      minZ = Math.min(minZ, p[i + 2]); maxZ = Math.max(maxZ, p[i + 2]);
    }
    const spread = clamp((maxX - minX) * (maxZ - minZ) / .056, .09, 1);
    for (let node = 0; node < this.count; node++) {
      const i = node * 3;
      const x = p[i], y = p[i + 1], z = p[i + 2];
      const tabletop = y <= deskContactHeight(x, z) + .0008;
      const flatter = spread * (1 - this.creases[node] * .55);
      const aerodynamicDrag = 1 / (1 + dt * (1.6 + flatter * 5.5));
      const damping = tabletop ? .77 : aerodynamicDrag;
      const gust = this.wind * (.89 + .11 * Math.sin(this.time * 2.1 + z * 13));
      const flutter = Math.sin(this.time * 13 + this.planar[i] * 61 + this.planar[i + 2] * 34) * flatter;
      const free = Math.min(1, y * 80);
      const leadingEdge = Math.max(0, 1 - (x - minX) / .055);
      const nearSurface = Math.max(0, 1 - y / .062);
      const fanLift = gust * gust * 1.44 * leadingEdge ** 2 * nearSurface * spread;
      p[i] = x + (x - last[i]) * damping + accelerated * gust * (free * .95 + .14) * (.25 + spread * .75);
      p[i + 1] = y + (y - last[i + 1]) * aerodynamicDrag + accelerated * (-GRAVITY + fanLift + (gust * 1.24 + this.turbulence * 2) * flutter * free);
      p[i + 2] = z + (z - last[i + 2]) * damping + accelerated * gust * flutter * .31 * free;
      last[i] = x; last[i + 1] = y; last[i + 2] = z;
    }
    for (let pass = 0; pass < this.passes; pass++) {
      if (this.hand) {
        const h = grip * 3;
        p[h] = this.hand.position.x;
        p[h + 1] = this.hand.position.y;
        p[h + 2] = this.hand.position.z;
      }
      if (press) this.compact(press);
      this.solve(this.flexion, grip);
      this.gripTethers(grip);
      this.distributeTension(grip);
      this.solve(this.links, grip);
      this.solve(this.links, grip, true);
      if (pass === 0 || (press && pass === this.passes - 1)) this.selfContact(grip);
      this.foldedContact(grip);
      this.contacts();
    }
    if (press) {
      if (press.time > .34) this.rememberBends(.063, .89);
      if (press.time >= 1.49) {
        this.rememberBends(.43, .87);
        this.previous.set(p);
        this.press = null;
      }
    } else if (this.hand) {
      this.rememberBends(.009, .71);
    }
    let travel = 0;
    for (let i = 0; i < p.length; i += 3) {
      if (p[i + 1] <= deskContactHeight(p[i], p[i + 2]) + .00001) {
        last[i] = p[i] + (last[i] - p[i]) * .60;
        last[i + 1] = p[i + 1];
        last[i + 2] = p[i + 2] + (last[i + 2] - p[i + 2]) * .60;
      }
      travel += Math.abs(p[i] - last[i]) + Math.abs(p[i + 1] - last[i + 1]) + Math.abs(p[i + 2] - last[i + 2]);
    }
    if (!press && !this.hand && this.wind < .07 && travel / this.count < .00013) this.quiet += dt;
    else this.quiet = 0;
    if (this.quiet > .45) this.moving = false;
    return true;
  }
}
