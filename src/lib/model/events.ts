import type { Assumptions, Config, Policy, State, Year } from "./engine";
import { initial, stepYear } from "./engine";

export type GameEventId =
  | "rents"
  | "repairs"
  | "grant"
  | "landlord"
  | "winter"
  | "development";

export type GameEvent = {
  id: GameEventId;
  title: string;
  bulletin: string;
  effect: string;
  tone: "alert" | "signal" | "modelled";
};

export const GAME_EVENTS: GameEvent[] = [
  {
    id: "rents",
    title: "Private rents rise",
    bulletin: "Nightly-paid and leased accommodation becomes more expensive this year.",
    effect: "Temporary accommodation unit cost +6% for this turn.",
    tone: "alert",
  },
  {
    id: "repairs",
    title: "Repair backlog grows",
    bulletin: "More occupied homes need urgent work before the next winter.",
    effect: "New repair demand +15% for this turn.",
    tone: "alert",
  },
  {
    id: "grant",
    title: "Government grant",
    bulletin: "A one-year housing grant gives the borough more room to act.",
    effect: "Annual spending envelope +8% for this turn.",
    tone: "signal",
  },
  {
    id: "landlord",
    title: "Landlord ends contract",
    bulletin: "A large provider withdraws temporary accommodation from the borough.",
    effect: "Annual household pressure +1.5 percentage points for this turn.",
    tone: "alert",
  },
  {
    id: "winter",
    title: "Winter pressure",
    bulletin: "Cold-weather demand puts both placements and accommodation costs under strain.",
    effect: "Household pressure +1 point and unit cost +2% for this turn.",
    tone: "modelled",
  },
  {
    id: "development",
    title: "New development",
    bulletin: "A development partner offers a limited batch of settled homes at a discount.",
    effect: "Acquisition cost −8% and annual acquisition cap +20% for this turn.",
    tone: "signal",
  },
];

function hash(value: string) {
  return Array.from(value).reduce((total, character) => total + character.charCodeAt(0), 0);
}

/** Five reproducible events per borough, selected from the six-card deck. */
export function eventDeck(boroughCode: string): GameEvent[] {
  const start = hash(boroughCode) % GAME_EVENTS.length;
  return Array.from({ length: 5 }, (_, index) => GAME_EVENTS[(start + index) % GAME_EVENTS.length] as GameEvent);
}

export function configForEvent(base: Config, event: GameEvent): Config {
  const assumptions: Assumptions = { ...base.assumptions };
  let envelope = base.envelope;
  let unitCost = base.unitCost;

  if (event.id === "rents") unitCost *= 1.06;
  if (event.id === "repairs") assumptions.newRepairs *= 1.15;
  if (event.id === "grant") envelope *= 1.08;
  if (event.id === "landlord") assumptions.growth += 0.015;
  if (event.id === "winter") {
    assumptions.growth += 0.01;
    unitCost *= 1.02;
  }
  if (event.id === "development") {
    assumptions.purchaseCost *= 0.92;
    assumptions.acquireCap = Math.round(assumptions.acquireCap * 1.2);
  }

  return { ...base, envelope, unitCost, assumptions };
}

export function baselinePolicy(config: Config): Policy {
  return { ta: Math.min(config.envelope, config.openingTA * config.unitCost), voids: 0, acquire: 0, repairs: 0 };
}

/** Event-aware baseline: the same external shocks, but no additional investment. */
export function runEventBaseline(base: Config, deck: GameEvent[]): Year[] {
  let state: State = initial(base);
  return deck.map((event) => {
    const config = configForEvent(base, event);
    const year = stepYear(state, baselinePolicy(config), config);
    state = year.state;
    return year;
  });
}