import { useStore } from "../state";
import { toggleTheme } from "../theme";
import { MoonIcon, SunIcon } from "./icons";

/** Sun by night, moon by day: the button shows where it will take you. */
export function ThemeToggle({ className = "tool" }: { className?: string }) {
  const dark = useStore((s) => s.theme === "dark");
  const label = dark ? "Light mode" : "Dark mode";
  return (
    <button
      className={className}
      onClick={toggleTheme}
      data-hot
      data-tip={label}
      aria-label={label}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
