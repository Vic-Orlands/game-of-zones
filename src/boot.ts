import { loadGeo } from "./data/geo";
import { forgeEmblem } from "./gl/emblems";
import type { SeatId } from "./data/houses";
import { store } from "./state";

// The percentage is real: every part reports its own fraction and carries a weight.
const W = {
  heights: 30,
  ink: 14,
  ink2: 8,
  ids: 5,
  fields: 7,
  fonts: 6,
  emblems: 18,
  world: 12,
};
const done: Record<string, number> = {};
const total = Object.values(W).reduce((a, b) => a + b, 0);

export function report(part: keyof typeof W, f: number) {
  done[part] = Math.max(done[part] ?? 0, f);
  let s = 0;
  for (const k of Object.keys(W) as (keyof typeof W)[])
    s += (done[k] ?? 0) * W[k];
  store.setState({ progress: s / total });
}

const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)));

export async function boot() {
  const fonts = Promise.all(
    [
      '400 1em "IM Fell English"',
      'italic 400 1em "IM Fell English"',
      '500 1em "Cormorant Garamond"',
      '400 1em "DM Mono"',
    ].map((f) => document.fonts.load(f)),
  ).then(() => report("fonts", 1));
  await loadGeo((part, f) => report(part as keyof typeof W, f));
  await fonts;
  const ids: SeatId[] = ["NW", "NE", "NC", "SW", "SE", "SS", "FCT"];
  for (let i = 0; i < ids.length; i++) {
    forgeEmblem(ids[i]);
    report("emblems", (i + 1) / ids.length);
    await frame();
  }
}

export const worldReady = () => report("world", 1);
