import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { QUESTIONS, type Question } from "../data/quiz";
import { HOUSES } from "../data/houses";
import { store } from "../state";
import { Scramble } from "./Scramble";
import { textureWipe } from "./wipe";
import { ThemeToggle } from "./ThemeToggle";
import { isShort, isTouch } from "../layout";

const houseName = (z: string) =>
  z === "FCT" ? "The Seat" : (HOUSES.find((h) => h.id === z)?.house ?? "");

function pick(not?: Question) {
  const pool = QUESTIONS.filter((q) => q !== not);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function Rose({
  className,
  x,
  y,
  size,
}: {
  className?: string;
  x?: number;
  y?: number;
  size?: number;
}) {
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const len = i % 2 ? 15 : 26;
    const w = 4;
    const tip = [32 + Math.cos(a) * len, 32 + Math.sin(a) * len];
    const l = [
      32 + Math.cos(a - Math.PI / 2) * w,
      32 + Math.sin(a - Math.PI / 2) * w,
    ];
    const r = [
      32 + Math.cos(a + Math.PI / 2) * w,
      32 + Math.sin(a + Math.PI / 2) * w,
    ];
    pts.push(`M32 32 L${l} L${tip} L${r} Z`);
  }
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      x={x}
      y={y}
      width={size}
      height={size}
      aria-hidden
    >
      <circle
        cx={32}
        cy={32}
        r={29}
        fill="none"
        stroke="currentColor"
        strokeWidth={0.8}
      />
      <circle
        cx={32}
        cy={32}
        r={26}
        fill="none"
        stroke="currentColor"
        strokeWidth={0.5}
        strokeDasharray="1 2.2"
      />
      {pts.map((d, i) => (
        <path
          key={i}
          d={d}
          fill={i % 2 ? "none" : "currentColor"}
          fillOpacity={0.85}
          stroke="currentColor"
          strokeWidth={0.7}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

function Stamp() {
  return (
    <svg viewBox="0 0 200 200" className="stamp-svg" aria-hidden>
      <defs>
        <path
          id="ring"
          d="M100 100 m-68 0 a68 68 0 1 1 136 0 a68 68 0 1 1 -136 0"
        />
      </defs>
      <circle
        cx={100}
        cy={100}
        r={92}
        fill="none"
        stroke="currentColor"
        strokeWidth={4}
        strokeDasharray="3 2.4"
      />
      <circle
        cx={100}
        cy={100}
        r={84}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      />
      <circle
        cx={100}
        cy={100}
        r={52}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      />
      <text
        fontFamily="IM Fell English"
        fontSize={16}
        letterSpacing={4.2}
        fill="currentColor"
      >
        <textPath href="#ring">WELL READ · THE HOUSES TAKE NOTE ·</textPath>
      </text>
      <Rose x={68} y={68} size={64} />
    </svg>
  );
}

export function Intro() {
  const [q, setQ] = useState<Question>(() => pick());
  const [stage, setStage] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [hold, setHold] = useState(false);
  const dim = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const enterWrap = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const qRef = useRef<HTMLHeadingElement>(null);
  const fx = useRef<HTMLDivElement>(null);
  const optRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const first = useRef(true);

  useEffect(() => {
    const ts = first.current ? [200, 500, 1600] : [0, 200, 1300];
    first.current = false;
    setStage(0);
    const timers = ts.map((t, i) =>
      window.setTimeout(() => setStage(i + 1), t),
    );
    return () => timers.forEach(clearTimeout);
  }, [q]);

  // the torch: everything but the question sits under a dimmed sheet; the pointer lifts it a little
  useEffect(() => {
    const p = { x: -400, y: -400 };
    const c = { x: -400, y: -400 };
    // on a touch screen there's no pointer to follow, so the light wanders on its own until a finger moves
    const touch = isTouch();
    let lastTouch = -1e9;
    const move = (e: PointerEvent) => {
      p.x = e.clientX;
      p.y = e.clientY;
      if (e.pointerType !== "mouse") lastTouch = performance.now();
    };
    window.addEventListener("pointermove", move, { passive: true });
    let raf = 0;
    const tick = (now: number) => {
      if (touch && now - lastTouch > 2500) {
        const t = now / 1000;
        p.x =
          innerWidth * (0.5 + 0.38 * Math.sin(t * 0.31) * Math.cos(t * 0.13));
        p.y = innerHeight * (0.55 + 0.34 * Math.sin(t * 0.23 + 1.2));
      }
      c.x += (p.x - c.x) * 0.18;
      c.y += (p.y - c.y) * 0.18;
      dim.current?.style.setProperty("--mx", `${c.x.toFixed(1)}px`);
      dim.current?.style.setProperty("--my", `${c.y.toFixed(1)}px`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
    };
  }, []);

  const right = picked !== null && picked === q.answer;
  const answered = picked !== null;

  // on a short screen the verdict and Enter fall below the fold: bring them up once they've appeared
  useEffect(() => {
    if (!answered) return;
    const sc = scroller.current;
    if (!sc || sc.scrollHeight <= sc.clientHeight + 4) return;
    const id = window.setTimeout(
      () => sc.scrollTo({ top: sc.scrollHeight, behavior: "smooth" }),
      right ? 1400 : 1900,
    );
    return () => clearTimeout(id);
  }, [answered, right]);

  // the fun: letters hop, paper flies, a seal comes down
  useLayoutEffect(() => {
    if (!answered) return;
    const chars = qRef.current?.querySelectorAll(".ch") ?? [];
    const el = optRefs.current[picked!];
    const box = el?.getBoundingClientRect();
    const ctx = gsap.context(() => {
      if (right) {
        gsap.fromTo(
          chars,
          { y: 0 },
          {
            y: -14,
            duration: 0.22,
            ease: "power2.out",
            stagger: { each: 0.012, from: "center" },
            yoyo: true,
            repeat: 1,
          },
        );
        if (box && fx.current) {
          const cx = box.left + box.width / 2;
          const cy = box.top + box.height / 2;
          const colors = [
            "#0b7a4b",
            "#0b7a4b",
            "#fbf8f0",
            "#b88a4a",
            "#24252f",
          ];
          const frag = document.createDocumentFragment();
          const bits: HTMLElement[] = [];
          for (let i = 0; i < 70; i++) {
            const b = document.createElement("i");
            const c = colors[i % colors.length];
            const kind = i % 3;
            const s = 5 + Math.random() * 7;
            Object.assign(b.style, {
              left: cx + "px",
              top: cy + "px",
              width: (kind === 1 ? s * 0.45 : s) + "px",
              height: (kind === 1 ? s * 1.8 : s) + "px",
              background: c,
              border: c === "#fbf8f0" ? "1px solid rgba(36,37,47,.5)" : "none",
              borderRadius: kind === 2 ? "50%" : "0",
            });
            frag.appendChild(b);
            bits.push(b);
          }
          fx.current.appendChild(frag);
          bits.forEach((b) => {
            const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
            const v = 220 + Math.random() * 380;
            const tl = gsap.timeline({ onComplete: () => b.remove() });
            tl.to(b, {
              x: Math.cos(a) * v,
              y: Math.sin(a) * v,
              rotation: Math.random() * 720 - 360,
              rotationX: Math.random() * 360,
              duration: 0.7,
              ease: "power3.out",
            })
              .to(b, {
                y: `+=${420 + Math.random() * 300}`,
                x: `+=${(Math.random() - 0.5) * 120}`,
                rotation: `+=${Math.random() * 360}`,
                duration: 1.8,
                ease: "power1.in",
              })
              .to(b, { opacity: 0, duration: 0.5 }, "-=0.5");
          });
          const st = fx.current.querySelector(".stamp") as HTMLElement;
          const qb = qRef.current!.getBoundingClientRect();
          // beside the question on wide screens; small, tucked into the lower right corner on phones
          const narrow = innerWidth < 900 || isShort();
          gsap.set(
            st,
            narrow
              ? { left: innerWidth - 146, top: innerHeight - 250 }
              : {
                  left: Math.min(window.innerWidth - 190, qb.right - 60),
                  top: qb.bottom - 10,
                },
          );
          gsap.fromTo(
            st,
            { scale: 2.6, rotation: -40, opacity: 0 },
            {
              scale: narrow ? 0.55 : 1,
              rotation: -14,
              opacity: 0.92,
              duration: 0.42,
              ease: "power4.in",
              delay: 0.35,
            },
          );
          gsap.fromTo(
            root.current,
            { x: 0 },
            { x: 3, duration: 0.05, repeat: 3, yoyo: true, delay: 0.77 },
          );
        }
      } else {
        const wipe = fx.current?.querySelector(".inkwipe") as HTMLElement;
        const qb = qRef.current!.getBoundingClientRect();
        gsap.fromTo(
          wipe,
          { top: qb.top - 10, opacity: 0, scaleX: 0.2 },
          {
            top: qb.bottom + 10,
            opacity: 1,
            scaleX: 1,
            duration: 0.9,
            ease: "power2.inOut",
          },
        );
        gsap.to(wipe, { opacity: 0, duration: 0.4, delay: 0.9 });
        gsap.fromTo(
          qRef.current,
          { filter: "blur(0px)" },
          {
            filter: "blur(3px)",
            duration: 0.45,
            yoyo: true,
            repeat: 1,
            ease: "sine.inOut",
          },
        );
        gsap.fromTo(
          chars,
          { opacity: 1 },
          {
            opacity: 0.45,
            duration: 0.6,
            stagger: { each: 0.006, from: "start" },
          },
        );
      }
    });
    return () => ctx.revert();
  }, [answered, right, picked]);

  const enter = () => {
    setLeaving(true);
    textureWipe(() => store.setState({ phase: "map" }));
  };

  // unanswered questions keep turning over until one is taken
  const rotate = () => {
    if (!answered) setQ((cur) => pick(cur));
  };

  const another = () => {
    setPicked(null);
    setQ((cur) => pick(cur));
  };

  return (
    <div ref={root} className={"intro" + (leaving ? " leaving" : "")}>
      <div
        ref={dim}
        className={"dim" + (answered ? " lift" : "")}
        aria-hidden
      />
      <div className="intro-tools">
        <ThemeToggle />
      </div>
      <div className="intro-scroll" ref={scroller}>
        <div className="brand">
          {stage >= 1 && (
            <>
              <div className="over rise">Six Houses · One Seat</div>
              <h1>
                <Scramble text="The Game of Zones" />
              </h1>
              <div className="under rise" style={{ animationDelay: "0.8s" }}>
                a map of Nigeria
              </div>
            </>
          )}
        </div>

        <div
          className={
            "quiz" +
            (answered ? (right ? " answered right" : " answered wrong") : "")
          }
          key={q.q}
        >
          {stage >= 2 && (
            <>
              <div className="ask rise">
                Before you enter — a question of the realm
              </div>
              <h2 className="q" ref={qRef}>
                <Scramble text={q.q} speed={1.5} />
              </h2>
              <div
                className={"opts" + (answered ? " answered" : "")}
                onPointerEnter={() => setHold(true)}
                onPointerLeave={() => setHold(false)}
              >
                {stage >= 3 &&
                  q.options.map((o, i) => (
                    <button
                      key={o}
                      ref={(el) => {
                        optRefs.current[i] = el;
                      }}
                      className={
                        "opt rise" +
                        (picked === i ? " picked" : "") +
                        (answered && i === q.answer ? " right" : "") +
                        (answered && picked === i && i !== q.answer
                          ? " no"
                          : "")
                      }
                      style={{ animationDelay: `${i * 0.09}s` }}
                      onClick={() => !answered && setPicked(i)}
                      data-right={
                        import.meta.env.DEV && i === q.answer ? "" : undefined
                      }
                      data-hot
                    >
                      <span className="n">{"ABCD"[i]}</span>
                      {o}
                      <span className="strike" />
                      {answered && !right && i === q.answer && (
                        <svg
                          className="swash"
                          viewBox="0 0 120 16"
                          preserveAspectRatio="none"
                        >
                          <path d="M2 10 C 30 4, 60 14, 90 7 S 116 6, 118 9" />
                        </svg>
                      )}
                    </button>
                  ))}
              </div>
              {stage >= 3 && !answered && (
                <div
                  className="turn"
                  aria-hidden
                  style={{ animationPlayState: hold ? "paused" : "running" }}
                  onAnimationEnd={rotate}
                />
              )}
              <div className="verdict">
                {answered && (
                  <>
                    <div
                      className="v rise"
                      style={{
                        color: right ? "var(--accent)" : "#9e3b32",
                        animationDelay: right ? "0.2s" : "0.9s",
                      }}
                    >
                      {right ? "Correct" : "Not quite"}
                    </div>
                    <div
                      className="note rise"
                      style={{ animationDelay: right ? "0.45s" : "1.15s" }}
                    >
                      {right
                        ? `${houseName(q.zone)} takes note. `
                        : `It is ${q.options[q.answer]}. `}
                      {q.note}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <div
          className="enter-wrap"
          ref={enterWrap}
          style={{ alignSelf: "end", display: "grid", justifyItems: "center" }}
        >
          {answered && (
            <>
              <button
                className="enter rise"
                style={{ animationDelay: right ? "1.1s" : "1.6s" }}
                onClick={enter}
                data-hot
              >
                <Rose className="rose" />
                Enter
              </button>
              <button
                className="again rise"
                style={{ animationDelay: right ? "1.3s" : "1.8s" }}
                onClick={another}
                data-hot
              >
                ask me another
              </button>
            </>
          )}
        </div>
      </div>

      <div ref={fx} className="confetti" aria-hidden>
        <div className="stamp" style={{ opacity: 0 }}>
          <Stamp />
        </div>
        <div className="inkwipe" style={{ opacity: 0 }} />
      </div>
    </div>
  );
}
