# The Game of Zones

An engraved, explorable 3D map of Nigeria. The six geopolitical zones are written as six Houses contending for one seat — Aso Rock in Abuja — and the whole country is drawn like an old copper-plate map: hatching that swells in shadow, contour lines, coastal echo lines, tree crowns that follow the real vegetation belts, hand-laid watercolour washes along the zone borders.

The background is white, after the flag. The Houses, their words and sigils are invented for this site. The states, peoples, places and constitutional rules are real. It takes no side and names no politician.

## The experience

1. **Loader** — a real percentage: every data layer, the fonts, the seven bronze sigils and the shader compile each report progress.
2. **A question of the realm** — only the question and its answers show; everything else waits under a dimmed sheet that a soft torch, following the pointer, lifts a little to glimpse the engraved map and a compass rose beneath. Unanswered, the question turns over every 14 seconds (hovering the answers holds it). Right: the letters hop, paper confetti flies and a seal stamps down. Wrong: a quiet strike-through, an ink line through the question and a swash under the right answer. Either way the whole page is revealed.
3. **Enter** — a textured page turn: fibrous paper with an ink-and-green edge sweeps over the screen and peels back onto the map, which inks itself in as the camera lifts away.
4. **The map** — hover a zone to see its name. Click anywhere in a zone and the camera flies across the map with that House's bronze sigil centred, then glides down to stand in the landscape facing it, the House lettered across the view. **Explore the House** opens its panel: states, peoples and notes. Drag to look around, scroll to zoom. The sun/moon icon switches between day (white, after the flag) and night (pale ink on a near-black sheet, remembered between visits). The map icon (or `M`) lays the plate flat with every state lettered on a graticule; the bar icon beside it opens the menu, which also lists every House. **The Seat** explains how the presidency is won and lets you forge a pact of Houses to see whether it reaches 24 states plus the FCT. `Esc` steps back.

## The Houses

| House      | Zone          | Sigil                           | Seat       |
| ---------- | ------------- | ------------------------------- | ---------- |
| Durbar     | North-West    | Durbar horse                    | Kano       |
| Sahel      | North-East    | Camel of the Sahel              | Maiduguri  |
| Confluence | North-Central | Meeting of the Niger and Benue  | Lokoja     |
| Drum       | South-West    | Talking drum (dùndún)           | Oyo        |
| Bronze     | South-East    | Roped pot of Igbo-Ukwu          | Igbo-Ukwu  |
| Delta      | South-South   | Ivory mask of Benin             | Benin City |
| The Seat   | FCT           | Aso Rock and the chair of state | Abuja      |

## Running it

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check and bundle into dist/
npm run format     # Prettier
```

In development, `?gallery` shows all seven sigils side by side and `?debug=1…8` shows the shader's individual layers.

## How it's made

- **Data** — `scripts/build_data.py` bakes everything in `public/data` from open sources: Terrarium elevation tiles become a 768×635 height grid; geoBoundaries polygons become a zone/state id raster and anti-aliased border ink; Natural Earth rivers and lakes become water ink; and SciPy distance transforms give the coast, border and riverbank distance fields the shader draws echo lines and washes from. Run it with `python -I scripts/build_data.py <cache-dir>` (needs numpy, pillow, scipy).
- **Terrain** — a heightfield mesh in map space (1 unit = 1° of latitude, longitude squeezed by cos 9°), ×170 vertical exaggeration over a lightly smoothed grid. One fragment shader (`src/gl/terrainMaterial.ts`) does all of the engraving. Hatch and glyph spacing are chosen from each pixel's footprint, so the plate stays crisp from the whole country down to a single valley.
- **Picking** — no mesh raycasts: the pointer ray is marched across the CPU copy of the heightfield, and the hit is looked up in the zone raster.
- **Sigils** — `src/gl/emblems.ts` builds each medallion from lathes, extrusions, tubes and displaced surfaces, in patinated physical bronze lit by a generated room environment. Nothing is downloaded.
- **Night mode** — the map shader inverts lightness while keeping hue (Y flipped in YIQ, in exact sRGB space), so the zone washes and greens survive and the sheet lands exactly on the page colour.
- **Performance** — the engraving shader exits early on blank paper, branches around layers a pixel doesn't need, and the render resolution adapts to hold the frame rate. There is a single WebGL context, and a lost context is recovered rather than fatal.
- **Stack** — Vite, React 19, TypeScript, three.js, React Three Fiber, GSAP, zustand.

## Credits

- Elevation: Terrain Tiles (Tilezen / Mapzen) on the AWS Registry of Open Data — SRTM courtesy of NASA and the USGS, ETOPO1 courtesy of NOAA, and the other sources in the Tilezen joerd attribution.
- Boundaries: geoBoundaries, William & Mary geoLab — Nigeria ADM0/ADM1, CC BY 4.0. Runfola, D. et al. (2020), “geoBoundaries: A global database of political administrative boundaries”, PLoS ONE.
- Rivers and lakes: Natural Earth 1:10m — public domain.
- Type: IM Fell English (Igino Marini), Cormorant Garamond (Christian Thalmann), DM Mono (Colophon Foundry) — SIL Open Font License.
- The engraved-landscape idea nods to the parcel map of Champagne Chartogne-Taillet; nothing from it is copied.
