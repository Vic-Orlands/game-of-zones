import gsap from "gsap";
import { store } from "./state";
import { flyTo, rig, VIEWS } from "./gl/rig";
import { fx } from "./gl/World";
import { HOUSES, THRONE, type SeatId } from "./data/houses";

// Every camera move and plate effect hangs off store changes, so buttons, the strip, clicks on the map and
// the keyboard all go through the same doors.

/** The seat (and sigil) of a House. */
const seatOf = (id: SeatId) =>
  id === "FCT" ? THRONE.seat : HOUSES.find((h) => h.id === id)!.seat;

/**
 * Fly to a House: travel across the map with its sigil centred, arrive high above it, then glide down to stand
 * in the landscape facing the sigil. The panel waits for "Discover".
 */
export function select(id: SeatId | null) {
  if (!id) {
    store.setState({
      selected: null,
      view: "aerial",
      hoverState: null,
      panel: false,
    });
    flyTo(VIEWS.aerial(), { duration: 2.6 });
    gsap.to(rig, { shift: 0, shiftY: 0, duration: 2, ease: "power3.inOut" });
    rig.drift = 1;
    return;
  }
  store.setState({
    selected: id,
    view: "zone",
    hover: null,
    hoverState: null,
    menu: false,
    panel: false,
  });
  const seat = seatOf(id);
  gsap.to(rig, { shift: 0, shiftY: 0, duration: 1.6, ease: "power3.inOut" });
  flyTo(VIEWS.ground(seat.lon, seat.lat), {
    duration: 4.6,
    via: { dist: 4.2, polar: 0.9 },
    spin: 0.022,
  });
  rig.drift = 0.5;
}

/** Open or close the House panel; the picture slides aside to keep the sigil in view. */
export function setPanel(open: boolean) {
  store.setState({ panel: open });
  const wide = window.innerWidth > 760;
  gsap.to(rig, {
    shift: open && wide ? 0.16 : 0,
    shiftY: open && !wide ? 0.22 : 0,
    duration: 1.4,
    ease: "power3.inOut",
  });
}

export function togglePlate() {
  const s = store.getState();
  if (s.view === "plate") {
    store.setState({ view: s.selected ? "zone" : "aerial" });
    if (s.selected) select(s.selected);
    else flyTo(VIEWS.aerial(), { duration: 2.2 });
  } else {
    store.setState({ view: "plate", hoverState: null });
    gsap.to(rig, { shift: 0, shiftY: 0, duration: 2, ease: "power3.inOut" });
    flyTo(VIEWS.plate(), { duration: 2.4, hop: 2 });
    rig.drift = 0;
  }
}

export function startDirector() {
  rig.cur = VIEWS.intro();
  rig.spin = 0.02;
  window.addEventListener("goz:select", (e) => {
    const d = (e as CustomEvent).detail as {
      id: SeatId | null;
      at?: { lon: number; lat: number } | null;
    };
    select(d.id);
  });
  window.addEventListener("keydown", (e) => {
    const s = store.getState();
    if (s.phase !== "map") return;
    if (e.key === "Escape") {
      if (s.credits || s.menu) store.setState({ credits: false, menu: false });
      else if (s.panel) setPanel(false);
      else if (s.selected || s.view === "plate") select(null);
    }
    if (e.key.toLowerCase() === "m" && !e.metaKey && !e.ctrlKey) togglePlate();
  });
  return store.subscribe((s, p) => {
    if (s.phase === "intro" && p.phase !== "intro") {
      rig.cur = VIEWS.intro();
      rig.spin = 0.02;
      fx.reveal.value = 1;
    }
    if (s.phase === "map" && p.phase !== "map") {
      // the sheet is wiped clean, then the engraving inks itself in as the camera lifts away
      fx.reveal.value = 0;
      gsap.to(fx.reveal, {
        value: 1,
        duration: 3.4,
        ease: "power2.inOut",
        delay: 0.2,
      });
      flyTo(VIEWS.aerial(), { duration: 3.6, hop: 4 });
    }
  });
}
