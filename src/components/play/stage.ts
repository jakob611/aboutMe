import * as T from "three";
import { initialTier, slowerTier, qualitySettings, type Quality, type Tier } from "@/lib/play-model";
export function createStage(options: { host: HTMLDivElement; quality: Quality; onTier(tier: Tier): void; onError(): void }) {
  const { host } = options;
  const renderer = new T.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "default" });
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.type = T.PCFShadowMap;
  host.appendChild(renderer.domElement);
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(42, 1, .15, 250);
  const ambient = new T.HemisphereLight(0xd6e7ea, 0x64684c, 2.4);
  const sun = new T.DirectionalLight(0xffe0b4, 4.4);
  sun.position.set(-14, 22, 9);
  sun.castShadow = true;
  sun.shadow.camera.left = -22; sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 22; sun.shadow.camera.bottom = -22;
  sun.shadow.camera.near = .5; sun.shadow.camera.far = 80;
  sun.shadow.bias = -.0005; sun.shadow.normalBias = .035;
  scene.add(ambient, sun, sun.target);
  let requested = options.quality;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const automaticTier = initialTier({ memory: nav.deviceMemory, cores: nav.hardwareConcurrency, coarse: matchMedia("(pointer: coarse)").matches, saveData: nav.connection?.saveData });
  let tier: Tier = requested === "auto" ? automaticTier : requested;
  let stopped = false, visible = true, disposed = false, frame = 0, last = 0, time = 0;
  let samples: number[] = [], cooldown = 3, sampleTime = 0, sampleCount = 0;
  let mustRender = true;
  let update: (dt: number, time: number) => boolean | void = () => {};
  let qualityChanged: (tier: Tier) => void = () => {};
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    const settings = qualitySettings[tier];
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, settings.pixelRatio, Math.sqrt(settings.pixels / (width * height))));
    renderer.setSize(width, height, false);
    camera.aspect = width / height; camera.updateProjectionMatrix();
    mustRender = true;
  };
  function applyQuality(next: Tier) {
    tier = next;
    canvas.dataset.renderQuality = tier;
    const size = qualitySettings[tier].shadow;
    renderer.shadowMap.enabled = size !== 0;
    sun.shadow.mapSize.set(size || 512, size || 512);
    sun.shadow.map?.dispose(); sun.shadow.map = null;
    qualityChanged(tier); options.onTier(tier); resize();
    samples = []; cooldown = 3;
  }
  const observer = new ResizeObserver(resize); observer.observe(host);
  const intersection = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? true; last = 0; }, { threshold: .01 }); intersection.observe(host);
  const clearClock = () => { last = 0; samples = []; };
  document.addEventListener("visibilitychange", clearClock);
  const lost = (event: Event) => { event.preventDefault(); options.onError(); };
  canvas.addEventListener("webglcontextlost", lost);
  function animate(now: number) {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    if (document.hidden || !visible) { last = 0; return; }
    if (stopped) { if (mustRender) { renderer.render(scene, camera); mustRender = false; } last = 0; return; }
    if (!last) { last = now; renderer.render(scene, camera); return; }
    const elapsed = now - last;
    if (elapsed < 1000 / qualitySettings[tier].fps - 1) return;
    last = now;
    const dt = Math.min(elapsed / 1000, .05);
    sampleTime += elapsed;
    if (sampleTime > 2000) { canvas.dataset.renderFps = String(Math.round(1000 * sampleCount / sampleTime)); sampleTime = 0; sampleCount = 0; }
    time += dt;
    const changed = update(dt, time);
    if (changed !== false || mustRender) { renderer.render(scene, camera); mustRender = false; sampleCount++; }
    if (requested === "auto" && tier !== "low") {
      cooldown -= dt;
      if (cooldown <= 0) {
        samples.push(elapsed);
        if (samples.length >= 75) {
          const next = slowerTier(tier, samples.reduce((a, b) => a + b, 0) / samples.length);
          samples = [];
          if (next !== tier) applyQuality(next);
        }
      }
    }
  }
  applyQuality(tier);
  frame = requestAnimationFrame(animate);
  const materials = new Set<T.Material>(), geometries = new Set<T.BufferGeometry>(), textures = new Set<T.Texture>();
  return {
    scene, camera, renderer, canvas, sun, ambient, preference,
    get tier() { return tier; },
    get reduced() { return preference.matches; },
    tick(callback: typeof update) { update = callback; },
    quality(callback: typeof qualityChanged) { qualityChanged = callback; callback(tier); },
    setQuality(value: Quality) { requested = value; applyQuality(value === "auto" ? automaticTier : value); },
    pause(value: boolean) { stopped = value; last = 0; },
    dispose() {
      if (disposed) return;
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect();
      document.removeEventListener("visibilitychange", clearClock); canvas.removeEventListener("webglcontextlost", lost);
      scene.traverse(object => {
        if (!(object instanceof T.Mesh || object instanceof T.Points || object instanceof T.Line)) return;
        geometries.add(object.geometry);
        const entries = Array.isArray(object.material) ? object.material : [object.material];
        entries.forEach(material => {
          materials.add(material);
          Object.values(material).forEach(value => { if (value instanceof T.Texture) textures.add(value); });
        });
      });
      geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); textures.forEach(item => item.dispose());
      sun.shadow.map?.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); scene.clear();
    },
  };
}
