/**
 * Council vs Speculator — auction game layer.
 *
 * This module is a *game* layer. It never changes the housing model in
 * src/lib/model/engine.ts. It reads observed borough figures (temporary
 * accommodation households, annual unit cost, council-owned vacancies) and
 * illustrative assumptions (purchase cost, repair share) to size a short,
 * deterministic auction. Every derived figure here is a projection, not an
 * observation, and the UI labels it as such.
 */

import type { Borough } from "@/lib/data";
import { defaultAssumptions } from "@/lib/data";

/* ------------------------------------------------------------------ *
 * Deterministic randomness: the same borough always plays the same deck,
 * so a result can be checked and compared.
 * ------------------------------------------------------------------ */

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ *
 * Characters
 * ------------------------------------------------------------------ */

export type SpeculatorId = "vance" | "keybox" | "apex" | "higgins";

export type Speculator = {
  id: SpeculatorId;
  name: string;
  archetype: string;
  blurb: string;
  /** Multiplier applied to a lot's guide price when they bid. */
  aggression: number;
  /** Lot kinds this character chases hardest. */
  appetite: LotKind[];
  winLine: string;
  loseLine: string;
  /** What happens to the property if they take it. */
  outcome: string;
  tone: "alert" | "modelled" | "signal";
  /** 10x10 pixel portrait. Key maps into `palette`. */
  art: string[];
  palette: Record<string, string>;
};

const BASE_PALETTE = {
  ".": "transparent",
  k: "var(--color-background)",
  o: "var(--color-foreground)",
};

export const SPECULATORS: Speculator[] = [
  {
    id: "vance",
    name: 'Sir Rupert "Buy-to-Let" Vance',
    archetype: "Legacy landlord portfolio",
    blurb:
      "Owns 240 doors across four boroughs. Buys family terraces and carves them into six micro-studios.",
    aggression: 1.18,
    appetite: ["terrace", "exCouncil"],
    winLine: "Supply and demand, darling. Rents go up in November.",
    loseLine: "My solicitors will hear about this!",
    outcome: "Split into micro-studios at market rent",
    tone: "alert",
    art: [
      "..oooooo..",
      ".oggggggo.",
      ".ogssssgo.",
      ".osswwsso.",
      ".oswbwbso.",
      ".osssrsso.",
      "..osssso..",
      ".ottttttо.",
      "otwtttwtto",
      "ot.tttt.to",
    ],
    palette: {
      ...BASE_PALETTE,
      g: "#6b4a2f",
      s: "#e8bd96",
      w: "#ffffff",
      b: "#2b2b2b",
      r: "#a8423a",
      t: "#7b6240",
      о: "var(--color-foreground)",
    },
  },
  {
    id: "keybox",
    name: 'Chloe "The Keybox Queen"',
    archetype: "Short-let operator",
    blurb:
      "Runs 60 self-check-in listings. Turns tube-side flats into £280-a-night weekend lets.",
    aggression: 1.32,
    appetite: ["newBuild", "exCouncil"],
    winLine: "Check-in code sent. Bye-bye long-term tenants.",
    loseLine: "Ugh. That was going to be five-star.",
    outcome: "Listed as a nightly short-let",
    tone: "modelled",
    art: [
      "..pppppp..",
      ".pyyyyyyp.",
      ".pysssyyp.",
      ".pssssssp.",
      ".pbbbbbbp.",
      ".psssrssp.",
      "..ossssо..",
      ".ecccccce.",
      "eccccccccе",
      "ec.cccc.ce",
    ],
    palette: {
      ...BASE_PALETTE,
      p: "#c9a227",
      y: "#f2d675",
      s: "#f0c9a8",
      b: "#1d1d1d",
      r: "#c2506b",
      c: "#2f7d6a",
      e: "var(--color-foreground)",
      о: "var(--color-foreground)",
    },
  },
  {
    id: "apex",
    name: "Apex Offshore Capital",
    archetype: "Buy-to-leave fund",
    blurb:
      "An algorithm with a registered office. Parks capital in whole blocks and leaves them dark.",
    aggression: 1.55,
    appetite: ["newBuild", "block"],
    winLine: "ASSET SECURED. OCCUPANCY: 0%.",
    loseLine: "ERROR. BID REJECTED. RECALCULATING.",
    outcome: "Held empty as an investment asset",
    tone: "modelled",
    art: [
      "oooooooooo",
      "ognnnnnngo",
      "ogn.nn.ngo",
      "ognnnnnngo",
      "ogn.nnn.go",
      "ognnnnnngo",
      "oooooooooo",
      "..oaaaao..",
      ".oaaaaaao.",
      "oaaaaaaaao",
    ],
    palette: {
      ...BASE_PALETTE,
      g: "#0d2b22",
      n: "#00e5a0",
      a: "#1b1b24",
    },
  },
  {
    id: "higgins",
    name: 'Terry "Cash Buyer" Higgins',
    archetype: "Flipper & emergency B&B supplier",
    blurb:
      "Buys damp wrecks, paints over the mould, then leases them back to the council nightly.",
    aggression: 1.05,
    appetite: ["derelict", "terrace", "block"],
    winLine: "I'll rent it back to you at £180 a night, mate.",
    loseLine: "You'll regret that when winter hits!",
    outcome: "Leased back as nightly emergency accommodation",
    tone: "alert",
    art: [
      "..llllll..",
      ".lhhhhhhl.",
      ".lhssssh l",
      ".lsswwssl.",
      ".lswbwbsl.",
      ".lsssmssl.",
      "..lsssslll",
      ".jjjjjjjj.",
      "jjvvjjvvjj",
      "jj.jjjj.jj",
    ],
    palette: {
      ...BASE_PALETTE,
      l: "#3a3a3a",
      h: "#8a8a8a",
      s: "#e0b48f",
      w: "#ffffff",
      b: "#222222",
      m: "#8f4b4b",
      j: "#1f3a5f",
      v: "#d8c063",
      " ": "transparent",
    },
  },
];

export function speculatorById(id: SpeculatorId): Speculator {
  return SPECULATORS.find((s) => s.id === id) ?? SPECULATORS[0]!;
}

/* ------------------------------------------------------------------ *
 * Lots
 * ------------------------------------------------------------------ */

export type LotKind = "exCouncil" | "derelict" | "terrace" | "block" | "newBuild";

type LotTemplate = {
  kind: LotKind;
  title: string;
  story: string;
  units: [number, number];
  /** Price multiplier against the assumed purchase cost per home. */
  price: number;
  /** Can a compulsory repair / empty-homes route be used instead of buying? */
  repairRoute: boolean;
};

const TEMPLATES: LotTemplate[] = [
  {
    kind: "exCouncil",
    title: "Ex-right-to-buy flat, third floor",
    story: "Sold off in 1989. Back on the market at eleven times its original price.",
    units: [1, 1],
    price: 0.78,
    repairRoute: false,
  },
  {
    kind: "derelict",
    title: "Derelict Victorian terrace",
    story: "Empty for three years. Roof gone, garden a skip, owner unreachable.",
    units: [1, 2],
    price: 0.62,
    repairRoute: true,
  },
  {
    kind: "block",
    title: "Six-flat rental block, section 21 served",
    story: "Six households already have eviction notices on the mat.",
    units: [5, 7],
    price: 4.6,
    repairRoute: false,
  },
  {
    kind: "newBuild",
    title: "Off-plan riverside apartment",
    story: "Marketed in Singapore before it was marketed here.",
    units: [1, 1],
    price: 1.45,
    repairRoute: false,
  },
  {
    kind: "terrace",
    title: "Family house above a shuttered shop",
    story: "Four bedrooms, needs a kitchen and a boiler. Rare at this size.",
    units: [1, 2],
    price: 0.95,
    repairRoute: true,
  },
  {
    kind: "block",
    title: "Former care home, twelve rooms",
    story: "Closed last spring. Could be converted into settled family homes.",
    units: [6, 9],
    price: 3.9,
    repairRoute: true,
  },
  {
    kind: "derelict",
    title: "Fire-damaged maisonette pair",
    story: "Two homes, one insurance dispute, boarded up since the fire.",
    units: [2, 2],
    price: 0.7,
    repairRoute: true,
  },
  {
    kind: "exCouncil",
    title: "Two ex-council flats, same landing",
    story: "One landlord, two tenancies ending, same stairwell as your own stock.",
    units: [2, 3],
    price: 1.5,
    repairRoute: false,
  },
];

export type Lot = {
  id: string;
  kind: LotKind;
  title: string;
  story: string;
  /** Households that could be housed if it comes into council stock. */
  units: number;
  guidePrice: number;
  /** What the speculator will pay. Beat it to win the lot. */
  rivalBid: number;
  /** Your winning bid if you outbid. */
  outbidPrice: number;
  /** Cheaper route: repair order / empty-homes route. Null when unavailable. */
  repairOrderCost: number | null;
  /** Repair orders can be appealed. Deterministic per lot. */
  repairSucceeds: boolean;
  /** Households pushed into temporary accommodation if the speculator wins. */
  displaced: number;
  rival: Speculator;
};

export type AuctionSetup = {
  borough: Borough;
  budget: number;
  /** Annual emergency accommodation cost per household in this borough. */
  unitCost: number;
  lots: Lot[];
  headliner: Speculator;
};

const round = (n: number, to: number) => Math.round(n / to) * to;

export const LOT_COUNT = 6;

/** Build a short, deterministic auction for a borough from its real figures. */
export function buildAuction(b: Borough): AuctionSetup {
  const rand = rng(hashSeed(b.code));
  const purchaseCost = defaultAssumptions["purchaseCost"] ?? 450000;
  const repairShare = defaultAssumptions["repairShare"] ?? 0.5;

  // Capital pot: a share of the borough's annual temporary accommodation bill,
  // floored so every borough gets a playable auction. Illustrative, not a budget.
  const budget = Math.max(
    round(purchaseCost * 9, 500000),
    round(b.grossEff * 0.45, 500000),
  );

  const pool = [...TEMPLATES];
  const lots: Lot[] = [];
  for (let i = 0; i < LOT_COUNT; i++) {
    const pick = pool.splice(Math.floor(rand() * pool.length), 1)[0]!;
    const units = pick.units[0] + Math.round(rand() * (pick.units[1] - pick.units[0]));
    const guidePrice = round(purchaseCost * pick.price * (0.9 + rand() * 0.25), 5000);

    const candidates = SPECULATORS.filter((s) => s.appetite.includes(pick.kind));
    const rival = (candidates.length ? candidates : SPECULATORS)[
      Math.floor(rand() * (candidates.length || SPECULATORS.length))
    ]!;

    const rivalBid = round(guidePrice * rival.aggression * (0.95 + rand() * 0.15), 5000);
    lots.push({
      id: `lot-${i + 1}`,
      kind: pick.kind,
      title: pick.title,
      story: pick.story,
      units,
      guidePrice,
      rivalBid,
      outbidPrice: rivalBid + 5000,
      repairOrderCost: pick.repairRoute
        ? round(guidePrice * repairShare * 0.35, 5000)
        : null,
      repairSucceeds: rand() > 0.32,
      displaced: Math.max(1, Math.round(units * 0.75)),
      rival,
    });
  }

  const counts = new Map<SpeculatorId, number>();
  for (const l of lots) counts.set(l.rival.id, (counts.get(l.rival.id) ?? 0) + 1);
  const headliner =
    [...counts.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? "vance";

  return { borough: b, budget, unitCost: b.unitCostEff, lots, headliner: speculatorById(headliner) };
}

/* ------------------------------------------------------------------ *
 * Turn resolution
 * ------------------------------------------------------------------ */

export type Move = "outbid" | "repair" | "pass";

export type Resolution = {
  move: Move;
  won: boolean;
  spend: number;
  homes: number;
  housed: number;
  pushedToTA: number;
  headline: string;
  detail: string;
  speaker: "you" | "rival";
  line: string;
};

export function resolveLot(lot: Lot, move: Move, remaining: number): Resolution {
  if (move === "outbid") {
    if (remaining < lot.outbidPrice) {
      return {
        move,
        won: false,
        spend: 0,
        homes: 0,
        housed: 0,
        pushedToTA: lot.displaced,
        headline: "Out of capital",
        detail: `You could not cover ${lot.outbidPrice.toLocaleString("en-GB")}. The lot went to ${lot.rival.name}.`,
        speaker: "rival",
        line: lot.rival.winLine,
      };
    }
    return {
      move,
      won: true,
      spend: lot.outbidPrice,
      homes: lot.units,
      housed: lot.units,
      pushedToTA: 0,
      headline: `Secured for social rent — ${lot.units} ${lot.units === 1 ? "home" : "homes"}`,
      detail: `${lot.rival.name} dropped out. ${lot.units} ${lot.units === 1 ? "household moves" : "households move"} out of temporary accommodation.`,
      speaker: "rival",
      line: lot.rival.loseLine,
    };
  }

  if (move === "repair" && lot.repairOrderCost != null) {
    if (remaining < lot.repairOrderCost) {
      return {
        move,
        won: false,
        spend: 0,
        homes: 0,
        housed: 0,
        pushedToTA: lot.displaced,
        headline: "Out of capital",
        detail: "No funds left to serve the order. The lot sold on.",
        speaker: "rival",
        line: lot.rival.winLine,
      };
    }
    if (lot.repairSucceeds) {
      return {
        move,
        won: true,
        spend: lot.repairOrderCost,
        homes: lot.units,
        housed: lot.units,
        pushedToTA: 0,
        headline: `Empty-homes order served — ${lot.units} back in use`,
        detail:
          "The owner surrendered the property for social rent rather than pay for the works. A fraction of the purchase price.",
        speaker: "you",
        line: "Cheaper than a bidding war, and the homes still come back.",
      };
    }
    return {
      move,
      won: false,
      spend: Math.round(lot.repairOrderCost * 0.4),
      homes: 0,
      housed: 0,
      pushedToTA: lot.displaced,
      headline: "Order appealed — and lost",
      detail:
        "The owner appealed, the tribunal sided with them, and your legal costs still landed.",
      speaker: "rival",
      line: lot.rival.winLine,
    };
  }

  return {
    move: "pass",
    won: false,
    spend: 0,
    homes: 0,
    housed: 0,
    pushedToTA: lot.displaced,
    headline: `Lost to ${lot.rival.archetype.toLowerCase()}`,
    detail: `${lot.rival.outcome}. ${lot.displaced} more ${lot.displaced === 1 ? "household goes" : "households go"} into temporary accommodation.`,
    speaker: "rival",
    line: lot.rival.winLine,
  };
}

/* ------------------------------------------------------------------ *
 * Curveballs
 * ------------------------------------------------------------------ */

export type Curveball = {
  id: string;
  title: string;
  text: string;
  tone: "signal" | "alert";
  /** Applied to remaining capital. */
  capital: number;
};

export function curveballFor(setup: AuctionSetup, lotIndex: number): Curveball | null {
  if (lotIndex !== 2 && lotIndex !== 4) return null;
  const rand = rng(hashSeed(setup.borough.code + lotIndex));
  const deck: Curveball[] = [
    {
      id: "grant",
      title: "Emergency acquisitions grant",
      text: "A central government pot lands mid-auction. More capital, same clock.",
      tone: "signal",
      capital: round(setup.budget * 0.18, 100000),
    },
    {
      id: "legal",
      title: "Landlord guild files a challenge",
      text: "Legal fees come straight out of your acquisitions pot.",
      tone: "alert",
      capital: -round(setup.budget * 0.08, 50000),
    },
    {
      id: "winter",
      title: "Winter freeze",
      text: "Nightly hotel rates jump. Emergency spending eats into capital.",
      tone: "alert",
      capital: -round(setup.budget * 0.11, 50000),
    },
    {
      id: "rtb",
      title: "Right-to-buy receipts released",
      text: "Retained receipts are cleared for acquisitions this quarter.",
      tone: "signal",
      capital: round(setup.budget * 0.12, 100000),
    },
  ];
  return deck[Math.floor(rand() * deck.length)]!;
}

/* ------------------------------------------------------------------ *
 * Scoring
 * ------------------------------------------------------------------ */

export type Score = {
  spend: number;
  homes: number;
  housed: number;
  pushedToTA: number;
  lotsWon: number;
  lotsLost: number;
};

export const EMPTY_SCORE: Score = {
  spend: 0,
  homes: 0,
  housed: 0,
  pushedToTA: 0,
  lotsWon: 0,
  lotsLost: 0,
};

export function applyResolution(score: Score, r: Resolution): Score {
  return {
    spend: score.spend + r.spend,
    homes: score.homes + r.homes,
    housed: score.housed + r.housed,
    pushedToTA: score.pushedToTA + r.pushedToTA,
    lotsWon: score.lotsWon + (r.won ? 1 : 0),
    lotsLost: score.lotsLost + (r.won ? 0 : 1),
  };
}

/** Annual emergency accommodation cost avoided by the homes secured. */
export function avoidedCost(score: Score, unitCost: number): number {
  return Math.round(score.housed * unitCost);
}

export function grade(score: Score): { title: string; note: string } {
  const net = score.housed - score.pushedToTA;
  if (score.lotsWon >= 5) return { title: "Borough turned", note: "You outbid the market almost everywhere. Rare, and expensive." };
  if (net >= 6) return { title: "Ground taken", note: "More families housed than displaced. A good year by any council's standard." };
  if (net >= 1) return { title: "Holding the line", note: "Just ahead. This is what most boroughs manage on a good day." };
  if (net === 0) return { title: "Stalemate", note: "Every home you saved was matched by one you lost." };
  return { title: "Outbid", note: "The private market moved faster than the capital programme. This is the usual result." };
}
