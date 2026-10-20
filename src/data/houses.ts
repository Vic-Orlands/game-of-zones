// The six geopolitical zones, written as six Houses contending for one seat.
// Everything factual here is plain civic geography; the Houses, words and sigils are this site's invention.

export type ZoneId = "NW" | "NE" | "NC" | "SW" | "SE" | "SS";
export type SeatId = ZoneId | "FCT";

export type House = {
  id: ZoneId;
  /** numeric id baked into the zone raster (ids.png red channel / 30) */
  n: number;
  house: string;
  zone: string;
  words: string;
  sigil: string;
  sigilNote: string;
  seat: { name: string; lon: number; lat: number };
  states: string[];
  peoples: string[];
  facts: string[];
};

export const HOUSES: House[] = [
  {
    id: "NW",
    n: 1,
    house: "House of the Durbar",
    zone: "North-West",
    words: "The horse remembers",
    sigil: "Durbar horse",
    sigilNote:
      "Durbar processions of horsemen in quilted armour are held in Kano, Katsina and Zaria at the end of Ramadan and at Eid al-Kabir.",
    seat: { name: "Kano", lon: 8.592, lat: 12.002 },
    states: [
      "Jigawa",
      "Kaduna",
      "Kano",
      "Katsina",
      "Kebbi",
      "Sokoto",
      "Zamfara",
    ],
    peoples: ["Hausa", "Fulani", "Kambari", "Dukawa", "Gbagyi"],
    facts: [
      "Seven states — more than any other zone.",
      "Kano is called the Centre of Commerce; its city walls and dye pits are centuries old.",
      "The Sokoto, Rima and Kaduna rivers water its plains.",
    ],
  },
  {
    id: "NE",
    n: 2,
    house: "House of the Sahel",
    zone: "North-East",
    words: "We cross what others cannot",
    sigil: "Camel of the Sahel",
    sigilNote:
      "Camels still cross the far north-east, where Borno meets the edge of the Sahara and the shrinking shore of Lake Chad.",
    seat: { name: "Maiduguri", lon: 13.151, lat: 11.831 },
    states: ["Adamawa", "Bauchi", "Borno", "Gombe", "Taraba", "Yobe"],
    peoples: ["Kanuri", "Fulani", "Bura", "Shuwa Arab", "Jukun", "Mumuye"],
    facts: [
      "The largest zone by land area.",
      "Chappal Waddi, Nigeria's highest point (≈2,419 m), stands in Taraba.",
      "Lake Chad is shared with Niger, Chad and Cameroon; Sukur in Adamawa is a UNESCO World Heritage Site.",
    ],
  },
  {
    id: "NC",
    n: 3,
    house: "House of the Confluence",
    zone: "North-Central",
    words: "Where rivers agree",
    sigil: "The meeting of two rivers",
    sigilNote:
      "At Lokoja the Benue runs into the Niger — the Y on the national coat of arms is this confluence.",
    seat: { name: "Lokoja", lon: 6.733, lat: 7.802 },
    states: ["Benue", "Kogi", "Kwara", "Nasarawa", "Niger", "Plateau"],
    peoples: ["Tiv", "Idoma", "Nupe", "Igala", "Berom", "Ebira", "Gbagyi"],
    facts: [
      "Niger is the largest state in the country by area; Zuma Rock rises inside it.",
      "Benue calls itself the Food Basket of the Nation.",
      "The zone wraps around the Federal Capital Territory.",
    ],
  },
  {
    id: "SW",
    n: 4,
    house: "House of the Drum",
    zone: "South-West",
    words: "The drum speaks first",
    sigil: "Talking drum",
    sigilNote:
      "The dùndún, an hourglass drum whose pitch is bent by squeezing its cords, can mimic the tones of spoken Yorùbá.",
    seat: { name: "Oyo", lon: 3.931, lat: 7.851 },
    states: ["Ekiti", "Lagos", "Ogun", "Ondo", "Osun", "Oyo"],
    peoples: ["Yorùbá", "Awori", "Egun", "Ẹ̀gbá", "Ìjẹ̀bú"],
    facts: [
      "Lagos is the smallest state by area and the country's commercial centre.",
      "The Osun-Osogbo Sacred Grove is a UNESCO World Heritage Site.",
      "Ekiti's Ikogosi springs run warm and cold side by side.",
    ],
  },
  {
    id: "SE",
    n: 5,
    house: "House of the Bronze",
    zone: "South-East",
    words: "From clay, bronze",
    sigil: "Roped pot of Igbo-Ukwu",
    sigilNote:
      "Bronzes cast at Igbo-Ukwu around the 9th–10th century — among them a pot wrapped in a cast rope — are among the oldest known in West Africa.",
    seat: { name: "Igbo-Ukwu", lon: 7.02, lat: 6.02 },
    states: ["Abia", "Anambra", "Ebonyi", "Enugu", "Imo"],
    peoples: ["Igbo", "Izzi", "Ezza", "Ikwo"],
    facts: [
      "Five states — the fewest of any zone.",
      "Enugu is the Coal City State.",
      "Onitsha's market on the Niger is one of the largest in West Africa.",
    ],
  },
  {
    id: "SS",
    n: 6,
    house: "House of the Delta",
    zone: "South-South",
    words: "The tide keeps its own crown",
    sigil: "Ivory mask of Benin",
    sigilNote:
      "The 16th-century pendant masks of Benin, carved for the Oba in honour of Queen Mother Idia, crowned with a lattice of small heads.",
    seat: { name: "Benin City", lon: 5.604, lat: 6.335 },
    states: ["Akwa Ibom", "Bayelsa", "Cross River", "Delta", "Edo", "Rivers"],
    peoples: [
      "Ijaw",
      "Edo",
      "Efik",
      "Ibibio",
      "Annang",
      "Urhobo",
      "Itsekiri",
      "Isoko",
      "Ogoni",
      "Ikwerre",
    ],
    facts: [
      "The Niger fans out here into one of the largest river deltas in the world.",
      "Calabar is capital of Cross River; Uyo of Akwa Ibom.",
      "Obudu's plateau resort sits near the Cameroon border.",
    ],
  },
];

export const THRONE = {
  id: "FCT" as const,
  n: 7,
  house: "The Seat",
  zone: "Federal Capital Territory",
  words: "One seat. Six Houses.",
  seat: { name: "Aso Rock", lon: 7.534, lat: 9.083 },
  rules: [
    "The most votes cast nationwide…",
    "…and at least a quarter of the vote in two-thirds of the 36 states — 24 of them — and in the FCT.",
  ],
  note: "That second rule is the real game of zones: no House can take the seat on its own ground. A winner has to carry a broad spread of the country with them. Abuja has been the capital since 12 December 1991.",
};

export const houseById = (id: string | null | undefined) =>
  HOUSES.find((h) => h.id === id) ?? null;
export const houseByN = (n: number) => HOUSES.find((h) => h.n === n) ?? null;
export const STATE_COUNT = 36;
export const NEEDED = 24;
