import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { landmarks, moveMarble, walkable, type LandmarkId } from "@/lib/play-model";
import { createStage } from "./stage";
import { waterMaterial, type ReflectionObject } from "./water";
import type { Engine, Options } from "./types";

export function createWorld(options: Options): Engine {
  const stage = createStage(options);
  const { scene, camera, canvas, sun, ambient } = stage;
  const floor = 1.4;
  const reflections: ReflectionObject[] = [];
  const stone = new T.MeshStandardMaterial({ color: 0xded0b5, roughness: .86 });
  const plaster = new T.MeshStandardMaterial({ color: 0xf2e6cc, roughness: .7 });
  const terracotta = new T.MeshStandardMaterial({ color: 0x9b5740, roughness: .7 });
  const dark = new T.MeshStandardMaterial({ color: 0x3d5248, roughness: .86 });
  const brass = new T.MeshStandardMaterial({ color: 0xe6b669, roughness: .28, metalness: .7 });
  function mesh(geometry: T.BufferGeometry, material: T.Material, x: number, y: number, z: number) {
    const object = new T.Mesh(geometry, material); object.position.set(x, y, z);
    object.castShadow = true; object.receiveShadow = true; scene.add(object); return object;
  }
  function box(w: number, h: number, d: number, material: T.MeshStandardMaterial, x: number, y: number, z: number, reflect = false) {
    const object = mesh(new RoundedBoxGeometry(w, h, d, 2, .07), material, x, y, z);
    if (reflect) reflections.push({ center: object.position.clone(), size: new T.Vector3(w / 2, h / 2, d / 2), color: material.color.clone(), sphere: false });
    return object;
  }
  // A stratified sandstone island, with a gently irregular grassy edge.
  mesh(new T.CylinderGeometry(12.7, 10.2, 2.4, 80), stone, 0, -.05, 0);
  mesh(new T.CylinderGeometry(13, 12.65, .42, 80), new T.MeshStandardMaterial({ color: 0x8d9d77, roughness: 1 }), 0, 1.18, 0);
  mesh(new T.CylinderGeometry(12.85, 12.85, .12, 80), new T.MeshStandardMaterial({ color: 0x91a17c, roughness: 1 }), 0, 1.38, 0);

  const sky = mesh(new T.SphereGeometry(180, 24, 16), new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false,
    uniforms: { uNight: { value: 0 } },
    vertexShader: `varying vec3 vPos;void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 vPos;uniform float uNight;void main(){float h=normalize(vPos).y;
      vec3 low=mix(vec3(.80,.80,.69),vec3(.15,.18,.26),uNight);
      vec3 high=mix(vec3(.34,.56,.61),vec3(.035,.065,.14),uNight);
      vec3 c=mix(low,high,smoothstep(-.05,.8,h));gl_FragColor=vec4(c,1.);#include <colorspace_fragment>}`.replace(";#include", ";\n#include"),
  }), 0, 0, 0);
  sky.castShadow = false; sky.receiveShadow = false; sky.renderOrder = -10;
  scene.fog = new T.FogExp2(0xb2c4bc, .008);
  // Distant islets give the horizon scale, without loading meshes or textures.
  for (const [x, z, radius, height] of [[-31, -38, 8, 5], [25, -46, 11, 7], [-49, -13, 6, 4]]) {
    mesh(new T.CylinderGeometry(radius, radius * .75, height, 9), new T.MeshStandardMaterial({ color: 0x819686, roughness: 1 }), x, -height * .12, z);
    mesh(new T.CylinderGeometry(radius * .98, radius * .98, .3, 9), new T.MeshStandardMaterial({ color: 0x85997d, roughness: 1 }), x, height * .38, z);
  }
  const sunDisc = mesh(new T.SphereGeometry(4, 24, 16), new T.MeshBasicMaterial({ color: 0xf3d3a2, fog: false }), -28, 13, -64); sunDisc.castShadow = false;

  // Architectural observatory: an open arch, a suspended sun, and low stair terraces.
  for (let i = 0; i < 4; i++) box(5.3 - i * .35, .24, 2.7 - i * .25, stone, -6, floor + .12 + i * .24, -7.3 + i * .12);
  const archShape = new T.Shape();
  archShape.moveTo(-2.1, 0); archShape.lineTo(-2.1, 3.5); archShape.absarc(0, 3.5, 2.1, Math.PI, 0, true);
  archShape.lineTo(2.1, 0); archShape.lineTo(1.32, 0); archShape.lineTo(1.32, 3.5); archShape.absarc(0, 3.5, 1.32, 0, Math.PI, false); archShape.lineTo(-1.32, 0); archShape.closePath();
  mesh(new T.ExtrudeGeometry(archShape, { depth: 1.1, bevelEnabled: true, bevelSize: .05, bevelThickness: .05, bevelSegments: 2, curveSegments: 24 }), plaster, -6, floor + .8, -8.2);
  reflections.push({ center: new T.Vector3(-7.7, 3.9, -7.7), size: new T.Vector3(.4, 2.5, .55), color: plaster.color.clone(), sphere: false });
  reflections.push({ center: new T.Vector3(-4.3, 3.9, -7.7), size: new T.Vector3(.4, 2.5, .55), color: plaster.color.clone(), sphere: false });
  for (let i = 0; i < 7; i++) reflections.push({ center: new T.Vector3(-6 + Math.cos(i / 6 * Math.PI) * 1.72, floor + 4.3 + Math.sin(i / 6 * Math.PI) * 1.72, -7.7), size: new T.Vector3(.43, .43, .43), color: plaster.color.clone(), sphere: true });
  const bell = mesh(new T.SphereGeometry(.72, 24, 16), brass, -6, floor + 3.5, -7.55);
  const bellReflection = { center: bell.position.clone(), size: new T.Vector3(.72, .72, .72), color: brass.color.clone(), sphere: true };
  reflections.push(bellReflection);
  const hanger = mesh(new T.CylinderGeometry(.018, .018, 1.3, 6), brass, -6, floor + 4.7, -7.55);
  const bellRig = new T.Group(); bellRig.position.set(-6, floor + 5.35, -7.55); scene.add(bellRig); bellRig.attach(bell); bellRig.attach(hanger);
  let bellAge = 4, lastChime = -1000, audio: AudioContext | undefined;
  function ringBell() {
    const now = performance.now(); if (now - lastChime < 350) return;
    lastChime = now; bellAge = 0;
    try {
      audio ??= new AudioContext();
      void audio.resume().catch(() => {});
      const start = audio.currentTime;
      for (const [frequency, volume, duration] of [[523.25, .055, 1.8], [1050, .019, 1.35], [1425, .012, .8]]) {
        const tone = audio.createOscillator(), envelope = audio.createGain();
        tone.frequency.value = frequency; envelope.gain.setValueAtTime(.0001, start);
        envelope.gain.exponentialRampToValueAtTime(volume, start + .025);
        envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
        tone.connect(envelope); envelope.connect(audio.destination);
        tone.onended = () => { tone.disconnect(); envelope.disconnect(); };
        tone.start(start); tone.stop(start + duration);
      }
    } catch { /* The visual bell also works without audio. */ }
  }

  // A circular sun gate, deliberately off-centre.
  box(.7, 3.0, .7, terracotta, -9.1, floor + 1.5, 4, true);
  box(.7, 3.0, .7, terracotta, -5.0, floor + 1.5, 4, true);
  const gate = mesh(new T.TorusGeometry(2.05, .36, 10, 64, Math.PI), terracotta, -7.05, floor + 3, 4);
  for (let i = 0; i < 5; i++) reflections.push({ center: new T.Vector3(-7.05 + Math.cos(i / 4 * Math.PI) * 2.05, floor + 3 + Math.sin(i / 4 * Math.PI) * 2.05, 4), size: new T.Vector3(.37, .37, .37), color: terracotta.color.clone(), sphere: true });
  gate.rotation.z = 0;

  // A small cypress grove with warm trunks and stacked canopies.
  const treePositions = [[7, -6, 1.1], [10, -2, .85], [9, -8, .9], [5, -8, .8], [11, -5, 1.0], [4, -5.5, .65], [-10, -3, .8], [-9, -5, 1.1], [-11, 0, .7], [7, 7, .75]];
  const leafMaterials = [0x405e4d, 0x526c52, 0x637954].map(color => new T.MeshStandardMaterial({ color, roughness: .95 }));
  treePositions.forEach(([x, z, scale], i) => {
    mesh(new T.CylinderGeometry(.12 * scale, .18 * scale, 2.2 * scale, 8), terracotta, x, floor + 1.1 * scale, z);
    const material = leafMaterials[i % 3];
    const profile = [[0, 0], [.35, .1], [.7, 1], [.83, 2], [.62, 3.3], [.28, 4.6], [0, 5.1]].map(([r, y]) => new T.Vector2(r * scale, y * scale));
    const tree = mesh(new T.LatheGeometry(profile, 14), material, x, floor + .65 * scale, z);
    reflections.push({ center: tree.position.clone(), size: new T.Vector3(1.35 * scale, 1.35 * scale, 1.35 * scale), color: material.color.clone(), sphere: true });
  });
  const bench = box(2.3, .18, .65, stone, 7.4, floor + .65, -2.9);
  box(.2, .6, .5, dark, 6.6, floor + .3, -2.9); box(.2, .6, .5, dark, 8.2, floor + .3, -2.9);
  bench.rotation.y = -.15;
  mesh(new T.CylinderGeometry(.5, .75, 1.3, 24), stone, 7.3, floor + .65, 8.7);
  const shoreOrb = mesh(new T.SphereGeometry(.95, 32, 24), brass, 7.3, floor + 2.8, 8.7);
  reflections.push({ center: shoreOrb.position.clone(), size: new T.Vector3(.95, .95, .95), color: brass.color.clone(), sphere: true });
  // A shallow stone basin catches the light at the centre of the garden.
  const basinRim = mesh(new T.TorusGeometry(1.6, .18, 8, 48), stone, 1.2, floor + .12, 1.8); basinRim.rotation.x = -Math.PI / 2;
  const basin = mesh(new T.CircleGeometry(1.5, 48), new T.MeshStandardMaterial({ color: 0x548c83, metalness: .25, roughness: .15 }), 1.2, floor + .04, 1.8); basin.rotation.x = -Math.PI / 2;

  // Walking paths are instanced so a few hundred stones cost one draw call.
  const points = [[0, 10.5], [0, 8], [-2, 5], [-4, 1], [-6, -4], [-3, -4], [2, -2], [7, -3]].map(([x, z]) => new T.Vector3(x, floor + .04, z));
  const path = new T.CatmullRomCurve3(points);
  const paving = new T.InstancedMesh(new RoundedBoxGeometry(.65, .07, .45, 1, .04), stone, 90);
  const matrix = new T.Matrix4(), quaternion = new T.Quaternion(), up = new T.Vector3(0, 1, 0);
  for (let i = 0; i < 90; i++) {
    const t = i / 89, p = path.getPointAt(t), tangent = path.getTangentAt(t);
    quaternion.setFromAxisAngle(up, Math.atan2(tangent.x, tangent.z)); matrix.compose(p, quaternion, new T.Vector3(1, 1, 1)); paving.setMatrixAt(i, matrix);
  }
  paving.receiveShadow = true; scene.add(paving);
  const sidePath = new T.CatmullRomCurve3([[-4, 1], [-5.5, 3.2], [-7, 5.5]].map(([x, z]) => new T.Vector3(x, floor + .05, z)));
  const sideStones = new T.InstancedMesh(paving.geometry, stone, 22);
  for (let i = 0; i < 22; i++) { const p = sidePath.getPointAt(i / 21); matrix.makeTranslation(p.x, p.y, p.z); sideStones.setMatrixAt(i, matrix); } sideStones.receiveShadow = true; scene.add(sideStones);

  // Scatter deterministic pebbles and grass. No network assets or texture downloads.
  let seed = 81;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const rocks = new T.InstancedMesh(new T.IcosahedronGeometry(1, 0), stone, 48);
  for (let i = 0; i < 48; i++) {
    const angle = random() * Math.PI * 2, r = 12.6 + random() * .65, s = .2 + random() * .6;
    matrix.compose(new T.Vector3(Math.cos(angle) * r, .65, Math.sin(angle) * r), new T.Quaternion().setFromEuler(new T.Euler(random(), random(), random())), new T.Vector3(s, s * .8, s)); rocks.setMatrixAt(i, matrix);
  } rocks.receiveShadow = true; rocks.castShadow = true; scene.add(rocks);
  const grass = new T.InstancedMesh(new T.ConeGeometry(.045, .38, 3), new T.MeshStandardMaterial({ color: 0x75845c, roughness: 1 }), 600);
  for (let i = 0; i < 600; i++) {
    const angle = random() * Math.PI * 2, r = Math.sqrt(random()) * 12.4;
    const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
    const nearPath = points.some(p => Math.hypot(p.x - x, p.z - z) < 1.4);
    const s = nearPath ? .01 : .5 + random();
    matrix.compose(new T.Vector3(x, floor + .15, z), new T.Quaternion().setFromEuler(new T.Euler(.15 * random(), random() * 6, .1)), new T.Vector3(s, s, s)); grass.setMatrixAt(i, matrix);
  } scene.add(grass);
  // Short timber jetty at the arrival point.
  for (let i = 0; i < 10; i++) box(2.4, .13, .38, terracotta, 0, floor + .08, 10.6 + i * .4);
  for (const x of [-1.1, 1.1]) for (const z of [11, 13.7]) box(.12, 1.3, .12, dark, x, .9, z);

  const water = waterMaterial(reflections);
  const sea = mesh(new T.PlaneGeometry(300, 300), water, 0, 0, 0); sea.rotation.x = -Math.PI / 2; sea.castShadow = false;
  const avatarMaterial = new T.MeshStandardMaterial({ color: 0xebbe75, metalness: .35, roughness: .24, emissive: 0xc97d35, emissiveIntensity: .1 });
  const avatar = mesh(new T.SphereGeometry(.35, 24, 16), avatarMaterial, 0, floor + .4, 8);
  const ring = mesh(new T.TorusGeometry(.58, .015, 6, 40), brass, 0, floor + .06, 8); ring.rotation.x = -Math.PI / 2; ring.castShadow = false;
  const destinationRing = mesh(new T.RingGeometry(.28, .33, 32), new T.MeshBasicMaterial({ color: 0xf8e3b9, side: T.DoubleSide, transparent: true, opacity: .7 }), 0, floor + .06, 8); destinationRing.rotation.x = -Math.PI / 2; destinationRing.visible = false;
  const motesGeometry = new T.BufferGeometry();
  const motePositions = new Float32Array(48 * 3);
  for (let i = 0; i < 48; i++) { motePositions[i * 3] = (random() - .5) * 25; motePositions[i * 3 + 1] = floor + .4 + random() * 4; motePositions[i * 3 + 2] = (random() - .5) * 25; }
  motesGeometry.setAttribute("position", new T.BufferAttribute(motePositions, 3));
  const moteMaterial = new T.PointsMaterial({ color: 0xffd99a, size: .055, transparent: true, opacity: 0, depthWrite: false });
  const motes = new T.Points(motesGeometry, moteMaterial); scene.add(motes);
  const lanternMaterial = new T.MeshStandardMaterial({ color: 0xffd48a, emissive: 0xffa840, emissiveIntensity: .2, roughness: .3 });
  [[0, 9], [-4, 2], [-6, -4], [7, -3]].forEach(([x, z]) => {
    mesh(new T.CylinderGeometry(.16, .22, .55, 8), dark, x + 1, floor + .275, z);
    mesh(new T.SphereGeometry(.15, 10, 8), lanternMaterial, x + 1, floor + .6, z);
  });

  let point = { x: 0, z: 8 }, target: { x: number; z: number } | null = null;
  let moveX = 0, moveZ = 0, azimuth = .45, elevation = .42, distance = 38, light = 0, desiredLight = 0;
  const focus = new T.Vector3(0, 1.4, 0), desiredFocus = new T.Vector3(0, 1.4, 0);
  let place: LandmarkId = "arrival", drag: { id: number; x: number; y: number; moved: number } | null = null, positionStamp = 0;
  const keys = new Set<string>(), raycaster = new T.Raycaster(), pointer = new T.Vector2();
  const ground = new T.Plane(new T.Vector3(0, 1, 0), -floor), hit = new T.Vector3();
  const keydown = (event: KeyboardEvent) => {
    if (!(event.target instanceof Node) || !options.host.parentElement?.contains(event.target) || (event.target instanceof HTMLElement && /INPUT|SELECT|TEXTAREA|BUTTON/.test(event.target.tagName))) return;
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(event.key.toLowerCase())) { event.preventDefault(); keys.add(event.key.toLowerCase()); target = null; }
  };
  const keyup = (event: KeyboardEvent) => { keys.delete(event.key.toLowerCase()); };
  const blur = () => { keys.clear(); moveX = 0; moveZ = 0; drag = null; };
  const down = (event: PointerEvent) => {
    if (event.button !== 0) return;
    options.host.focus({ preventScroll: true }); canvas.setPointerCapture(event.pointerId);
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: 0 };
  };
  const pointermove = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    drag.moved += Math.hypot(dx, dy); drag.x = event.clientX; drag.y = event.clientY;
    if (drag.moved > 6) { azimuth -= dx * .006; elevation = T.MathUtils.clamp(elevation + dy * .004, .3, 1.25); }
  };
  const upPointer = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (drag.moved < 7) {
      const rect = canvas.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.intersectObject(bell, false).length) ringBell();
      else if (raycaster.ray.intersectPlane(ground, hit) && walkable(hit)) { target = { x: hit.x, z: hit.z }; destinationRing.position.set(hit.x, floor + .08, hit.z); destinationRing.visible = true; }
    }
    drag = null;
  };
  const wheel = (event: WheelEvent) => { if (document.activeElement !== options.host) return; event.preventDefault(); distance = T.MathUtils.clamp(distance + event.deltaY * .025, 13, 48); };
  canvas.addEventListener("pointerdown", down); canvas.addEventListener("pointermove", pointermove); canvas.addEventListener("pointerup", upPointer); canvas.addEventListener("pointercancel", blur); canvas.addEventListener("wheel", wheel, { passive: false });
  window.addEventListener("keydown", keydown); window.addEventListener("keyup", keyup); window.addEventListener("blur", blur); document.addEventListener("visibilitychange", blur);
  stage.quality(tier => { water.uniforms.uReflections.value = tier === "cinematic" ? 1 : 0; grass.count = tier === "low" ? 180 : 600; });
  stage.tick((dt, time) => {
    let x = moveX + (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
    let z = moveZ + (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - (keys.has("w") || keys.has("arrowup") ? 1 : 0);
    if (x || z) {
      target = null; destinationRing.visible = false;
      const length = Math.hypot(x, z); x /= Math.max(1, length); z /= Math.max(1, length);
      const dx = x * Math.cos(azimuth) + z * Math.sin(azimuth), dz = -x * Math.sin(azimuth) + z * Math.cos(azimuth);
      point = moveMarble(point, dx * dt * 4, dz * dt * 4);
    } else if (target) {
      const dx = target.x - point.x, dz = target.z - point.z, length = Math.hypot(dx, dz);
      if (length < .15) { target = null; destinationRing.visible = false; }
      else {
        const next = moveMarble(point, dx / length * Math.min(length, dt * 4), dz / length * Math.min(length, dt * 4));
        if (Math.hypot(next.x - point.x, next.z - point.z) < .002) { target = null; destinationRing.visible = false; }
        point = next;
      }
    }
    const previous = avatar.position.clone(); avatar.position.set(point.x, floor + .38, point.z);
    if (time - positionStamp > .2) { canvas.dataset.marblePosition = `${point.x.toFixed(2)},${point.z.toFixed(2)}`; positionStamp = time; }
    avatar.rotation.z -= (avatar.position.x - previous.x) / .35; avatar.rotation.x += (avatar.position.z - previous.z) / .35;
    ring.position.set(point.x, floor + .055, point.z);
    desiredFocus.set(point.x * .27, 1.5, point.z * .27); focus.lerp(desiredFocus, 1 - Math.exp(-dt * 2.3));
    const desiredFov = camera.aspect < .9 ? 58 : 42;
    if (camera.fov !== desiredFov) { camera.fov = desiredFov; camera.updateProjectionMatrix(); }
    const aspectDistance = distance * (camera.aspect < .9 ? Math.max(1.3, .75 / camera.aspect) : 1);
    camera.position.set(focus.x + Math.sin(azimuth) * Math.cos(elevation) * aspectDistance, focus.y + Math.sin(elevation) * aspectDistance, focus.z + Math.cos(azimuth) * Math.cos(elevation) * aspectDistance); camera.lookAt(focus);
    const near = landmarks.find(p => Math.hypot(p.x - point.x, p.z - point.z) < 2);
    if (near && near.id !== place) { place = near.id; options.onPlace(place); }
    light = T.MathUtils.lerp(light, desiredLight, 1 - Math.exp(-dt * 2));
    (sky.material as T.ShaderMaterial).uniforms.uNight.value = light;
    water.uniforms.uLight.value = light; water.uniforms.uTime.value = stage.reduced ? 0 : time;
    sun.color.set(0xffd3a0).lerp(new T.Color(0x8bafe2), light); sun.intensity = 3.0 - light * 2.2;
    ambient.intensity = 1.7 - light * .9; lanternMaterial.emissiveIntensity = .2 + light * 3;
    sunDisc.visible = light < .7;
    moteMaterial.opacity = stage.reduced ? 0 : light * .8;
    if (!stage.reduced) motes.rotation.y = time * .012;
    if (bellAge < 4) {
      bellAge += dt;
      bellRig.rotation.z = stage.reduced || bellAge >= 4 ? 0 : Math.sin(bellAge * 6.5) * Math.exp(-bellAge * 1.2) * .4;
      bell.getWorldPosition(bellReflection.center);
    }
    water.uniforms.uRing.value = !stage.reduced && bellAge < 3 ? bellAge : -1;
  });
  // Set the camera before the first rendered frame.
  camera.position.set(17, 25, 25); camera.lookAt(focus);
  options.onPlace("arrival");
  return {
    setQuality: stage.setQuality, pause: stage.pause,
    light(value) { desiredLight = value; },
    ring: ringBell,
    move(x, z) { moveX = x; moveZ = z; if (x || z) target = null; },
    travel(id) { const destination = landmarks.find(p => p.id === id)!; point = { x: destination.x, z: destination.z }; target = null; destinationRing.visible = false; place = id; options.onPlace(id); },
    reframe() { azimuth = .45; elevation = .42; distance = 38; }, paper() {}, write() {},
    dispose() {
      window.removeEventListener("keydown", keydown); window.removeEventListener("keyup", keyup); window.removeEventListener("blur", blur); document.removeEventListener("visibilitychange", blur);
      canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointermove", pointermove); canvas.removeEventListener("pointerup", upPointer); canvas.removeEventListener("pointercancel", blur); canvas.removeEventListener("wheel", wheel);
      if (audio) void audio.close().catch(() => {});
      stage.dispose();
    },
  };
}
