// Names lettered onto the plate itself: the neighbours, the sea and the two great rivers.
export type Label = {
  key: string;
  text: string;
  lon: number;
  lat: number;
  kind: "land" | "water" | "river";
};

export const LABELS: Label[] = [
  { key: "l:niger-c", text: "Niger", lon: 7.4, lat: 13.85, kind: "land" },
  { key: "l:benin", text: "Benin", lon: 2.85, lat: 9.6, kind: "land" },
  { key: "l:chad", text: "Chad", lon: 14.55, lat: 12.7, kind: "land" },
  { key: "l:cameroon", text: "Cameroon", lon: 13.4, lat: 7.1, kind: "land" },
  { key: "l:gulf", text: "Gulf of Guinea", lon: 5.2, lat: 4.35, kind: "water" },
  { key: "l:lchad", text: "Lake Chad", lon: 14.1, lat: 13.55, kind: "water" },
  { key: "l:r-niger", text: "R. Niger", lon: 5.55, lat: 8.95, kind: "river" },
  { key: "l:r-benue", text: "R. Benue", lon: 8.9, lat: 7.95, kind: "river" },
  { key: "l:kainji", text: "Kainji", lon: 4.35, lat: 10.15, kind: "water" },
];
