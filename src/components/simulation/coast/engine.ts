import * as T from "three";
import { initialTier, qualitySettings, type Tier } from "@/lib/play-model";
import { addScenery, addTerrain, loadSurfaceMaps } from "./landscape";
import { addSeascape } from "./seascape";
import { coastSession, type CoastEngine, type CoastOptions } from "./session";
import { coastHeight, eyeHeight, terrainNoise } from "./terrain";
import { createPebbles } from "./pebbles";

function addHorizon(scene: T.Scene) {
  const layers = [
    { x: -501, z: -735, rise: 48, width: 530, angle: -.4, tone: 0x8d9c9f },
    { x: -698, z: -1080, rise: 88, width: 820, angle: -.09, tone: 0x97a4a8 },
    { x: 185, z: -930, rise: 97, width: 820, angle: -.44, tone: 0x829597 },
  ];
  for (const layer of layers) {
    const vertices: number[] = [], index: number[] = [];
    for (let step = 0; step <= 74; step++) {
      const t = step / 74;
      const x = layer.x + (t - .5) * layer.width;
      const z = layer.z + (t - .5) * layer.width * layer.angle;
      const edge = Math.pow(Math.sin(t * Math.PI), .77);
      const height = layer.rise * edge * (.37 + terrainNoise(t * 16, layer.z) * .56 + terrainNoise(t * 39, layer.x) * .18);
      vertices.push(x, -11, z + 36, x, height, z, x, -11, z - 125);
      if (step > 0) {
        const a = (step - 1) * 3, b = step * 3;
        index.push(a, b, a + 1, b, b + 1, a + 1, a + 1, b + 1, a + 2, b + 1, b + 2, a + 2);
      }
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(index);
    geometry.computeVertexNormals();
    const ridge = new T.Mesh(geometry, new T.MeshBasicMaterial({ color: layer.tone, side: T.DoubleSide }));
    scene.add(ridge);
  }
}

export async function createCoastEngine(options: CoastOptions): Promise<CoastEngine> {
  const coarsePointer = matchMedia("(pointer: coarse)").matches;
  const renderer = new T.WebGLRenderer({ antialias: !coarsePointer, alpha: false, powerPreference: "default" });
  const canvas = renderer.domElement;
  canvas.dataset.renderer = "coast-3d";
  canvas.setAttribute("aria-hidden", "true");
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.14;
  renderer.shadowMap.type = T.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.setClearColor(0x9aaca9);
  const supportsReflection = renderer.extensions.has("EXT_color_buffer_float");
  const maps = await loadSurfaceMaps(renderer.capabilities.getMaxAnisotropy());
  if (options.signal.aborted) {
    Object.values(maps).forEach(texture => texture.dispose());
    renderer.dispose(); renderer.forceContextLoss();
    throw new DOMException("Coast loading cancelled", "AbortError");
  }
  const scene = new T.Scene();
  const fog = new T.FogExp2(0xd1d8d2, .00255);
  scene.fog = fog;
  const camera = new T.PerspectiveCamera(56, 1, .065, 2050);
  camera.rotation.order = "YXZ";
  const ambient = new T.HemisphereLight(0xa7c4d4, 0xb3ad92, 1.96);
  const sun = new T.DirectionalLight(0xffc88b, 3.2);
  sun.castShadow = true;
  sun.shadow.camera.left = -43;
  sun.shadow.camera.right = 43;
  sun.shadow.camera.bottom = -43;
  sun.shadow.camera.top = 43;
  sun.shadow.camera.near = 4;
  sun.shadow.camera.far = 177;
  sun.shadow.normalBias = .105;
  sun.shadow.bias = -.00016;
  sun.shadow.radius = 2.3;
  scene.add(ambient, sun, sun.target);
  const controls = {
    time: { value: 0 },
    tide: { value: options.initial.tide },
    wind: { value: options.initial.wind },
    detail: { value: 1 },
  };
  addTerrain(scene, maps, controls.tide, controls.detail);
  const scenery = addScenery(scene, maps, controls.time, controls.wind);
  addHorizon(scene);
  const pebbles = createPebbles(scene);
  const sea = addSeascape(scene, controls, maps.beach, pebbles.ripples);
  sea.changeLight(options.initial.light);
  const session = coastSession(options, scenery.collisions);
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const startingTier = initialTier({ memory: device.deviceMemory, cores: device.hardwareConcurrency, coarse: coarsePointer, saveData: device.connection?.saveData });
  let tier: Tier = options.initial.quality === "auto" ? startingTier : options.initial.quality;
  let raf = 0, disposed = false, previous = 0, sampleFrames = 0, sampleMs = 0, seconds = 0;
  let width = 1, height = 1, warmUp = 1.8, shadowTimer = 1;
  let shadowX = Infinity, shadowZ = Infinity, shadowAngle = 1, cameraHeight = NaN, activityTimer = 0;
  let setScanDetail: ((detailed: boolean) => void) | undefined;

  const resize = () => {
    const rect = options.host.getBoundingClientRect();
    width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    const budget = qualitySettings[tier];
    const pixelRatio = Math.min(window.devicePixelRatio || 1, budget.pixelRatio, Math.sqrt(budget.pixels / (width * height)));
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = camera.aspect < .74 ? 70 : camera.aspect < 1.1 ? 62 : 55;
    camera.updateProjectionMatrix();
    const ratio = Math.min(.56, 560 / width, 520 / height);
    sea.applyQuality(tier === "cinematic" && supportsReflection, Math.max(128, Math.round(width * ratio)), Math.max(128, Math.round(height * ratio)));
  };
  function setTier(value: Tier) {
    tier = value;
    canvas.dataset.renderQuality = value;
    options.tier(value);
    const settings = qualitySettings[tier];
    renderer.shadowMap.enabled = settings.shadow > 0;
    if (settings.shadow > 0) {
      const resolution = Math.min(settings.shadow, 1536);
      if (sun.shadow.mapSize.x !== resolution) {
        sun.shadow.mapSize.set(resolution, resolution);
        sun.shadow.map?.dispose();
        sun.shadow.map = null;
      }
      renderer.shadowMap.needsUpdate = true;
    }
    controls.detail.value = tier === "low" ? .34 : tier === "balanced" ? .73 : 1;
    scenery.setDetail(tier !== "low");
    setScanDetail?.(tier !== "low");
    sampleFrames = sampleMs = 0;
    warmUp = 1.8;
    resize();
  }

  function draw(dt: number) {
    session.step(dt);
    const pose = session.state;
    const targetY = coastHeight(pose.x, pose.z) + eyeHeight;
    if (!Number.isFinite(cameraHeight)) cameraHeight = targetY;
    cameraHeight += (targetY - cameraHeight) * (1 - Math.exp(-dt * 14));
    seconds += dt;
    controls.time.value = preference.matches ? 0 : seconds;
    controls.tide.value = session.config.tide;
    controls.wind.value = session.config.wind;
    pebbles.step(dt, controls.tide.value);
    camera.position.set(pose.x, cameraHeight, pose.z);
    camera.rotation.set(pose.pitch, -pose.yaw, 0);
    const light = sea.update(dt, camera, sun, ambient);
    fog.color.copy(light.lower).lerp(light.upper, .32);
    shadowTimer += dt;
    if (shadowTimer > .13 && (Math.hypot(pose.x - shadowX, pose.z - shadowZ) > 4 || Math.abs(light.direction.y - shadowAngle) > .012)) {
      shadowX = pose.x; shadowZ = pose.z; shadowAngle = light.direction.y;
      sun.target.position.set(pose.x, cameraHeight + 2, pose.z);
      sun.position.copy(light.direction).multiplyScalar(97).add(sun.target.position);
      renderer.shadowMap.needsUpdate = true;
      shadowTimer = 0;
    }
    renderer.render(scene, camera);
  }
  const pauseClock = () => { previous = 0; sampleMs = sampleFrames = 0; };
  const lost = (event: Event) => { event.preventDefault(); cancelAnimationFrame(raf); options.onLost(); };
  const observer = new ResizeObserver(resize);
  function animate(now: number) {
    if (disposed) return;
    raf = requestAnimationFrame(animate);
    if (document.hidden) { previous = 0; return; }
    const elapsed = previous ? now - previous : 16.67;
    if (previous && elapsed < 1000 / qualitySettings[tier].fps - 1.5) return;
    previous = now;
    draw(Math.min(elapsed * .001, .062));
    warmUp -= elapsed * .001;
    if (warmUp > 0) return;
    sampleFrames++;
    sampleMs += elapsed;
    activityTimer += elapsed;
    if (sampleFrames >= 40 || sampleMs > 2100) {
      const mean = sampleMs / sampleFrames;
      canvas.dataset.renderFps = String(Math.round(1000 / mean));
      canvas.dataset.renderTriangles = String(renderer.info.render.triangles);
      sampleFrames = sampleMs = 0;
      if (session.config.quality === "auto" && activityTimer >= 1400) {
        if (tier === "cinematic" && mean > 28) setTier("balanced");
        else if (tier === "balanced" && mean > 35) setTier("low");
        activityTimer = 0;
      }
    }
  }
  const engine: CoastEngine = {
    ...session,
    settings(value) {
      const previousConfig = session.config;
      session.settings(value);
      if (previousConfig.light !== value.light) sea.changeLight(value.light);
      if (previousConfig.quality !== value.quality) setTier(value.quality === "auto" ? startingTier : value.quality);
    },
    visit(where) {
      session.visit(where);
      cameraHeight = NaN;
      shadowX = Infinity;
    },
    throwPebble() {
      pebbles.throw(session.state, cameraHeight);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", lost);
      document.removeEventListener("visibilitychange", pauseClock);
      pebbles.dispose();
      const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>();
      const textures = new Set<T.Texture>(Object.values(maps));
      scene.traverse(object => {
        if (!(object instanceof T.Mesh)) return;
        if (object instanceof T.InstancedMesh) object.dispose();
        geometries.add(object.geometry);
        const meshMaterials: T.Material[] = Array.isArray(object.material) ? object.material : [object.material];
        meshMaterials.forEach(material => {
          materials.add(material);
          Object.values(material).forEach(value => { if (value instanceof T.Texture) textures.add(value); });
        });
      });
      sea.dispose();
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      textures.forEach(texture => texture.dispose());
      sun.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      scene.clear();
    },
  };
  try {
    options.host.appendChild(canvas);
    observer.observe(options.host);
    canvas.addEventListener("webglcontextlost", lost);
    document.addEventListener("visibilitychange", pauseClock);
    setTier(tier);
    draw(0);
    raf = requestAnimationFrame(animate);
    void import("./scans").then(({ addScans }) => addScans(scene, options.signal, () => !disposed)).then(setDetail => {
      if (disposed) return;
      setScanDetail = setDetail;
      setDetail(tier !== "low");
      renderer.shadowMap.needsUpdate = true;
    }).catch(() => {});
  } catch (error) {
    engine.dispose();
    throw error;
  }
  return engine;
}
