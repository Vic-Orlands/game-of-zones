import * as THREE from "three";
import { geo, EXAG, lonLatToWorld } from "../data/geo";
import { CAPITALS } from "../data/capitals";

// One shader draws the whole map as an engraving: light becomes cross-hatching whose strokes swell in shadow,
// heights become contour lines, the coast gets the old engraver's echo lines, vegetation is stamped as tree
// crowns whose density follows the real belts (mangrove → rainforest → savanna → Sahel), and the zones carry a
// hand-laid watercolour wash along their edges. Hatch and glyphs pick their spacing from the screen footprint,
// so the plate stays crisp from the whole-country view down to a single valley.

export const PALETTE = {
  paper: "#ffffff",
  ink: "#24252f",
  water: "#21436f",
  accent: "#0b7a4b",
  gold: "#a8741f",
};

export const ZONE_TINT: Record<number, string> = {
  1: "#c9963c", // NW ochre
  2: "#b5643b", // NE burnt sienna
  3: "#7d9a4a", // NC sap green
  4: "#4f6fa3", // SW indigo
  5: "#9c4f5c", // SE madder
  6: "#3f8a86", // SS teal
  7: "#0b7a4b", // the seat
};

const vert = /* glsl */ `
varying vec2 vUv;
varying vec3 vW;
varying vec3 vN;
varying float vH;
uniform float uExag;
void main(){
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(normal);
  vH = position.y / uExag;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const frag = /* glsl */ `
precision highp float;
uniform sampler2D uInk, uInk2, uIds, uFields;
uniform float uTime, uHover, uSel, uFocus, uPlate, uReveal, uHoverState, uSelState;
uniform float uPact[8];
uniform vec3 uTint[8];
uniform vec3 uPaper, uInkCol, uWater, uAccent, uGold, uCam;
uniform vec4 uBox; // lon0 lon1 lat0 lat1
uniform float uDebug;
uniform float uViewDist;
uniform float uGround;
uniform float uDark;

// Night: flip lightness but keep hue (invert Y in YIQ), so pale paper turns to a dark sheet, ink turns pale and
// the zone washes, water and greens keep their colour. Done in display (sRGB) space, so mid-tones invert evenly.
vec3 toSrgb(vec3 c){ c = max(c, 0.); return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c)); }
vec3 toLin(vec3 c){ return mix(c / 12.92, pow((c + .055) / 1.055, vec3(2.4)), step(.04045, c)); }
vec3 night(vec3 lin){
  if (uDark < .001) return lin;
  vec3 c = toSrgb(lin);
  float y = dot(c, vec3(.299, .587, .114));
  float i = dot(c, vec3(.596, -.274, -.322));
  float q = dot(c, vec3(.211, -.523, .312));
  // the near-white paper (mottle, vignette, fades) all lands on the page's own black, so the sheet has no edge
  y = .9 * smoothstep(.05, 1., 1. - y);
  vec3 d = vec3(y + .956 * i + .621 * q, y - .272 * i - .647 * q, y - 1.106 * i + 1.703 * q);
  const vec3 sheet = vec3(13., 16., 15.) / 255.; // --paper in dark mode
  d = sheet + clamp(d, 0., 1.) * (1. - sheet);
  return mix(lin, toLin(d), uDark);
}
uniform vec2 uTowns[37];
varying vec2 vUv;
varying vec3 vW;
varying vec3 vN;
varying float vH;

float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y); }
float fbm3(vec2 p){ return vnoise(p) * .55 + vnoise(p * 2.03 + 7.1) * .3 + vnoise(p * 4.1 + 3.7) * .15; }

// Every line below takes its pixel footprint (fw) from outside any branch, so derivatives stay valid
// inside the branches that skip work the pixel doesn't need.

// box-filtered coverage: lines thinner than a pixel fade instead of popping
float lineC(float t, float w, float fw){
  float d = abs(fract(t + .5) - .5);
  fw = max(fw, 1e-5) * .75;
  float c = clamp((min(d + fw, w) - max(d - fw, -w)) / (2. * fw), 0., 1.);
  return c * (1. - smoothstep(.3, .6, fw));
}
// line of constant on-screen width (px)
float linePx(float t, float wpx, float fw){
  float d = abs(fract(t + .5) - .5);
  fw = max(fw, 1e-5);
  return (1. - smoothstep(wpx - .6, wpx + .6, d / fw)) * (1. - smoothstep(.25, .5, fw));
}

vec2 dPx, dPy; // screen derivatives of the map position
float fwDir(vec2 dir){ return abs(dot(dPx, dir)) + abs(dot(dPy, dir)); }

// hatch whose spacing follows the pixel footprint, so strokes never alias into grey
float hatch(vec2 P, vec2 dir, float fwd, float targetPx, float w, float wob){
  float lv = log2(1. / (targetPx * max(fwd, 1e-6)));
  float f0 = exp2(floor(lv));
  float k = smoothstep(0., 1., fract(lv));
  float t = dot(P, dir) + wob / f0;
  return mix(lineC(t * f0, w, fwd * f0), lineC(t * f0 * 2., w, fwd * f0 * 2.), k);
}

// tree crowns in a jittered grid: a ring, a shaded south-east half; writes a paper mask under each crown
float trees(vec2 P, float cs, float dens, float pxc, out float crown){
  vec2 g = P / cs; vec2 id = floor(g); vec2 f = fract(g);
  float ink = 0.; crown = 0.;
  float lw = max(pxc * .8, .035);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    vec2 o = vec2(float(i), float(j));
    vec2 cid = id + o;
    float h = hash12(cid);
    if (h > dens) continue;
    vec2 d = f - (o + .5 + (hash22(cid) - .5) * 1.1);
    float r = .22 + .12 * hash12(cid + 7.3);
    float dist = length(d);
    float inside = 1. - smoothstep(r - pxc, r + pxc, dist);
    float ring = 1. - smoothstep(lw - pxc, lw + pxc, abs(dist - r));
    float sh = inside * step(.15 * r, (d.x + d.y) * .7071) * lineC((f.x - f.y) * 7., .2, pxc * 7.);
    ink = max(ink, max(ring, sh));
    crown = max(crown, inside);
  }
  return ink;
}

// a town: a knot of small blocks with shadowed sides and a few roads leaving it
float town(vec2 P, vec2 c, float px, out float mask){
  mask = 0.;
  vec2 d = P - c;
  float R = .085;
  float ink = 0.;
  float h = hash12(c * 13.1);
  for (int k = 0; k < 4; k++){
    float ang = h * 6.283 + float(k) * 1.57 + sin(float(k) * 3.1) * .4;
    vec2 dir = vec2(cos(ang), sin(ang));
    float along = dot(d, dir);
    float off = abs(dot(d, vec2(-dir.y, dir.x)) + sin(along * 60.) * .004);
    float road = (1. - smoothstep(px * .5, px * 1.2, off)) * step(R * .6, along) * (1. - smoothstep(R * 2., R * 4., along));
    ink = max(ink, road * .55);
  }
  float cs = .014;
  vec2 g = P / cs; vec2 id = floor(g); vec2 f = fract(g);
  float hb = hash12(id + c);
  float dens = 1. - smoothstep(R * .3, R, length((id + .5) * cs - c) + (hb - .5) * .02);
  if (hb < dens * .85){
    vec2 q = abs(f - .5);
    float sz = .26 + .14 * hash12(id + 3.1);
    float box = step(max(q.x, q.y), sz);
    float edge = box * (1. - step(max(q.x, q.y), sz - px / cs * 1.1));
    float shade = box * step(.5, f.x) * lineC((f.x - f.y) * 5., .2, px / cs * 7.);
    ink = max(ink, max(edge, shade));
    mask = box * smoothstep(2.5, 5., cs / px) * (1. - smoothstep(10., 18., cs / px));
  }
  // legible from mid-distance; up close the blocks would turn into big loose squares
  return ink * smoothstep(2.5, 5., cs / px) * (1. - smoothstep(10., 18., cs / px));
}

void main(){
  vec2 uv = vUv;
  vec2 P = vW.xz;
  dPx = dFdx(P);
  dPy = dFdy(P);
  float px = max(length(fwidth(P)) * .7071, 1e-5); // world units per pixel

  vec4 fld = texture2D(uFields, uv);
  float ocean = step(.002, fld.r);
  float inNg = smoothstep(.49, .51, fld.g);
  float outFade = smoothstep(.12, .5, fld.g); // fades the neighbours out with distance

  // how much of the engraving shows here at all; most of the off-country sheet is just paper
  float far = max(mix(.22 * outFade, 1., inNg), ocean * .9);
  float dcam = length(vW - uCam);
  // haze relative to the current view, so a far-back phone camera isn't washed out
  far *= 1. - smoothstep(uViewDist * .7, uViewDist * 1.6, dcam) * .55;
  float edge = min(min(uv.x, 1. - uv.x), min(uv.y, 1. - uv.y));
  far *= smoothstep(.0, .05 + vnoise(P * 3.) * .04, edge);
  if (uReveal < .999){
    // ink spreading across the plate on arrival
    float rv = smoothstep(uReveal * 1.35 - .3, uReveal * 1.35, fbm3(P * .9) * .55 + length(uv - .5) * .9);
    far *= 1. - rv;
  }
  if (far < .004 && uDebug < .5){
    gl_FragColor = linearToOutputTexel(vec4(night(uPaper), 1.));
    return;
  }

  float lon = mix(uBox.x, uBox.y, uv.x);
  float lat = mix(uBox.z, uBox.w, uv.y);
  vec4 ink = texture2D(uInk, uv);
  vec4 ink2 = texture2D(uInk2, uv);
  vec4 idt = texture2D(uIds, uv);
  float zone = floor(idt.r * 255. / 30. + .5);
  float stateId = floor(idt.g * 255. / 6. + .5);
  float lake = step(.5, idt.b);
  float wet = max(ocean, lake);

  // -------- light → tone
  vec3 n = normalize(vN);
  vec3 L = normalize(vec3(-.5, .85, -.4));
  float lam = dot(n, L);
  float tone = clamp((.8 - lam) * 2.3 + (1. - n.y) * .15, 0., 1.);
  tone *= mix(1., .55, uPlate);
  // standing in the landscape: a faint ruling over the plains so flat ground still reads as receding land
  tone = max(tone, .13 * uGround * (1. - wet));

  // footprints, taken once here (outside every branch)
  vec2 D1 = vec2(cos(.62), sin(.62)), D2 = vec2(cos(-.95), sin(-.95)), D3 = vec2(cos(1.6), sin(1.6));
  vec2 DH = vec2(.7071, .7071), DS = vec2(cos(2.35), sin(2.35));
  float fw1 = fwDir(D1), fw2 = fwDir(D2), fw3 = fwDir(D3), fwH = fwDir(DH), fwS = fwDir(DS);
  float hm = vH * 1000.;
  float fwC = fwidth(hm);
  float dco = fld.r * 255. / 2.;
  float fwO = fwidth(dco);
  float wd = fld.b * 255. / 8.;
  float fwW = fwidth(wd);
  float fwY = fwidth(P.y);

  float covInk = 0.;
  float covWater = 0.;

  // -------- vegetation belts (latitude is a fair proxy in Nigeria), kept off the hillsides
  // forest in the south and along the rivers; the savanna north is left open so the land shows
  float belt = lat < 5.4 ? .32 : lat < 7.2 ? .26 : lat < 9. ? .07 : .02;
  belt = max(belt, .3 * smoothstep(.12, .0, fld.b) * step(lat, 11.));
  belt *= (.45 + vnoise(P * 2.2) * 1.1) * (1. - smoothstep(.12, .4, tone)) * (1. - wet);
  float mangrove = step(lat, 5.25) * step(vH, .025) * (1. - ocean) * inNg;
  belt *= 1. - mangrove;
  float crown = 0.;
  float cs = .075;
  // only at middle distances: from afar they'd be specks, close up they'd be big empty rings
  float vis = smoothstep(6., 11., cs / px) * (1. - smoothstep(16., 26., cs / px));
  if (vis * belt > .005){
    float cr;
    covInk = trees(P, cs, belt, px / cs * 1.2, cr) * vis * .55;
    crown = cr * vis;
  }

  // -------- hatching, swelling with shadow
  float wob = (vnoise(P * 9.) - .5) * .35;
  float hat = 0.;
  if (tone > .06){
    hat = hatch(P, D1, fw1, 5., clamp((tone - .06) * .5, 0., .34), wob);
    if (tone > .5) hat = max(hat, hatch(P, D2, fw2, 6.5, clamp((tone - .5) * .6, 0., .3), wob));
    if (tone > .78) hat = max(hat, hatch(P, D3, fw3, 7.5, clamp((tone - .78) * .7, 0., .26), wob));
  }
  covInk = max(covInk, hat * .9 * (1. - crown) * (1. - wet));

  // -------- contours
  float c100 = linePx(hm / 100., .35, fwC / 100.) * .3;
  float c500 = linePx(hm / 500., .6, fwC / 500.) * .5;
  covInk = max(covInk, max(c100, c500) * (1. - ocean) * (1. - crown * .7) * step(10., hm));

  // -------- the far north-east: stipple and dune ripples
  if (lat > 11.6){
    float sahel = smoothstep(11.6, 13.2, lat) * (1. - lake);
    vec2 sg = P / (px * 4.);
    float st = step(hash12(floor(sg)), sahel * .12) * (1. - smoothstep(.15, .35, length(fract(sg) - .5)));
    covInk = max(covInk, st * .6);
    float dunes = smoothstep(12.4, 13.4, lat) * smoothstep(10.5, 12., lon) * (1. - lake);
    if (dunes > .0){
      float dt = (P.y + .018 * sin(P.x * 38. + vnoise(P * 3.) * 6.)) * 70.;
      covInk = max(covInk, lineC(dt, .05, fwY * 70. * 1.4) * dunes * .45 * step(.35, vnoise(P * 14.)));
    }
  }

  // -------- the delta: marsh dashes with tufts
  if (mangrove > .5){
    vec2 mg = P / .03; vec2 mf = fract(mg);
    float dash = step(.25, mf.x) * step(mf.x, .75) * (1. - smoothstep(.0, .08, abs(mf.y - .6)));
    float tuft = step(.35, mf.x) * step(mf.x, .65) * step(abs(fract(mf.x * 10.) - .5), .12) * step(.35, mf.y) * step(mf.y, .6);
    covInk = max(covInk, max(dash, tuft) * step(hash12(floor(mg)), .6) * smoothstep(3., 6., .03 / px) * .7);
  }

  // -------- water
  covWater = ink.b;
  covWater = max(covWater, linePx(wd / 2.2, .45, fwW / 2.2) * (1. - smoothstep(2., 5., wd)) * step(1.5, wd) * (1. - lake) * .3);
  if (lake > .5) covWater = max(covWater, lineC(P.y / (px * 4.), .16, fwY / (px * 4.)) * .7);
  if (ocean > .5){
    // echo lines that follow the coast, thinning offshore, then long swell strokes
    float echo = linePx(dco / 2.4, mix(.9, .3, smoothstep(0., 30., dco)), fwO / 2.4) * (1. - smoothstep(18., 34., dco));
    float swell = lineC((P.y + .02 * sin(P.x * 7. + vnoise(P * 2.) * 3.)) / (px * 6.), .1, fwY / (px * 6.)) * step(.42, vnoise(P * vec2(3., 12.)));
    covWater = max(covWater, max(echo * .7, swell * .28 * smoothstep(20., 40., dco)));
  }

  // -------- towns at the state capitals
  for (int i = 0; i < 37; i++){
    vec2 c = uTowns[i];
    if (abs(P.x - c.x) > .25 || abs(P.y - c.y) > .25) continue;
    float m;
    float ti = town(P, c, px, m);
    covInk = max(covInk * (1. - m), ti);
  }

  // -------- borders
  covInk = max(covInk, ink.r * .6);  // states
  covInk = max(covInk, ink2.r * .85); // zones
  covInk = max(covInk, ink.g);       // the nation

  // -------- compose on paper
  vec3 col = uPaper * (.965 + .05 * vnoise(P * 1.5 + 3.) + .02 * vnoise(P * 60.));
  // a breath of tone under the hatching, so the relief reads even between strokes
  col *= 1. - tone * .14 * (1. - wet);
  // watercolour wash laid along each zone's edge, the way engraved maps were hand-coloured
  float zd = ink2.g * 255. / 4.;
  float bleed = vnoise(P * 7. + zone);
  float wz = clamp(zone, 0., 7.);
  vec3 tint = uTint[int(wz)];
  float hovering = step(.5, uHover) * (1. - step(.5, abs(zone - uHover)));
  float wash = (1. - smoothstep(5., 20. + bleed * 14., zd)) * step(.5, zone) * .75;
  wash = max(wash, hovering * .32);
  wash = max(wash, step(6.5, zone) * .35);
  col = mix(col, col * mix(vec3(1.), tint * 1.15, .55), wash * (1. - ocean));
  // a green ribbon just outside the national border
  float outd = (.5 - fld.g) * 255.;
  float ribbon = (1. - smoothstep(1., 5. + bleed * 3., outd)) * step(0., outd);
  col = mix(col, col * mix(vec3(1.), uAccent * 1.6, .5), ribbon * .55);

  col = mix(col, uInkCol, covInk);
  col = mix(col, uWater, covWater * .9);

  // hovered House: hatched over in its colour
  if (hovering > .5) col = mix(col, tint * .8, hatch(P, DH, fwH, 4.5, .2, .1 * wob) * .85);
  // coalition (the Seat panel): pledged Houses take a gold wash, deepest at their edges
  if (uPact[int(wz)] > .5 && zone > .5) col = mix(col, col * mix(vec3(1.), uGold * 1.5, .6), .35 + .35 * (1. - smoothstep(4., 24., zd)));
  // hovered / chosen state in the zone view
  float sOn = max(step(.5, uHoverState) * (1. - step(.5, abs(stateId - uHoverState))), step(.5, uSelState) * (1. - step(.5, abs(stateId - uSelState))));
  if (sOn > .5) col = mix(col, uAccent, hatch(P, DS, fwS, 4., .2, .1 * wob) * .8);

  // graticule for the plate view
  if (uPlate > .01){
    float fwLon = fwidth(lon), fwLat = fwidth(lat);
    float gr = max(linePx(lon, .5, fwLon), linePx(lat, .5, fwLat)) * .6 + max(linePx(lon * 4., .3, fwLon * 4.), linePx(lat * 4., .3, fwLat * 4.)) * .15;
    col = mix(col, uInkCol, gr * uPlate);
  }

  // focus on the chosen House
  if (uFocus > .01){
    // the zone raster is nearest-sampled; average a few taps so the focus edge doesn't stair-step
    vec2 tx = vec2(1. / 2048., 1. / 1693.) * .7;
    float other = 0.;
    for (int k = 0; k < 4; k++){
      vec2 o = vec2(k == 0 || k == 2 ? -1. : 1., k < 2 ? -1. : 1.) * tx;
      float z = floor(texture2D(uIds, uv + o).r * 255. / 30. + .5);
      other += step(.5, abs(z - uSel)) * step(.5, abs(z - 7.)) * step(.5, z);
    }
    far *= 1. - other * .25 * .4 * uFocus * (1. - ocean);
  }

  col = mix(uPaper, col, far);
  if (uDebug > 0.5 && uDebug < 1.5) col = ink.rgb;
  if (uDebug > 1.5 && uDebug < 2.5) col = fld.rgb;
  if (uDebug > 2.5 && uDebug < 3.5) col = vec3(far, tone, covInk);
  if (uDebug > 3.5 && uDebug < 4.5) col = n * .5 + .5;
  if (uDebug > 4.5) col = vec3(tone);
  gl_FragColor = linearToOutputTexel(vec4(night(col), 1.));
}
`;

export function makeTerrainMaterial() {
  const [L0, L1, A0, A1] = geo.meta.bbox;
  const c = (h: string) => new THREE.Color(h);
  const tints = Array.from({ length: 8 }, (_, i) =>
    c(ZONE_TINT[i] ?? PALETTE.paper),
  );
  return new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    uniforms: {
      uInk: { value: geo.tex.ink },
      uInk2: { value: geo.tex.ink2 },
      uIds: { value: geo.tex.ids },
      uFields: { value: geo.tex.fields },
      uExag: { value: EXAG },
      uTime: { value: 0 },
      uHover: { value: 0 },
      uSel: { value: 0 },
      uFocus: { value: 0 },
      uPlate: { value: 0 },
      uReveal: { value: 0 },
      uHoverState: { value: 0 },
      uSelState: { value: 0 },
      uPact: { value: new Array(8).fill(0) },
      uTint: { value: tints },
      uPaper: { value: c(PALETTE.paper) },
      uInkCol: { value: c(PALETTE.ink) },
      uWater: { value: c(PALETTE.water) },
      uAccent: { value: c(PALETTE.accent) },
      uGold: { value: c(PALETTE.gold) },
      uCam: { value: new THREE.Vector3() },
      uViewDist: { value: 14 },
      uGround: { value: 0 },
      uDark: { value: 0 },
      uBox: { value: new THREE.Vector4(L0, L1, A0, A1) },
      uTowns: {
        value: CAPITALS.map((c) => {
          const w = lonLatToWorld(c.lon, c.lat);
          return new THREE.Vector2(w.x, w.z);
        }),
      },
      uDebug: {
        value: import.meta.env.DEV
          ? Number(new URLSearchParams(location.search).get("debug") ?? 0)
          : 0,
      },
    },
  });
}

/** Heightfield mesh in map space. `step` thins the grid on small screens. */
export function makeTerrainGeometry(step = 1) {
  const { gx, gy, h } = geo;
  const [L0, L1, A0, A1] = geo.meta.bbox;
  const nx = Math.floor((gx - 1) / step) + 1;
  const ny = Math.floor((gy - 1) / step) + 1;
  const pos = new Float32Array(nx * ny * 3);
  const nor = new Float32Array(nx * ny * 3);
  const uv = new Float32Array(nx * ny * 2);
  const cos = geo.meta.cosLat;
  const dxw = ((L1 - L0) / (gx - 1)) * cos * step;
  const dzw = ((A1 - A0) / (gy - 1)) * step;
  const H = (x: number, y: number) =>
    h[
      Math.min(gy - 1, Math.max(0, y)) * gx + Math.min(gx - 1, Math.max(0, x))
    ] * EXAG;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const gxI = i * step;
      const gyI = j * step;
      const k = j * nx + i;
      const lon = L0 + (gxI / (gx - 1)) * (L1 - L0);
      const lat = A1 - (gyI / (gy - 1)) * (A1 - A0);
      pos[k * 3] = (lon - geo.lonC) * cos;
      pos[k * 3 + 1] = H(gxI, gyI);
      pos[k * 3 + 2] = -(lat - geo.latC);
      // a wider stencil smooths the 1.6 km grid so close-ups read as landform, not facets
      const s2 = step * 2;
      const hx =
        (H(gxI + s2, gyI) - H(gxI - s2, gyI)) * 0.6 +
        (H(gxI + step, gyI) - H(gxI - step, gyI)) * 0.4 * 2;
      const hz =
        (H(gxI, gyI + s2) - H(gxI, gyI - s2)) * 0.6 +
        (H(gxI, gyI + step) - H(gxI, gyI - step)) * 0.4 * 2;
      const kx = 1 / (4 * dxw);
      const kz = 1 / (4 * dzw);
      // +row runs south (+z)
      const nv = new THREE.Vector3(-hx * kx, 1, -hz * kz).normalize();
      nor[k * 3] = nv.x;
      nor[k * 3 + 1] = nv.y;
      nor[k * 3 + 2] = nv.z;
      uv[k * 2] = (lon - L0) / (L1 - L0);
      uv[k * 2 + 1] = (lat - A0) / (A1 - A0);
    }
  }
  const idx = new Uint32Array((nx - 1) * (ny - 1) * 6);
  let o = 0;
  for (let j = 0; j < ny - 1; j++)
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i;
      const b = a + 1;
      const c = a + nx;
      const d = c + 1;
      idx[o++] = a;
      idx[o++] = c;
      idx[o++] = b;
      idx[o++] = b;
      idx[o++] = c;
      idx[o++] = d;
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}
