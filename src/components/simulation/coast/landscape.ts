import * as T from "three";
import { clamp, coastHeight, coastViewpoints, shoreline, smoothstep, terrainNoise, type BoulderCollision } from "./terrain";

const root = "/simulation/coast/";
type SurfaceMaps = {
  beach: T.Texture;
  beachNormal: T.Texture;
  cliff: T.Texture;
  cliffNormal: T.Texture;
  earth: T.Texture;
  bark: T.Texture;
};

export async function loadSurfaceMaps(anisotropy: number): Promise<SurfaceMaps> {
  const loader = new T.TextureLoader();
  async function load(name: string, baseColour: boolean, fill: [number, number, number]) {
    let texture: T.Texture;
    try {
      texture = await loader.loadAsync(root + name + ".webp");
    } catch {
      texture = new T.DataTexture(new Uint8Array([...fill, 255]), 1, 1);
      texture.needsUpdate = true;
    }
    texture.colorSpace = baseColour ? T.SRGBColorSpace : T.NoColorSpace;
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.anisotropy = Math.min(8, anisotropy);
    return texture;
  }
  const [beach, beachNormal, cliff, cliffNormal, earth, bark] = await Promise.all([
    load("river_small_rocks_diff", true, [150, 141, 117]),
    load("river_small_rocks_nor_gl", false, [128, 128, 255]),
    load("cliff_side_diff", true, [145, 125, 106]),
    load("cliff_side_nor_gl", false, [128, 128, 255]),
    load("forest_ground_04_diff", true, [91, 85, 59]),
    load("bark_brown_02_diff", true, [111, 102, 83]),
  ]);
  return { beach, beachNormal, cliff, cliffNormal, earth, bark };
}

function groundMaterial(maps: SurfaceMaps, tide: T.IUniform<number>, detail: T.IUniform<number>) {
  const ground = new T.MeshStandardMaterial({ roughness: .9 });
  ground.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      coastSand: { value: maps.beach }, coastSandNormal: { value: maps.beachNormal },
      coastRock: { value: maps.cliff }, coastRockNormal: { value: maps.cliffNormal },
      coastEarth: { value: maps.earth }, coastTide: tide, coastDetail: detail,
    });
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>
        attribute vec3 habitat;
        varying vec3 vCoast, vSlope, vHabitat;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        vCoast=position; vSlope=normal; vHabitat=habitat;`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>
        uniform sampler2D coastSand,coastSandNormal,coastRock,coastRockNormal,coastEarth;
        uniform float coastTide,coastDetail;
        varying vec3 vCoast,vSlope,vHabitat;
        vec3 perturbCoast(vec3 oldNormal,vec2 coord,vec3 sampleNormal){
          vec3 px=dFdx(-vViewPosition),py=dFdy(-vViewPosition);
          vec2 tx=dFdx(coord),ty=dFdy(coord);
          vec3 tangent=px*ty.y-py*tx.y;
          tangent=tangent-oldNormal*dot(tangent,oldNormal);
          float tangentLength=length(tangent);
          if(tangentLength<.000001) return oldNormal;
          tangent/=tangentLength;
          float orient=sign(tx.x*ty.y-tx.y*ty.x);
          tangent*=orient;
          vec3 binormal=normalize(cross(oldNormal,tangent))*orient;
          return normalize(tangent*sampleNormal.x+binormal*sampleNormal.y+oldNormal*sampleNormal.z);
        }`)
      .replace("#include <color_fragment>", `#include <color_fragment>
        vec3 surface=normalize(vSlope);
        float steep=smoothstep(.3,.91,1.-surface.y);
        float wet=1.-smoothstep(coastTide+.01,coastTide+.6,vCoast.y);
        float strataWeight=smoothstep(.14,.48,1.-surface.y)*vHabitat.z;
        float useX=step(abs(surface.z),abs(surface.x));
        vec2 flatUV=vCoast.xz*.54;
        vec2 cliffUV=vec2(mix(vCoast.x,vCoast.z,useX)*.45,-vCoast.y*.55+vCoast.z*.022);
        vec3 sand=texture2D(coastSand,flatUV).rgb*vec3(1.18,1.20,1.19);
        vec3 rockTexture=texture2D(coastRock,cliffUV).rgb;
        float rockLuminance=dot(rockTexture,vec3(.23,.67,.10));
        vec3 rock=mix(rockTexture,vec3(rockLuminance),.47)*vec3(1.03,1.08,1.13);
        vec3 forest=texture2D(coastEarth,flatUV*.86).rgb*vec3(.81,1.02,.68);
        float green=vHabitat.y*(1.-strataWeight*.91);
        float layers=vCoast.y*13.0+vCoast.z*.48+sin(vCoast.z*.19)*.96;
        float lamina=sin(layers+.73*sin(vCoast.y*2.65+vCoast.z*.081)+.38*cos(vCoast.y*4.4));
        float strata=.966+.067*smoothstep(-.58,.64,lamina);
        vec3 tint=mix(vec3(.79,.85,.86),vec3(1.14,1.05,.92),vHabitat.x);
        diffuseColor.rgb*=mix(mix(sand,rock*strata,max(strataWeight,steep)),forest,green)*tint;
        diffuseColor.rgb*=mix(1.,.58,wet);`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
        roughnessFactor=mix(.96,.81,wet);`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        vec3 normalSand=texture2D(coastSandNormal,flatUV).xyz*2.-1.;
        vec3 normalRock=texture2D(coastRockNormal,cliffUV).xyz*2.-1.;
        normalSand.xy*=.32+coastDetail*.22;
        normalRock.xy*=.28+coastDetail*.24;
        vec3 groundNormal=perturbCoast(normal,flatUV,normalSand);
        vec3 rockNormal=perturbCoast(normal,cliffUV,normalRock);
        normal=normalize(mix(groundNormal,rockNormal,max(strataWeight,steep)));`);
  };
  ground.customProgramCacheKey = () => "stillwater-terrain-v1";
  return ground;
}

export function addTerrain(
  scene: T.Scene,
  maps: SurfaceMaps,
  tide: T.IUniform<number>,
  detail: T.IUniform<number>,
) {
  const ground = groundMaterial(maps, tide, detail);
  const offsets = [-60, -41, -27, -20, -15, -11, -8, -6, -4.6, -3.5, -2.6, -1.8, -1.2, -.6, 0];
  for (let offset = .47; offset <= 28; offset += .47) offsets.push(offset);
  for (let offset = 28.9; offset <= 80; offset += 1.16) offsets.push(offset);
  for (let offset = 82; offset <= 216; offset += 2.9) offsets.push(offset);
  const columns = offsets.length;
  for (let start = -320; start < 320; start += 32) {
    const step = start > -193 && start < 192 ? .8 : 1.6;
    const rows = Math.round(32 / step) + 1;
    const vertices = new Float32Array(rows * columns * 3);
    const normals = new Float32Array(vertices.length);
    const habitats = new Float32Array(vertices.length);
    const indices: number[] = [];
    for (let row = 0; row < rows; row++) {
      const z = start + row * step;
      const shore = shoreline(z);
      for (let column = 0; column < columns; column++) {
        const offset = offsets[column], x = shore + offset;
        const height = coastHeight(x, z);
        const dx = (coastHeight(x + .23, z) - coastHeight(x - .23, z)) / .46;
        const dz = (coastHeight(x, z + .23) - coastHeight(x, z - .23)) / .46;
        const normalLength = Math.hypot(dx, 1, dz);
        const vertex = row * columns + column;
        vertices.set([x, height, z], vertex * 3);
        normals.set([-dx / normalLength, 1 / normalLength, -dz / normalLength], vertex * 3);
        const soil = terrainNoise(x * .066, z * .061);
        const woody = smoothstep(3.5, 13, height) * smoothstep(.22, .63, terrainNoise(x * .23, z * .26) * .54 + soil * .46);
        habitats.set([soil, woody, smoothstep(1.3, 6.1, offset)], vertex * 3);
        if (row < rows - 1 && column < columns - 1) {
          indices.push(vertex, vertex + columns, vertex + 1, vertex + 1, vertex + columns, vertex + columns + 1);
        }
      }
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute("position", new T.BufferAttribute(vertices, 3));
    geometry.setAttribute("normal", new T.BufferAttribute(normals, 3));
    geometry.setAttribute("habitat", new T.BufferAttribute(habitats, 3));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    const patch = new T.Mesh(geometry, ground);
    patch.receiveShadow = true;
    patch.castShadow = true;
    scene.add(patch);
  }
}

function randomSequence(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function canopyTexture() {
  const image = document.createElement("canvas");
  image.width = image.height = 384;
  const ctx = image.getContext("2d");
  if (!ctx) return new T.Texture();
  const random = randomSequence(961);
  for (let cluster = 0; cluster < 29; cluster++) {
    const angle = cluster * 2.39996;
    const distance = Math.sqrt(cluster / 29);
    const x = 192 + Math.cos(angle) * distance * 125;
    const y = 211 + Math.sin(angle) * distance * 100 - Math.abs(Math.cos(angle)) * 18;
    const size = 14 + random() * 34;
    for (let needle = 0; needle < 168; needle++) {
      const a = random() * Math.PI * 2, r = Math.sqrt(random()) * size;
      const tint = 53 + Math.floor(random() * 41 + (245 - y) * .17);
      ctx.fillStyle = `rgb(${tint * .82},${tint * 1.17},${tint * .59})`;
      ctx.save();
      ctx.translate(x + Math.cos(a) * r, y + Math.sin(a) * r * .69);
      ctx.rotate(a + .62);
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.3 + random() * 3.0, .62 + random() * 1.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  const texture = new T.CanvasTexture(image);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const up = new T.Vector3(0, 1, 0);
function segmentMatrix(from: T.Vector3, to: T.Vector3, width: number) {
  const difference = to.clone().sub(from);
  return new T.Matrix4().compose(
    from.clone().lerp(to, .5), new T.Quaternion().setFromUnitVectors(up, difference.clone().normalize()),
    new T.Vector3(width, difference.length(), width),
  );
}

function grassGeometry() {
  const random = randomSequence(190);
  const verts: number[] = [], colors: number[] = [], indices: number[] = [];
  for (let j = 0; j < 13; j++) {
    const angle = random() * Math.PI * 2;
    const dx = Math.cos(angle), dz = Math.sin(angle);
    const rootX = dx * random() * .10, rootZ = dz * random() * .10;
    const height = .17 + random() * .35, lean = .09 + random() * .13;
    const width = .009 + random() * .014;
    const index = verts.length / 3;
    verts.push(rootX - dz * width, -.01, rootZ + dx * width, rootX + dz * width, -.01, rootZ - dx * width,
      rootX + dx * lean * .37 - dz * width * .61, height * .58, rootZ + dz * lean * .37 + dx * width * .61,
      rootX + dx * lean * .37 + dz * width * .61, height * .58, rootZ + dz * lean * .37 - dx * width * .61,
      rootX + dx * lean, height, rootZ + dz * lean);
    const tone = random() * .3;
    colors.push(.075, .073, .024, .080, .082, .027, .24 + tone, .26 + tone, .066, .26 + tone, .29 + tone, .076, .54 + tone, .49 + tone, .20);
    indices.push(index, index + 1, index + 2, index + 2, index + 1, index + 3, index + 2, index + 3, index + 4);
  }
  const result = new T.BufferGeometry();
  result.setAttribute("position", new T.Float32BufferAttribute(verts, 3));
  result.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  result.setIndex(indices);
  result.computeVertexNormals();
  return result;
}

export function addScenery(scene: T.Scene, maps: SurfaceMaps, time: T.IUniform<number>, wind: T.IUniform<number>) {
  const random = randomSequence(875445);
  const dummy = new T.Object3D();
  const stoneGeometry = new T.IcosahedronGeometry(1, 2);
  const positions = stoneGeometry.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index), y = positions.getY(index), z = positions.getZ(index);
    const irregular = .78 + terrainNoise((x + 4.2) * 2.1, (z + y * .23) * 2.6) * .32;
    positions.setXYZ(index, x * irregular, clamp(y * irregular, -.77, .7) + .11 * x, z * irregular);
  }
  stoneGeometry.computeVertexNormals();
  const rock = new T.MeshStandardMaterial({ map: maps.cliff, normalMap: maps.cliffNormal, normalScale: new T.Vector2(.61, .61), roughness: .93 });
  const pebbleGeometry = new T.IcosahedronGeometry(1, 0);
  const small = new T.InstancedMesh(pebbleGeometry, rock, 1140);
  const boulders = new T.InstancedMesh(stoneGeometry, rock, 158);
  const collisions: BoulderCollision[] = [];
  const rockTone = new T.Color();
  for (const stones of [small, boulders]) {
    const large = stones === boulders;
    for (let index = 0; index < stones.count; index++) {
      const z = -179 + random() * 351;
      const d = large ? -.64 + random() * 17 : -.22 + Math.pow(random(), 1.6) * 14;
      const x = shoreline(z) + d;
      const scale = large ? .25 + Math.pow(random(), 2.1) * 1.23 : .017 + Math.pow(random(), 2) * .16;
      dummy.position.set(x, coastHeight(x, z) + scale * .11, z);
      dummy.rotation.set((random() - .5) * .41, random() * Math.PI * 2, (random() - .5) * .3);
      dummy.scale.set(scale * (.72 + random() * .43), scale * (.41 + random() * .46), scale * (.61 + random() * .52));
      dummy.updateMatrix();
      stones.setMatrixAt(index, dummy.matrix);
      rockTone.setRGB(.76 + random() * .37, .76 + random() * .32, .72 + random() * .29);
      if (d < 1) rockTone.multiplyScalar(.65);
      stones.setColorAt(index, rockTone);
      if (large && scale > .63 && Math.hypot(x - 15.8, z - 34) > 2.4) collisions.push({ x, z, radius: scale * .67 });
    }
    stones.receiveShadow = true;
    stones.castShadow = large;
    scene.add(stones);
  }

  const grassMaterial = new T.MeshStandardMaterial({ color: 0xf5e5ae, roughness: 1, vertexColors: true, side: T.DoubleSide });
  grassMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.grassTime = time;
    shader.uniforms.grassWind = wind;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>
        uniform float grassTime,grassWind;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        vec2 tuftOrigin=instanceMatrix[3].xz;
        float gust=sin(grassTime*2.7+tuftOrigin.x*.54+tuftOrigin.y*.43);
        transformed.x+=pow(max(0.,position.y),1.6)*grassWind*.033*(.75+gust*.6);`);
  };
  const grass = new T.InstancedMesh(grassGeometry(), grassMaterial, 2590);
  let grassCount = 0;
  for (let tries = 0; tries < 12500 && grassCount < grass.count; tries++) {
    const z = -184 + random() * 371;
    const d = 2.5 + Math.pow(random(), 1.9) * 64;
    const x = shoreline(z) + d;
    const patch = terrainNoise(x * .19, z * .23);
    if (patch < .42 || (d < 5.4 && patch < .76)) continue;
    const scale = (.41 + random() * 1.7) * (d < 6 ? .7 : 1);
    dummy.position.set(x, coastHeight(x, z) - .027, z);
    dummy.rotation.set(0, random() * Math.PI * 2, 0);
    dummy.scale.set(scale, scale * (.63 + random() * .53), scale);
    dummy.updateMatrix();
    grass.setMatrixAt(grassCount++, dummy.matrix);
  }
  grass.count = grassCount;
  grass.receiveShadow = true;
  scene.add(grass);

  const barkMaterial = new T.MeshStandardMaterial({ map: maps.bark, color: 0xad9d81, roughness: 1 });
  const branchGeometry = new T.CylinderGeometry(.52, 1, 1, 7);
  const foliageMaterial = new T.MeshStandardMaterial({
    map: canopyTexture(), alphaTest: .38, side: T.DoubleSide,
    roughness: .99, color: 0xcdd69a, emissive: 0x212915, emissiveIntensity: .19,
  });
  foliageMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.needleTime = time;
    shader.uniforms.needleWind = wind;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>
        uniform float needleTime,needleWind;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        vec2 crownOrigin=instanceMatrix[3].xz;
        float gust=sin(needleTime*1.72+crownOrigin.x*.23+crownOrigin.y*.19);
        transformed.x+=gust*needleWind*.00165*(.65+position.y);`);
  };
  const branches: T.Matrix4[] = [];
  const leaves: { matrix: T.Matrix4; shade: T.Color }[] = [];
  const leafGeometry = new T.PlaneGeometry(1, 1);
  const overlook = coastViewpoints[2];
  const viewX = Math.sin(overlook.yaw), viewZ = -Math.cos(overlook.yaw);
  for (let index = 0; index < 260; index++) {
    const z = index < 200 ? -195 + random() * 392 : -308 + random() * 618;
    const d = 11.6 + Math.pow(random(), 1.66) * 107;
    const x = shoreline(z) + d;
    const headlandX = x - overlook.x, headlandZ = z - overlook.z;
    const forward = headlandX * viewX + headlandZ * viewZ;
    const lateral = headlandX * viewZ - headlandZ * viewX;
    if (Math.hypot(headlandX, headlandZ) < 2.6 || (forward > 0 && forward < 13 && Math.abs(lateral) < 3.5)) continue;
    if (terrainNoise(x * .23, z * .21) < .31) continue;
    const y = coastHeight(x, z) - .10;
    if (y < 3.5) continue;
    const growth = .45 + Math.pow(random(), .92) * 1.15;
    const tree = index % 7 !== 0 && d > 15;
    const height = (tree ? 4.2 : 1.32) * growth;
    const trunk = new T.Vector3(x, y, z);
    const neck = new T.Vector3(x + growth * .19, y + height * .56, z + growth * .11);
    const crown = new T.Vector3(x + growth * .55, y + height, z - growth * .35);
    const trunkWidth = growth * (tree ? .19 : .07);
    branches.push(segmentMatrix(trunk, neck, trunkWidth), segmentMatrix(neck, crown, trunkWidth * .74));
    for (let branch = 0; branch < (tree ? 5 : 3); branch++) {
      const angle = branch * 2.39996 + index;
      const spread = (tree ? 1.35 : .66) * growth * (.74 + random() * .61);
      const tuft = new T.Vector3(crown.x + Math.cos(angle) * spread, crown.y - random() * height * .23, crown.z + Math.sin(angle) * spread);
      branches.push(segmentMatrix(neck.clone().lerp(crown, .10 + random() * .45), tuft, trunkWidth * .41));
      const tuftSize = growth * (tree ? 3.7 : 1.8) * (.71 + random() * .62);
      const shade = new T.Color().setRGB(.76 + random() * .42, .84 + random() * .36, .63 + random() * .38);
      for (let card = 0; card < 3; card++) {
        dummy.position.copy(tuft);
        dummy.rotation.set(.09 + (card === 2 ? 1.08 : random() * .24), angle + card * Math.PI / 2.2, (random() - .5) * .46);
        dummy.scale.set(tuftSize, tuftSize * (.66 + random() * .17), tuftSize);
        dummy.updateMatrix();
        leaves.push({ matrix: dummy.matrix.clone(), shade });
      }
    }
    if (tree && growth > .67 && Math.hypot(x - 15.8, z - 34) > 2.4) collisions.push({ x, z, radius: trunkWidth });
  }
  const bark = new T.InstancedMesh(branchGeometry, barkMaterial, branches.length);
  const foliage = new T.InstancedMesh(leafGeometry, foliageMaterial, leaves.length);
  branches.forEach((matrix, index) => bark.setMatrixAt(index, matrix));
  leaves.forEach(({ matrix, shade }, index) => {
    foliage.setMatrixAt(index, matrix);
    foliage.setColorAt(index, shade);
  });
  bark.castShadow = foliage.castShadow = true;
  bark.receiveShadow = foliage.receiveShadow = true;
  scene.add(bark, foliage);
  return {
    collisions,
    setDetail(high: boolean) { small.count = high ? 1140 : 610; grass.count = high ? grassCount : Math.min(1350, grassCount); },
  };
}
