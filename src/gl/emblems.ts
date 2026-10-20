import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { SeatId } from "../data/houses";

// Each House's sigil is cast as a bronze medallion: a lathed coin with a beaded rim and a sculpted figure in
// high relief. Everything is built from code — lathes, extrusions, tubes and displaced surfaces — so there is
// nothing to download, and the same geometry serves the small markers on the map and the large turntable.
// Faces +z, radius 1.

type Parts = {
  field: THREE.BufferGeometry[];
  relief: THREE.BufferGeometry[];
  /** white enamel (the Seat's flag band) */
  accent?: THREE.BufferGeometry[];
  /** patinated bronze set into a non-bronze field (the Seat's rock) */
  bronze?: THREE.BufferGeometry[];
};

const V = (x: number, y: number) => new THREE.Vector2(x, y);

function coin(): Parts {
  // profile from the centre outwards: recessed field, inner step, raised rim, back
  const prof = [
    V(0, -0.1),
    V(0.98, -0.1),
    V(1.0, -0.07),
    V(1.0, 0.06),
    V(0.985, 0.1),
    V(0.93, 0.105),
    V(0.9, 0.08),
    V(0.86, 0.055),
    V(0.84, 0.035),
    V(0, 0.035),
  ];
  const body = new THREE.LatheGeometry(prof, 128);
  body.rotateX(Math.PI / 2);
  // beaded ring
  const beads: THREE.BufferGeometry[] = [];
  const N = 54;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const b = new THREE.SphereGeometry(0.028, 10, 8);
    b.scale(1, 1, 0.8);
    b.translate(Math.cos(a) * 0.79, Math.sin(a) * 0.79, 0.045);
    beads.push(b);
  }
  return { field: [body], relief: beads };
}

const extrude = (
  shape: THREE.Shape | THREE.Shape[],
  depth: number,
  bevel: number,
  z = 0.035,
) => {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.9,
    bevelSegments: 6,
    curveSegments: 48,
  });
  g.translate(0, 0, z);
  return g;
};

const tube = (pts: THREE.Vector3[], r: number, seg = 64, closed = false) =>
  new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(pts, closed),
    seg,
    r,
    10,
    closed,
  );

const smoothShape = (pts: [number, number][], scale = 1, dx = 0, dy = 0) => {
  const s = new THREE.Shape();
  const v = pts.map(([x, y]) => V(x * scale + dx, y * scale + dy));
  s.moveTo(v[0].x, v[0].y);
  s.splineThru([...v.slice(1), v[0]]);
  return s;
};

// ---------------------------------------------------------------- NW: Durbar horse
function horse(): Parts {
  const head = smoothShape(
    [
      [0.12, 0.66], // fore ear tip
      [0.04, 0.44],
      [-0.08, 0.34],
      [-0.26, 0.12],
      [-0.42, -0.1],
      [-0.52, -0.24], // muzzle
      [-0.5, -0.36],
      [-0.4, -0.42],
      [-0.3, -0.38], // lip
      [-0.24, -0.4],
      [-0.12, -0.36], // chin
      [0.0, -0.26],
      [0.06, -0.22], // throat latch
      [0.1, -0.36],
      [0.13, -0.56],
      [0.16, -0.66], // chest
      [0.56, -0.66],
      [0.56, -0.4],
      [0.5, -0.06],
      [0.4, 0.22], // crest of the neck
      [0.27, 0.44],
      [0.25, 0.68], // back ear tip
      [0.18, 0.5],
    ],
    1,
    0.02,
    0.02,
  );
  const relief: THREE.BufferGeometry[] = [extrude(head, 0.1, 0.05)];
  // bridle: brow band, nose band, cheek strap, reins
  relief.push(
    tube(
      [
        new THREE.Vector3(0.02, 0.36, 0.2),
        new THREE.Vector3(0.16, 0.3, 0.22),
        new THREE.Vector3(0.3, 0.34, 0.2),
      ],
      0.022,
    ),
    tube(
      [
        new THREE.Vector3(-0.42, -0.16, 0.2),
        new THREE.Vector3(-0.32, -0.2, 0.23),
        new THREE.Vector3(-0.2, -0.24, 0.2),
      ],
      0.022,
    ),
    tube(
      [
        new THREE.Vector3(0.12, 0.32, 0.22),
        new THREE.Vector3(-0.04, 0.0, 0.24),
        new THREE.Vector3(-0.26, -0.2, 0.22),
      ],
      0.018,
    ),
    tube(
      [
        new THREE.Vector3(-0.3, -0.22, 0.22),
        new THREE.Vector3(-0.1, -0.5, 0.25),
        new THREE.Vector3(0.3, -0.62, 0.2),
      ],
      0.016,
    ),
  );
  // the Durbar headdress: a fan plume and a fringe of tassels down the neck
  for (let i = 0; i < 9; i++) {
    const a = 0.25 + (i / 8) * 1.4;
    const r = 0.22 + (i % 2) * 0.05;
    const c = new THREE.ConeGeometry(0.035, r, 8);
    c.translate(0, r / 2, 0);
    c.rotateZ(a - Math.PI / 2 + 0.4);
    c.translate(0.16, 0.56, 0.17);
    relief.push(c);
  }
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const x = THREE.MathUtils.lerp(0.33, 0.55, t);
    const y = THREE.MathUtils.lerp(0.34, -0.42, t);
    const s = new THREE.SphereGeometry(0.045, 10, 8);
    s.scale(0.8, 1.2, 0.7);
    s.translate(x, y, 0.2);
    relief.push(s);
  }
  // eye
  const eye = new THREE.SphereGeometry(0.04, 16, 12);
  eye.scale(1.3, 0.8, 0.6);
  eye.translate(-0.06, 0.16, 0.22);
  relief.push(eye);
  // nostril
  const nos = new THREE.TorusGeometry(0.03, 0.01, 6, 16);
  nos.translate(-0.43, -0.26, 0.2);
  relief.push(nos);
  return { field: [], relief };
}

// ---------------------------------------------------------------- NE: camel
function camel(): Parts {
  const body = smoothShape(
    [
      [-0.5, 0.12],
      [-0.56, -0.04],
      [-0.53, -0.02],
      [-0.48, -0.1],
      [-0.45, -0.3],
      [-0.47, -0.52],
      [-0.4, -0.52],
      [-0.37, -0.3],
      [-0.33, -0.15],
      [-0.2, -0.13],
      [-0.04, -0.14],
      [0.08, -0.16],
      [0.11, -0.32],
      [0.1, -0.52],
      [0.17, -0.52],
      [0.19, -0.3],
      [0.21, -0.1],
      [0.29, 0.0],
      [0.38, 0.06],
      [0.45, 0.18],
      [0.48, 0.32],
      [0.58, 0.33],
      [0.65, 0.37],
      [0.63, 0.43],
      [0.53, 0.47],
      [0.47, 0.51],
      [0.43, 0.45],
      [0.39, 0.3],
      [0.31, 0.16],
      [0.2, 0.19],
      [0.08, 0.37],
      [-0.1, 0.44],
      [-0.28, 0.33],
      [-0.42, 0.18],
    ],
    1.05,
    -0.02,
    0.05,
  );
  const relief: THREE.BufferGeometry[] = [extrude(body, 0.09, 0.045)];
  // the far legs, set back a little
  const far = smoothShape(
    [
      [-0.32, -0.16],
      [-0.33, -0.52],
      [-0.27, -0.52],
      [-0.25, -0.18],
    ],
    1.05,
    -0.02,
    0.05,
  );
  const far2 = smoothShape(
    [
      [0.0, -0.16],
      [-0.02, -0.52],
      [0.05, -0.52],
      [0.06, -0.18],
    ],
    1.05,
    -0.02,
    0.05,
  );
  relief.push(extrude([far, far2], 0.05, 0.025, 0.02));
  // saddle cloth with fringe
  const cloth = smoothShape(
    [
      [-0.24, 0.3],
      [0.02, 0.36],
      [0.08, 0.12],
      [-0.06, 0.02],
      [-0.26, 0.06],
    ],
    1.05,
    -0.02,
    0.05,
  );
  relief.push(extrude(cloth, 0.05, 0.02, 0.15));
  for (let i = 0; i < 7; i++) {
    const x = THREE.MathUtils.lerp(-0.27, 0.05, i / 6);
    const c = new THREE.ConeGeometry(0.018, 0.08, 6);
    c.rotateZ(Math.PI);
    c.translate(x, 0.04 + Math.sin(i) * 0.01, 0.2);
    relief.push(c);
  }
  // dune ridges and a low sun
  for (let k = 0; k < 3; k++) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 20; i++) {
      const x = -0.52 + (i / 20) * 1.04;
      pts.push(
        new THREE.Vector3(
          x,
          -0.6 - k * 0.07 + Math.sin(x * 3 + k) * 0.03,
          0.06,
        ),
      );
    }
    relief.push(tube(pts, 0.014 - k * 0.002));
  }
  const sun = new THREE.CylinderGeometry(0.11, 0.11, 0.04, 40);
  sun.rotateX(Math.PI / 2);
  sun.translate(-0.42, 0.5, 0.06);
  relief.push(sun);
  return { field: [], relief };
}

// ---------------------------------------------------------------- NC: the confluence
function confluence(): Parts {
  // centre lines of the two rivers and the joined stream (a Y)
  const niger = [V(-0.6, 0.55), V(-0.38, 0.32), V(-0.12, 0.12), V(0, -0.02)];
  const benue = [V(0.62, 0.42), V(0.4, 0.3), V(0.16, 0.12), V(0, -0.02)];
  const joined = [V(0, -0.02), V(-0.03, -0.3), V(0.04, -0.62)];
  const ribbon = (pts: THREE.Vector2[], w0: number, w1: number) => {
    const c = new THREE.SplineCurve(pts);
    const n = 48;
    const L: THREE.Vector2[] = [];
    const R: THREE.Vector2[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = c.getPoint(t);
      const d = c.getTangent(t);
      const w = THREE.MathUtils.lerp(w0, w1, t);
      L.push(V(p.x - d.y * w, p.y + d.x * w));
      R.push(V(p.x + d.y * w, p.y - d.x * w));
    }
    return new THREE.Shape([...L, ...R.reverse()]);
  };
  const relief: THREE.BufferGeometry[] = [
    extrude(ribbon(niger, 0.06, 0.1), 0.06, 0.03),
    extrude(ribbon(benue, 0.05, 0.09), 0.06, 0.03),
    extrude(ribbon(joined, 0.13, 0.15), 0.06, 0.03),
  ];
  // waves riding each river
  const waves = (pts: THREE.Vector2[], amp: number, z: number) => {
    const c = new THREE.SplineCurve(pts);
    const out: THREE.Vector3[] = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const p = c.getPoint(t);
      const d = c.getTangent(t);
      const s = Math.sin(t * Math.PI * 9) * amp;
      out.push(new THREE.Vector3(p.x - d.y * s, p.y + d.x * s, z));
    }
    return tube(out, 0.014, 120);
  };
  relief.push(
    waves(niger, 0.03, 0.17),
    waves(benue, 0.025, 0.17),
    waves(joined, 0.06, 0.17),
  );
  // banks: raised land masses either side with ploughed furrows (the food basket)
  for (let k = 0; k < 5; k++) {
    const y = -0.1 - k * 0.11;
    relief.push(
      tube(
        [
          new THREE.Vector3(-0.62 + k * 0.04, y, 0.06),
          new THREE.Vector3(-0.38, y + 0.03, 0.07),
          new THREE.Vector3(-0.2, y - 0.02, 0.06),
        ],
        0.016,
        24,
      ),
    );
    relief.push(
      tube(
        [
          new THREE.Vector3(0.2, y - 0.02, 0.06),
          new THREE.Vector3(0.4, y + 0.03, 0.07),
          new THREE.Vector3(0.62 - k * 0.04, y, 0.06),
        ],
        0.016,
        24,
      ),
    );
  }
  // a star where the waters meet
  const star = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 ? 0.05 : 0.12;
    const p = V(Math.cos(a) * r, Math.sin(a) * r + 0.42);
    if (i === 0) star.moveTo(p.x, p.y);
    else star.lineTo(p.x, p.y);
  }
  relief.push(extrude(star, 0.05, 0.02));
  return { field: [], relief };
}

// ---------------------------------------------------------------- SW: talking drum
function drum(): Parts {
  const prof: THREE.Vector2[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const y = -0.5 + t;
    const r = 0.13 + 0.15 * Math.pow(Math.abs(t - 0.5) * 2, 2.4);
    prof.push(V(r, y));
  }
  const body = new THREE.LatheGeometry(prof, 48);
  const relief: THREE.BufferGeometry[] = [body];
  // heads and hoops
  for (const y of [-0.5, 0.5]) {
    const head = new THREE.CylinderGeometry(0.3, 0.3, 0.025, 48);
    head.translate(0, y, 0);
    const hoop = new THREE.TorusGeometry(0.3, 0.022, 10, 48);
    hoop.rotateX(Math.PI / 2);
    hoop.translate(0, y, 0);
    relief.push(head, hoop);
  }
  // tension cords run head to head; they are what the drummer squeezes
  const N = 28;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const a2 = a + 0.18;
    const pts = [
      new THREE.Vector3(Math.cos(a) * 0.3, 0.5, Math.sin(a) * 0.3),
      new THREE.Vector3(
        Math.cos(a + 0.09) * 0.16,
        0,
        Math.sin(a + 0.09) * 0.16,
      ),
      new THREE.Vector3(Math.cos(a2) * 0.3, -0.5, Math.sin(a2) * 0.3),
    ];
    relief.push(tube(pts, 0.008, 16));
  }
  // the hand grip band
  const band = new THREE.TorusGeometry(0.17, 0.02, 8, 40);
  band.rotateX(Math.PI / 2);
  relief.push(band);
  const g = mergeGeometries(relief.map((x) => x.toNonIndexed()));
  g.rotateZ(-0.95);
  g.scale(0.92, 0.92, 0.92);
  g.translate(-0.04, 0.0, 0.3);
  // the hooked stick
  const stick = tube(
    [
      new THREE.Vector3(0.42, -0.52, 0.28),
      new THREE.Vector3(0.3, -0.22, 0.4),
      new THREE.Vector3(0.28, 0.06, 0.46),
      new THREE.Vector3(0.36, 0.16, 0.48),
      new THREE.Vector3(0.43, 0.1, 0.46),
    ],
    0.022,
    48,
  );
  return { field: [], relief: [g, stick] };
}

// ---------------------------------------------------------------- SE: roped pot of Igbo-Ukwu
function pot(): Parts {
  const profPts = [
    V(0.0, -0.46),
    V(0.12, -0.46),
    V(0.2, -0.43),
    V(0.3, -0.33),
    V(0.36, -0.18),
    V(0.37, -0.02),
    V(0.33, 0.12),
    V(0.24, 0.24),
    V(0.15, 0.3),
    V(0.13, 0.36),
    V(0.15, 0.46),
    V(0.2, 0.5),
    V(0.19, 0.53),
    V(0.12, 0.5),
  ];
  const curve = new THREE.SplineCurve(profPts);
  const prof = curve.getPoints(60);
  const body = new THREE.LatheGeometry(prof, 64);
  const parts: THREE.BufferGeometry[] = [body];
  const radiusAt = (y: number) => {
    let best = prof[0];
    for (const p of prof)
      if (Math.abs(p.y - y) < Math.abs(best.y - y)) best = p;
    return best.x;
  };
  // a cord: a tube with a second strand wound around it
  const rope = (path: THREE.Vector3[], closed: boolean, r = 0.02) => {
    const c = new THREE.CatmullRomCurve3(path, closed);
    const out: THREE.BufferGeometry[] = [
      new THREE.TubeGeometry(c, 160, r, 8, closed),
    ];
    const frames = c.computeFrenetFrames(320, closed);
    const twist: THREE.Vector3[] = [];
    for (let i = 0; i <= 320; i++) {
      const t = i / 320;
      const p = c.getPointAt(t);
      const a = t * Math.PI * 2 * 26;
      const k = Math.min(i, 319);
      twist.push(
        p
          .clone()
          .addScaledVector(frames.normals[k], Math.cos(a) * r)
          .addScaledVector(frames.binormals[k], Math.sin(a) * r),
      );
    }
    out.push(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(twist, closed),
        640,
        r * 0.45,
        5,
        closed,
      ),
    );
    return out;
  };
  const ring = (y: number) => {
    const r = radiusAt(y) + 0.015;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    return rope(pts, true);
  };
  for (const y of [-0.3, -0.05, 0.18, 0.34]) parts.push(...ring(y));
  // meridian cords from shoulder to foot, knotted where they cross
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 16; i++) {
      const y = THREE.MathUtils.lerp(0.34, -0.42, i / 16);
      const r = radiusAt(y) + 0.02;
      pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    parts.push(...rope(pts, false, 0.017));
    for (const y of [-0.3, -0.05, 0.18]) {
      const r = radiusAt(y) + 0.035;
      const kn = new THREE.SphereGeometry(0.036, 10, 8);
      kn.translate(Math.cos(a) * r, y, Math.sin(a) * r);
      parts.push(kn);
    }
  }
  const g = mergeGeometries(parts.map((x) => (x.index ? x.toNonIndexed() : x)));
  g.scale(1.2, 1.2, 1.2);
  g.rotateX(0.18);
  g.translate(0, -0.02, 0.4);
  return { field: [], relief: [g] };
}

// ---------------------------------------------------------------- SS: ivory mask of Benin
function mask(): Parts {
  const g = new THREE.SphereGeometry(1, 96, 96, 0, Math.PI * 2, 0, Math.PI / 2);
  // hemisphere facing +z
  g.rotateX(Math.PI / 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  const bump = (
    x: number,
    y: number,
    cx: number,
    cy: number,
    sx: number,
    sy: number,
  ) => Math.exp(-(((x - cx) / sx) ** 2) - ((y - cy) / sy) ** 2);
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i);
    let y = p.getY(i);
    let z = p.getZ(i);
    // oval face, narrowing to the chin
    const taper = 1 - Math.max(0, -y) * 0.32;
    x *= 0.4 * taper;
    y *= 0.56;
    z *= 0.26;
    const u = x / 0.4;
    const v = y / 0.56;
    let dz = 0;
    dz += 0.11 * bump(u, v, 0, -0.05, 0.16, 0.34); // nose ridge
    dz += 0.05 * bump(u, v, 0, -0.33, 0.28, 0.1); // nostrils
    dz -= 0.07 * bump(u, v, -0.42, 0.17, 0.22, 0.1); // eye sockets
    dz -= 0.07 * bump(u, v, 0.42, 0.17, 0.22, 0.1);
    dz += 0.035 * bump(u, v, -0.42, 0.17, 0.16, 0.05); // lids
    dz += 0.035 * bump(u, v, 0.42, 0.17, 0.16, 0.05);
    dz += 0.05 * bump(u, v, 0, -0.56, 0.32, 0.07); // lips
    dz -= 0.02 * bump(u, v, 0, -0.56, 0.3, 0.015);
    dz -= 0.04 * bump(u, v, 0, 0.34, 0.6, 0.12); // brow line
    dz +=
      0.03 * bump(u, v, -0.8, -0.1, 0.1, 0.3) +
      0.03 * bump(u, v, 0.8, -0.1, 0.1, 0.3); // cheeks
    p.setXYZ(i, x, y, z + dz * (z > 0.02 ? 1 : 0));
  }
  g.computeVertexNormals();
  const face = g;
  face.translate(0, -0.08, 0.06);
  const relief: THREE.BufferGeometry[] = [face];
  // the two inlaid bars between the brows
  for (const x of [-0.035, 0.035]) {
    const b = new THREE.CapsuleGeometry(0.018, 0.14, 4, 8);
    b.translate(x, 0.24, 0.3);
    relief.push(b);
  }
  // crown: a lattice of tiny heads (as on the original masks) on two arcs
  for (let row = 0; row < 2; row++) {
    const R = 0.46 + row * 0.13;
    const n = 9 + row * 2;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (0.12 + (0.76 * i) / (n - 1));
      const hd = new THREE.SphereGeometry(0.055, 14, 10);
      hd.scale(0.85, 1, 0.75);
      hd.translate(
        Math.cos(a) * R * 0.92,
        Math.sin(a) * R * 0.8 + 0.08,
        0.22 - row * 0.05,
      );
      relief.push(hd);
      const beard = new THREE.ConeGeometry(0.03, 0.06, 6);
      beard.rotateZ(Math.PI);
      beard.translate(
        Math.cos(a) * R * 0.92,
        Math.sin(a) * R * 0.8 + 0.01,
        0.22 - row * 0.05,
      );
      relief.push(beard);
    }
  }
  // the coral-bead collar under the chin
  for (let row = 0; row < 3; row++) {
    const y = -0.66 - row * 0.065;
    const w = 0.24 + row * 0.06;
    const n = 9 + row * 2;
    for (let i = 0; i < n; i++) {
      const x = THREE.MathUtils.lerp(-w, w, i / (n - 1));
      const bd = new THREE.SphereGeometry(0.03, 10, 8);
      bd.translate(x, y - Math.cos((x / w) * 1.3) * -0.03, 0.14);
      relief.push(bd);
    }
  }
  return { field: [], relief };
}

// ---------------------------------------------------------------- FCT: the seat under Aso Rock
function seat(): Parts {
  // Aso Rock: a granite whaleback, steep-sided, streaked by rain
  const rock = new THREE.SphereGeometry(
    0.6,
    96,
    48,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
  rock.rotateX(Math.PI / 2);
  const p = rock.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const h = z / 0.6; // 0 at the base, 1 at the crown
    const streak =
      Math.sin(x * 46 + Math.sin(y * 7) * 2) * 0.012 * (1 - h * 0.6);
    const lump =
      Math.sin(x * 7 + y * 3) * 0.02 + Math.sin(y * 11 - x * 4) * 0.012;
    // flatten the crown and steepen the flanks
    const zz = Math.pow(Math.max(0, h), 0.55) * 0.22 + lump + streak;
    p.setXYZ(i, x * 1.3, y * 0.6 - 0.12 + (x < 0 ? x * 0.08 : 0), zz);
  }
  rock.computeVertexNormals();
  rock.translate(0, 0.02, 0.04);
  // chair of state in front of it
  const back = new THREE.Shape();
  back.moveTo(-0.17, -0.3);
  back.lineTo(-0.17, 0.32);
  back.quadraticCurveTo(-0.17, 0.46, 0, 0.5);
  back.quadraticCurveTo(0.17, 0.46, 0.17, 0.32);
  back.lineTo(0.17, -0.3);
  back.lineTo(0.13, -0.3);
  back.lineTo(0.13, -0.1);
  back.lineTo(-0.13, -0.1);
  back.lineTo(-0.13, -0.3);
  back.closePath();
  const chair = extrude(back, 0.06, 0.025, 0.28);
  chair.translate(0, -0.12, 0);
  const seatSlab = new THREE.BoxGeometry(0.42, 0.05, 0.18);
  seatSlab.translate(0, -0.2, 0.42);
  const legs: THREE.BufferGeometry[] = [];
  for (const x of [-0.18, 0.18]) {
    const l = new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8);
    l.translate(x, -0.33, 0.48);
    legs.push(l);
  }
  // a band of white across the green field, as on the flag
  const band = new THREE.BoxGeometry(0.56, 1.5, 0.02);
  band.translate(0, 0, 0.045);
  return {
    field: [],
    relief: [chair, seatSlab, ...legs],
    accent: [band],
    bronze: [rock],
  };
}

const BUILDERS: Record<SeatId, () => Parts> = {
  NW: horse,
  NE: camel,
  NC: confluence,
  SW: drum,
  SE: pot,
  SS: mask,
  FCT: seat,
};

// ---------------------------------------------------------------- materials
function patina(m: THREE.MeshPhysicalMaterial, amount: number) {
  // darken the recesses and green them slightly, by object-space noise and depth below the rim
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uPatina = { value: amount };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vObjPos;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvObjPos = position;",
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vObjPos; uniform float uPatina;
float ph(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
float pn(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(ph(i),ph(i+vec3(1,0,0)),f.x),mix(ph(i+vec3(0,1,0)),ph(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(ph(i+vec3(0,0,1)),ph(i+vec3(1,0,1)),f.x),mix(ph(i+vec3(0,1,1)),ph(i+vec3(1,1,1)),f.x),f.y),f.z); }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
float pt = pn(vObjPos * 9.) * .6 + pn(vObjPos * 31.) * .4;
float recess = smoothstep(.12, -.05, vObjPos.z);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.19, .28, .22), uPatina * (pt * .5 + recess * .5) * .8);`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + uPatina * pt * .35, 0., 1.);`,
      );
  };
  return m;
}

export type EmblemMats = ReturnType<typeof createEmblemMaterials>;

/** One material set per renderer — an environment map can't be shared between WebGL contexts. */
export function createEmblemMaterials(env: THREE.Texture | null = null) {
  const m = {
    field: patina(
      new THREE.MeshPhysicalMaterial({
        color: "#8a5a2b",
        metalness: 1,
        roughness: 0.48,
      }),
      0.9,
    ),
    relief: patina(
      new THREE.MeshPhysicalMaterial({
        color: "#c99a55",
        metalness: 1,
        roughness: 0.26,
        clearcoat: 0.3,
        clearcoatRoughness: 0.4,
      }),
      0.35,
    ),
    seatField: new THREE.MeshPhysicalMaterial({
      color: "#0b6a40",
      metalness: 0.2,
      roughness: 0.25,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    }),
    enamel: new THREE.MeshPhysicalMaterial({
      color: "#f3efe4",
      metalness: 0,
      roughness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
    }),
    gold: new THREE.MeshPhysicalMaterial({
      color: "#e0b45c",
      metalness: 1,
      roughness: 0.2,
      clearcoat: 0.5,
    }),
  };
  if (env) for (const x of Object.values(m)) x.envMap = env;
  return m;
}

const MAP_MATS = createEmblemMaterials();
export const setEmblemEnv = (t: THREE.Texture) => {
  for (const m of Object.values(MAP_MATS)) {
    m.envMap = t;
    m.needsUpdate = true;
  }
};

// ---------------------------------------------------------------- assembly + cache
const cache = new Map<
  SeatId,
  {
    field: THREE.BufferGeometry;
    relief: THREE.BufferGeometry;
    accent?: THREE.BufferGeometry;
    bronze?: THREE.BufferGeometry;
  }
>();

const merge = (list: THREE.BufferGeometry[]) => {
  const flat = list.map((g) => {
    let x = g.index ? g.toNonIndexed() : g;
    // keep only the attributes all builders share
    for (const k of Object.keys(x.attributes))
      if (k !== "position" && k !== "normal") x.deleteAttribute(k);
    if (!x.attributes.normal) x.computeVertexNormals();
    x = x.clone();
    return x;
  });
  return mergeGeometries(flat)!;
};

/** Build (once) the geometry for a sigil. Cheap enough to call during the loader. */
export function forgeEmblem(id: SeatId) {
  const hit = cache.get(id);
  if (hit) return hit;
  const c = coin();
  const f = BUILDERS[id]();
  const out = {
    field: merge([...c.field, ...f.field]),
    relief: merge([...c.relief, ...f.relief]),
    accent: f.accent ? merge(f.accent) : undefined,
    bronze: f.bronze ? merge(f.bronze) : undefined,
  };
  cache.set(id, out);
  return out;
}

/** A fresh Object3D for a sigil, sharing geometry and materials. */
export function emblemObject(id: SeatId, MATS: EmblemMats = MAP_MATS) {
  const g = forgeEmblem(id);
  const grp = new THREE.Group();
  const isSeat = id === "FCT";
  const field = new THREE.Mesh(g.field, isSeat ? MATS.seatField : MATS.field);
  const relief = new THREE.Mesh(g.relief, isSeat ? MATS.gold : MATS.relief);
  grp.add(field, relief);
  if (g.accent) grp.add(new THREE.Mesh(g.accent, MATS.enamel));
  if (g.bronze) grp.add(new THREE.Mesh(g.bronze, MATS.relief));
  grp.traverse((o) => {
    (o as THREE.Mesh).castShadow = true;
  });
  return grp;
}
