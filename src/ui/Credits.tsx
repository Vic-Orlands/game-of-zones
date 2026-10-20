import { store } from "../state";

const SECTIONS: { h?: string; p: string }[] = [
  {
    p: "The Game of Zones is an interactive map of Nigeria's six geopolitical zones. The Houses, their words and sigils are invented for this site; the states, peoples, places and constitutional rules are real. It takes no side and names no politician.",
  },
  {
    h: "Elevation",
    p: "Terrain Tiles (Tilezen / Mapzen) via the AWS Registry of Open Data — SRTM courtesy of NASA and the USGS, ETOPO1 courtesy of NOAA, and the other sources listed in the Tilezen joerd attribution.",
  },
  {
    h: "Boundaries",
    p: "geoBoundaries, William & Mary geoLab — Nigeria ADM0 and ADM1, CC BY 4.0. Runfola, D. et al. (2020), “geoBoundaries: A global database of political administrative boundaries”, PLoS ONE.",
  },
  {
    h: "Rivers and lakes",
    p: "Natural Earth, 1:10m physical vectors — public domain.",
  },
  {
    h: "Type",
    p: "IM Fell English (Igino Marini), Cormorant Garamond (Christian Thalmann) and DM Mono (Colophon Foundry), all under the SIL Open Font License.",
  },
  {
    h: "Built with",
    p: "three.js, React Three Fiber, GSAP and zustand. The engraving and the bronze sigils are drawn in code and the paper grain is generated — there are no photographs or downloaded models, only the map data.",
  },
  {
    h: "Inspiration",
    p: "The engraved-landscape idea owes a nod to the parcel map of Champagne Chartogne-Taillet.",
  },
];

/**
 * The page fades in from the top down: a soft, feathered front of ink sweeps over the text, so each line
 * resolves out of the paper rather than appearing.
 */
export function Credits() {
  return (
    <div className="sheet" role="dialog" aria-label="Credits">
      <button
        className="x"
        onClick={() => store.setState({ credits: false })}
        data-hot
      >
        CLOSE ✕
      </button>
      <div className="credits fade-down">
        <h2>Credits</h2>
        {SECTIONS.map((s, i) => (
          <section key={i} aria-label={s.h}>
            {s.h && <h3>{s.h}</h3>}
            <p>{s.p}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
