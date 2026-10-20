import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { createEmblemMaterials, emblemObject } from "../gl/emblems";
import type { SeatId } from "../data/houses";
import { useThree } from "@react-three/fiber";

// Dev-only: every sigil side by side at ?gallery (with &yaw=0.6 to turn them).
const IDS: SeatId[] = ["NW", "NE", "NC", "SW", "SE", "SS", "FCT"];

function All() {
  const { gl } = useThree();
  const yaw = Number(new URLSearchParams(location.search).get("yaw") ?? 0);
  const objs = useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const mats = createEmblemMaterials(
      pm.fromScene(new RoomEnvironment(), 0.03).texture,
    );
    return IDS.map((id, i) => {
      const o = emblemObject(id, mats);
      o.position.set(((i % 4) - 1.5) * 2.3, i < 4 ? 1.2 : -1.2, 0);
      o.rotation.y = yaw;
      return o;
    });
  }, [gl, yaw]);
  return (
    <>
      {objs.map((o, i) => (
        <primitive key={i} object={o} />
      ))}
    </>
  );
}

export function Gallery() {
  return (
    <Canvas
      style={{ position: "fixed", inset: 0 }}
      camera={{ fov: 30, position: [0, 0, 11] }}
      gl={{ antialias: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.1;
      }}
    >
      <color attach="background" args={["#ffffff"]} />
      <directionalLight position={[-3, 4, 4]} intensity={3} color="#fff0d6" />
      <directionalLight position={[4, -1, 2]} intensity={0.8} color="#bcd4ff" />
      <All />
    </Canvas>
  );
}
