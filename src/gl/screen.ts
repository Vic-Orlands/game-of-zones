import * as THREE from "three";

// The DOM labels ride on top of the canvas. The world projects their anchors once per frame and the label
// layer reads them in its own rAF — no React renders per frame.

export type Anchor = { x: number; y: number; visible: boolean; depth: number };
export const anchors = new Map<string, Anchor>();
export const anchorWorld = new Map<string, THREE.Vector3>();

const v = new THREE.Vector3();
export function projectAnchors(cam: THREE.Camera, w: number, h: number) {
  for (const [k, p] of anchorWorld) {
    v.copy(p).project(cam);
    const a = anchors.get(k) ?? { x: 0, y: 0, visible: false, depth: 0 };
    a.x = (v.x * 0.5 + 0.5) * w;
    a.y = (-v.y * 0.5 + 0.5) * h;
    a.visible = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
    a.depth = v.z;
    anchors.set(k, a);
  }
}
