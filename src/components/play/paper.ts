import * as T from "three";
import { createStage } from "./stage";
import type { Engine, Options } from "./types";

type Sheet = {
  mesh: T.Mesh<T.PlaneGeometry, T.MeshStandardMaterial>;
  texture: T.CanvasTexture; canvas: HTMLCanvasElement;
  velocity: T.Vector3; rotationVelocity: T.Vector3;
  amount: number; desired: number; home: T.Vector3; held: boolean; text: string;
};
const words = {
  en: ["Leave a little room\nfor the unexpected.", "A thought,\nbefore it becomes\na plan.", "Go on.\nMake a mess.", "Not everything\nneeds a purpose.", "Start anywhere.", "You can always\nunfold it again."],
  sl: ["Pusti malo prostora\nza nepričakovano.", "Misel,\npreden postane\nnačrt.", "Kar pogumno.\nNaredi malo nereda.", "Ni treba, da ima\nvse svoj namen.", "Začni kjerkoli.", "Vedno ga lahko\nspet razgrneš."],
};

function drawPaper(sheet: Sheet, number: number) {
  const context = sheet.canvas.getContext("2d")!;
  const w = sheet.canvas.width, h = sheet.canvas.height;
  context.fillStyle = ["#eee8d9", "#dce0d2", "#e9d7c5"][number % 3]; context.fillRect(0, 0, w, h);
  // Faint graph paper and tactile fibres, generated locally at a fixed seed.
  context.strokeStyle = "rgba(55,65,48,.09)"; context.lineWidth = 1;
  for (let x = 30; x < w; x += 30) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, h); context.stroke(); }
  for (let y = 30; y < h; y += 30) { context.beginPath(); context.moveTo(0, y); context.lineTo(w, y); context.stroke(); }
  context.fillStyle = "rgba(70,60,45,.035)";
  for (let i = 0; i < 2800; i++) context.fillRect((i * 79.3) % w, (i * 127.7) % h, 1, 2);
  context.fillStyle = "#69715d"; context.font = "16px monospace"; context.fillText("STILLWATER / PAPER STUDIES", 48, 65);
  context.fillStyle = "#344238"; context.font = "italic 46px Georgia";
  const lines = sheet.text.split("\n").flatMap(line => {
    const result: string[] = []; let current = "";
    for (const word of line.split(" ")) { const next = current ? current + " " + word : word; if (context.measureText(next).width > w - 100 && current) { result.push(current); current = word; } else current = next; }
    result.push(current); return result;
  });
  lines.slice(0, 7).forEach((line, index) => context.fillText(line, 48, 245 + index * 60));
  context.strokeStyle = "#69715d"; context.lineWidth = 1; context.beginPath(); context.moveTo(48, h - 95); context.lineTo(w - 48, h - 95); context.stroke();
  context.font = "16px monospace"; context.fillText(String(number + 1).padStart(2, "0") + " / 06", 48, h - 54);
  context.font = "italic 20px Georgia"; context.fillText("a small diversion", w - 210, h - 54);
  sheet.texture.needsUpdate = true;
}

/** A continuous sheet folds into a creased, compact surface; geometry is only updated while folding. */
function deform(sheet: Sheet) {
  const geometry = sheet.mesh.geometry, positions = geometry.getAttribute("position"), uv = geometry.getAttribute("uv");
  const t = sheet.amount, eased = t * t * (3 - 2 * t);
  for (let i = 0; i < positions.count; i++) {
    const u = uv.getX(i), v = uv.getY(i), x = (u - .5) * 3.45, y = (v - .5) * 4.5;
    const theta = (u - .5) * Math.PI * 2.05, phi = .12 + v * Math.PI * .9;
    const crease = .18 * (Math.abs(Math.sin(u * 19 + v * 8)) - .5) + .07 * Math.sin(v * 23 - u * 7);
    const radius = .72 + crease;
    const bx = Math.sin(theta) * Math.sin(phi) * radius;
    const by = Math.cos(phi) * radius;
    const bz = Math.cos(theta) * Math.sin(phi) * radius;
    // A broad bend first, followed by high-frequency creases as the sheet closes.
    const curl = Math.sin(u * Math.PI * 2 + v * 3) * Math.sin(v * Math.PI) * .26;
    positions.setXYZ(i, T.MathUtils.lerp(x, bx, eased), T.MathUtils.lerp(y, by, eased), T.MathUtils.lerp(curl * Math.sin(t * Math.PI), bz, eased));
  }
  positions.needsUpdate = true; geometry.computeVertexNormals(); geometry.computeBoundingSphere();
}

export function createPaper(options: Options): Engine {
  const stage = createStage(options), { scene, camera, canvas, sun } = stage;
  scene.background = new T.Color(0x263d35); scene.fog = new T.Fog(0x263d35, 20, 50);
  camera.position.set(0, 8.5, 13.5); camera.lookAt(0, 1, 0);
  sun.position.set(-8, 14, 7); sun.intensity = 2.4; stage.ambient.intensity = 1.5;
  const table = new T.Mesh(new T.PlaneGeometry(200, 200), new T.MeshStandardMaterial({ color: 0x596855, roughness: 1 })); table.rotation.x = -Math.PI / 2; table.receiveShadow = true; scene.add(table);
  const sheets: Sheet[] = Array.from({ length: 6 }, (_, index) => {
    const canvas = document.createElement("canvas"); canvas.width = 600; canvas.height = 780;
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = Math.min(4, stage.renderer.capabilities.getMaxAnisotropy());
    const geometry = new T.PlaneGeometry(3.45, 4.5, 32, 42);
    const material = new T.MeshStandardMaterial({ map: texture, color: 0xffffff, side: T.DoubleSide, roughness: .94, metalness: 0, flatShading: true });
    const mesh = new T.Mesh(geometry, material); mesh.castShadow = true; mesh.receiveShadow = true;
    const home = new T.Vector3((index % 3 - 1) * 3.4 + (index > 2 ? .7 : -.4), .85, (Math.floor(index / 3) - .5) * 3.8);
    mesh.position.copy(home); mesh.rotation.set(.5 * index, index * 1.5, index * .7); scene.add(mesh);
    const sheet: Sheet = { mesh, canvas, texture, amount: 1, desired: 1, velocity: new T.Vector3(), rotationVelocity: new T.Vector3(), home, held: false, text: options.notes[index] ?? words[options.lang][index] };
    drawPaper(sheet, index); deform(sheet); return sheet;
  });
  let selected = 0, open = true, grabbed: Sheet | null = null, textureDirty = true;
  const focusPosition = new T.Vector3(0, 3.1, 2.7), openRotation = new T.Quaternion().setFromEuler(new T.Euler(-.25, 0, -.035));
  sheets[0].desired = 0;
  const raycaster = new T.Raycaster(), pointer = new T.Vector2(), dragPlane = new T.Plane();
  const dragTarget = new T.Vector3(), dragOffset = new T.Vector3(), intersection = new T.Vector3();
  let drag: { id: number; startX: number; startY: number; lastX: number; lastY: number; moved: boolean } | null = null;
  function select(index: number) {
    const previous = sheets[selected];
    if (selected !== index && open) { previous.desired = 1; previous.velocity.set(-1.5, 2, -3); previous.rotationVelocity.set(.8, 1.1, .5); }
    selected = index; open = true;
    const sheet = sheets[index]; sheet.desired = 0; sheet.velocity.set(0, 0, 0); sheet.held = false;
    options.onPaper(index);
  }
  function pointerRay(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2); raycaster.setFromCamera(pointer, camera);
  }
  const down = (event: PointerEvent) => {
    if (event.button !== 0) return;
    pointerRay(event);
    const hits = raycaster.intersectObjects(sheets.map(sheet => sheet.mesh));
    if (!hits.length) return;
    const index = sheets.findIndex(sheet => sheet.mesh === hits[0].object);
    if (index !== selected && open) { sheets[selected].desired = 1; sheets[selected].velocity.set(-1.5, 2, -3); }
    selected = index; grabbed = sheets[index]; options.onPaper(index, grabbed.amount > .5 ? "folded" : "opened");
    canvas.setPointerCapture(event.pointerId);
    drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastY: event.clientY, moved: false };
    dragPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new T.Vector3()).negate(), grabbed.mesh.position);
    if (raycaster.ray.intersectPlane(dragPlane, intersection)) { dragOffset.copy(grabbed.mesh.position).sub(intersection); dragTarget.copy(grabbed.mesh.position); }
  };
  const move = (event: PointerEvent) => {
    if (!drag || !grabbed || drag.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 6) { drag.moved = true; open = false; grabbed.held = true; }
    if (drag.moved) {
      pointerRay(event);
      if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
        dragTarget.copy(intersection).add(dragOffset); dragTarget.x = T.MathUtils.clamp(dragTarget.x, -7, 7); dragTarget.y = T.MathUtils.clamp(dragTarget.y, 1, 7); dragTarget.z = T.MathUtils.clamp(dragTarget.z, -4, 5);
      }
    }
    drag.lastX = event.clientX; drag.lastY = event.clientY;
  };
  const release = () => {
    if (grabbed) {
      grabbed.held = false;
      if (drag?.moved) { grabbed.desired = 1; grabbed.velocity.clampLength(0, 14); grabbed.rotationVelocity.set(.7, 1.2, .8); options.onPaper(selected, "thrown"); }
      else select(selected);
    }
    drag = null; grabbed = null;
  };
  const cancel = () => { if (grabbed) { grabbed.held = false; grabbed.velocity.set(0, 0, 0); grabbed.desired = 1; } drag = null; grabbed = null; };
  canvas.addEventListener("pointerdown", down); canvas.addEventListener("pointermove", move); canvas.addEventListener("pointerup", release); canvas.addEventListener("pointercancel", cancel); window.addEventListener("blur", cancel);
  stage.tick((dt) => {
    const dirty = textureDirty || sheets.some((sheet, index) => sheet.held || Math.abs(sheet.amount - sheet.desired) > .001 || (index === selected && open ? sheet.mesh.position.distanceTo(focusPosition) > .002 || sheet.mesh.quaternion.angleTo(openRotation) > .002 : sheet.mesh.position.y > .801 || sheet.velocity.lengthSq() > .0025 || sheet.rotationVelocity.lengthSq() > .001));
    textureDirty = false;
    sheets.forEach((sheet, index) => {
      if (Math.abs(sheet.amount - sheet.desired) > .001) { sheet.amount = T.MathUtils.damp(sheet.amount, sheet.desired, stage.reduced ? 40 : 4, dt); deform(sheet); }
      if (sheet.held) {
        sheet.velocity.copy(dragTarget).sub(sheet.mesh.position).multiplyScalar(18).clampLength(0, 16); sheet.mesh.position.addScaledVector(sheet.velocity, dt);
      } else if (index === selected && open) {
        sheet.mesh.position.lerp(focusPosition, 1 - Math.exp(-dt * 5)); sheet.mesh.quaternion.slerp(openRotation, 1 - Math.exp(-dt * 4)); sheet.velocity.set(0, 0, 0);
      } else {
        sheet.velocity.y -= 10 * dt; sheet.mesh.position.addScaledVector(sheet.velocity, dt);
        const rest = .8;
        if (sheet.mesh.position.y < rest) {
          sheet.mesh.position.y = rest; sheet.velocity.y = Math.abs(sheet.velocity.y) > .7 ? -sheet.velocity.y * .3 : 0;
          sheet.velocity.x *= Math.exp(-dt * 4); sheet.velocity.z *= Math.exp(-dt * 4); sheet.rotationVelocity.multiplyScalar(Math.exp(-dt * 5));
        }
        for (const axis of ["x", "z"] as const) if (Math.abs(sheet.mesh.position[axis]) > 7) { sheet.mesh.position[axis] = Math.sign(sheet.mesh.position[axis]) * 7; sheet.velocity[axis] *= -.35; }
        sheet.mesh.rotation.x += sheet.rotationVelocity.x * dt; sheet.mesh.rotation.y += sheet.rotationVelocity.y * dt; sheet.mesh.rotation.z += sheet.rotationVelocity.z * dt;
      }
    });
    // Lightweight broad-phase sphere contacts for crumpled sheets only.
    for (let i = 0; i < sheets.length; i++) for (let j = i + 1; j < sheets.length; j++) {
      const a = sheets[i], b = sheets[j];
      if (a.amount < .85 || b.amount < .85 || (open && (i === selected || j === selected))) continue;
      const delta = b.mesh.position.clone().sub(a.mesh.position), length = delta.length();
      if (length > .001 && length < 1.45) {
        delta.divideScalar(length); const overlap = 1.45 - length;
        if (!a.held) a.mesh.position.addScaledVector(delta, -overlap * .5);
        if (!b.held) b.mesh.position.addScaledVector(delta, overlap * .5);
        const impulse = a.velocity.clone().sub(b.velocity).dot(delta);
        if (impulse > 0) { if (!a.held) a.velocity.addScaledVector(delta, -impulse * .6); if (!b.held) b.velocity.addScaledVector(delta, impulse * .6); }
      }
    }
    return dirty;
  });
  options.onPaper(0);
  return {
    setQuality: stage.setQuality, pause: stage.pause, light() {}, ring() {}, move() {}, travel() {}, reframe() {},
    paper(action, index) {
      if (action === "open") select(index ?? selected);
      else if (action === "crumple") { open = false; sheets[selected].desired = 1; }
      else if (action === "toss") { open = false; const sheet = sheets[selected]; sheet.desired = 1; sheet.velocity.set((selected % 2 ? -1 : 1) * 4.5, 5, -4); sheet.rotationVelocity.set(1.7, 2, -.8); }
      else if (action === "reset") { cancel(); open = false; sheets.forEach(sheet => { sheet.mesh.position.copy(sheet.home); sheet.velocity.set(0, 0, 0); sheet.desired = 1; sheet.rotationVelocity.set(0, 0, 0); }); }
    },
    write(text) { sheets[selected].text = text; drawPaper(sheets[selected], selected); textureDirty = true; },
    dispose() { cancel(); canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointermove", move); canvas.removeEventListener("pointerup", release); canvas.removeEventListener("pointercancel", cancel); window.removeEventListener("blur", cancel); stage.dispose(); },
  };
}
