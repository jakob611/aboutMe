import * as T from "three";
import { coastCurve, coastHeight, coastLength, course, laneWidth, type Run, type RunEvent } from "@/lib/arcade";
import { createStage } from "./stage";
import { waterMaterial, type ReflectionObject } from "./water";
import type { GameOptions } from "./arcade-types";

const palettes = [
  { horizon: 0xffbc91, sky: 0x627eae, fog: 0xf7ae95, sea: .16, sun: 0xffcc95, rock: 0xae675b },
  { horizon: 0xfab881, sky: 0x785c91, fog: 0xe9a791, sea: .42, sun: 0xffb97a, rock: 0x8a5262 },
  { horizon: 0xf1a37d, sky: 0x37416c, fog: 0xbf8a9e, sea: .62, sun: 0xffad6e, rock: 0x68475b },
];
const hash = (n: number) => { const x = Math.sin(n * 125.6 + 21) * 43758.5453; return x - Math.floor(x); };
export function createCoastView(options: GameOptions) {
  const stage = createStage({ host: options.host, quality: options.quality, onTier: options.onTier, onError: options.onLost });
  const { scene, camera, sun, ambient } = stage;
  stage.canvas.dataset.renderer = "coast-3d";
  stage.renderer.toneMappingExposure = 1.08;
  const fog = new T.FogExp2(0xf3b296, .011);
  scene.fog = fog;
  ambient.color.setHex(0xffdbc8); ambient.groundColor.setHex(0x554464); ambient.intensity = 2.1;
  sun.intensity = 3.2;
  const material = (color: number, metalness = 0) => new T.MeshStandardMaterial({ color, flatShading: true, roughness: metalness ? .34 : .87, metalness });
  const road = material(0x815951), side = material(0xd0ad86), line = material(0xe6b98c);
  const rock = material(0xb37663), strata = material(0x72515c), grass = material(0x636343);
  const box = new T.BoxGeometry(1, 1, 1), cone = new T.ConeGeometry(1, 1, 7), boulder = new T.IcosahedronGeometry(1, 0);
  const gold = new T.MeshStandardMaterial({ color: 0xffc95c, emissive: 0xff9325, emissiveIntensity: .68, roughness: .3, metalness: .22 });
  const barrierMat = material(0xab3829), barrierStripe = material(0xffd290), pine = material(0x274d43), trunk = material(0x60433b);
  const stone = material(0xe4aa79), stoneDark = material(0x935a4e), stucco = material(0xf7ce9e), roof = material(0xb74231);
  const glow = new T.MeshBasicMaterial({ color: 0xffcf78 });
  function ribbon(left: (d: number) => [number, number], right: (d: number) => [number, number], mat: T.Material) {
    const vertices: number[] = [], indices: number[] = [];
    for (let d = -32; d <= coastLength + 30; d += 2) {
      const a = left(d), b = right(d), c = coastCurve(d), y = coastHeight(d);
      vertices.push(c + a[0], y + a[1], -d, c + b[0], y + b[1], -d);
      const i = vertices.length / 3 - 2;
      if (i >= 2) indices.push(i - 2, i - 1, i, i - 1, i + 1, i);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(vertices, 3)); geo.setIndex(indices); geo.computeVertexNormals();
    mat.side = T.DoubleSide;
    const mesh = new T.Mesh(geo, mat); mesh.receiveShadow = true; scene.add(mesh);
  }
  const edge = (d: number) => 6.4 + Math.sin(d * .093) * .65 + Math.cos(d * .27) * .32;
  ribbon(() => [-4.04, 0], () => [4.04, 0], road);
  for (const k of [-1, 1]) {
    ribbon(() => [4.04 * k, -.012], () => [4.4 * k, -.012], side);
    ribbon(d => [4.4 * k, -.025], d => [edge(d) * k, -.12], grass);
    ribbon(d => [edge(d) * k, -.12], d => [(edge(d) + .9) * k, -2.1 - Math.cos(d * .26) * .35], rock);
    ribbon(d => [(edge(d) + .9) * k, -2.1 - Math.cos(d * .26) * .35], d => [(edge(d) + 2.5) * k, -5.5], strata);
    ribbon(() => [k * 3.87, .014], () => [k * 3.95, .014], line);
  }
  const dummy = new T.Object3D();
  type Instance = [number, number, number, number, number, number, number?];
  const batches = new Map<T.Material, Map<T.BufferGeometry, Instance[]>>();
  function add(geo: T.BufferGeometry, mat: T.Material, item: Instance) {
    const byGeometry = batches.get(mat) ?? new Map(); batches.set(mat, byGeometry);
    const items = byGeometry.get(geo) ?? []; byGeometry.set(geo, items); items.push(item);
  }
  function place(mat: T.Material, x: number, y: number, d: number, w: number, h: number, l: number, turn = 0, geo: T.BufferGeometry = box) {
    add(geo, mat, [coastCurve(d) + x, coastHeight(d) + y, -d, w, h, l, turn]);
  }
  for (let d = -9; d < coastLength + 25; d += 3) for (const k of [-1, 1]) {
    place(line, k * laneWidth / 2, .013, d, .05, .018, 1.15);
    if (d % 9 === 0) {
      place(stoneDark, k * 4.44, .25, d, .23, .5, .25);
      place(glow, k * 4.44, .52, d, .19, .09, .19);
    }
  }
  const reflections: ReflectionObject[] = [];
  const islands = [material(0x6b6579), material(0x847584), material(0x3c625d)];
  for (let i = 0; i < 94; i++) {
    const d = -10 + i * 6.35;
    const sign = i % 2 ? 1 : -1, x = sign * (5.18 + hash(i) * .75);
    if (i % 6 !== 0) {
      const h = 1.8 + hash(i + .4) * 3.2;
      place(trunk, x, .42, d, .16, .84, .16);
      place(pine, x, h / 2 + .34, d, h * .22, h, h * .22, i, cone);
      place(grass, -x, .15, d + 2.5, .4, .35, .7, i, boulder);
    }
    if (i % 3 === 0) {
      const mat = islands[i % 4 === 0 ? 2 : i % 5 === 0 ? 1 : 0];
      const off = (i % 4 === 0 ? 17 : 33) + hash(i + 8) * 53;
      const cx = sign * off, cz = -d + hash(i + 30) * 8;
      const sx = 4 + hash(i + 40) * 13, sy = 3 + hash(i + 60) * 13;
      add(boulder, mat, [cx, -4, cz, sx, sy, sx * 1.2, i]);
      if (reflections.length < 30) reflections.push({ center: new T.Vector3(cx, -2, cz), size: new T.Vector3(sx * .72, sy * .64, sx * .9), color: mat.color.clone(), sphere: false });
    }
  }
  const sail = new T.BufferGeometry();
  sail.setAttribute("position", new T.Float32BufferAttribute([0, 0, 0, 0, 1, 0, .65, 0, 0], 3)); sail.computeVertexNormals();
  stucco.side = T.DoubleSide;
  for (let i = 0; i < 15; i++) {
    const d = 7 + i * 37, x = (i % 2 ? -1 : 1) * (13 + hash(i + 12) * 19);
    add(boulder, stoneDark, [x, -4.11, -d, 1.4, .33, .42, -.35]);
    add(sail, i % 3 === 0 ? barrierStripe : stucco, [x, -3.9, -d, 2.1, 2.5, 2.2, -.35]);
    add(box, trunk, [x, -2.75, -d, .06, 2.45, .06]);
  }
  barrierStripe.side = T.DoubleSide;
  for (const d of [30, 177, 357, 540]) {
    for (const k of [-1, 1]) {
      place(stone, k * 4.88, 2.9, d, 1.25, 5.8, 1.15);
      place(stoneDark, k * 4.88, .24, d, 1.57, .48, 1.48);
      place(stucco, k * 4.88, 5.45, d, 1.52, .42, 1.42);
      place(glow, k * 4.88, 4.35, d + .61, .23, .68, .03);
      place(roof, k * 4.88, 6.2, d, 1.04, 1.12, 1.04, Math.PI / 4, cone);
    }
    place(stoneDark, 0, 5.12, d, 9.5, .62, .65);
    place(stucco, 0, 5.55, d, 9.55, .28, .9);
    for (let i = 0; i < 13; i++) place(d === 540 && i % 2 ? stoneDark : glow, (i - 6) * .62, 5.14, d - .34, .38, .14, .06);
  }
  for (const d of [66, 129, 214, 282, 335, 413, 463, 512]) {
    const k = d % 2 ? 1 : -1, x = k * 8.5;
    place(stone, x, 1.0, d, 3.1, 3.4, 3.65);
    place(stucco, x, 2.1, d + 1.6, 2.8, 1.7, .4);
    place(roof, x, 3.12, d, 2.7, 1.5, 2.7, Math.PI / 4, cone);
    for (let i = -1; i <= 1; i++) place(i ? stoneDark : glow, x + i * .83, 1.5, d - 1.84, .32, .53, .03);
    place(stoneDark, x, -1.6, d, 3.8, 2.6, 4);
  }
  for (const item of course) {
    if (item.kind !== "barrier") continue;
    const x = item.lane * laneWidth;
    place(barrierMat, x, .37, item.d, 1.97, .74, .56);
    for (let i = -2; i <= 2; i++) place(barrierStripe, x + i * .35, .37, item.d - .3, .16, .52, .045, 0);
    place(stoneDark, x, .09, item.d, 2.12, .18, .76);
  }
  for (const [mat, byGeometry] of batches) for (const [geo, items] of byGeometry) {
    const mesh = new T.InstancedMesh(geo, mat, items.length);
    items.forEach(([x, y, z, w, h, d, turn], i) => {
      dummy.position.set(x, y, z); dummy.scale.set(w, h, d); dummy.rotation.set(0, turn ?? 0, 0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.receiveShadow = true; scene.add(mesh);
  }
  const skyMat = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false,
    uniforms: { upper: { value: new T.Color() }, lower: { value: new T.Color() }, light: { value: new T.Vector3(-.14, .16, -.98).normalize() } },
    vertexShader: "varying vec3 vP; void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `varying vec3 vP;uniform vec3 upper,lower,light;
      void main(){
        vec3 dir=normalize(vP);
        vec3 color=mix(lower,upper,smoothstep(-.08,.55,dir.y));
        float s=dot(dir,light); float disc=smoothstep(.9984,.9989,s);
        float cloud=(sin(dir.x*24.+dir.y*111.)+sin(dir.x*37.-dir.y*46.))*.5;
        color=mix(color,vec3(.96,.48,.31),smoothstep(.24,.86,cloud)*(1.-smoothstep(.13,.3,dir.y))*.21);
        color+=vec3(.52,.21,.09)*pow(max(0.,s),30.);
        color=mix(color,vec3(3.2,1.6,.62),disc);
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sky = new T.Mesh(new T.SphereGeometry(184, 26, 14), skyMat); sky.frustumCulled = false; sky.renderOrder = -20; scene.add(sky);
  const water = waterMaterial(reflections);
  const sea = new T.Mesh(new T.PlaneGeometry(430, 1050), water);
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, -4.32, -265); scene.add(sea);
  stage.quality(tier => { water.uniforms.uReflections.value = tier === "cinematic" ? 1 : 0; });
  const lightGeometry = new T.OctahedronGeometry(.5, 0);
  const lights = course.filter(o => o.kind === "light").map(o => {
    const mesh = new T.Mesh(lightGeometry, gold);
    mesh.position.set(coastCurve(o.d) + laneWidth * o.lane, coastHeight(o.d) + 1.14, -o.d);
    scene.add(mesh); return { mesh, item: o };
  });
  const rover = new T.Group(); scene.add(rover);
  const trim = material(0x064549), enamel = material(0x2cd9bd, .2), visor = material(0x173f54, .25), rubber = material(0x292937);
  function part(geo: T.BufferGeometry, mat: T.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) {
    const mesh = new T.Mesh(geo, mat);
    mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.castShadow = true; rover.add(mesh); return mesh;
  }
  part(box, trim, 0, .48, .03, 1.54, .35, 1.75);
  part(new T.CylinderGeometry(.73, .94, .44, 8), enamel, 0, .68, -.07, 1.22, 1, 1.1);
  part(new T.SphereGeometry(.54, 12, 7, 0, Math.PI * 2, 0, Math.PI * .65), visor, 0, .86, -.18, 1.12, .66, 1.05);
  part(box, stucco, 0, .58, .93, .56, .16, .12);
  const wheel = new T.CylinderGeometry(.36, .36, .26, 12);
  for (const x of [-.78, .78]) for (const z of [-.62, .59]) {
    const mesh = part(wheel, rubber, x, .34, z, 1, 1, 1); mesh.rotation.z = Math.PI / 2;
    part(box, glow, x * .83, .55, z > 0 ? .94 : -.93, .23, .15, .12);
  }
  const shadow = new T.Mesh(new T.CircleGeometry(1, 24), new T.MeshBasicMaterial({ color: 0x302128, transparent: true, opacity: .34, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.scale.set(1.1, 1.35, 1); scene.add(shadow);
  const sparks = new T.InstancedMesh(new T.OctahedronGeometry(.13), glow, 27);
  sparks.frustumCulled = false; sparks.count = 0; scene.add(sparks);
  let sparkTime = -1, sparkX = 0, sparkY = 0, sparkD = 0, sparkCount = 0;
  let lastChapter = -1;
  function render(s: Run, time: number, active: boolean, event?: RunEvent) {
    const d = s.d, cx = coastCurve(d), y = coastHeight(d);
    if (s.chapter !== lastChapter) {
      lastChapter = s.chapter;
      const theme = palettes[s.chapter];
      skyMat.uniforms.upper.value.setHex(theme.sky); skyMat.uniforms.lower.value.setHex(theme.horizon);
      fog.color.setHex(theme.fog); rock.color.setHex(theme.rock);
      sun.color.setHex(theme.sun); water.uniforms.uLight.value = theme.sea;
    }
    const slope = (coastCurve(d + .2) - cx) / .2;
    rover.position.set(cx + s.x, y + s.air + (active && !stage.reduced ? Math.sin(d * 4) * .028 : 0), -d);
    rover.rotation.set(-s.vy * .027, -Math.atan(slope) - (s.lane * laneWidth - s.x) * .16, -(s.lane * laneWidth - s.x) * .13);
    rover.visible = !s.shield || stage.reduced || Math.sin(s.shield * 18) > -.68;
    shadow.position.set(cx + s.x, y + .025, -d);
    shadow.material.opacity = .34 - Math.min(.23, s.air * .095);
    if (!stage.reduced && (event === "light" || event === "clear" || event === "hit")) {
      sparkTime = time; sparkX = cx + s.x; sparkY = y + s.air + .55; sparkD = d;
      sparkCount = event === "hit" ? 27 : 15;
    } else if (time < sparkTime) sparkTime = -1;
    const age = time - sparkTime;
    sparks.count = age < .45 && sparkTime >= 0 && !stage.reduced ? sparkCount : 0;
    for (let i = 0; i < sparks.count; i++) {
      const j = i + 1, decay = Math.max(0, 1 - age / .45);
      dummy.position.set(sparkX + (hash(j) - .5) * age * 8, sparkY + (.2 + hash(j + 25)) * age * 4 - age * age * 3, -sparkD + (hash(j + 55) - .15) * age * 7);
      dummy.rotation.set(i + age * 3, i, age * 4); dummy.scale.setScalar(decay * (.4 + hash(j + 90))); dummy.updateMatrix();
      sparks.setMatrixAt(i, dummy.matrix);
    }
    if (sparks.count) sparks.instanceMatrix.needsUpdate = true;
    const portrait = camera.aspect < .9;
    const fov = portrait ? 62 : 48;
    if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    camera.position.set(coastCurve(d - 6) + s.x * .47, y + (portrait ? 5.25 : 4.75) + s.air * .19, -d + (portrait ? 8.6 : 7.6));
    camera.lookAt(coastCurve(d + 13) * .68 + cx * .32, y + (portrait ? .96 : .67), -d - (portrait ? 9 : 14));
    sky.position.copy(camera.position);
    sun.position.set(cx - 10, y + 15, -d + 8); sun.target.position.set(cx, y, -d - 3);
    water.uniforms.uTime.value = stage.reduced ? 0 : time;
    for (const { mesh, item } of lights) {
      mesh.visible = item.d > d + .28 && item.d < d + 112;
      if (!mesh.visible) continue;
      mesh.rotation.y = time * 1.8 + item.d;
      mesh.position.y = coastHeight(item.d) + 1.11 + Math.sin(time * 3 + item.d) * .14;
    }
  }
  return { tick: stage.tick, render, dispose: stage.dispose, quality: stage.setQuality };
}
