import { useStore } from "../state";
import { toggleTheme } from "../theme";

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
      <svg
        width={30}
        height={30}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {dark ? (
          <>
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
          </>
        ) : (
          <path d="M20 14.6A8.2 8.2 0 0 1 9.4 4a8.2 8.2 0 1 0 10.6 10.6z" />
        )}
      </svg>
    </button>
  );
}
