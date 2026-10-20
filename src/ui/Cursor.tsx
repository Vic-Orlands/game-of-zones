import { useEffect, useRef } from "react";
import { store } from "../state";

/** A small lozenge that trails the pointer and swells over anything that can be pressed or chosen. */
export function Cursor() {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const p = { x: -100, y: -100 };
    const c = { x: -100, y: -100 };
    let hot = false;
    let down = false;
    const move = (e: PointerEvent) => {
      p.x = e.clientX;
      p.y = e.clientY;
      const t = e.target as HTMLElement | null;
      hot = !!t?.closest?.("[data-hot]");
    };
    const pd = () => (down = true);
    const pu = () => (down = false);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", pd);
    window.addEventListener("pointerup", pu);
    let raf = 0;
    const tick = () => {
      c.x += (p.x - c.x) * 0.35;
      c.y += (p.y - c.y) * 0.35;
      const s = store.getState();
      const onMap = s.phase === "map" && !!s.hover;
      if (el.current) {
        el.current.style.transform = `translate3d(${c.x}px, ${c.y}px, 0)`;
        el.current.classList.toggle("hot", hot || onMap);
        el.current.classList.toggle("drag", down && !hot);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", pd);
      window.removeEventListener("pointerup", pu);
    };
  }, []);
  return (
    <div className="cursor" ref={el} aria-hidden>
      <i />
      <b />
    </div>
  );
}
