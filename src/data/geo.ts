import * as THREE from "three";

// Map space: 1 world unit = 1 degree of latitude. Longitude is squeezed by cos(9°) so the country keeps its
// true shape; north is −z. Heights are metres scaled by EXAG (≈ ×20 vertical exaggeration).

export type StateMeta = {
  id: number;
  name: string;
  zone: string;
  lon: number;
  lat: number;
};
export type Meta = {
  bbox: [number, number, number, number];
  cosLat: number;
  grid: [number, number];
  tex: [number, number];
  states: StateMeta[];
};

export const EXAG = 0.17; // world units per km

export const geo = {
  meta: null as unknown as Meta,
  /** heights in km, row 0 = north edge */
  h: new Float32Array(0),
  gx: 0,
  gy: 0,
  ids: null as unknown as ImageData,
  tex: {} as Record<"ink" | "ink2" | "ids" | "fields", THREE.Texture>,
  heightTex: null as unknown as THREE.DataTexture,
  lonC: 0,
  latC: 0,
};

export function lonLatToWorld(lon: number, lat: number) {
  const m = geo.meta;
  return {
    x: (lon - geo.lonC) * m.cosLat,
    z: -(lat - geo.latC),
  };
}
export function worldToLonLat(x: number, z: number) {
  return { lon: x / geo.meta.cosLat + geo.lonC, lat: -z + geo.latC };
}

/** Bilinear terrain height (world units) under a world x/z. */
export function heightAt(x: number, z: number) {
  const [L0, L1, A0, A1] = geo.meta.bbox;
  const { lon, lat } = worldToLonLat(x, z);
  const fx = ((lon - L0) / (L1 - L0)) * (geo.gx - 1);
  const fy = ((A1 - lat) / (A1 - A0)) * (geo.gy - 1);
  if (fx < 0 || fy < 0 || fx > geo.gx - 1 || fy > geo.gy - 1) return 0;
  const x0 = Math.min(geo.gx - 2, Math.floor(fx));
  const y0 = Math.min(geo.gy - 2, Math.floor(fy));
  const tx = fx - x0;
  const ty = fy - y0;
  const i = y0 * geo.gx + x0;
  const h = geo.h;
  const v =
    h[i] * (1 - tx) * (1 - ty) +
    h[i + 1] * tx * (1 - ty) +
    h[i + geo.gx] * (1 - tx) * ty +
    h[i + geo.gx + 1] * tx * ty;
  return v * EXAG;
}

/** Zone number (1–7, 0 = outside) and state id under a lon/lat, read from the baked raster. */
export function zoneAt(lon: number, lat: number) {
  const [L0, L1, A0, A1] = geo.meta.bbox;
  const W = geo.ids.width;
  const H = geo.ids.height;
  const px = Math.floor(((lon - L0) / (L1 - L0)) * W);
  const py = Math.floor(((A1 - lat) / (A1 - A0)) * H);
  if (px < 0 || py < 0 || px >= W || py >= H) return { zone: 0, state: 0 };
  const o = (py * W + px) * 4;
  const d = geo.ids.data;
  return { zone: Math.round(d[o] / 30), state: Math.round(d[o + 1] / 6) };
}

export function stateById(id: number) {
  return geo.meta.states.find((s) => s.id === id) ?? null;
}

/** March a ray across the heightfield; returns the first hit or null. */
export function rayTerrain(ray: THREE.Ray, out = new THREE.Vector3()) {
  const p = new THREE.Vector3();
  const o = ray.origin;
  const d = ray.direction;
  if (d.y >= 0) return null;
  // start where the ray drops below the highest possible ground
  const top = 0.6;
  let t = o.y > top ? (top - o.y) / d.y : 0;
  const step = 0.02;
  let prevT = t;
  for (let i = 0; i < 4000; i++) {
    p.copy(o).addScaledVector(d, t);
    if (p.y < -0.05) break;
    if (p.y <= heightAt(p.x, p.z)) {
      // refine
      let a = prevT;
      let b = t;
      for (let k = 0; k < 10; k++) {
        const m = (a + b) / 2;
        p.copy(o).addScaledVector(d, m);
        if (p.y <= heightAt(p.x, p.z)) b = m;
        else a = m;
      }
      return out.copy(o).addScaledVector(d, b);
    }
    prevT = t;
    t += step * Math.max(1, t * 0.02);
  }
  // fall back to sea level
  const ts = -o.y / d.y;
  return out.copy(o).addScaledVector(d, ts);
}

/** Light [1 2 1] blur, a couple of passes: takes the spikes off single-cell peaks so close-ups read as hills. */
function smoothHeights(
  h: Float32Array,
  w: number,
  hgt: number,
  passes: number,
) {
  const t = new Float32Array(h.length);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < hgt; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const l = h[x > 0 ? i - 1 : i];
        const r = h[x < w - 1 ? i + 1 : i];
        t[i] = (l + 2 * h[i] + r) / 4;
      }
    for (let y = 0; y < hgt; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const u = t[y > 0 ? i - w : i];
        const d = t[y < hgt - 1 ? i + w : i];
        h[i] = (u + 2 * t[i] + d) / 4;
      }
  }
}

async function fetchWithProgress(url: string, onp: (f: number) => void) {
  const res = await fetch(url);
  const total = Number(res.headers.get("content-length")) || 0;
  if (!res.body || !total) {
    const b = await res.arrayBuffer();
    onp(1);
    return b;
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    onp(Math.min(1, got / total));
  }
  const out = new Uint8Array(got);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  onp(1);
  return out.buffer;
}

async function loadImage(url: string, onp: (f: number) => void) {
  const buf = await fetchWithProgress(url, onp);
  const blob = new Blob([buf], { type: "image/png" });
  return createImageBitmap(blob, {
    imageOrientation: "flipY",
    premultiplyAlpha: "none",
    colorSpaceConversion: "none",
  });
}

function bitmapTexture(bmp: ImageBitmap, nearest = false) {
  const t = new THREE.Texture(bmp);
  // the bitmap is already flipped, so v runs south → north like the uv attribute
  t.flipY = false;
  t.colorSpace = THREE.NoColorSpace;
  t.generateMipmaps = !nearest;
  t.minFilter = nearest ? THREE.NearestFilter : THREE.LinearMipmapLinearFilter;
  t.magFilter = nearest ? THREE.NearestFilter : THREE.LinearFilter;
  t.anisotropy = nearest ? 1 : 8;
  t.needsUpdate = true;
  return t;
}

/** Fetch every map layer. `onp` receives a 0–1 fraction per named part. */
export async function loadGeo(onp: (part: string, f: number) => void) {
  const meta = (await (await fetch("/data/meta.json")).json()) as Meta;
  geo.meta = meta;
  const [L0, L1, A0, A1] = meta.bbox;
  geo.lonC = (L0 + L1) / 2;
  geo.latC = (A0 + A1) / 2;
  [geo.gx, geo.gy] = meta.grid;

  const [hBuf, ink, ink2, ids, fields] = await Promise.all([
    fetchWithProgress("/data/heights.u16", (f) => onp("heights", f)),
    loadImage("/data/ink.png", (f) => onp("ink", f)),
    loadImage("/data/ink2.png", (f) => onp("ink2", f)),
    loadImage("/data/ids.png", (f) => onp("ids", f)),
    loadImage("/data/fields.png", (f) => onp("fields", f)),
  ]);

  const u16 = new Uint16Array(hBuf);
  geo.h = new Float32Array(u16.length);
  for (let i = 0; i < u16.length; i++) geo.h[i] = u16[i] / 1000;
  smoothHeights(geo.h, geo.gx, geo.gy, 2);

  // half-float height texture (km) so the shader can draw true contours; flipped so row 0 is south
  const half = new Uint16Array(u16.length);
  for (let y = 0; y < geo.gy; y++)
    for (let x = 0; x < geo.gx; x++)
      half[y * geo.gx + x] = THREE.DataUtils.toHalfFloat(
        geo.h[(geo.gy - 1 - y) * geo.gx + x],
      );
  const ht = new THREE.DataTexture(
    half,
    geo.gx,
    geo.gy,
    THREE.RedFormat,
    THREE.HalfFloatType,
  );
  ht.minFilter = ht.magFilter = THREE.LinearFilter;
  ht.needsUpdate = true;
  geo.heightTex = ht;

  // CPU copy of the zone raster for picking (unflipped: row 0 = north)
  const c = document.createElement("canvas");
  c.width = ids.width;
  c.height = ids.height;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.scale(1, -1);
  g.drawImage(ids, 0, -ids.height);
  geo.ids = g.getImageData(0, 0, ids.width, ids.height);

  geo.tex.ink = bitmapTexture(ink);
  geo.tex.ink2 = bitmapTexture(ink2);
  geo.tex.ids = bitmapTexture(ids, true);
  geo.tex.fields = bitmapTexture(fields);
}
