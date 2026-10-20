import { store } from "./state";

export type Theme = "light" | "dark";
const KEY = "goz-theme";

/** The saved choice, else whatever the system prefers. */
export function initialTheme(): Theme {
  const saved = localStorage.getItem(KEY);
  if (saved === "light" || saved === "dark") return saved;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", t === "dark" ? "#0d100f" : "#ffffff");
}

export function toggleTheme() {
  const t: Theme = store.getState().theme === "dark" ? "light" : "dark";
  localStorage.setItem(KEY, t);
  applyTheme(t);
  store.setState({ theme: t });
}
