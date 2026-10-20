import { useEffect, useState } from "react";
import { boot, worldReady } from "./boot";
import { startDirector } from "./director";
import { useStore } from "./state";
import { World } from "./gl/World";
import { Loader } from "./ui/Loader";
import { Crafts } from "./ui/Crafts";
import { Intro } from "./ui/Intro";
import { Hud } from "./ui/Hud";
import { Cursor } from "./ui/Cursor";
import { GlBoundary } from "./ui/GlBoundary";

export default function App() {
  const [ready, setReady] = useState(false);
  const phase = useStore((s) => s.phase);
  useEffect(() => {
    const stop = startDirector();
    boot().then(() => setReady(true));
    return stop;
  }, []);
  return (
    <>
      {ready && (
        <GlBoundary>
          <World onReady={worldReady} />
        </GlBoundary>
      )}
      <Crafts />
      {phase === "loading" && <Loader />}
      {phase === "intro" && <Intro />}
      {phase === "map" && <Hud />}
      <div className="grain" aria-hidden />
      <Cursor />
    </>
  );
}
