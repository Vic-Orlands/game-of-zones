// A textured page turn: a field of fibrous noise is inked over the screen — white paper rising through it with a
// dark edge and a green bleed — then, once the screen is covered, the same texture eats away to uncover what's
// behind. Drawn on a small 2D canvas and stretched, so it costs next to nothing.

const W = 480;
const H = 300;
let field: Float32Array | null = null;

function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** fbm + fibre grain + a gentle sweep from the bottom-left, normalised to 0–1 */
function makeField() {
  const f = new Float32Array(W * H);
  let lo = Infinity;
  let hi = -Infinity;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const nx = x / 80;
      const ny = y / 80;
      let n =
        vnoise(nx, ny) * 0.5 +
        vnoise(nx * 2.1, ny * 2.1) * 0.25 +
        vnoise(nx * 4.3, ny * 4.3) * 0.13;
      n += vnoise(x / 2.9, y / 12) * 0.09; // fibres
      n += (x / W) * 0.35 + (1 - y / H) * 0.2; // sweep
      f[y * W + x] = n;
      lo = Math.min(lo, n);
      hi = Math.max(hi, n);
    }
  for (let i = 0; i < f.length; i++) f[i] = (f[i] - lo) / (hi - lo);
  return f;
}

// colours follow the theme: the sheet is the page colour, the front edge the ink
let PAPER = [255, 255, 255];
let INK = [36, 37, 47];
let GREEN = [11, 122, 75];
function readTheme() {
  const dark = document.documentElement.dataset.theme === "dark";
  PAPER = dark ? [13, 16, 15] : [255, 255, 255];
  INK = dark ? [233, 230, 221] : [36, 37, 47];
  GREEN = dark ? [63, 191, 134] : [11, 122, 75];
}

function draw(
  ctx: CanvasRenderingContext2D,
  img: ImageData,
  thr: number,
  covering: boolean,
) {
  const f = field!;
  const d = img.data;
  const edge = 0.035;
  for (let i = 0; i < f.length; i++) {
    // distance into the covered side of the front
    const k = covering ? thr - f[i] : f[i] - thr;
    const o = i * 4;
    if (k < 0) {
      d[o + 3] = 0;
      continue;
    }
    // a soft first pixel on the front so the stretched canvas doesn't stair-step
    const aa = Math.min(1, k / 0.004);
    if (k < edge * 0.35) {
      d[o] = INK[0];
      d[o + 1] = INK[1];
      d[o + 2] = INK[2];
      d[o + 3] = 230 * aa;
    } else if (k < edge) {
      const t = (k - edge * 0.35) / (edge * 0.65);
      d[o] = GREEN[0] + (PAPER[0] - GREEN[0]) * t;
      d[o + 1] = GREEN[1] + (PAPER[1] - GREEN[1]) * t;
      d[o + 2] = GREEN[2] + (PAPER[2] - GREEN[2]) * t;
      d[o + 3] = 255;
    } else {
      d[o] = PAPER[0];
      d[o + 1] = PAPER[1];
      d[o + 2] = PAPER[2];
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

let busy = false;

/** Cover the screen, call `swap` while it's hidden, then uncover. */
export function textureWipe(swap: () => void, cover = 0.95, uncover = 1.25) {
  if (busy) return;
  busy = true;
  field ??= makeField();
  readTheme();
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  c.className = "wipe";
  c.setAttribute("aria-hidden", "true");
  document.body.appendChild(c);
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(W, H);
  const ease = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const span = 1 + 0.1; // overshoot so the edge band clears fully
  let t0 = performance.now();
  let stage: "cover" | "hold" | "reveal" = "cover";
  const tick = (now: number) => {
    const t = (now - t0) / 1000;
    if (stage === "cover") {
      const k = Math.min(1, t / cover);
      draw(ctx, img, ease(k) * span - 0.05, true);
      if (k >= 1) {
        stage = "hold";
        swap();
        t0 = now;
      }
    } else if (stage === "hold") {
      // give the new page a beat to mount behind the sheet
      if (t > 0.25) {
        stage = "reveal";
        t0 = now;
      }
    } else {
      const k = Math.min(1, t / uncover);
      draw(ctx, img, ease(k) * span - 0.05, false);
      if (k >= 1) {
        c.remove();
        busy = false;
        return;
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
