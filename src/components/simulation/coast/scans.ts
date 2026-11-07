import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { coastHeight, shoreline } from "./terrain";

type Placement = [z: number, inland: number, scale: number, turn: number];
const rockPlacements: Placement[] = [
  [30.5, .8, 5.8, .31], [29.9, 1.2, 2.7, 1.61], [28.8, .4, 4.0, 2.4],
  [28, 5.8, 7.0, 1.92], [-30.8, 1.8, 5.1, .29], [-31.3, 2.1, 3.3, 1.5],
  [-78, 17.1, 3.9, 5.4], [-81, 19.7, 5.7, 2.21], [23.8, -.11, 5.0, .8], [23.4, .36, 2.4, 4.9],
  [26.9, 6.05, 5.4, 3.47], [26.3, 6.4, 3.3, .4], [17.7, 4.8, 5.6, 3.7],
  [-36.2, 4.91, 7.2, 2.62],
  [66.2, 2.8, 6.7, 4.17], [67, 1.7, 4.05, 1.35], [78, 5.7, 4.5, .99],
];
const shrubPlacements: Placement[] = [
  [31.8, 4.15, 1.27, .57], [30.7, 4.65, 1.8, 2.24], [30.1, 4.1, .94, 4.7],
  [-30.9, 5.8, 1.42, 1.43], [-31.1, 6.15, 1.25, .68], [-77.8, 16.8, 1.25, .72],
  [-79.2, 17.05, 1.15, 2.61], [-81, 17.35, 1.67, 5.4], [-35.2, 6.1, 1.7, 3.0],
  [26.4, 6.7, 2.1, 3.11], [27.0, 7.3, 1.3, .4], [23.8, 5.95, 1.15, 2.8],
  [63.9, 5.72, 1.47, 2.9], [64.45, 5.3, .82, 4.87], [66.8, 5.0, 1.28, .29],
];

function disposeModel(group: T.Group) {
  group.traverse(object => {
    if (!(object instanceof T.Mesh)) return;
    object.geometry.dispose();
    const materials: T.Material[] = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      for (const value of Object.values(material)) if (value instanceof T.Texture) value.dispose();
      material.dispose();
    }
  });
}

export async function addScans(scene: T.Scene, signal: AbortSignal, canAttach: () => boolean) {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const layers: T.InstancedMesh[] = [];
  const placementObject = new T.Object3D();
  const combined = new T.Matrix4();
  await Promise.all([
    { file: "rock", places: rockPlacements },
    { file: "shrub", places: shrubPlacements },
  ].map(async ({ file, places }) => {
    try {
      const model = await loader.loadAsync(`/simulation/props/${file}.glb`);
      if (signal.aborted || !canAttach()) { disposeModel(model.scene); return; }
      model.scene.updateMatrixWorld(true);
      model.scene.traverse(part => {
        if (!(part instanceof T.Mesh)) return;
        const instanced = new T.InstancedMesh(part.geometry, part.material, places.length);
        const color = new T.Color();
        places.forEach(([z, inland, scale, turn], index) => {
          const x = shoreline(z) + inland;
          placementObject.position.set(x, coastHeight(x, z) - (file === "rock" ? .029 : .038), z);
          placementObject.rotation.set(Math.sin(turn) * .1, turn, Math.cos(turn) * .09);
          placementObject.scale.setScalar(scale);
          placementObject.updateMatrix();
          combined.multiplyMatrices(placementObject.matrix, part.matrixWorld);
          instanced.setMatrixAt(index, combined);
          color.setRGB(.89 + Math.sin(index * 1.8) * .095, .94 + Math.sin(index) * .05, .95 + Math.cos(index) * .05);
          instanced.setColorAt(index, color);
        });
        instanced.castShadow = instanced.receiveShadow = true;
        instanced.computeBoundingSphere();
        layers.push(instanced);
        scene.add(instanced);
      });
    } catch {
      // The locally generated surface remains complete if an optional close-up prop fails to load.
    }
  }));
  return (detailed: boolean) => {
    for (const layer of layers) layer.count = detailed ? layer.instanceMatrix.count : Math.min(layer.instanceMatrix.count, 9);
  };
}
