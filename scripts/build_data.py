"""Bake the map layers in public/data from open data.

    python -I scripts/build_data.py <cache-dir> [out-dir]

Needs numpy, pillow and scipy. Downloads (once, into <cache-dir>):
  - Terrain Tiles (Terrarium PNG, zoom 7) from the AWS Registry of Open Data
  - geoBoundaries Nigeria ADM0 / ADM1 (simplified), CC BY 4.0
  - Natural Earth 10m rivers and lakes, public domain

Writes:
  heights.u16  elevation in metres, 768 x 635, row 0 = north
  ids.png      R = zone id * 30, G = state id * 6, B = lake mask
  ink.png      R = state borders, G = national border, B = rivers
  ink2.png     R = zone borders, G = distance to the zone's edge (for washes)
  fields.png   R = distance offshore, G = signed distance to the border, B = distance to water
  meta.json    bbox, grid, and each state's name, zone and centroid
"""

import json
import math
import os
import sys
import urllib.request

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

CACHE = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), "..", "public", "data")
os.makedirs(CACHE, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

LON0, LON1, LAT0, LAT1 = 2.55, 14.8, 4.05, 14.05
COSL = math.cos(math.radians(9.0))
GX = 768
GY = int(round(GX * (LAT1 - LAT0) / ((LON1 - LON0) * COSL)))
TW = 2048
TH = int(round(TW * GY / GX))

GB = "https://github.com/wmgeolab/geoBoundaries/raw/main/releaseData/gbOpen/NGA"
NE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson"
SOURCES = {
    "ng-adm0.geojson": f"{GB}/ADM0/geoBoundaries-NGA-ADM0_simplified.geojson",
    "ng-adm1.geojson": f"{GB}/ADM1/geoBoundaries-NGA-ADM1_simplified.geojson",
    "rivers.geojson": f"{NE}/ne_10m_rivers_lake_centerlines.geojson",
    "lakes.geojson": f"{NE}/ne_10m_lakes.geojson",
}

ZONES = {
    "NW": ["Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Sokoto", "Zamfara"],
    "NE": ["Adamawa", "Bauchi", "Borno", "Gombe", "Taraba", "Yobe"],
    "NC": ["Benue", "Kogi", "Kwara", "Nasarawa", "Niger", "Plateau"],
    "SW": ["Ekiti", "Lagos", "Ogun", "Ondo", "Osun", "Oyo"],
    "SE": ["Abia", "Anambra", "Ebonyi", "Enugu", "Imo"],
    "SS": ["Akwa Ibom", "Bayelsa", "Cross River", "Delta", "Edo", "Rivers"],
    "FCT": ["Abuja Federal Capital Territory"],
}
ZID = {"NW": 1, "NE": 2, "NC": 3, "SW": 4, "SE": 5, "SS": 6, "FCT": 7}
ZONE_OF = {s: z for z, ss in ZONES.items() for s in ss}


def fetch(name, url):
    path = os.path.join(CACHE, name)
    if not os.path.exists(path):
        print("fetch", url)
        urllib.request.urlretrieve(url, path)
    return path


def load(name):
    return json.load(open(fetch(name, SOURCES[name])))


def rings(geom):
    return [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]


def to_px(lon, lat, w, h):
    return ((lon - LON0) / (LON1 - LON0) * w, (LAT1 - lat) / (LAT1 - LAT0) * h)


# ---------------------------------------------------------------- elevation
Z = 7
def tile_xy(lon, lat):
    n = 2**Z
    r = math.radians(lat)
    return (lon + 180) / 360 * n, (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * n

x0 = int(tile_xy(LON0, LAT1)[0]); x1 = int(tile_xy(LON1, LAT1)[0])
y0 = int(tile_xy(LON0, LAT1)[1]); y1 = int(tile_xy(LON0, LAT0)[1])
mos = Image.new("RGB", ((x1 - x0 + 1) * 256, (y1 - y0 + 1) * 256))
for ty in range(y0, y1 + 1):
    for tx in range(x0, x1 + 1):
        p = fetch(f"terrarium-{Z}-{tx}-{ty}.png", f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{tx}/{ty}.png")
        mos.paste(Image.open(p).convert("RGB"), ((tx - x0) * 256, (ty - y0) * 256))
rgb = np.asarray(mos).astype(np.float64)
elev = rgb[..., 0] * 256 + rgb[..., 1] + rgb[..., 2] / 256 - 32768

LL, TT = np.meshgrid(np.linspace(LON0, LON1, GX), np.linspace(LAT1, LAT0, GY))
px = (LL + 180) / 360 * 2**Z * 256 - x0 * 256
r = np.radians(TT)
py = (1 - np.log(np.tan(r) + 1 / np.cos(r)) / np.pi) / 2 * 2**Z * 256 - y0 * 256
ix = np.clip(np.floor(px).astype(int), 0, elev.shape[1] - 2)
iy = np.clip(np.floor(py).astype(int), 0, elev.shape[0] - 2)
fx, fy = px - ix, py - iy
h = (elev[iy, ix] * (1 - fx) * (1 - fy) + elev[iy, ix + 1] * fx * (1 - fy)
     + elev[iy + 1, ix] * (1 - fx) * fy + elev[iy + 1, ix + 1] * fx * fy)
h = np.clip(h, 0, 4000).astype(np.uint16)
h.tofile(os.path.join(OUT, "heights.u16"))

# ---------------------------------------------------------------- states, zones, borders
adm1 = load("ng-adm1.geojson")
adm0 = load("ng-adm0.geojson")
idimg = Image.new("RGB", (TW, TH)); idd = ImageDraw.Draw(idimg)
st_line = Image.new("L", (TW * 2, TH * 2)); sd = ImageDraw.Draw(st_line)
states = []
for i, f in enumerate(sorted(adm1["features"], key=lambda f: f["properties"]["shapeName"])):
    name = f["properties"]["shapeName"]; z = ZONE_OF[name]; sid = i + 1
    area = cx = cy = 0
    for poly in rings(f["geometry"]):
        outer = poly[0]
        idd.polygon([to_px(x, y, TW, TH) for x, y in outer], fill=(ZID[z] * 30, sid * 6, 0))
        for ring in poly[1:]:
            idd.polygon([to_px(x, y, TW, TH) for x, y in ring], fill=(0, 0, 0))
        sd.line([to_px(x, y, TW * 2, TH * 2) for x, y in outer + outer[:1]], fill=255, width=3)
        a = sx = sy = 0
        for (xa, ya), (xb, yb) in zip(outer, outer[1:] + outer[:1]):
            c = xa * yb - xb * ya; a += c; sx += (xa + xb) * c; sy += (ya + yb) * c
        a /= 2
        if abs(a) > abs(area):
            area, cx, cy = a, sx / (6 * a), sy / (6 * a)
    states.append({"id": sid, "name": name.replace(" Federal Capital Territory", ""), "zone": z,
                   "lon": round(cx, 3), "lat": round(cy, 3)})

nat = Image.new("L", (TW * 2, TH * 2)); ndw = ImageDraw.Draw(nat)
for poly in rings(adm0["features"][0]["geometry"]):
    o = poly[0]
    ndw.line([to_px(x, y, TW * 2, TH * 2) for x, y in o + o[:1]], fill=255, width=7)

def inbox(cs):
    return any(LON0 - 1 < x < LON1 + 1 and LAT0 - 1 < y < LAT1 + 1 for x, y in cs)

riv = Image.new("L", (TW * 2, TH * 2)); rd = ImageDraw.Draw(riv)
for f in load("rivers.geojson")["features"]:
    g = f["geometry"]
    if not g:
        continue
    for ln in [g["coordinates"]] if g["type"] == "LineString" else g["coordinates"]:
        if inbox(ln):
            w = max(2, int(9 - (f["properties"].get("scalerank", 9) or 9)))
            rd.line([to_px(x, y, TW * 2, TH * 2) for x, y in ln], fill=255, width=w, joint="curve")
lake = Image.new("L", (TW * 2, TH * 2)); ld = ImageDraw.Draw(lake)
for f in load("lakes.geojson")["features"]:
    for poly in rings(f["geometry"]):
        if inbox(poly[0]):
            ld.polygon([to_px(x, y, TW * 2, TH * 2) for x, y in poly[0]], fill=255)

down = lambda im: im.resize((TW, TH), Image.LANCZOS)
ir, ig, _ = idimg.split()
Image.merge("RGB", (ir, ig, down(lake))).save(os.path.join(OUT, "ids.png"), optimize=True)
Image.merge("RGB", (down(st_line), down(nat), down(riv))).save(os.path.join(OUT, "ink.png"), optimize=True)

# zone borders (internal only) and the distance to each zone's edge
big = np.array(ir.resize((TW * 2, TH * 2), Image.NEAREST)).astype(int)
e = np.zeros_like(big, bool)
e[:, 1:] |= (big[:, 1:] != big[:, :-1]) & (big[:, 1:] > 0) & (big[:, :-1] > 0)
e[1:, :] |= (big[1:, :] != big[:-1, :]) & (big[1:, :] > 0) & (big[:-1, :] > 0)
e = nd.binary_dilation(e, iterations=2)
R = np.array(Image.fromarray((e * 255).astype(np.uint8)).resize((TW, TH), Image.LANCZOS))
zz = np.array(ir); edge = np.zeros_like(zz, bool)
edge[:, 1:] |= zz[:, 1:] != zz[:, :-1]; edge[:, :-1] |= zz[:, 1:] != zz[:, :-1]
edge[1:, :] |= zz[1:, :] != zz[:-1, :]; edge[:-1, :] |= zz[1:, :] != zz[:-1, :]
G = (np.clip(nd.distance_transform_edt(~edge) * 4, 0, 255) * (zz > 0)).astype(np.uint8)
Image.fromarray(np.stack([R, G, np.zeros_like(R)], -1)).save(os.path.join(OUT, "ink2.png"), optimize=True)

# ---------------------------------------------------------------- distance fields @1024
W, H = 1024, math.ceil(1024 * TH / TW)
inside = np.array(ir.resize((W, H), Image.NEAREST)) > 0
hh = np.array(Image.fromarray(h.astype(np.float32)).resize((W, H), Image.BILINEAR))
lat = np.linspace(LAT1, LAT0, H)[:, None] * np.ones((1, W))
ocean = (hh <= 0.5) & (lat < 7.2) & ~inside
lab, _ = nd.label(ocean)
ocean = np.isin(lab, list(set(lab[-1, :]) - {0}))
Rf = np.clip(nd.distance_transform_edt(ocean) * 2, 0, 255) * ocean
Gf = np.clip(128 + nd.distance_transform_edt(inside) - nd.distance_transform_edt(~inside), 0, 255)
water = (np.array(down(riv).resize((W, H))) > 60) | (np.array(down(lake).resize((W, H))) > 128)
Bf = np.clip(nd.distance_transform_edt(~water) * 8, 0, 255)
Image.fromarray(np.stack([Rf, Gf, Bf], -1).astype(np.uint8)).save(os.path.join(OUT, "fields.png"), optimize=True)

json.dump({"bbox": [LON0, LON1, LAT0, LAT1], "cosLat": COSL, "grid": [GX, GY], "tex": [TW, TH],
           "zoneIds": ZID, "states": states}, open(os.path.join(OUT, "meta.json"), "w"), indent=1)
print("wrote", OUT, "grid", GX, GY, "states", len(states))
