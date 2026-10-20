import type { SeatId } from "./houses";

export type Question = {
  q: string;
  options: string[];
  answer: number;
  /** the House the question belongs to — it is lit up on the way in */
  zone: SeatId;
  note: string;
};

// Plain, checkable civic geography and recent landmarks. No politicians, no polls.
export const QUESTIONS: Question[] = [
  {
    q: "The Benue runs into the Niger at which city?",
    options: ["Lokoja", "Makurdi", "Onitsha", "Jebba"],
    answer: 0,
    zone: "NC",
    note: "The confluence at Lokoja is the Y on the national coat of arms.",
  },
  {
    q: "Which state calls itself the Centre of Excellence?",
    options: ["Ogun", "Oyo", "Lagos", "Rivers"],
    answer: 2,
    zone: "SW",
    note: "Lagos — also the smallest state by land area.",
  },
  {
    q: "Abuja replaced Lagos as the capital in which year?",
    options: ["1976", "1987", "1991", "1999"],
    answer: 2,
    zone: "FCT",
    note: "The seat moved on 12 December 1991.",
  },
  {
    q: "Which zone holds the most states?",
    options: ["North-Central", "North-West", "South-South", "North-East"],
    answer: 1,
    zone: "NW",
    note: "Seven: Jigawa, Kaduna, Kano, Katsina, Kebbi, Sokoto and Zamfara.",
  },
  {
    q: "Which zone has only five states?",
    options: ["South-East", "South-West", "North-East", "South-South"],
    answer: 0,
    zone: "SE",
    note: "Abia, Anambra, Ebonyi, Enugu and Imo.",
  },
  {
    q: "Nigeria's highest point, Chappal Waddi, is in which state?",
    options: ["Plateau", "Adamawa", "Taraba", "Cross River"],
    answer: 2,
    zone: "NE",
    note: "About 2,419 metres up, on the Cameroon border.",
  },
  {
    q: "Zuma Rock, on the road into Abuja, stands in which state?",
    options: ["Kogi", "Niger", "Nasarawa", "Kaduna"],
    answer: 1,
    zone: "NC",
    note: "Niger State — the largest state in the country by area.",
  },
  {
    q: "Uyo is the capital of which state?",
    options: ["Cross River", "Abia", "Akwa Ibom", "Bayelsa"],
    answer: 2,
    zone: "SS",
    note: "Akwa Ibom; Calabar is the capital of neighbouring Cross River.",
  },
  {
    q: "The Second Niger Bridge, opened in 2022, links Asaba to…",
    options: ["Onitsha", "Lokoja", "Warri", "Benin City"],
    answer: 0,
    zone: "SE",
    note: "Asaba in Delta to Onitsha in Anambra, across the Niger.",
  },
  {
    q: "The Dangote refinery stands in which state?",
    options: ["Rivers", "Delta", "Ogun", "Lagos"],
    answer: 3,
    zone: "SW",
    note: "On the Lekki peninsula, Lagos.",
  },
  {
    q: "Which state is known as the Coal City State?",
    options: ["Kogi", "Enugu", "Gombe", "Ebonyi"],
    answer: 1,
    zone: "SE",
    note: "Enugu, after the coal seams first mined there in 1915.",
  },
  {
    q: "Lake Chad is shared by Nigeria, Niger, Chad and…",
    options: ["Benin", "Cameroon", "Mali", "Sudan"],
    answer: 1,
    zone: "NE",
    note: "Borno holds Nigeria's share of the shore.",
  },
  {
    q: "The Osun-Osogbo Sacred Grove is a World Heritage Site in which state?",
    options: ["Osun", "Ondo", "Ekiti", "Kwara"],
    answer: 0,
    zone: "SW",
    note: "Inscribed by UNESCO in 2005.",
  },
  {
    q: "Which state calls itself the Food Basket of the Nation?",
    options: ["Plateau", "Kwara", "Benue", "Niger"],
    answer: 2,
    zone: "NC",
    note: "Benue — yams, rice, soybeans and citrus along its river.",
  },
  {
    q: "Dutse is the capital of which state?",
    options: ["Jigawa", "Yobe", "Katsina", "Zamfara"],
    answer: 0,
    zone: "NW",
    note: "Jigawa, carved out of Kano State in 1991.",
  },
  {
    q: "The Benin bronzes come from the kingdom centred on which modern city?",
    options: ["Warri", "Benin City", "Calabar", "Port Harcourt"],
    answer: 1,
    zone: "SS",
    note: "Benin City, Edo State — and some have been returned home since 2022.",
  },
];

export const pickQuestion = () =>
  QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
