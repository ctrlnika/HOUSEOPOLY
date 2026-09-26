import boroughsRaw from "../../public/data/boroughs.json";
import manifestRaw from "../../public/data/manifest.json";
import assumptionsRaw from "../../public/data/assumptions.json";
import sourcesRaw from "../../public/data/sources.json";
import registerRaw from "../../public/data/dataset-register.json";
import evidenceRaw from "../../public/data/evidence-cards.json";
import challengeRaw from "../../public/data/challenge.json";
import type { Assumptions, Config } from "./model/engine";

export type RawBorough = (typeof boroughsRaw)[number];
export type SourceRecord = (typeof sourcesRaw)[number];

export const manifest = manifestRaw;
export const assumptionSpecs = assumptionsRaw;
export const sources = sourcesRaw;
export const register = registerRaw;
export const evidence = evidenceRaw;
export const challenge = challengeRaw;

export const defaultAssumptions = Object.fromEntries(
  assumptionsRaw.map((a) => [a.id, a.value]),
) as Assumptions;

/* ------------------------------------------------------------------ *
 * London-level reference values, derived only from observed records.
 * Used to fill gaps for authorities with missing figures. Every filled
 * value is flagged so the UI can label it "modelled, not observed".
 * ------------------------------------------------------------------ */

const observedTa = boroughsRaw.filter((b) => b.ta != null);
const londonRatePer1000 =
  (1000 * observedTa.reduce((s, b) => s + (b.ta ?? 0), 0)) /
  observedTa.reduce((s, b) => s + b.households, 0);

const unitCostBase = boroughsRaw.filter((b) => b.gross != null && b.annualAverage != null);
const londonUnitCost =
  unitCostBase.reduce((s, b) => s + (b.gross ?? 0), 0) /
  unitCostBase.reduce((s, b) => s + (b.annualAverage ?? 0), 0);

const growthBase = boroughsRaw.filter((b) => b.stockGrowth != null);
const londonGrowth =
  growthBase.reduce((s, b) => s + (b.stockGrowth ?? 0), 0) / growthBase.length;

/** Reference authority for the illustrative restoration / repair pools. */
const REFERENCE_CODE = challengeRaw.boroughCode;
const reference = boroughsRaw.find((b) => b.code === REFERENCE_CODE)!;

export type Borough = RawBorough & {
  /** Effective values: observed where available, otherwise London-average fill. */
  taEff: number;
  rateEff: number;
  grossEff: number;
  unitCostEff: number;
  growthEff: number;
  /** Field names whose effective value is modelled rather than observed. */
  modelled: string[];
  isFullyObserved: boolean;
};

function build(b: RawBorough): Borough {
  const modelled: string[] = [];
  const rateEff = b.rate ?? londonRatePer1000;
  if (b.rate == null) modelled.push("rate");
  const taEff = b.ta ?? Math.round((rateEff * b.households) / 1000);
  if (b.ta == null) modelled.push("ta");
  const unitCostEff = b.taUnitCost ?? londonUnitCost;
  if (b.taUnitCost == null) modelled.push("taUnitCost");
  const grossEff = b.gross ?? Math.round(taEff * unitCostEff);
  if (b.gross == null) modelled.push("gross");
  const growthEff = b.stockGrowth ?? londonGrowth;
  if (b.stockGrowth == null) modelled.push("stockGrowth");
  return {
    ...b,
    taEff,
    rateEff,
    grossEff,
    unitCostEff,
    growthEff,
    modelled,
    isFullyObserved: modelled.length === 0,
  };
}

export const boroughs: Borough[] = boroughsRaw.map(build);
export const londonReference = {
  ratePer1000: londonRatePer1000,
  unitCost: londonUnitCost,
  growth: londonGrowth,
};

export function getBorough(code: string): Borough {
  return boroughs.find((b) => b.code === code) ?? boroughs.find((b) => b.code === REFERENCE_CODE)!;
}

/** London-wide annual gross direct TA spend, summing observed borough outturns. */
export const londonGrossSpend = boroughsRaw.reduce((s, b) => s + (b.gross ?? 0), 0);
export const londonGrossReported = boroughsRaw.filter((b) => b.gross != null).length;

/* ------------------------------------------------------------------ *
 * Scenario configuration
 * ------------------------------------------------------------------ */

/**
 * Per-borough illustrative pools. The reference authority keeps the published
 * defaults (150 eligible homes, 1,200 qualifying repairs). Other authorities
 * scale those same illustrative figures by council-owned vacancies and by
 * household count respectively. These are assumptions, never observations.
 */
export function boroughAssumptions(b: Borough, base: Assumptions = defaultAssumptions): Assumptions {
  const voidScale =
    b.councilVacants != null && reference.councilVacants
      ? b.councilVacants / reference.councilVacants
      : b.households / reference.households;
  const repairScale = b.households / reference.households;
  return {
    ...base,
    growth: b.growthEff,
    voidPool: Math.max(0, Math.round((base["voidPool"] ?? 0) * voidScale)),
    repairBacklog: Math.max(0, Math.round((base["repairBacklog"] ?? 0) * repairScale)),
    retrofitPool: Math.max(0, Math.round((base["retrofitPool"] ?? 0) * repairScale)),
  };
}

export function makeConfig(b: Borough, a: Assumptions): Config {
  return {
    openingTA: b.taEff,
    unitCost: b.unitCostEff,
    envelope: b.grossEff * 1.2,
    assumptions: a,
  };
}

/* ------------------------------------------------------------------ *
 * Formatting
 * ------------------------------------------------------------------ */

export const fmt = (n: number | null | undefined) =>
  n == null ? "Not available" : Math.round(n).toLocaleString("en-GB");

/**
 * Compact currency, written by hand rather than with Intl compact notation:
 * server and browser ICU data disagree on trailing zeros ("£40K" vs "£40.0K"),
 * which breaks hydration.
 */
export const money = (n: number) => {
  const sign = n < 0 ? "-" : "";
  const v = Math.abs(n);
  const unit = v >= 1e9 ? 1e9 : v >= 1e6 ? 1e6 : v >= 1e3 ? 1e3 : 1;
  const suffix = unit === 1e9 ? "bn" : unit === 1e6 ? "m" : unit === 1e3 ? "k" : "";
  const scaled = v / unit;
  const text =
    unit === 1
      ? Math.round(scaled).toString()
      : scaled >= 100
        ? Math.round(scaled).toString()
        : scaled.toFixed(1).replace(/\.0$/, "");
  return `${sign}£${text}${suffix}`;
};

export const moneyExact = (n: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(n);

export const dateLabel = (s: string) =>
  new Date(s + "T12:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const sourceById = (id: string): SourceRecord | undefined => sources.find((s) => s.id === id);
