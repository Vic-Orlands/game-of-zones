import { useEffect, useRef, useState } from "react";

const GLYPHS = "ABCDEFGHIKLMNOPRSTUVWXYZ·—";

/** Letters arrive out of order, each flickering through a few wrong glyphs before it settles. */
export function Scramble({
  text,
  delay = 0,
  speed = 1,
  className,
  charClass = "ch",
}: {
  text: string;
  delay?: number;
  speed?: number;
  className?: string;
  charClass?: string;
}) {
  const [out, setOut] = useState<string[]>(() => [...text].map(() => " "));
  const order = useRef<number[]>([]);

  useEffect(() => {
    const chars = [...text];
    const n = chars.length;
    // each letter gets a random arrival time and a short flicker
    order.current = chars.map(() => Math.random());
    const t0 = performance.now() + delay * 1000;
    const span = (500 + n * 22) / speed;
    let raf = 0;
    const tick = (now: number) => {
      const t = now - t0;
      let settled = 0;
      const next = chars.map((c, i) => {
        if (c === " ") {
          settled++;
          return " ";
        }
        const at = order.current[i] * span;
        if (t < at) return " ";
        if (t > at + 260 / speed) {
          settled++;
          return c;
        }
        return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      });
      setOut(next);
      if (settled < n) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, delay, speed]);

  // group letters into words so lines only break between words
  const chars = [...text];
  const words: number[][] = [[]];
  chars.forEach((c, i) => {
    if (c === " ") words.push([i], []);
    else words[words.length - 1].push(i);
  });
  return (
    <span className={className} aria-label={text}>
      {words.map((w, wi) =>
        w.length === 1 && chars[w[0]] === " " ? (
          <span key={wi} aria-hidden>
            {" "}
          </span>
        ) : (
          <span
            key={wi}
            aria-hidden
            style={{ whiteSpace: "nowrap", display: "inline-block" }}
          >
            {w.map((i) => (
              <span
                key={i}
                className={charClass}
                style={{ opacity: out[i] === " " ? 0 : 1 }}
              >
                {out[i] === " " ? chars[i] : out[i]}
              </span>
            ))}
          </span>
        ),
      )}
    </span>
  );
}
