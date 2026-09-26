import { describe, expect, it } from "vitest";
import { boroughAssumptions, getBorough, makeConfig } from "@/lib/data";
import { stepYear, initial } from "./engine";
import { baselinePolicy, configForEvent, eventDeck, GAME_EVENTS, runEventBaseline } from "./events";

const borough = getBorough("E09000025");
const base = makeConfig(borough, boroughAssumptions(borough));

describe("HOUSEOPOLY event layer", () => {
  it("returns the same five-card deck for a borough", () => {
    expect(eventDeck(borough.code).map((event) => event.id)).toEqual(eventDeck(borough.code).map((event) => event.id));
    expect(eventDeck(borough.code)).toHaveLength(5);
  });

  it("applies event effects without mutating the base config", () => {
    const rentEvent = GAME_EVENTS.find((event) => event.id === "rents");
    expect(rentEvent).toBeDefined();
    if (!rentEvent) return;
    const adjusted = configForEvent(base, rentEvent);
    expect(adjusted.unitCost).toBeCloseTo(base.unitCost * 1.06);
    expect(base.unitCost).not.toBe(adjusted.unitCost);
  });

  it("keeps allocations inside the annual envelope", () => {
    const event = eventDeck(borough.code)[0];
    expect(event).toBeDefined();
    if (!event) return;
    const config = configForEvent(base, event);
    const policy = baselinePolicy(config);
    expect(Object.values(policy).reduce((sum, value) => sum + value, 0)).toBeLessThanOrEqual(config.envelope);
    expect(() => stepYear(initial(config), policy, config)).not.toThrow();
  });

  it("runs exactly five comparable baseline years", () => {
    const years = runEventBaseline(base, eventDeck(borough.code));
    expect(years).toHaveLength(5);
    expect(years.map((year) => year.state.year)).toEqual([1, 2, 3, 4, 5]);
  });
});