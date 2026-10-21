import { useSyncExternalStore } from "react";

// One place for the breakpoints the scripts care about; the CSS media queries mirror these numbers.
//   phone/tablet portrait (< 900 wide and > 560 tall): the House panel is a bottom sheet
//   short screens (≤ 560 tall, i.e. phones held sideways): compact type, side panel at half width
export const SHEET_MAX_W = 900;
export const SHORT_MAX_H = 560;

export const isSheet = () =>
  innerWidth < SHEET_MAX_W && innerHeight > SHORT_MAX_H;
export const isShort = () => innerHeight <= SHORT_MAX_H;
export const isNarrow = () => innerWidth < 760;
export const isTouch = () =>
  matchMedia("(hover: none), (pointer: coarse)").matches;

/** Width of the side panel in px (mirrors .panel in index.css). */
export const sidePanelWidth = () =>
  Math.min(440, innerWidth * (isShort() ? 0.5 : 0.92));

let version = 0;
const subs = new Set<() => void>();
const bump = () => {
  version++;
  subs.forEach((f) => f());
};
addEventListener("resize", bump);
addEventListener("orientationchange", bump);

/** Re-render on resize / rotation. */
export function useViewport() {
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => version,
  );
  return {
    w: innerWidth,
    h: innerHeight,
    sheet: isSheet(),
    short: isShort(),
    narrow: isNarrow(),
  };
}

export const onViewportChange = (f: () => void) => {
  subs.add(f);
  return () => subs.delete(f);
};
