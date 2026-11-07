import * as THREE from "three";
import { DESK_PROPS } from "./paper-physics";

function canvasTexture(width: number, height: number, paint: (context: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("A 2D canvas is required to render materials.");
  paint(context);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function randomSequence(seed: number) {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function sheetSurface(foldTrace: THREE.Vector2) {
  const random = randomSequence(62041);
  const paper = canvasTexture(768, 1086, context => {
    const width = context.canvas.width;
    const height = context.canvas.height;
    context.fillStyle = "#eee7d6";
    context.fillRect(0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const x = (i / 4) % width;
      const y = Math.floor(i / 4 / width);
      const mottling = Math.sin(x * .071 + y * .018) * Math.cos(y * .056 + x * .011) * 1.75;
      const speckle = (random() + random() + random() - 1.5) * 12 + mottling;
      pixels.data[i] += speckle;
      pixels.data[i + 1] += speckle;
      pixels.data[i + 2] += speckle * .9;
    }
    context.putImageData(pixels, 0, 0);
    for (let i = 0; i < 23000; i++) {
      const x = random() * width;
      const y = random() * height;
      context.strokeStyle = i % 3 ? "rgba(135,117,92,.105)" : "rgba(255,255,251,.35)";
      context.lineWidth = .48 + random() * .39;
      context.beginPath();
      context.moveTo(x, y);
      context.quadraticCurveTo(x + random() * 2 - 1, y + 1.4, x + random() * 4 - 2, y + 2 + random() * 6);
      context.stroke();
    }
  });
  const surface = new THREE.MeshPhysicalMaterial({
    map: paper,
    bumpMap: paper,
    bumpScale: .00018,
    roughness: .86,
    metalness: 0,
    sheen: .16,
    sheenRoughness: .9,
    sheenColor: new THREE.Color(0xfff1d6),
    side: THREE.DoubleSide,
    vertexColors: true,
  });
  surface.onBeforeCompile = shader => {
    shader.uniforms.foldTrace = { value: foldTrace };
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <map_pars_fragment>", "#include <map_pars_fragment>\nuniform vec2 foldTrace;")
      .replace("#include <map_fragment>", [
        "#include <map_fragment>",
        "vec2 crease = vMapUv - vec2(.5);",
        "vec2 shadow = exp(-pow((crease + vec2(.0014)) * 278., vec2(2.)));",
        "vec2 ridge = exp(-pow((crease - vec2(.0022)) * 305., vec2(2.)));",
        "float fiber = .82 + .18 * sin(vMapUv.x * 190. + vMapUv.y * 211.);",
        "diffuseColor.rgb *= 1. - dot(shadow, foldTrace) * .32 * fiber + dot(ridge, foldTrace) * .09;",
      ].join("\n"));
  };
  return surface;
}

export function shadowSurface() {
  return canvasTexture(128, 128, context => {
    const gradient = context.createRadialGradient(64, 64, 13, 64, 64, 64);
    gradient.addColorStop(0, "rgba(21,11,7,.69)");
    gradient.addColorStop(.52, "rgba(25,13,8,.39)");
    gradient.addColorStop(.83, "rgba(25,13,8,.13)");
    gradient.addColorStop(1, "rgba(25,13,8,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  });
}

export function walnutSurface(onTexture: () => void) {
  const loader = new THREE.TextureLoader();
  const wood = new THREE.MeshStandardMaterial({ color: 0x624839, roughness: 1 });
  const textures: THREE.Texture[] = [];
  function map(name: string, color: boolean, apply: (texture: THREE.Texture) => void) {
    const texture = loader.load(
      "/simulation/paper/" + name,
      image => {
        image.wrapS = image.wrapT = THREE.RepeatWrapping;
        image.repeat.set(.83, .67);
        image.rotation = Math.PI / 2;
        image.anisotropy = 8;
        if (color) image.colorSpace = THREE.SRGBColorSpace;
        apply(image);
        wood.needsUpdate = true;
        onTexture();
      },
      undefined,
      () => {},
    );
    textures.push(texture);
  }
  map("walnut-color.webp", true, texture => {
    wood.color.setHex(0xd8ccba);
    wood.map = texture;
    wood.bumpMap = texture;
    wood.bumpScale = .00024;
  });
  map("walnut-normal.webp", false, texture => {
    wood.normalMap = texture;
    wood.normalScale.set(.48, .48);
  });
  map("walnut-roughness.webp", false, texture => { wood.roughnessMap = texture; });
  return { material: wood, textures };
}

function rulerMaterial() {
  const texture = canvasTexture(768, 86, context => {
    const color = context.createLinearGradient(0, 0, 0, 86);
    color.addColorStop(0, "#d8ccad");
    color.addColorStop(.23, "#b3a688");
    color.addColorStop(.70, "#cabc9d");
    color.addColorStop(1, "#9d8c70");
    context.fillStyle = color;
    context.fillRect(0, 0, 768, 86);
    const noise = randomSequence(1041);
    for (let i = 0; i < 1300; i++) {
      context.fillStyle = i % 2 ? "rgba(255,252,216,.17)" : "rgba(46,35,29,.13)";
      context.fillRect(noise() * 768, noise() * 86, 1 + noise() * 145, .4);
    }
    context.fillStyle = "#4e4a3b";
    context.font = "600 12px monospace";
    for (let i = 0; i <= 150; i++) {
      const x = 24 + i * 4.65;
      const tick = i % 10 === 0 ? 27 : i % 5 === 0 ? 17 : 10;
      context.fillRect(x, 2, 1.25, tick);
      if (i % 10 === 0) context.fillText(String(i / 10), x - 3, 45);
    }
    context.font = "600 8px monospace";
    context.fillText("150 MM / STEEL", 591, 67);
  });
  return new THREE.MeshStandardMaterial({ map: texture, metalness: .66, roughness: .48 });
}

function pencilLabel() {
  return canvasTexture(320, 42, context => {
    context.fillStyle = "#23362d";
    context.fillRect(0, 0, 320, 42);
    context.fillStyle = "#bfb292";
    context.font = "600 16px serif";
    context.fillText("GRAPHITE  /  2B", 82, 27);
  });
}

export function makeDeskObjects(scene: THREE.Scene) {
  const pencil = new THREE.Group();
  const lacquer = new THREE.MeshStandardMaterial({ color: 0x27382e, roughness: .41 });
  const shavedWood = new THREE.MeshStandardMaterial({ color: 0xb88b60, roughness: .88 });
  const graphite = new THREE.MeshStandardMaterial({ color: 0x22252a, metalness: .38, roughness: .49 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xaba28e, metalness: .74, roughness: .34 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x66574a, roughness: .92 });
  const cylinder = (a: number, b: number, length: number, radial: number, material: THREE.Material, at: number) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(a, b, length, radial), material);
    mesh.position.y = at;
    mesh.castShadow = mesh.receiveShadow = true;
    pencil.add(mesh);
  };
  cylinder(.00385, .00385, .140, 6, lacquer, 0);
  cylinder(.0009, .00385, .011, 6, shavedWood, .0755);
  cylinder(.00012, .0009, .0044, 6, graphite, .083);
  cylinder(.0039, .0039, .0104, 12, metal, -.074);
  for (let i = 0; i < 4; i++) cylinder(.0041, .0041, .0007, 12, metal, -.0705 - i * .0024);
  cylinder(.00375, .00335, .0047, 12, rubber, -.081);
  const mark = new THREE.Mesh(new THREE.PlaneGeometry(.071, .0029), new THREE.MeshStandardMaterial({ map: pencilLabel(), roughness: .55 }));
  mark.position.set(.0001, -.007, .00336);
  mark.rotation.z = -Math.PI / 2;
  pencil.add(mark);
  pencil.rotation.x = Math.PI / 2;
  pencil.rotation.z = DESK_PROPS.pencil.angle;
  pencil.position.set(DESK_PROPS.pencil.x, DESK_PROPS.pencil.height, DESK_PROPS.pencil.z);
  scene.add(pencil);

  const ruler = new THREE.Group();
  const steel = rulerMaterial();
  const edge = new THREE.MeshStandardMaterial({ color: 0x9e9b8d, metalness: .72, roughness: .38 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(.163, .00115, .019), [edge, edge, steel, edge, edge, edge]);
  body.castShadow = body.receiveShadow = true;
  ruler.add(body);
  ruler.position.set(DESK_PROPS.ruler.x, DESK_PROPS.ruler.height - .0006, DESK_PROPS.ruler.z);
  ruler.rotation.y = DESK_PROPS.ruler.angle;
  scene.add(ruler);

  const pad = new THREE.Group();
  const cover = new THREE.MeshStandardMaterial({ color: 0x353c38, roughness: .94 });
  const pages = new THREE.MeshStandardMaterial({ color: 0xb9ac91, roughness: .89 });
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(.086, .0023, .105), cover);
  bottom.position.y = .0015;
  const stack = new THREE.Mesh(new THREE.BoxGeometry(.083, .008, .102), pages);
  stack.position.y = .006;
  const top = new THREE.Mesh(new THREE.BoxGeometry(.086, .0025, .105), cover);
  top.position.y = .0114;
  const coverTexture = canvasTexture(344, 420, context => {
    context.fillStyle = "#363e39";
    context.fillRect(0, 0, 344, 420);
    const noise = randomSequence(802);
    for (let i = 0; i < 13000; i++) {
      context.fillStyle = i % 2 ? "rgba(255,255,235,.07)" : "rgba(15,19,13,.12)";
      context.fillRect(noise() * 344, noise() * 420, 1, 1);
    }
    context.strokeStyle = "#a49373";
    context.lineWidth = 1;
    context.strokeRect(31, 37, 282, 346);
    context.font = "17px serif";
    context.fillStyle = "#bcaa87";
    context.textAlign = "center";
    context.fillText("MATERIAL STUDIES", 172, 179);
    context.font = "11px monospace";
    context.fillText("PAPER   /   01", 172, 205);
    context.beginPath();
    context.moveTo(145, 234);
    context.lineTo(199, 234);
    context.stroke();
  });
  const coverPrint = new THREE.Mesh(
    new THREE.PlaneGeometry(.085, .104),
    new THREE.MeshStandardMaterial({ map: coverTexture, roughness: .9 }),
  );
  coverPrint.rotation.x = -Math.PI / 2;
  coverPrint.position.y = DESK_PROPS.notebook.height;
  pad.add(bottom, stack, top, coverPrint);
  pad.position.set(DESK_PROPS.notebook.x, 0, DESK_PROPS.notebook.z);
  pad.rotation.y = DESK_PROPS.notebook.angle;
  pad.traverse(object => {
    if (object instanceof THREE.Mesh) object.castShadow = object.receiveShadow = true;
  });
  scene.add(pad);
}
