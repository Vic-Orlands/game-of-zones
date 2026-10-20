import { create } from "zustand";
import type { SeatId } from "./data/houses";
import { initialTheme, applyTheme, type Theme } from "./theme";

export type Phase = "loading" | "intro" | "map";
export type View = "aerial" | "zone" | "plate";

type S = {
  phase: Phase;
  progress: number;
  view: View;
  hover: SeatId | null;
  hoverState: string | null;
  selected: SeatId | null;
  /** Houses pledged to the player's coalition on the Seat panel */
  pact: SeatId[];
  /** the House panel, opened from "Discover" once the camera has landed */
  panel: boolean;
  menu: boolean;
  credits: boolean;
  sound: boolean;
  theme: Theme;
};

const theme = initialTheme();
applyTheme(theme);

export const useStore = create<S>(() => ({
  phase: "loading",
  progress: 0,
  view: "aerial",
  hover: null,
  hoverState: null,
  selected: null,
  pact: [],
  panel: false,
  menu: false,
  credits: false,
  sound: true,
  theme,
}));

export const store = useStore;
