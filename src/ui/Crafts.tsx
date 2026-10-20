import type { CSSProperties } from "react";
import { useStore } from "../state";

// Faint cartographer's furniture drawn in around the edges of the blank sheet: a compass rose throwing rhumb
// lines and a torn graticule corner. Strokes draw themselves in.

function Rose({ r = 90 }: { r?: number }) {
  const pts: string[] = [];
  const kite = (a: number, len: number, w: number) => {
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const tip = [ca * len, sa * len];
    const l = [Math.cos(a - Math.PI / 2) * w, Math.sin(a - Math.PI / 2) * w];
    const rr = [Math.cos(a + Math.PI / 2) * w, Math.sin(a + Math.PI / 2) * w];
    return `M0 0 L${l[0]} ${l[1]} L${tip[0]} ${tip[1]} L${rr[0]} ${rr[1]} Z M0 0 L${tip[0]} ${tip[1]}`;
  };
  for (let i = 0; i < 8; i++)
    pts.push(
      kite(
        (i * Math.PI) / 4 - Math.PI / 2,
        i % 2 ? r * 0.58 : r * 0.88,
        r * 0.1,
      ),
    );
  for (let i = 0; i < 16; i++)
    if (i % 2)
      pts.push(kite((i * Math.PI) / 8 - Math.PI / 2, r * 0.4, r * 0.05));
  const ticks: string[] = [];
  for (let d = 0; d < 360; d += 5) {
    const a = (d * Math.PI) / 180;
    const r0 = d % 45 === 0 ? r * 0.86 : r * 0.93;
    ticks.push(
      `M${Math.cos(a) * r0} ${Math.sin(a) * r0} L${Math.cos(a) * r} ${Math.sin(a) * r}`,
    );
  }
  const rhumbs: string[] = [];
  for (let i = 0; i < 32; i++) {
    const a = (i * Math.PI) / 16;
    rhumbs.push(
      `M${Math.cos(a) * r} ${Math.sin(a) * r} L${Math.cos(a) * r * 9} ${Math.sin(a) * r * 9}`,
    );
  }
  return (
    <g>
      <path
        className="draw"
        pathLength={1}
        d={rhumbs.join(" ")}
        style={{ strokeWidth: 0.5, opacity: 0.5, animationDuration: "7s" }}
      />
      <circle className="draw" pathLength={1} r={r} />
      <circle className="draw" pathLength={1} r={r * 0.93} />
      <circle
        className="draw"
        pathLength={1}
        r={r * 0.3}
        style={{ animationDelay: "0.6s" }}
      />
      <path
        className="draw"
        pathLength={1}
        d={ticks.join(" ")}
        style={{ animationDelay: "0.3s" }}
      />
      <path
        className="draw"
        pathLength={1}
        d={pts.join(" ")}
        style={{ animationDelay: "0.8s" }}
      />
      <text
        y={-r - 10}
        textAnchor="middle"
        fontFamily="IM Fell English"
        fontSize={18}
        fill="currentColor"
        className="rise"
      >
        N
      </text>
    </g>
  );
}

function Graticule() {
  const d: string[] = [];
  for (let i = 0; i <= 4; i++)
    d.push(`M${i * 70} 0 L${i * 70} 260`, `M0 ${i * 65} L300 ${i * 65}`);
  const ticks: string[] = [];
  for (let i = 0; i <= 24; i++) ticks.push(`M${i * 12.5} -6 L${i * 12.5} 0`);
  return (
    <g>
      <path
        className="draw"
        pathLength={1}
        d={d.join(" ")}
        style={{ strokeWidth: 0.5 }}
      />
      <path
        className="draw"
        pathLength={1}
        d={`M-10 -10 L310 -10 M-10 -10 L-10 270`}
      />
      <path
        className="draw"
        pathLength={1}
        d={ticks.join(" ")}
        transform="translate(0 -10)"
      />
      {[4, 5, 6, 7].map((k, i) => (
        <text
          key={k}
          x={i * 70}
          y={-22}
          textAnchor="middle"
          fontFamily="DM Mono"
          fontSize={9}
          fill="currentColor"
        >
          {k}°E
        </text>
      ))}
    </g>
  );
}

const pos = (s: CSSProperties) => s;

export function Crafts() {
  const phase = useStore((s) => s.phase);
  if (phase === "loading") return null;
  return (
    <div className={"crafts" + (phase === "map" ? " out" : "")} aria-hidden>
      <svg
        className="drift"
        style={pos({
          left: "8vw",
          bottom: "14vh",
          width: 1,
          height: 1,
          opacity: 0.32,
          ["--dx" as string]: "26px",
          ["--dy" as string]: "-14px",
          ["--dr" as string]: "6deg",
        })}
      >
        <Rose r={92} />
      </svg>
      <svg
        className="drift"
        style={pos({
          right: "9vw",
          top: "16vh",
          width: 1,
          height: 1,
          opacity: 0.22,
          ["--dx" as string]: "-30px",
          ["--dy" as string]: "18px",
          ["--dr" as string]: "-3deg",
        })}
      >
        <g transform="rotate(-8)">
          <Graticule />
        </g>
      </svg>
    </div>
  );
}
