import { useEffect, useRef, useState } from "react";
import { store, useStore } from "../state";

const STEPS = [
  [0, "Raising the plateaus from the elevation survey…"],
  [0.3, "Running the Niger and the Benue to the sea…"],
  [0.5, "Ruling the borders of thirty-six states…"],
  [0.64, "Casting the sigils of six Houses in bronze…"],
  [0.84, "Inking the plate…"],
  [0.99, "The plate is dry."],
] as const;

/** The real load fraction, eased so the numerals roll rather than jump. */
export function Loader() {
  const progress = useStore((s) => s.progress);
  const [shown, setShown] = useState(0);
  const [out, setOut] = useState(false);
  const target = useRef(0);
  useEffect(() => {
    target.current = progress;
  }, [progress]);

  useEffect(() => {
    let raf = 0;
    let v = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // never faster than ~1.2s from 0 → 100, never stall behind the real number by much
      v = Math.min(
        target.current,
        v + Math.max(dt * 0.8, (target.current - v) * dt * 4),
      );
      setShown(v);
      if (v >= 0.9999) {
        setOut(true);
        setTimeout(() => store.setState({ phase: "intro" }), 900);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pct = Math.floor(shown * 100);
  const step = [...STEPS].reverse().find(([k]) => shown >= k)?.[1] ?? "";
  return (
    <div
      className={"loader" + (out ? " out" : "")}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="plate">
        <div className="kicker">Engraving the realm</div>
        <div className="pct">
          {String(pct).padStart(2, "0")}
          <sup>%</sup>
        </div>
        <div className="rule">
          <i style={{ width: `${shown * 100}%` }} />
          <b style={{ left: `${shown * 100}%` }} />
        </div>
        <div className="ticks">
          <span>4°N</span>
          <span>6°</span>
          <span>8°</span>
          <span>10°</span>
          <span>12°</span>
          <span>14°N</span>
        </div>
        <div className="step" key={step}>
          <span className="rise">{step}</span>
        </div>
      </div>
    </div>
  );
}
