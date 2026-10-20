import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  geo,
  heightAt,
  lonLatToWorld,
  rayTerrain,
  worldToLonLat,
  zoneAt,
} from "../data/geo";
import { HOUSES, THRONE, houseByN, type SeatId } from "../data/houses";
import { store, useStore } from "../state";
import {
  makeTerrainGeometry,
  makeTerrainMaterial,
  PALETTE,
} from "./terrainMaterial";
import { applyRig, rig } from "./rig";
import { anchorWorld, anchors, projectAnchors } from "./screen";
import { emblemObject, setEmblemEnv } from "./emblems";
import { LABELS } from "../data/labels";

export const fx = { reveal: { value: 1 } };
const SEATS: { id: SeatId; lon: number; lat: number }[] = [
  ...HOUSES.map((h) => ({ id: h.id, ...h.seat })),
  { id: "FCT", ...THRONE.seat },
];
const zoneIdOf = (n: number): SeatId | null =>
  n === 7 ? "FCT" : (houseByN(n)?.id ?? null);
const nOf = (id: SeatId | null) =>
  id === "FCT" ? 7 : (HOUSES.find((h) => h.id === id)?.n ?? 0);

const clear = new THREE.Color();
const night = new THREE.Color("#0d100f");

function Terrain({ onReady }: { onReady: () => void }) {
  const { gl, scene, camera } = useThree();
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const geom = useMemo(() => makeTerrainGeometry(small ? 2 : 1), [small]);
  const mat = useMemo(() => makeTerrainMaterial(), []);
  const ready = useRef(false);
  const u = mat.uniforms;
  const sm = useRef({ plate: 0, focus: 0 });

  useEffect(() => {
    // compile before the curtain rises so the first frame doesn't hitch
    gl.compile(scene, camera);
    const id = requestAnimationFrame(() => {
      ready.current = true;
      onReady();
    });
    return () => cancelAnimationFrame(id);
  }, [gl, scene, camera, onReady]);

  useFrame((state, dt) => {
    const s = store.getState();
    u.uTime.value = state.clock.elapsedTime;
    u.uCam.value.copy(state.camera.position);
    u.uViewDist.value = rig.cur.dist * rig.user.zoom;
    // the sheet turns over slowly between day and night; the clear colour follows the shader's paper
    const dk = s.theme === "dark" ? 1 : 0;
    if (Math.abs(u.uDark.value - dk) > 1e-3) {
      u.uDark.value += (dk - u.uDark.value) * (1 - Math.exp(-dt * 4));
      if (Math.abs(u.uDark.value - dk) < 2e-3) u.uDark.value = dk;
      clear.set(PALETTE.paper).lerp(night, u.uDark.value);
      state.gl.setClearColor(clear);
    }
    u.uGround.value = THREE.MathUtils.smoothstep(
      rig.cur.polar + rig.user.polar,
      1.05,
      1.32,
    );
    u.uHover.value = nOf(s.hover);
    u.uSel.value = nOf(s.selected);
    const k = 1 - Math.exp(-dt * 3);
    sm.current.plate += ((s.view === "plate" ? 1 : 0) - sm.current.plate) * k;
    sm.current.focus +=
      ((s.selected && s.selected !== "FCT" && s.view === "zone" ? 1 : 0) -
        sm.current.focus) *
      k;
    u.uPlate.value = sm.current.plate;
    u.uFocus.value = sm.current.focus;
    u.uReveal.value = fx.reveal.value;
    const st = s.hoverState
      ? (geo.meta.states.find((x) => x.name === s.hoverState)?.id ?? 0)
      : 0;
    u.uHoverState.value = s.view === "zone" ? st : 0;
    const pact = u.uPact.value as number[];
    for (let i = 0; i < 8; i++) pact[i] = s.pact.includes(zoneIdOf(i)!) ? 1 : 0;
  });

  return (
    <mesh
      geometry={geom}
      material={mat}
      raycast={() => null}
      frustumCulled={false}
    />
  );
}

function Markers() {
  const { camera, size } = useThree();
  const objs = useMemo(
    () =>
      SEATS.map((s) => {
        const g = new THREE.Group();
        const pivot = new THREE.Group();
        pivot.add(emblemObject(s.id));
        g.add(pivot);
        const w = lonLatToWorld(s.lon, s.lat);
        const gy = heightAt(w.x, w.z);
        g.position.set(w.x, gy, w.z);
        anchorWorld.set("m:" + s.id, new THREE.Vector3(w.x, gy, w.z));
        anchorWorld.set("g:" + s.id, new THREE.Vector3(w.x, gy, w.z));
        return {
          id: s.id,
          g,
          pivot,
          base: s.id === "FCT" ? 0.3 : 0.24,
          k: 1,
          big: 0,
        };
      }),
    [],
  );

  useFrame((state, dt) => {
    const s = store.getState();
    const t = state.clock.elapsedTime;
    const plate = s.view === "plate" ? 1 : 0;
    objs.forEach((o, i) => {
      o.g.visible = s.phase === "map";
      const hot = s.hover === o.id || s.selected === o.id;
      const want =
        (hot ? 1.25 : 1) *
        (s.view === "zone" && s.selected && s.selected !== o.id ? 0.75 : 1);
      o.k += (want - o.k) * (1 - Math.exp(-dt * 6));
      // hold a roughly constant size on screen, a little larger up close
      const far =
        Math.pow(camera.position.distanceTo(o.g.position) / 14.5, 0.8) *
        Math.min(1, Math.sqrt(size.width / 900));
      // the chosen House's sigil grows to stand in the middle of the view as the camera lands
      const chosen = s.view === "zone" && s.selected === o.id ? 1 : 0;
      o.big += (chosen - o.big) * (1 - Math.exp(-dt * 1.6));
      const dCam = camera.position.distanceTo(o.g.position);
      const r = THREE.MathUtils.lerp(o.base * o.k * far, dCam * 0.07, o.big); // radius in world units
      o.pivot.scale.setScalar(r);
      const dx = camera.position.x - o.g.position.x;
      const dz = camera.position.z - o.g.position.z;
      const face = Math.atan2(dx, dz);
      // tip back toward the camera so the face is read square-on
      const elev = Math.atan2(
        camera.position.y - o.g.position.y - r,
        Math.hypot(dx, dz),
      );
      const rock =
        Math.sin(t * 0.55 + i * 1.7) * (0.4 - 0.3 * o.big) * (1 - plate);
      o.pivot.rotation.set(
        -plate * Math.PI * 0.5 -
          (1 - plate) * elev * THREE.MathUtils.lerp(0.35, 1, o.big),
        face + rock,
        0,
        "YXZ",
      );
      // the medallion stands just clear of the ground, bobbing a touch
      o.pivot.position.y =
        r * (1 - plate) * 1.08 +
        r * 0.12 * (1 + Math.sin(t * 0.9 + i)) * (hot ? 1.6 : 1);
      anchorWorld
        .get("m:" + o.id)!
        .set(
          o.g.position.x,
          o.g.position.y + o.pivot.position.y,
          o.g.position.z,
        );
    });
  });

  return (
    <>
      {objs.map((o) => (
        <primitive key={o.id} object={o.g} />
      ))}
    </>
  );
}

/** Lowers (or restores) the render resolution to hold the frame rate. */
function AdaptiveResolution() {
  const setDpr = useThree((s) => s.setDpr);
  const st = useRef({ acc: 0, n: 0, cool: 2, dpr: maxDpr() });
  useFrame((_, dt) => {
    const s = st.current;
    if (dt > 0.25) return; // tab was hidden
    s.acc += dt;
    s.n++;
    s.cool -= dt;
    if (s.n < 30) return;
    const avg = s.acc / s.n;
    s.acc = 0;
    s.n = 0;
    if (s.cool > 0) return;
    let d = s.dpr;
    if (avg > 1 / 48 && d > 0.6) d = Math.max(0.6, d - 0.2);
    else if (avg < 1 / 58 && d < maxDpr()) d = Math.min(maxDpr(), d + 0.1);
    if (d !== s.dpr) {
      s.dpr = d;
      setDpr(d);
      s.cool = 1.5;
    }
  });
  return null;
}
const maxDpr = () => Math.min(window.devicePixelRatio || 1, 1.5);

function Env() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    setEmblemEnv(env);
    scene.environment = env;
    return () => {
      env.dispose();
      pm.dispose();
    };
  }, [gl, scene]);
  return null;
}

function Rig() {
  const { camera, size } = useThree();
  useEffect(() => {
    for (const l of LABELS) {
      const w = lonLatToWorld(l.lon, l.lat);
      anchorWorld.set(
        l.key,
        new THREE.Vector3(w.x, heightAt(w.x, w.z) + 0.02, w.z),
      );
    }
    for (const st of geo.meta.states) {
      const w = lonLatToWorld(st.lon, st.lat);
      anchorWorld.set(
        "s:" + st.name,
        new THREE.Vector3(w.x, heightAt(w.x, w.z) + 0.02, w.z),
      );
    }
  }, []);
  useFrame((state, dt) => {
    applyRig(
      camera as THREE.PerspectiveCamera,
      state.clock.elapsedTime,
      Math.min(dt, 0.05),
      size.width,
      size.height,
    );
    camera.updateMatrixWorld();
    projectAnchors(camera, size.width, size.height);
  });
  return null;
}

/** Pointer handling straight on the canvas: heightfield ray-march for zones, screen distance for sigils. */
function Controls() {
  const { gl, camera, size } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let down: { x: number; y: number; moved: number; id: number } | null = null;
    const pick = (cx: number, cy: number) => {
      const r = el.getBoundingClientRect();
      const x = cx - r.left;
      const y = cy - r.top;
      // sigils first
      let best: SeatId | null = null;
      let bd = 1e9;
      for (const sid of SEATS.map((s) => s.id)) {
        const a = anchors.get("m:" + sid);
        if (!a?.visible) continue;
        const d = Math.hypot(a.x - x, a.y - y);
        const p = anchorWorld.get("m:" + sid)!;
        const rad =
          (0.3 / camera.position.distanceTo(p)) *
          (r.height /
            (2 *
              Math.tan(
                ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 360,
              )));
        if (d < Math.max(14, rad) && d < bd) {
          bd = d;
          best = sid;
        }
      }
      ndc.set((x / r.width) * 2 - 1, -(y / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = rayTerrain(ray.ray);
      let zone: SeatId | null = null;
      let state: string | null = null;
      let at: { lon: number; lat: number } | null = null;
      if (hit) {
        const ll = worldToLonLat(hit.x, hit.z);
        at = ll;
        const z = zoneAt(ll.lon, ll.lat);
        zone = zoneIdOf(z.zone);
        state = z.state
          ? (geo.meta.states.find((s) => s.id === z.state)?.name ?? null)
          : null;
      }
      return {
        zone: best ?? zone,
        state: best ? null : state,
        at: best ? null : at,
      };
    };
    const onMove = (e: PointerEvent) => {
      const s = store.getState();
      if (down) {
        const dx = e.clientX - down.x;
        const dy = e.clientY - down.y;
        down.moved += Math.abs(dx) + Math.abs(dy);
        down.x = e.clientX;
        down.y = e.clientY;
        if (down.moved > 4 && s.view !== "plate") {
          rig.userT.az -= dx * 0.004;
          rig.userT.polar = THREE.MathUtils.clamp(
            rig.userT.polar - dy * 0.003,
            -0.6,
            0.3,
          );
          el.style.cursor = "grabbing";
        }
        return;
      }
      if (s.phase !== "map") return;
      const p = pick(e.clientX, e.clientY);
      if (p.zone !== s.hover || p.state !== s.hoverState)
        store.setState({ hover: p.zone, hoverState: p.state });
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      down = { x: e.clientX, y: e.clientY, moved: 0, id: e.pointerId };
      el.setPointerCapture?.(e.pointerId);
    };
    const onUp = (e: PointerEvent) => {
      const d = down;
      down = null;
      el.style.cursor = "";
      if (!d || d.moved > 6) return;
      const s = store.getState();
      if (s.phase !== "map") return;
      const p = pick(e.clientX, e.clientY);
      if (p.zone) {
        // a click on the land zooms to that very spot; a click on a sigil frames the whole House
        window.dispatchEvent(
          new CustomEvent("goz:select", { detail: { id: p.zone, at: p.at } }),
        );
      } else if (s.view !== "aerial")
        window.dispatchEvent(
          new CustomEvent("goz:select", { detail: { id: null } }),
        );
    };
    const onLeave = () => {
      if (store.getState().hover)
        store.setState({ hover: null, hoverState: null });
    };
    const onWheel = (e: WheelEvent) => {
      if (store.getState().phase !== "map") return;
      e.preventDefault();
      rig.userT.zoom = THREE.MathUtils.clamp(
        rig.userT.zoom * Math.exp(e.deltaY * 0.0012),
        0.35,
        1.6,
      );
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("wheel", onWheel);
    };
  }, [gl, camera, size]);
  return null;
}

export function World({ onReady }: { onReady: () => void }) {
  const phase = useStore((s) => s.phase);
  return (
    <Canvas
      className={"world phase-" + phase}
      dpr={maxDpr()}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ fov: 32, near: 0.05, far: 200, position: [0, 20, 20] }}
      onCreated={({ gl }) => {
        // if the GPU drops the context, ask for it back rather than dying
        gl.domElement.addEventListener("webglcontextlost", (e) =>
          e.preventDefault(),
        );
        gl.setClearColor(PALETTE.paper);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <Env />
      <hemisphereLight args={["#fff6e6", "#4a3b2a", 0.6]} />
      <directionalLight
        position={[-6, 9, -4]}
        intensity={2.2}
        color="#fff1d8"
      />
      <Terrain onReady={onReady} />
      <Markers />
      <Rig />
      <Controls />
      <AdaptiveResolution />
    </Canvas>
  );
}
