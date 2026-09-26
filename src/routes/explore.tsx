import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  boroughAssumptions,
  boroughs,
  dateLabel,
  defaultAssumptions,
  fmt,
  getBorough,
  makeConfig,
  money,
} from "@/lib/data";
import { compare, runScenario, type Assumptions, type Policy } from "@/lib/model/engine";
import { Counter, SectionHeading, Source, Tag } from "@/components/site/bits";
import { AllocationBar, AssumptionEditor } from "@/components/explore/controls";
import { Trajectory } from "@/components/explore/Trajectory";
import { HousingBlocks } from "@/components/explore/HousingBlocks";

type Search = { b?: string };

export const Route = createFileRoute("/explore")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    b: typeof search["b"] === "string" ? search["b"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Explore the boroughs — HOUSEOPOLY" },
      {
        name: "description",
        content:
          "Pick any London borough, move the levers on re-lets, repairs and acquisition, and watch five years of modelled consequences.",
      },
      { property: "og:title", content: "Explore the boroughs — HOUSEOPOLY" },
      {
        property: "og:description",
        content:
          "Real borough data, editable assumptions, and a five-year model of what housing money buys.",
      },
    ],
  }),
  component: Explore,
});

const ZERO: Policy = { ta: 0, voids: 0, acquire: 0, repairs: 0 };

function Explore() {
  const { b: searchCode } = Route.useSearch();
  const [code, setCode] = useState(searchCode ?? "E09000025");
  useEffect(() => {
    if (searchCode) setCode(searchCode);
  }, [searchCode]);

  const borough = getBorough(code);
  const [a, setA] = useState<Assumptions>(() => boroughAssumptions(getBorough(code)));
  const [spend, setSpend] = useState<Policy>({ ...ZERO });

  function select(next: string) {
    setCode(next);
    setA(boroughAssumptions(getBorough(next)));
    setSpend({ ...ZERO });
  }
  function reset() {
    setA(boroughAssumptions(borough));
    setSpend({ ...ZERO });
  }

  const config = useMemo(() => makeConfig(borough, a), [borough, a]);
  const { player, baseline, result } = useMemo(() => {
    const policy = { ...spend, ta: 0 };
    const p = runScenario(policy, config);
    const base = runScenario({ ...ZERO }, config);
    return { player: p, baseline: base, result: compare(p, base) };
  }, [spend, config]);

  const yearFive = player[4]!;
  const envelopeM = (config.envelope * 0.35) / 1e6;
  const restoredHomes = Math.min(
    a["voidPool"] ?? 0,
    Math.floor(spend.voids / (a["voidCost"] ?? 1)) * 5,
  );

  const [live, setLive] = useState("");
  useEffect(() => {
    const t = setTimeout(
      () => setLive(`Year five: ${fmt(yearFive.state.ta)} households in temporary accommodation.`),
      600,
    );
    return () => clearTimeout(t);
  }, [yearFive.state.ta]);

  return (
    <section className="mx-auto max-w-[1400px] px-4 py-12 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading eyebrow="The borough sandbox" title={<>Room to change<br />{borough.name}.</>}>
          <p>Move one lever. Follow the consequences over five years.</p>
        </SectionHeading>
        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Choose an authority
          <select
            value={borough.code}
            onChange={(e) => select(e.target.value)}
            className="display border-2 border-signal bg-background px-4 py-3 text-xl text-foreground"
          >
            {boroughs.map((x) => (
              <option key={x.code} value={x.code}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {borough.modelled.length > 0 && (
        <p className="mt-6 flex flex-wrap items-center gap-3 border-2 border-modelled bg-surface p-4 text-sm">
          <Tag kind="modelled" />
          <span className="text-muted-foreground">
            {borough.name} does not report every figure in this release. Where a value is missing it
            is filled from the London average and labelled modelled — never treated as observed, and
            never shown as zero.
          </span>
        </p>
      )}

      {/* Observed facts */}
      <div className="mt-8 grid gap-px border-2 border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Households in TA",
            value: fmt(borough.taEff),
            detail: "31 March 2025",
            src: "ta-202503",
            modelled: borough.ta == null,
          },
          {
            label: "Gross direct TA spending",
            value: money(borough.grossEff),
            detail: "2024–25 · excludes administration",
            src: "ro4",
            modelled: borough.gross == null,
          },
          {
            label: "Council-owned vacancies",
            value: fmt(borough.councilVacants),
            detail: "31 March 2025 · eligibility unknown",
            src: "vacants",
            modelled: borough.councilVacants == null,
          },
          {
            label: "All-tenure empty dwellings",
            value: fmt(borough.allVacants),
            detail: "7 October 2024 · not a council pool",
            src: "vacants",
            modelled: borough.allVacants == null,
          },
        ].map((f) => (
          <article key={f.label} className="bg-background p-5">
            <Tag kind={f.modelled ? "modelled" : "observed"} />
            <h3 className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {f.label}
            </h3>
            <strong className="display mt-2 block text-4xl">{f.value}</strong>
            <p className="mt-1 text-xs text-muted-foreground">{f.detail}</p>
            <div className="mt-2">
              <Source id={f.src} />
            </div>
          </article>
        ))}
      </div>

      {/* Levers + consequences */}
      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <div className="flex items-center justify-between gap-4">
            <h2 className="display text-3xl">Your annual policy</h2>
            <button onClick={reset} className="text-xs uppercase tracking-[0.16em] text-signal">
              Reset to baseline ↺
            </button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Repeated every year for five years from April 2025. Baseline: no additional
            intervention. All delivery and repair inputs are assumptions.
          </p>

          <div className="mt-6 space-y-4">
            <AllocationBar
              label="Return empty council homes"
              value={spend.voids / 1e6}
              max={Math.max(1, Math.round(envelopeM * 0.4))}
              onChange={(v) => setSpend({ ...spend, voids: v * 1e6 })}
              hint={`${fmt(a["voidPool"])} assumed eligible homes · ${money(a["voidCost"] ?? 0)} each · ${a["lag"]}-year lag. Illustrative pool, not a verified council list.`}
            />
            <AllocationBar
              label="Acquire settled homes"
              tone="modelled"
              value={spend.acquire / 1e6}
              max={Math.max(1, Math.round(envelopeM))}
              step={0.5}
              onChange={(v) => setSpend({ ...spend, acquire: v * 1e6 })}
              hint={`${money(a["purchaseCost"] ?? 0)} all-in per home · ${Math.round((a["suitability"] ?? 0) * 100)}% suitable · ${a["lag"]}-year lag.`}
            />
            <AllocationBar
              label="Repair & improve homes"
              tone="alert"
              value={spend.repairs / 1e6}
              max={Math.max(1, Math.round(envelopeM * 0.4))}
              onChange={(v) => setSpend({ ...spend, repairs: v * 1e6 })}
              hint={`${Math.round((a["repairShare"] ?? 0) * 100)}% repairs / ${Math.round((1 - (a["repairShare"] ?? 0)) * 100)}% retrofit. Illustrative backlog; occupied-home repairs create no extra housing.`}
            />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <HousingBlocks
              label="Empty homes returned"
              total={a["voidPool"] ?? 0}
              occupied={restoredHomes}
              caption="Over five years, at your funding level."
            />
            <HousingBlocks
              label="Repair backlog cleared"
              tone="alert"
              total={a["repairBacklog"] ?? 0}
              occupied={Math.max(0, (a["repairBacklog"] ?? 0) - result.backlog)}
              caption="Occupied homes brought back to standard."
              unitLabel="cases"
            />
          </div>

          <p className="mt-6 border-l-2 border-alert pl-4 text-sm text-muted-foreground">
            Accommodation still has to be paid for. Any funding gap is carried into the results; it
            never removes households from the system.
          </p>
        </div>

        {/* Results */}
        <div className="border-2 border-border bg-surface p-5 md:p-7">
          <div className="flex flex-wrap items-center gap-3">
            <Tag kind="modelled">Modelled · year five</Tag>
            <span className="text-xs text-muted-foreground">Projection, not a forecast</span>
          </div>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-b-2 border-border pb-5">
            <div>
              <strong className="display block text-6xl text-signal">
                <Counter value={yearFive.state.ta} format={(n) => fmt(n)} />
              </strong>
              <span className="mt-1 block text-sm text-muted-foreground">
                households still in temporary accommodation
              </span>
            </div>
            <div className="text-right">
              <strong className="display block text-3xl text-alert">
                <Counter value={result.householdDifference} format={(n) => fmt(n)} /> fewer
              </strong>
              <span className="text-xs text-muted-foreground">than the modelled baseline</span>
            </div>
          </div>

          <div className="mt-6">
            <Trajectory player={player} baseline={baseline} opening={borough.taEff} />
          </div>

          <dl className="mt-6 grid gap-px border-2 border-border bg-border sm:grid-cols-2">
            {[
              ["Additional settled placements", fmt(result.additionalPlacements)],
              ["Gross TA cost avoided", money(result.grossAvoided)],
              ["Interventions spent", money(result.interventionCost)],
              [
                result.netSaving >= 0 ? "Net programme saving" : "Net additional programme cost",
                money(Math.abs(result.netSaving)),
              ],
              ["Modelled repair backlog", fmt(result.backlog)],
              ["Additional funding required", money(result.funding)],
            ].map(([label, value]) => (
              <div key={label} className="bg-background p-4">
                <dd className="display text-3xl">{value}</dd>
                <dt className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  {label}
                </dt>
              </div>
            ))}
          </dl>

          <p className="mt-4 text-xs text-muted-foreground">
            This scenario uses the assumptions below; it is not a forecast of council performance.
            Costs include capital and added-home operation, in fixed 2024–25 prices.
          </p>
        </div>
      </div>

      <p role="status" className="sr-only">
        {live}
      </p>

      <AssumptionEditor a={a} setA={setA} />

      <details className="mt-4 border-2 border-border p-5">
        <summary className="cursor-pointer text-sm font-bold uppercase tracking-[0.16em]">
          Observed history and the annual cost proxy
        </summary>
        <p className="mt-3 text-sm text-muted-foreground">
          Gross direct TA cost ÷ mean of four quarter-end stocks = annual occupied-household cost
          proxy. For {borough.name}: {borough.gross == null ? "not reported" : money(borough.gross)}{" "}
          ÷ {fmt(borough.annualAverage)} ={" "}
          {borough.taUnitCost == null
            ? `${money(borough.unitCostEff)} (London average, modelled)`
            : money(borough.taUnitCost)}
          . This is not cost per distinct household served.
        </p>
        <div className="mt-4 overflow-auto">
          <table className="w-full text-sm">
            <thead className="eyebrow">
              <tr className="border-b-2 border-border text-left">
                <th className="py-1">Quarter end</th>
                <th className="py-1 text-right">Observed TA households</th>
              </tr>
            </thead>
            <tbody>
              {borough.history.map((h) => (
                <tr key={h.date} className="border-b border-border">
                  <th className="py-1 text-left font-medium">{dateLabel(h.date)}</th>
                  <td className="tabular py-1 text-right">{fmt(h.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <Source id="ta-202503">MHCLG quarterly tables</Source>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          RO4 income: {borough.income == null ? "not reported" : money(borough.income)}. Net direct
          expenditure: {borough.net == null ? "not reported" : money(borough.net)}. The scenario
          consistently uses gross costs.
        </p>
      </details>
    </section>
  );
}
