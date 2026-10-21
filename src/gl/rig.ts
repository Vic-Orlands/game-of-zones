import * as THREE from "three";
import gsap from "gsap";
import { heightAt, lonLatToWorld } from "../data/geo";

// The camera is a small orbit rig — target on the ground, distance, tilt (polar) and heading (azimuth).
// Flights between views tween every term together and add a hop to the distance, so the camera rises off the
// plate before it dives, like a hand lifting a lens.

export type RigState = {
  tx: number;
  tz: number;
  dist: number;
  polar: number;
  az: number;
  /** height of the look-at point above the ground (to face a standing sigil) */
  ly?: number;
};

export const rig = {
  cur: { tx: 0.2, tz: 0.8, dist: 30, polar: 0.5, az: 0 } as RigState,
  /** user offsets layered on top (drag / wheel); `user` eases toward `userT` */
  user: { az: 0, polar: 0, zoom: 1 },
  userT: { az: 0, polar: 0, zoom: 1 },
  spin: 0, // auto-rotation speed (rad/s)
  drift: 1, // idle sway amount
  flying: false,
  /** picture shift, as a fraction of the viewport */
  shift: 0,
  shiftY: 0,
  tween: null as gsap.core.Tween | null,
  // eased internals
  _spin: 0,
  _sway: 0,
  _gy: NaN,
};

// distance at which the whole country (~12.5 units wide) fits across a narrow screen
const fitWidth = (base: number, k = 1) =>
  Math.max(
    base,
    (12.8 * k) /
      (2 * Math.tan((16 * Math.PI) / 180) * (innerWidth / innerHeight)),
  );

const portrait = () => innerWidth < innerHeight;

export const VIEWS = {
  // on a portrait phone the country is seen more from above and fills the width edge to edge
  aerial: (): RigState => ({
    tx: portrait() ? 0.05 : 0.25,
    tz: portrait() ? 0.35 : 0.9,
    dist: portrait() ? fitWidth(6, 1.02) : fitWidth(14.5, 0.95),
    polar: portrait() ? 0.42 : 0.86,
    az: 0,
  }),
  plate: (): RigState => ({
    tx: 0.0,
    tz: -0.3,
    dist: portrait() ? fitWidth(8, 1.06) : fitWidth(19.5),
    polar: 0.0001,
    az: 0,
  }),
  intro: (): RigState => ({
    tx: -1.6,
    tz: 1.3,
    dist: 5.2,
    polar: 1.02,
    az: -0.5,
  }),
  /** standing in the landscape, facing a sigil */
  ground: (lon: number, lat: number, dist = 1.75): RigState => {
    const w = lonLatToWorld(lon, lat);
    return {
      tx: w.x,
      tz: w.z,
      dist,
      polar: 1.36,
      az: rig.cur.az + rig.user.az + 0.35,
      ly: dist * 0.075,
    };
  },
  zone: (lon: number, lat: number, dist = 3.4): RigState => {
    const w = lonLatToWorld(lon, lat);
    return {
      tx: w.x,
      tz: w.z,
      dist,
      polar: 1.1,
      az: rig.cur.az + rig.user.az,
    };
  },
};

export function flyTo(
  to: RigState,
  opts: {
    duration?: number;
    hop?: number;
    spin?: number;
    /** pass over this distance/tilt on the way: fly in high, then sink to the target */
    via?: { dist: number; polar: number };
    onDone?: () => void;
  } = {},
) {
  rig.tween?.kill();
  const from = { ...rig.cur };
  // fold the user's orbit into the base so nothing jumps
  from.az += rig.user.az;
  from.polar += rig.user.polar;
  from.dist *= rig.user.zoom;
  rig.cur = { ...from };
  rig.user = { az: 0, polar: 0, zoom: 1 };
  rig.userT = { az: 0, polar: 0, zoom: 1 };
  // shortest way round
  let da = to.az - from.az;
  da = Math.atan2(Math.sin(da), Math.cos(da));
  const target = { ...to, az: from.az + da, ly: to.ly ?? 0 };
  const fromLy = from.ly ?? 0;
  const hop =
    opts.hop ?? Math.min(6, Math.hypot(to.tx - from.tx, to.tz - from.tz) * 0.6);
  const p = { t: 0 };
  rig.flying = true;
  rig.spin = 0;
  const via = opts.via;
  // smootherstep over a slice of the timeline, so overlapping stages hand over without a stop
  const seg = (t: number, a: number, b: number) => {
    const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
    return x * x * x * (x * (x * 6 - 15) + 10);
  };
  rig.tween = gsap.to(p, {
    t: 1,
    duration: opts.duration ?? 2.4,
    ease: via ? "none" : "power3.inOut",
    onUpdate: () => {
      if (via) {
        const t = p.t;
        const L = (a: number, b: number, k: number) => a + (b - a) * k;
        // travel across the map and arrive high over the sigil…
        const kp = seg(t, 0, 0.58);
        rig.cur.tx = L(from.tx, target.tx, kp);
        rig.cur.tz = L(from.tz, target.tz, kp);
        // …then glide down to stand in front of it
        rig.cur.dist =
          L(
            L(from.dist, via.dist, seg(t, 0, 0.5)),
            target.dist,
            seg(t, 0.42, 1),
          ) +
          Math.sin(Math.PI * kp) * hop;
        rig.cur.polar = L(
          L(from.polar, via.polar, seg(t, 0, 0.45)),
          target.polar,
          seg(t, 0.42, 1),
        );
        rig.cur.az = L(from.az, target.az, seg(t, 0.05, 1));
        rig.cur.ly = L(fromLy, target.ly, seg(t, 0.45, 1));
        return;
      }
      const k = p.t;
      const l = (a: number, b: number) => a + (b - a) * k;
      rig.cur.tx = l(from.tx, target.tx);
      rig.cur.tz = l(from.tz, target.tz);
      rig.cur.dist = l(from.dist, target.dist) + Math.sin(Math.PI * k) * hop;
      rig.cur.polar = l(from.polar, target.polar);
      rig.cur.az = l(from.az, target.az);
      rig.cur.ly = l(fromLy, target.ly);
    },
    onComplete: () => {
      rig.flying = false;
      rig.spin = opts.spin ?? 0;
      opts.onDone?.();
    },
  });
}

/** Ground height averaged over a small disc, so the look-at point glides over hills instead of bumping. */
function groundAround(x: number, z: number, r = 0.35) {
  let s = heightAt(x, z) * 2;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    s += heightAt(x + Math.cos(a) * r, z + Math.sin(a) * r);
  }
  return s / 10;
}

const tmp = new THREE.Vector3();
export function applyRig(
  cam: THREE.PerspectiveCamera,
  t: number,
  dt: number,
  w = 1,
  h = 1,
) {
  if (Math.abs(rig.shift) + Math.abs(rig.shiftY) > 1e-4)
    cam.setViewOffset(w, h, rig.shift * w, rig.shiftY * h, w, h);
  else if (cam.view?.enabled) cam.clearViewOffset();
  const ease = (rate: number) => 1 - Math.exp(-dt * rate);
  // user input, damped
  const u = rig.user;
  const ut = rig.userT;
  u.az += (ut.az - u.az) * ease(7);
  u.polar += (ut.polar - u.polar) * ease(7);
  u.zoom += (ut.zoom - u.zoom) * ease(6);
  // spin and sway fade in and out instead of switching
  rig._spin += ((rig.flying ? 0 : rig.spin) - rig._spin) * ease(0.8);
  rig._sway += ((rig.flying ? 0 : rig.drift) - rig._sway) * ease(0.6);
  const c = rig.cur;
  c.az += rig._spin * dt;
  const sway = rig._sway;
  const az = c.az + u.az + Math.sin(t * 0.11) * 0.05 * sway;
  const polar = THREE.MathUtils.clamp(
    c.polar + u.polar + Math.sin(t * 0.07) * 0.02 * sway,
    0.0001,
    1.45,
  );
  const dist = c.dist * u.zoom;
  const g = groundAround(c.tx, c.tz);
  rig._gy = Number.isNaN(rig._gy) ? g : rig._gy + (g - rig._gy) * ease(3);
  const gy = rig._gy + (c.ly ?? 0);
  tmp.set(
    c.tx + Math.sin(az) * Math.sin(polar) * dist,
    gy + Math.cos(polar) * dist,
    c.tz + Math.cos(az) * Math.sin(polar) * dist,
  );
  // never dip under the ground (with a soft margin rather than a hard clamp)
  const floor = groundAround(tmp.x, tmp.z, 0.5) + Math.min(0.35, dist * 0.06);
  if (tmp.y < floor) tmp.y = floor;
  cam.position.copy(tmp);
  // top-down needs an explicit up so north stays up
  cam.up.set(
    polar < 0.01 ? -Math.sin(az) : 0,
    polar < 0.01 ? 0 : 1,
    polar < 0.01 ? -Math.cos(az) : 0,
  );
  cam.lookAt(c.tx, gy, c.tz);
}
