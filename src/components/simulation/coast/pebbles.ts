import * as T from "three";
import { launchPebble, stepPebble, type Pebble, type PebblePose, type WaterImpact } from "./pebble-physics";

const capacity = 16;
const rippleCount = 5;
const splashLimit = 42;
const interval = 1 / 144;
const hash = (i: number) => { const value = Math.sin(i * 127.1 + 23.7) * 43758.5453; return value - Math.floor(value); };

type Particle = { x: number; y: number; z: number; vx: number; vy: number; vz: number; age: number; lifetime: number; scale: number };

export function createPebbles(scene: T.Scene) {
  const geo = new T.IcosahedronGeometry(1, 2);
  const vertices = geo.getAttribute("position");
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
    const n = .92 + hash(Math.round(x * 19 + y * 117 + z * 891)) * .15;
    vertices.setXYZ(i, x * n, y * n, z * n);
  }
  geo.computeVertexNormals();
  const rockMat = new T.MeshStandardMaterial({ color: 0xb8b1a0, roughness: .73, flatShading: false });
  const rocks = new T.InstancedMesh(geo, rockMat, capacity);
  rocks.frustumCulled = false; rocks.count = 0; rocks.castShadow = true; rocks.receiveShadow = true;
  rocks.instanceMatrix.setUsage(T.DynamicDrawUsage);
  scene.add(rocks);
  const splashGeo = new T.IcosahedronGeometry(1, 0);
  const splashMat = new T.MeshStandardMaterial({ color: 0xb8d8db, roughness: .23, metalness: .11 });
  const spray = new T.InstancedMesh(splashGeo, splashMat, splashLimit);
  spray.frustumCulled = false; spray.count = 0;
  spray.instanceMatrix.setUsage(T.DynamicDrawUsage);
  scene.add(spray);
  const dummy = new T.Object3D();
  const ripples = Array.from({ length: rippleCount }, () => new T.Vector4(0, 0, 99, 0));
  let rippleIndex = 0, accumulator = 0, release = 0, time = 0;
  const stones: Array<{ physics: Pebble; spin: number; tint: T.Color }> = [];
  const sprayParticles: Particle[] = [];
  function impact(hit: WaterImpact, tide: number) {
    const size = Math.min(1, .26 + hit.speed * .055) * (hit.skipped ? .72 : 1);
    ripples[rippleIndex].set(hit.x, hit.z, 0, size);
    rippleIndex = (rippleIndex + 1) % rippleCount;
    for (let i = 0; i < (hit.skipped ? 7 : 11); i++) {
      const angle = i * 2.39996 + hash(i + release) * .4;
      const force = .20 + hash(i + release + 97) * 1.35;
      sprayParticles.push({ x: hit.x, y: tide + .035, z: hit.z,
        vx: Math.cos(angle) * force, vy: (.54 + hash(i + 61) * 2.12) * size, vz: Math.sin(angle) * force,
        age: 0, lifetime: .28 + hash(i + 11) * .32, scale: .009 + hash(i + 71) * .016 });
    }
    if (sprayParticles.length > splashLimit) sprayParticles.splice(0, sprayParticles.length - splashLimit);
  }
  return {
    ripples,
    throw(pose: PebblePose, eye: number, power?: number) {
      if (time - release < .16 && stones.length) return;
      release = time;
      const stone = launchPebble(pose, eye, power);
      if (stones.length === capacity) stones.shift();
      const shade = .75 + hash(Math.round(time * 103)) * .25;
      stones.push({ physics: stone, spin: pose.yaw, tint: new T.Color(shade, shade * .95, shade * .88) });
    },
    step(dt: number, tide: number) {
      time += dt;
      accumulator = Math.min(.095, accumulator + dt);
      for (const ripple of ripples) ripple.z = Math.min(99, ripple.z + dt);
      while (accumulator >= interval) {
        accumulator -= interval;
        for (const { physics } of stones) {
          const hit = stepPebble(physics, interval, tide);
          if (hit) impact(hit, tide);
        }
      }
      let drawIndex = 0;
      for (const { physics: stone, spin, tint } of stones) {
        if (stone.state === "sunk") continue;
        dummy.position.set(stone.x, stone.y, stone.z);
        dummy.scale.set(stone.radius, stone.thickness * .5, stone.radius * .84);
        dummy.rotation.set(stone.state === "air" ? .32 : .13, stone.age * 20 + spin, stone.state === "air" ? .08 : 0);
        dummy.updateMatrix(); rocks.setMatrixAt(drawIndex, dummy.matrix); rocks.setColorAt(drawIndex++, tint);
      }
      rocks.count = drawIndex;
      if (rocks.count) { rocks.instanceMatrix.needsUpdate = true; if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true; }
      for (let i = sprayParticles.length - 1; i >= 0; i--) {
        const p = sprayParticles[i];
        p.age += dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vy -= 8.8 * dt;
        if (p.age > p.lifetime || p.y < tide) sprayParticles.splice(i, 1);
      }
      spray.count = sprayParticles.length;
      sprayParticles.forEach((p, i) => {
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(p.scale, p.scale * (1 + Math.abs(p.vy) * .44), p.scale).multiplyScalar(1 - p.age / p.lifetime);
        dummy.updateMatrix(); spray.setMatrixAt(i, dummy.matrix);
      });
      if (spray.count) spray.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      scene.remove(rocks, spray);
      rocks.dispose(); spray.dispose(); geo.dispose(); splashGeo.dispose(); rockMat.dispose(); splashMat.dispose();
    },
  };
}
