import { describe, expect, it } from "vitest";
import { boroughs, getBorough } from "@/lib/data";
import {
  applyResolution,
  buildAuction,
  EMPTY_SCORE,
  LOT_COUNT,
  resolveLot,
} from "./auction";

const newham = getBorough("E09000025");

describe("auction setup", () => {
  it("is deterministic for a borough", () => {
    expect(buildAuction(newham)).toEqual(buildAuction(newham));
  });

  it("builds a playable auction for every borough", () => {
    for (const b of boroughs) {
      const a = buildAuction(b);
      expect(a.lots).toHaveLength(LOT_COUNT);
      expect(a.budget).toBeGreaterThan(0);
      for (const lot of a.lots) {
        expect(lot.units).toBeGreaterThan(0);
        expect(lot.outbidPrice).toBeGreaterThan(lot.rivalBid);
      }
    }
  });
});

describe("resolving a lot", () => {
  const lot = buildAuction(newham).lots[0]!;

  it("houses households when you can afford to outbid", () => {
    const r = resolveLot(lot, "outbid", lot.outbidPrice);
    expect(r.won).toBe(true);
    expect(r.housed).toBe(lot.units);
    expect(r.spend).toBe(lot.outbidPrice);
  });

  it("loses the lot when capital runs out", () => {
    const r = resolveLot(lot, "outbid", 0);
    expect(r.won).toBe(false);
    expect(r.spend).toBe(0);
    expect(r.pushedToTA).toBe(lot.displaced);
  });

  it("passing never spends money", () => {
    expect(resolveLot(lot, "pass", 1e9).spend).toBe(0);
  });

  it("accumulates into the score", () => {
    const r = resolveLot(lot, "outbid", 1e9);
    const s = applyResolution(EMPTY_SCORE, r);
    expect(s.lotsWon).toBe(1);
    expect(s.homes).toBe(lot.units);
  });
});
