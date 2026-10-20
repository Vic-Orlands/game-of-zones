import { useEffect, useRef, useState } from "react";
import {
  HOUSES,
  NEEDED,
  STATE_COUNT,
  THRONE,
  houseById,
  type House,
  type SeatId,
} from "../data/houses";
import { LABELS } from "../data/labels";
import { geo } from "../data/geo";
import { store, useStore } from "../state";
import { anchors } from "../gl/screen";
import { select, setPanel, togglePlate } from "../director";
import { Scramble } from "./Scramble";
import { Credits } from "./Credits";
import { textureWipe } from "./wipe";
import { ThemeToggle } from "./ThemeToggle";

const SEAT_IDS: SeatId[] = ["NW", "NE", "NC", "SW", "SE", "SS", "FCT"];
const nameOf = (id: SeatId) =>
  id === "FCT" ? THRONE.house : houseById(id)!.house;
const zoneOf = (id: SeatId) =>
  id === "FCT" ? THRONE.zone : houseById(id)!.zone;
const wordsOf = (id: SeatId) =>
  id === "FCT" ? THRONE.words : houseById(id)!.words;

/** Names lettered on the plate, moved every frame from the projected anchors. */
function Labels() {
  const view = useStore((s) => s.view);
  const selected = useStore((s) => s.selected);
  const hoverState = useStore((s) => s.hoverState);
  const panel = useStore((s) => s.panel);
  const refs = useRef(new Map<string, HTMLDivElement>());
  const zoneStates =
    selected && selected !== "FCT"
      ? houseById(selected)!.states
      : selected === "FCT"
        ? ["Abuja"]
        : [];
  const roomy = window.innerWidth > 760;
  const states =
    view === "plate" && roomy
      ? geo.meta.states.map((s) => s.name)
      : view === "zone" && panel
        ? zoneStates
        : [];

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      // keep lettering off the chosen sigil
      const sel = store.getState().selected;
      const sig = sel ? anchors.get("m:" + sel) : undefined;
      for (const [k, el] of refs.current) {
        const a = anchors.get(k);
        if (!a) continue;
        el.style.transform = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`;
        const onSigil =
          !!sig &&
          k.startsWith("s:") &&
          Math.hypot(a.x - sig.x, a.y - sig.y) < 130;
        el.style.visibility = a.visible && !onSigil ? "visible" : "hidden";
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const reg = (k: string) => (el: HTMLDivElement | null) => {
    if (el) refs.current.set(k, el);
    else refs.current.delete(k);
  };
  const seatName = (id: SeatId) =>
    id === "FCT" ? THRONE.seat.name : houseById(id)!.seat.name;
  return (
    <div className="labels" aria-hidden>
      {view !== "zone" &&
        LABELS.map((l) => (
          <div key={l.key} ref={reg(l.key)} className={"lbl " + l.kind}>
            <span>{l.text}</span>
          </div>
        ))}
      {view !== "plate" &&
        SEAT_IDS.filter(
          (id) =>
            !states.includes(seatName(id)) &&
            !(view === "zone" && selected === id),
        ).map((id) => (
          <div
            key={id}
            ref={reg("g:" + id)}
            className="lbl seat"
            style={{ opacity: view === "zone" && selected !== id ? 0.35 : 1 }}
          >
            <span>{seatName(id)}</span>
          </div>
        ))}
      {states.map((n) => (
        <div
          key={n}
          ref={reg("s:" + n)}
          className={"lbl state" + (hoverState === n ? " hot" : "")}
        >
          <span>{n === "Abuja" ? "F.C.T." : n}</span>
        </div>
      ))}
    </div>
  );
}

/** Over the landed view: the House lettered across its sigil, and the way into its panel. */
function ZoneTitle() {
  const view = useStore((s) => s.view);
  const selected = useStore((s) => s.selected);
  const panel = useStore((s) => s.panel);
  if (view !== "zone" || !selected || panel) return null;
  const seat =
    selected === "FCT" ? THRONE.seat.name : houseById(selected)!.seat.name;
  return (
    <div className="zone-title" key={selected}>
      <div className="z rise" style={{ animationDelay: "2.6s" }}>
        {zoneOf(selected)} · {seat}
      </div>
      <div className="h">
        <Scramble text={nameOf(selected)} delay={2.9} speed={1.6} />
      </div>
      <button className="discover" onClick={() => setPanel(true)} data-hot>
        <span className="plate">
          Explore the House
          <svg viewBox="0 0 28 10" aria-hidden>
            <path d="M0 5h25M21 1.5 25 5l-4 3.5" />
          </svg>
        </span>
        <i />
      </button>
    </div>
  );
}

function HoverTitle() {
  const hover = useStore((s) => s.hover);
  const view = useStore((s) => s.view);
  if (!hover || view === "zone") return null;
  return (
    <div className="hover-title" key={hover}>
      <div className="z rise">{zoneOf(hover)}</div>
      <div className="h">
        <Scramble text={nameOf(hover)} speed={2.4} />
      </div>
      <div className="w rise" style={{ animationDelay: "0.2s" }}>
        “{wordsOf(hover)}”
      </div>
    </div>
  );
}

function HousePanel({ h }: { h: House }) {
  const hoverState = useStore((s) => s.hoverState);
  return (
    <div className="body" key={h.id}>
      <div className="zn">
        {h.zone} · seat at {h.seat.name}
      </div>
      <h2>{h.house}</h2>
      <p className="words">“{h.words}”</p>
      <p>{h.sigilNote}</p>
      <h3>{h.states.length} states</h3>
      <div className="states">
        {h.states.map((s) => (
          <button
            key={s}
            className={hoverState === s ? "on" : ""}
            onPointerEnter={() => store.setState({ hoverState: s })}
            onPointerLeave={() => store.setState({ hoverState: null })}
            data-hot
          >
            {s}
          </button>
        ))}
      </div>
      <h3>Peoples</h3>
      <div className="peoples">{h.peoples.join(", ")} — and many others.</div>
      <h3>Of note</h3>
      <ul className="facts">
        {h.facts.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <p className="fine">
        The Houses, their words and sigils are this map's invention; the states,
        peoples and places are real.
      </p>
    </div>
  );
}

function SeatPanel() {
  const pact = useStore((s) => s.pact);
  const states = HOUSES.filter((h) => pact.includes(h.id)).reduce(
    (a, h) => a + h.states.length,
    0,
  );
  const fct = pact.includes("FCT");
  const ok = states >= NEEDED && fct;
  const toggle = (id: SeatId) =>
    store.setState({
      pact: pact.includes(id) ? pact.filter((x) => x !== id) : [...pact, id],
    });
  return (
    <div className="body" key="FCT">
      <div className="zn">{THRONE.zone} · Aso Rock</div>
      <h2>The Seat</h2>
      <p className="words">“{THRONE.words}”</p>
      <h3>To take it</h3>
      {THRONE.rules.map((r) => (
        <p key={r}>{r}</p>
      ))}
      <p>{THRONE.note}</p>
      <h3>Forge a pact</h3>
      <p style={{ fontStyle: "italic", color: "var(--ink-2)" }}>
        A toy, not a forecast: pretend each House you pledge delivers its
        quarter in every one of its states.
      </p>
      <div className="pact">
        {SEAT_IDS.map((id) => (
          <button
            key={id}
            className={pact.includes(id) ? "on" : ""}
            onClick={() => toggle(id)}
            data-hot
          >
            <span className="box" />
            <span>
              {id === "FCT" ? "Abuja (the FCT)" : houseById(id)!.house}
            </span>
            <span className="c">
              {id === "FCT" ? "FCT" : `${houseById(id)!.states.length} states`}
            </span>
          </button>
        ))}
      </div>
      <div className="tally">
        <div className="bar">
          <i style={{ width: `${(states / STATE_COUNT) * 100}%` }} />
          <b style={{ left: `${(NEEDED / STATE_COUNT) * 100}%` }} />
        </div>
        <div className="row">
          <span>
            {states} / {STATE_COUNT} STATES
          </span>
          <span>NEED {NEEDED} + FCT</span>
        </div>
        <div className={"verdict-line" + (ok ? " ok" : "")}>
          {ok
            ? "The pact spans the country. The seat could be yours."
            : states >= NEEDED
              ? "Enough states — but Abuja must be carried too."
              : pact.length === 0
                ? "Pledge Houses to begin."
                : `${NEEDED - states} more states. No House, nor any three, can do it alone.`}
        </div>
      </div>
    </div>
  );
}

function Menu() {
  const go = (fn: () => void) => () => {
    store.setState({ menu: false });
    fn();
  };
  return (
    <div className="sheet" role="dialog" aria-label="Menu">
      <button
        className="x"
        onClick={() => store.setState({ menu: false })}
        data-hot
      >
        CLOSE ✕
      </button>
      <div className="menu-list">
        <button
          onClick={go(() => select(null))}
          data-hot
          style={{ animationDelay: "0s" }}
        >
          The Houses<small>the realm from above</small>
        </button>
        <div className="menu-houses" style={{ animationDelay: "0.03s" }}>
          {HOUSES.map((h) => (
            <button key={h.id} onClick={go(() => select(h.id))} data-hot>
              {h.house.replace("House of the ", "")}
            </button>
          ))}
        </div>
        <button
          onClick={go(() => select("FCT"))}
          data-hot
          style={{ animationDelay: "0.06s" }}
        >
          The Seat<small>Aso Rock, and how it is won</small>
        </button>
        <button
          onClick={go(() => store.getState().view !== "plate" && togglePlate())}
          data-hot
          style={{ animationDelay: "0.12s" }}
        >
          The Plate<small>every state, flat on the table</small>
        </button>
        <button
          onClick={go(() =>
            textureWipe(() =>
              store.setState({
                phase: "intro",
                selected: null,
                view: "aerial",
                hover: null,
                panel: false,
              }),
            ),
          )}
          data-hot
          style={{ animationDelay: "0.18s" }}
        >
          A Question<small>test yourself again</small>
        </button>
        <button
          onClick={go(() => store.setState({ credits: true }))}
          data-hot
          style={{ animationDelay: "0.24s" }}
        >
          Credits<small>data, type and thanks</small>
        </button>
      </div>
    </div>
  );
}

/**
 * The House panel, opened from "Explore the House". It stays mounted and slides in and out; the sigil itself is the one
 * standing in the landscape, so the panel is words only.
 */
function Panel() {
  const view = useStore((s) => s.view);
  const selected = useStore((s) => s.selected);
  const panel = useStore((s) => s.panel);
  const open = view === "zone" && !!selected && panel;
  const [last, setLast] = useState<SeatId>("NW");
  if (selected && selected !== last) setLast(selected);
  const house = houseById(selected);
  return (
    <aside
      className={"panel" + (open ? " open" : "")}
      aria-hidden={!open}
      aria-label={open ? nameOf(last) : undefined}
    >
      <button className="close" onClick={() => setPanel(false)} data-hot>
        CLOSE ✕
      </button>
      {open && (house ? <HousePanel h={house} /> : <SeatPanel />)}
    </aside>
  );
}

const ICON = {
  width: 30,
  height: 30,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.2,
  strokeLinejoin: "round" as const,
  strokeLinecap: "round" as const,
  "aria-hidden": true,
};
/** a folded map — lay the plate flat */
const MapIcon = () => (
  <svg {...ICON}>
    <path d="M3 6.5 9 4.5l6 2 6-2v13l-6 2-6-2-6 2z" />
    <path d="M9 4.5v13M15 6.5v13" />
  </svg>
);
/** hills in perspective — back to the aerial view */
const AerialIcon = () => (
  <svg {...ICON}>
    <path d="M2 19 8.5 9.5l3.5 5 3-4 7 8.5z" />
    <path d="M8.5 9.5 7 12M15 10.5l-1 2" />
    <circle cx="18" cy="5.5" r="1.6" />
  </svg>
);
const BarsIcon = () => (
  <svg {...ICON}>
    <path d="M3 7h18M7 12h14M3 17h18" />
  </svg>
);

export function Hud() {
  const view = useStore((s) => s.view);
  const menu = useStore((s) => s.menu);
  const credits = useStore((s) => s.credits);
  return (
    <div className="hud">
      <Labels />
      <HoverTitle />
      <ZoneTitle />
      <div className="hud-top">
        <div className="hud-left">
          {view === "zone" && (
            <button className="back rise" onClick={() => select(null)} data-hot>
              ← all Houses
            </button>
          )}
        </div>
        <div className="mark rise">
          <small>SIX HOUSES · ONE SEAT</small>
          The Game of Zones
        </div>
        <div className="tools rise">
          <ThemeToggle />
          <button
            className="tool"
            onClick={togglePlate}
            data-hot
            data-tip={view === "plate" ? "Aerial view" : "Flat map"}
            aria-label={view === "plate" ? "Aerial view" : "Flat map"}
          >
            {view === "plate" ? <AerialIcon /> : <MapIcon />}
          </button>
          <button
            className="tool"
            onClick={() => store.setState({ menu: true })}
            data-hot
            data-tip="Menu"
            aria-label="Menu"
          >
            <BarsIcon />
          </button>
        </div>
      </div>
      <Panel />
      {menu && <Menu />}
      {credits && <Credits />}
    </div>
  );
}
