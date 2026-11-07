import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { makeDeskObjects, shadowSurface, sheetSurface, walnutSurface } from "./paper-materials";
import { PaperSheet, STEP, TABLE_HALF_DEPTH, TABLE_HALF_WIDTH, type Point } from "./paper-physics";

export type PaperQuality = "auto" | "low" | "high";
export type PaperEffect = "grab" | "crease" | "crumple" | "land";
export type PaperAction = "fold" | "unfold" | "crumple" | "smooth" | "reset" | "toss";
export type PaperState = { folded: boolean; forming: boolean; holding: boolean; fallback: boolean };
export type PaperDesk = {
  action(action: PaperAction, alternate?: boolean): boolean;
  orbit(enabled: boolean): void;
  rotate(dx: number, dy: number): void;
  magnify(delta: number): void;
  resetView(): void;
  fan(value: number): void;
  quality(value: PaperQuality): void;
  dispose(): void;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function createPaperDesk(host: HTMLElement, options: {
  state: (state: PaperState) => void;
  effect: (effect: PaperEffect, strength?: number) => void;
}): PaperDesk {
  const sheet = new PaperSheet();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x181e1d);
  const camera = new THREE.PerspectiveCamera(39, 1, .022, 8);
  const key = new THREE.DirectionalLight(0xffe1bb, 2.65);
  key.position.set(-.52, .79, -.30);
  key.castShadow = true;
  key.shadow.camera.left = key.shadow.camera.bottom = -.37;
  key.shadow.camera.right = key.shadow.camera.top = .37;
  key.shadow.camera.near = .25;
  key.shadow.camera.far = 1.7;
  key.shadow.bias = -.00019;
  key.shadow.normalBias = .0009;
  key.shadow.radius = 4;
  scene.add(key, new THREE.HemisphereLight(0xdce9f3, 0x785c40, .68));
  const fill = new THREE.DirectionalLight(0xbbd7e6, .87);
  fill.position.set(.32, .45, .55);
  scene.add(fill);

  let width = 1, height = 1, ratio = 1;
  let dirty = true, geometryPending = true, disposed = false, frame = 0, time = 0, accumulator = 0, lastRender = 0;
  let orbit = false, azimuth = .19, elevation = 1.07, zoom = 1;
  let fallback = false;
  let quality: PaperQuality = "auto";
  let renderTier: "low" | "high" = "high";
  let autoLow = false;
  let slowFrameTime = 0;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = matchMedia("(pointer: coarse)");
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const focus = new THREE.Vector3();
  const center = new THREE.Vector3();
  const aim = new THREE.Vector2();
  const viewRay = new THREE.Raycaster();
  const projection = new THREE.Vector3();
  const pressurePlane = new THREE.Plane();
  const planeNormal = new THREE.Vector3();
  const pointerIntersection = new THREE.Vector3();
  const pointers = new Map<number, { x: number; y: number }>();
  let press: { id: number; node: number; target: Point; origin: THREE.Vector3; previous: number } | null = null;
  let movingView: number | null = null;
  let pinch: { distance: number; zoom: number } | null = null;
  let lastPositionY = 0;
  let airborne = false;
  let previousState = "";
  const invalidate = () => { dirty = true; };

  const surface = walnutSurface(invalidate);
  const desk = new THREE.Mesh(new THREE.BoxGeometry(.792, .032, .632), surface.material);
  desk.position.y = -.016;
  desk.receiveShadow = true;
  scene.add(desk);
  const deskEdge = new THREE.MeshStandardMaterial({ color: 0x45332b, roughness: .7 });
  const rim = (w: number, l: number, x: number, z: number) => {
    const part = new THREE.Mesh(new THREE.BoxGeometry(w, .009, l), deskEdge);
    part.position.set(x, .002, z);
    part.castShadow = part.receiveShadow = true;
    scene.add(part);
  };
  rim(.010, .62, -.386, 0);
  rim(.010, .62, .386, 0);
  rim(.78, .010, 0, -.306);
  rim(.78, .010, 0, .306);
  const base = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 8),
    new THREE.MeshStandardMaterial({ color: 0x25302e, roughness: .91 }),
  );
  base.rotation.x = -Math.PI / 2;
  base.position.y = -.052;
  base.receiveShadow = true;
  scene.add(base);
  makeDeskObjects(scene);
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: shadowSurface(), transparent: true, depthWrite: false, opacity: .8 }),
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = .00015;
  contact.renderOrder = 1;
  scene.add(contact);

  const geometry = new THREE.BufferGeometry();
  const positions = new THREE.BufferAttribute(sheet.positions, 3).setUsage(THREE.DynamicDrawUsage);
  const colors = new THREE.BufferAttribute(new Float32Array(sheet.count * 3).fill(1), 3).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", positions);
  geometry.setAttribute("color", colors);
  geometry.setAttribute("uv", new THREE.BufferAttribute(sheet.uv, 2));
  geometry.setIndex(new THREE.BufferAttribute(sheet.triangles, 1));
  const foldTrace = new THREE.Vector2();
  const paper = new THREE.Mesh(geometry, sheetSurface(foldTrace));
  paper.castShadow = paper.receiveShadow = true;
  paper.frustumCulled = false;
  scene.add(paper);
  const edgePoints = new Float32Array((sheet.outlines.length + 1) * 3);
  const edgeGeometry = new THREE.BufferGeometry();
  const edgePositions = new THREE.BufferAttribute(edgePoints, 3).setUsage(THREE.DynamicDrawUsage);
  edgeGeometry.setAttribute("position", edgePositions);
  const edge = new THREE.Line(edgeGeometry, new THREE.LineBasicMaterial({ color: 0xd7c7a9, transparent: true, opacity: .56 }));
  edge.frustumCulled = false;
  scene.add(edge);
  const gripGeometry = new THREE.RingGeometry(.006, .00685, 24);
  const gripMarker = new THREE.Mesh(gripGeometry, new THREE.MeshBasicMaterial({ color: 0xede1c3, depthTest: false, transparent: true, opacity: .81 }));
  gripMarker.renderOrder = 2;
  gripMarker.visible = false;
  scene.add(gripMarker);

  let renderer: THREE.WebGLRenderer | undefined;
  let environment: THREE.WebGLRenderTarget | undefined;
  let canvas: HTMLCanvasElement;
  let context: CanvasRenderingContext2D | null = null;
  const screen = new Float32Array(sheet.count * 3);
  const faceOrder = Array.from({ length: sheet.triangles.length / 3 }, (_, i) => i * 3);
  const depth = new Float32Array(sheet.triangles.length);

  function updateState() {
    const state = { folded: sheet.isFolded, forming: sheet.forming, holding: sheet.holding, fallback };
    const stamp = Object.values(state).join(",");
    if (stamp !== previousState) {
      previousState = stamp;
      options.state(state);
    }
  }

  function setTier() {
    const constrained = autoLow || mobile.matches || (memory !== undefined && memory < 6) || navigator.hardwareConcurrency <= 4;
    renderTier = quality === "low" || (quality === "auto" && constrained) || fallback ? "low" : "high";
    if (renderer) {
      const shadow = renderTier === "low" ? 1024 : 2048;
      if (key.shadow.mapSize.x !== shadow || !key.shadow.map) {
        key.shadow.map?.dispose();
        key.shadow.map = null;
        key.shadow.mapSize.set(shadow, shadow);
        key.shadow.needsUpdate = true;
      }
    }
    // Keep the mechanical accuracy identical at each graphics tier.
    sheet.setPasses(6);
    canvas.dataset.paperQuality = fallback ? "2d" : renderTier;
    resize();
  }

  function initializeCanvas() {
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "default" });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = .92;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      const pmrem = new THREE.PMREMGenerator(renderer);
      const room = new RoomEnvironment();
      environment = pmrem.fromScene(room, .065);
      scene.environment = environment.texture;
      scene.environmentIntensity = .48;
      room.dispose();
      pmrem.dispose();
      canvas = renderer.domElement;
    } catch {
      environment?.dispose();
      renderer?.dispose();
      renderer = undefined;
      fallback = true;
      canvas = document.createElement("canvas");
      context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("No usable canvas.");
    }
    attachCanvas();
  }

  function attachCanvas() {
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.touchAction = "none";
    canvas.dataset.paperRenderer = fallback ? "canvas2d" : "webgl2";
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", pointerCancel);
    canvas.addEventListener("lostpointercapture", pointerCancel);
    canvas.addEventListener("wheel", wheel, { passive: false });
    canvas.addEventListener("webglcontextlost", lostContext);
    host.appendChild(canvas);
    setTier();
  }

  function detachCanvas() {
    canvas.removeEventListener("pointerdown", pointerDown);
    canvas.removeEventListener("pointermove", pointerMove);
    canvas.removeEventListener("pointerup", pointerUp);
    canvas.removeEventListener("pointercancel", pointerCancel);
    canvas.removeEventListener("lostpointercapture", pointerCancel);
    canvas.removeEventListener("wheel", wheel);
    canvas.removeEventListener("webglcontextlost", lostContext);
    canvas.remove();
  }

  function lostContext(event: Event) {
    event.preventDefault();
    if (fallback || disposed) return;
    finishGrip(false);
    pointers.clear();
    movingView = null;
    pinch = null;
    detachCanvas();
    environment?.dispose();
    renderer?.dispose();
    renderer = undefined;
    fallback = true;
    canvas = document.createElement("canvas");
    context = canvas.getContext("2d", { alpha: false });
    attachCanvas();
    updateState();
  }

  function resize() {
    const box = host.getBoundingClientRect();
    width = Math.max(1, box.width);
    height = Math.max(1, box.height);
    const cap = renderTier === "low" ? 720_000 : 1_720_000;
    ratio = Math.max(.55, Math.min(renderTier === "low" ? 1.25 : 2, devicePixelRatio || 1, Math.sqrt(cap / (width * height))));
    const shortLandscape = height < 420 && width > height;
    camera.setViewOffset(width, height, 0, height * (shortLandscape ? .092 : .055), width, height);
    if (renderer) {
      renderer.setPixelRatio(ratio);
      renderer.setSize(width, height, false);
    } else {
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
    }
    invalidate();
  }

  function cameraPosition(dt: number) {
    if (press) return false;
    const target = sheet.centre();
    center.set(target.x * .82, Math.max(0, target.y - .012) * .39, target.z * .82);
    focus.lerp(center, motion.matches || !dt ? 1 : 1 - Math.exp(-dt * 9));
    const shortLandscape = height < 420 && width > height;
    const distance = Math.max(shortLandscape ? .61 : .545, .438 / camera.aspect) * zoom;
    const radius = Math.cos(elevation) * distance;
    camera.position.set(
      focus.x + Math.sin(azimuth) * radius,
      focus.y + Math.sin(elevation) * distance,
      focus.z + Math.cos(azimuth) * radius,
    );
    camera.lookAt(focus);
    camera.updateMatrixWorld();
    return focus.distanceToSquared(center) > .000001;
  }

  function updatePaper() {
    positions.needsUpdate = true;
    foldTrace.set(sheet.foldMemory[0], sheet.foldMemory[1]);
    // Millimetre-spaced flat layers are too close for a stable self-shadow
    // map. The fold scar and physical tabletop shadow remain active.
    paper.receiveShadow = !sheet.isFolded;
    for (let i = 0; i < sheet.count; i++) {
      const trace = sheet.creases[i];
      const rim = (i * 17 % 19) / 19;
      const discolor = 1 - trace * (.1 + rim * .11);
      colors.setXYZ(i, discolor, discolor - trace * .025, discolor - trace * .032);
    }
    colors.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    for (let i = 0; i <= sheet.outlines.length; i++) {
      const from = (sheet.outlines[i % sheet.outlines.length]) * 3;
      const at = i * 3;
      edgePoints[at] = sheet.positions[from];
      edgePoints[at + 1] = sheet.positions[from + 1] + .00017;
      edgePoints[at + 2] = sheet.positions[from + 2];
    }
    edgePositions.needsUpdate = true;
    const box = geometry.boundingSphere;
    if (!box) return;
    let halfX = .009, halfZ = .009;
    for (let i = 0; i < sheet.positions.length; i += 3) {
      halfX = Math.max(halfX, Math.abs(sheet.positions[i] - box.center.x));
      halfZ = Math.max(halfZ, Math.abs(sheet.positions[i + 2] - box.center.z));
    }
    const altitude = Math.max(0, box.center.y);
    contact.position.set(box.center.x + altitude * .19, .00015, box.center.z + altitude * .11);
    contact.scale.set(halfX * 2.6 + altitude * .65, halfZ * 2.55 + altitude * .65, 1);
    contact.material.opacity = clamp(.76 - altitude * 2.7, .09, .76);
    gripMarker.visible = !!press;
    if (press) {
      const grab = sheet.point(press.node);
      gripMarker.position.set(grab.x, grab.y, grab.z);
      gripMarker.quaternion.copy(camera.quaternion);
    }
  }

  function drawFallback() {
    const ctx = context;
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const table = ctx.createLinearGradient(0, 0, width, height);
    table.addColorStop(0, "#8c6045");
    table.addColorStop(.45, "#644335");
    table.addColorStop(1, "#322820");
    ctx.fillStyle = table;
    ctx.fillRect(0, 0, width, height);
    ctx.lineWidth = 1;
    for (let i = -height; i < width; i += 7.2) {
      ctx.strokeStyle = i % 2 === 0 ? "#dfaa7540" : "#2c170a45";
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.bezierCurveTo(i + .17 * height, .37 * height, i + .20 * height, .75 * height, i + .36 * height, height);
      ctx.stroke();
    }
    const c = sheet.centre();
    projection.set(c.x, 0, c.z).project(camera);
    const sx = width * (projection.x + 1) * .5, sy = height * (1 - projection.y) * .5;
    const spread = clamp((geometry.boundingSphere?.radius ?? .15) * .83 * height / camera.position.distanceTo(focus), 10, width * .58);
    ctx.save();
    ctx.translate(sx + 6, sy + 9);
    ctx.scale(1, .66);
    const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, spread);
    shadow.addColorStop(0, "#2816108e");
    shadow.addColorStop(.8, "#24170f4f");
    shadow.addColorStop(1, "#22150d00");
    ctx.fillStyle = shadow;
    ctx.fillRect(-spread, -spread, spread * 2, spread * 2);
    ctx.restore();
    for (let i = 0; i < sheet.count; i++) {
      projection.fromArray(sheet.positions, i * 3).project(camera);
      screen[i * 3] = width * (projection.x + 1) * .5;
      screen[i * 3 + 1] = height * (1 - projection.y) * .5;
      screen[i * 3 + 2] = projection.z;
    }
    const indices = sheet.triangles;
    for (const face of faceOrder) {
      depth[face] = screen[indices[face] * 3 + 2] + screen[indices[face + 1] * 3 + 2] + screen[indices[face + 2] * 3 + 2];
    }
    faceOrder.sort((a, b) => depth[b] - depth[a]);
    const normal = geometry.getAttribute("normal");
    for (const face of faceOrder) {
      const a = indices[face], b = indices[face + 1], c = indices[face + 2];
      const ax = a * 3, bx = b * 3, cx = c * 3;
      const nx = normal.getX(a) + normal.getX(b) + normal.getX(c);
      const ny = normal.getY(a) + normal.getY(b) + normal.getY(c);
      const nz = normal.getZ(a) + normal.getZ(b) + normal.getZ(c);
      const trace = (sheet.creases[a] + sheet.creases[b] + sheet.creases[c]) / 3;
      const value = clamp(71 + Math.abs(nx * -.3 + ny * .75 + nz * -.27) * 8.5 - trace * 9, 51, 94);
      const shade = "hsl(43 30% " + value + "%)";
      ctx.fillStyle = ctx.strokeStyle = shade;
      ctx.lineWidth = .36;
      ctx.beginPath();
      ctx.moveTo(screen[ax], screen[ax + 1]);
      ctx.lineTo(screen[bx], screen[bx + 1]);
      ctx.lineTo(screen[cx], screen[cx + 1]);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    for (let axis = 0; axis < 2; axis++) {
      if (!sheet.foldMemory[axis]) continue;
      const points = axis === 0 ? sheet.rows : sheet.columns;
      ctx.strokeStyle = "#82776392";
      ctx.lineWidth = .9;
      ctx.beginPath();
      for (let i = 0; i < points; i++) {
        const node = axis === 0 ? i * sheet.columns + (sheet.columns - 1) / 2
          : (sheet.rows - 1) / 2 * sheet.columns + i;
        const index = node * 3;
        if (i === 0) ctx.moveTo(screen[index], screen[index + 1]);
        else ctx.lineTo(screen[index], screen[index + 1]);
      }
      ctx.stroke();
    }
    if (press) {
      const i = press.node * 3;
      ctx.strokeStyle = "#9b754d";
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.arc(screen[i], screen[i + 1], 7.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function ray(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    aim.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    viewRay.setFromCamera(aim, camera);
    return viewRay.ray;
  }

  function pick(event: PointerEvent) {
    ray(event);
    const hit = viewRay.intersectObject(paper, false)[0];
    if (hit?.face) {
      const indices = [hit.face.a, hit.face.b, hit.face.c];
      let distance = Infinity, best = -1;
      for (const i of indices) {
        const d = projection.fromArray(sheet.positions, i * 3).distanceToSquared(hit.point);
        if (d < distance) { distance = d; best = i; }
      }
      return best;
    }
    let distance = mobile.matches ? 25 ** 2 : 13 ** 2, best = -1;
    for (const i of sheet.outlines) {
      projection.fromArray(sheet.positions, i * 3).project(camera);
      const dx = (projection.x - aim.x) * width / 2, dy = (projection.y - aim.y) * height / 2;
      const d = dx * dx + dy * dy;
      if (d < distance) { distance = d; best = i; }
    }
    return best;
  }

  function pointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    event.preventDefault();
    host.focus({ preventScroll: true });
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.setPointerCapture(event.pointerId);
    if (pointers.size > 1) {
      finishGrip(false);
      movingView = null;
      const [a, b] = Array.from(pointers.values());
      pinch = { distance: Math.max(8, Math.hypot(a.x - b.x, a.y - b.y)), zoom };
      return;
    }
    if (orbit) {
      movingView = event.pointerId;
      canvas.style.cursor = "grabbing";
      return;
    }
    const node = pick(event);
    if (node < 0) return;
    const target = sheet.point(node);
    camera.getWorldDirection(planeNormal);
    pressurePlane.setFromNormalAndCoplanarPoint(planeNormal, projection.set(target.x, target.y, target.z));
    const origin = viewRay.ray.intersectPlane(pressurePlane, new THREE.Vector3());
    if (!origin || !sheet.grab(node, target)) return;
    press = { id: event.pointerId, node, target, origin, previous: event.timeStamp };
    canvas.style.cursor = "grabbing";
    options.effect("grab", .5);
    updateState();
  }

  function pointerMove(event: PointerEvent) {
    const old = pointers.get(event.pointerId);
    if (old) pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch && pointers.size > 1) {
      const [a, b] = Array.from(pointers.values());
      zoom = clamp(pinch.zoom * pinch.distance / Math.max(8, Math.hypot(a.x - b.x, a.y - b.y)), .52, 1.55);
      invalidate();
      return;
    }
    if (old && movingView === event.pointerId) {
      rotate(event.clientX - old.x, event.clientY - old.y);
      return;
    }
    if (press?.id === event.pointerId && ray(event).intersectPlane(pressurePlane, pointerIntersection)) {
      sheet.pull({
        x: press.target.x + pointerIntersection.x - press.origin.x,
        y: press.target.y + pointerIntersection.y - press.origin.y,
        z: press.target.z + pointerIntersection.z - press.origin.z,
      }, (event.timeStamp - press.previous) / 1000);
      press.previous = event.timeStamp;
    } else if (!old && !mobile.matches) {
      canvas.style.cursor = orbit ? "grab" : pick(event) >= 0 ? "grab" : "default";
    }
  }

  function finishGrip(inertia: boolean) {
    if (!press) return;
    sheet.release(inertia);
    press = null;
    updateState();
    invalidate();
  }

  function endPointer(event: PointerEvent, inertia: boolean) {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (press?.id === event.pointerId) finishGrip(inertia && event.timeStamp - press.previous < 95);
    if (movingView === event.pointerId) movingView = null;
    if (pointers.size < 2) pinch = null;
    canvas.style.cursor = orbit ? "grab" : "default";
  }

  function pointerUp(event: PointerEvent) { endPointer(event, true); }
  function pointerCancel(event: PointerEvent) { endPointer(event, false); }
  function wheel(event: WheelEvent) {
    event.preventDefault();
    magnify(event.deltaY * .00075);
  }
  function rotate(dx: number, dy: number) {
    azimuth -= dx * .012;
    elevation = clamp(elevation + dy * .009, .27, 1.49);
    invalidate();
  }
  function magnify(delta: number) {
    zoom = clamp(zoom + delta, .52, 1.55);
    invalidate();
  }
  function visibility() {
    if (document.hidden) {
      finishGrip(false);
      movingView = null;
      pointers.clear();
      pinch = null;
    }
    time = accumulator = 0;
    invalidate();
  }

  function tick(now: number) {
    if (disposed) return;
    frame = requestAnimationFrame(tick);
    if (document.hidden) return;
    const dt = time ? clamp((now - time) / 1000, 0, .044) : 0;
    time = now;
    const isAwake = sheet.awake;
    let geometryChanged = false;
    if (isAwake) {
      accumulator = Math.min(.052, accumulator + dt);
      while (accumulator >= STEP) {
        geometryChanged = sheet.step() || geometryChanged;
        accumulator -= STEP;
      }
      const y = sheet.centre().y;
      if (!sheet.forming && !sheet.holding && y > .061) airborne = true;
      if (airborne && y <= .059 && y < lastPositionY) {
        options.effect("land", clamp((lastPositionY - y) / Math.max(dt, .001) * 1.2, .24, 1));
        airborne = false;
      }
      lastPositionY = y;
      updateState();
    } else accumulator = 0;
    const cameraMoving = cameraPosition(dt);
    geometryPending = geometryPending || geometryChanged;
    if (!dirty && !geometryPending && !cameraMoving) return;
    if (renderTier === "low" && lastRender && now - lastRender < 30) return;
    updatePaper();
    if (renderer) renderer.render(scene, camera);
    else drawFallback();
    lastRender = now;
    dirty = geometryPending = false;
    if (quality === "auto" && renderTier === "high" && isAwake && dt > .031) {
      slowFrameTime += dt;
      if (slowFrameTime > 1.4) { autoLow = true; setTier(); }
    } else slowFrameTime = Math.max(0, slowFrameTime - dt);
  }

  initializeCanvas();
  updatePaper();
  updateState();
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  document.addEventListener("visibilitychange", visibility);
  frame = requestAnimationFrame(tick);

  return {
    action(action, alternate = false) {
      if (action === "reset") {
        finishGrip(false);
        sheet.reset();
        airborne = false;
        focus.set(0, 0, 0);
        invalidate();
        updateState();
        return true;
      }
      let accepted = false;
      if (action === "toss") accepted = sheet.toss();
      else accepted = sheet.tool(action, alternate);
      if (!accepted) return false;
      if (action === "crumple") options.effect("crumple");
      else if (action !== "toss") options.effect("crease", action === "smooth" ? .47 : .75);
      else options.effect("grab", .48);
      updateState();
      invalidate();
      return true;
    },
    orbit(value) {
      finishGrip(false);
      orbit = value;
      canvas.style.cursor = orbit ? "grab" : "default";
    },
    rotate,
    magnify,
    resetView() {
      azimuth = .19;
      elevation = 1.07;
      zoom = 1;
      invalidate();
    },
    fan(value) { sheet.setWind(value); },
    quality(value) { quality = value; setTier(); },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      detachCanvas();
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      const textures = new Set<THREE.Texture>(surface.textures);
      scene.traverse(object => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.Line)) return;
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          materials.add(material);
          for (const prop of Object.values(material)) if (prop instanceof THREE.Texture) textures.add(prop);
        }
      });
      geometries.forEach(item => item.dispose());
      materials.forEach(item => item.dispose());
      textures.forEach(item => item.dispose());
      key.shadow.dispose();
      environment?.dispose();
      renderer?.dispose();
      renderer?.forceContextLoss();
      scene.clear();
    },
  };
}
