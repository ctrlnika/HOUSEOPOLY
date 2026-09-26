import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  boroughAssumptions,
  challenge,
  evidence,
  fmt,
  getBorough,
  makeConfig,
  money,
} from "@/lib/data";
import {
  compare,
  initial,
  runScenario,
  stepYear,
  type Assumptions,
  type Policy,
  type Year,
} from "@/lib/model/engine";
import { Source, Tag } from "@/components/site/bits";
import { AllocationBar, AssumptionEditor } from "@/components/explore/controls";
import { Trajectory } from "@/components/explore/Trajectory";

export const Route = createFileRoute("/challenge")({
  head: () => ({
    meta: [
      { title: "Housing Director Challenge — HOUSEOPOLY" },
      {
        name: "description",
        content:
          "Take the chair for five years in Newham: split the budget between accommodation, repairs, re-lets and new homes, and live with the modelled consequences.",
      },
      { property: "og:title", content: "Housing Director Challenge — HOUSEOPOLY" },
      {
        property: "og:description",
        content: "Five years, one borough, a budget under pressure. Built on real 2024–25 data.",
      },
    ],
  }),
  component: Challenge,
});

const borough = getBorough(challenge.boroughCode);

function Outcome({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background p-4">
      <strong className="display block text-3xl">{value}</strong>
      <span className="mt-1 block text-xs uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function Ledger({ y }: { y: Year }) {
  const rows: [string, number][] = [
    ["Available envelope + opening reserve", y.available],
    ["TA allocation (preview only)", y.policy.ta],
    ["Initially unallocated", y.available - Object.values(y.policy).reduce((s, v) => s + v, 0)],
    ["Actual accommodation cost", y.taCost],
    ["Actual intervention spend", y.interventionCost],
    ["Added-home operating cost", y.operatingCost],
    ["Actual total cost", y.totalCost],
    ["Closing reserve", y.state.reserve],
    ["External funding this year", y.funding],
    ["Cumulative external funding", y.state.funding],
  ];
  return (
    <details className="mt-3 border-2 border-border p-4">
      <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.16em]">
        Inspect year {y.state.year} funding ledger
      </summary>
      <table className="mt-3 w-full text-sm">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-border">
              <th className="py-1 text-left font-medium">{k}</th>
              <td className="tabular py-1 text-right">{money(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-muted-foreground">
        Unused category allocations can cover other costs in this simplified game. The TA allocation
        shortfall is a preview, not an extra debt. External funding never increases next year&apos;s
        envelope.
      </p>
    </details>
  );
}

function EvidenceCard({ index }: { index: number }) {
  const card = evidence[Math.min(index, evidence.length - 1)]!;
  return (
    <div className="mt-4 border-2 border-signal p-4">
      <span className="pixel text-xs uppercase tracking-[0.18em] text-signal">
        Why this matters
      </span>
      <h3 className="display mt-2 text-xl">{card.title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{card.text}</p>
      <div className="mt-2">
        <Source id={card.sourceId} /> <span className="text-xs text-muted-foreground">{card.locator}</span>
      </div>
    </div>
  );
}

function Challenge() {
  const [a, setA] = useState<Assumptions>(() => boroughAssumptions(borough));
  const [years, setYears] = useState<Year[]>([]);
  const [review, setReview] = useState(false);
  const config = makeConfig(borough, a);
  const opening = years.at(-1)?.state ?? initial(config);
  const available = config.envelope + opening.reserve;
  const [policy, setPolicy] = useState<Policy>({ ...challenge.baselinePolicy });
  const summary = useRef<HTMLHeadingElement>(null);
  const lock = useRef(false);

  const baseline = runScenario(challenge.baselinePolicy, config);
  const done = years.length === 5;
  const preview = !done ? stepYear(opening, policy, config) : null;
  const total = Object.values(policy).reduce((s, v) => s + v, 0);
  const result = done ? compare(years, baseline) : null;

  function restart() {
    setYears([]);
    setPolicy({ ...challenge.baselinePolicy });
    setReview(false);
    setA(boroughAssumptions(borough));
    lock.current = false;
  }
  function commit() {
    if (lock.current || review || done) return;
    lock.current = true;
    setYears([...years, stepYear(opening, policy, config)]);
    setReview(true);
    setTimeout(() => summary.current?.focus(), 20);
  }
  function next() {
    setReview(false);
    setPolicy({ ...challenge.baselinePolicy });
    lock.current = false;
  }

  const keys: [keyof Policy, string, string, "signal" | "alert" | "modelled"][] = [
    [
      "ta",
      "Temporary accommodation",
      "Funds current accommodation need. Underfunding becomes a gap, not fewer households.",
      "alert",
    ],
    [
      "voids",
      "Faster re-lets",
      `${money(a["voidCost"] ?? 0)} per restored home. Limited eligible pool.`,
      "signal",
    ],
    [
      "repairs",
      "Repairs & retrofit",
      `${Math.round((a["repairShare"] ?? 0) * 100)}% repairs; the rest improves energy performance.`,
      "modelled",
    ],
    [
      "acquire",
      "Acquire settled homes",
      `${money(a["purchaseCost"] ?? 0)} per home. ${a["lag"]}-year delivery lag.`,
      "signal",
    ],
  ];

  return (
    <section className="mx-auto max-w-[1400px] px-4 py-12 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <span className="pixel text-xs uppercase tracking-[0.2em] text-alert">
            Housing Director · {borough.name}
          </span>
          <h1 className="display mt-3 text-5xl md:text-7xl">
            {done ? (
              <>
                Five years.
                <br />
                What changed?
              </>
            ) : (
              <>
                A place to stay.
                <br />
                A future to fund.
              </>
            )}
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Hypothetical April 2025 – March 2030 scenario, starting from observed 2024–25 data.
          </p>
        </div>
        <button onClick={restart} className="text-xs uppercase tracking-[0.16em] text-signal">
          Restart challenge ↺
        </button>
      </div>

      <div className="mt-8 grid gap-px border-2 border-border bg-border sm:grid-cols-3">
        <Outcome label="Observed opening TA households" value={fmt(borough.taEff)} />
        <Outcome label="Observed gross direct TA spend · 2024–25" value={money(borough.grossEff)} />
        <Outcome label="Assumed annual envelope" value={money(config.envelope)} />
      </div>

      <p className="mt-4 flex flex-wrap items-center gap-3 border-l-2 border-modelled pl-4 text-sm text-muted-foreground">
        <Tag kind="assumption" />
        Simplified funding exercise. Real capital, revenue, grants and housing accounts have
        separate rules. The envelope is 120% of observed gross TA spending; delivery and repair
        inputs are illustrative.
      </p>

      <ol className="mt-8 grid grid-cols-5 gap-px border-2 border-border bg-border" aria-label="Challenge progress">
        {[1, 2, 3, 4, 5].map((n) => {
          const state = n <= years.length ? "complete" : n === years.length + 1 ? "current" : "todo";
          return (
            <li
              key={n}
              className={`bg-background p-3 text-center ${
                state === "current" ? "border-b-4 border-signal" : ""
              }`}
            >
              <span
                className={`pixel block text-lg ${
                  state === "complete" ? "text-signal" : state === "current" ? "text-alert" : "text-muted-foreground"
                }`}
              >
                {state === "complete" ? "✓" : n}
              </span>
              <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                Year {n}
              </span>
              <small className="block text-[0.65rem] text-muted-foreground">
                {2024 + n}–{String(2025 + n).slice(2)}
              </small>
            </li>
          );
        })}
      </ol>

      {done && result ? (
        <div className="mt-10">
          <Tag kind="modelled">Both lines are modelled</Tag>
          <h2 ref={summary} tabIndex={-1} className="display mt-4 text-4xl md:text-5xl">
            Your five years vs continuing
            <br />
            the baseline assumptions.
          </h2>
          <div className="mt-6 grid gap-px border-2 border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            <Outcome label="Fewer households in TA at year five" value={fmt(result.householdDifference)} />
            <Outcome
              label={result.netSaving >= 0 ? "Net programme saving" : "Net additional programme cost"}
              value={money(Math.abs(result.netSaving))}
            />
            <Outcome label="Homes delivered" value={fmt(result.homesDelivered)} />
            <Outcome label="Additional funding required" value={money(result.funding)} />
          </div>
          <div className="mt-8 border-2 border-border bg-surface p-5">
            <Trajectory player={years} baseline={baseline} opening={borough.taEff} />
          </div>
          <p className="mt-6 max-w-3xl text-muted-foreground">
            Your choices enabled {fmt(result.additionalPlacements)} additional settled placements.{" "}
            {fmt(years[4]!.state.ta)} households remain in temporary accommodation.{" "}
            {fmt(result.backlog)} homes remain in the illustrative repair backlog.{" "}
            {fmt(years[4]!.state.queue.reduce((s, q) => s + q.homes, 0))} commissioned homes arrive
            after this five-year horizon.
          </p>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            Gross accommodation costs fell by {money(result.grossAvoided)} relative to baseline;
            interventions cost {money(result.interventionCost)}. The comparison includes added-home
            operating costs. Owned homes retain value beyond five years, but no sale value is
            credited. These are model outputs, not guaranteed real-world outcomes.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={restart}
              className="border-2 border-signal bg-signal px-5 py-3 text-sm font-bold uppercase tracking-[0.16em] text-primary-foreground"
            >
              Try a different approach
            </button>
            <Link to="/methodology" className="border-2 border-border px-5 py-3 text-sm font-bold uppercase tracking-[0.16em]">
              See how this was calculated →
            </Link>
            <Link to="/explore" className="border-2 border-border px-5 py-3 text-sm font-bold uppercase tracking-[0.16em]">
              Explore another borough →
            </Link>
          </div>
          {years.map((y) => (
            <Ledger y={y} key={y.state.year} />
          ))}
        </div>
      ) : review ? (
        <div className="mt-10">
          <span className="pixel text-xs uppercase tracking-[0.2em] text-signal">
            Year {years.length} complete
          </span>
          <h2 ref={summary} tabIndex={-1} className="display mt-3 text-4xl">
            The year in your borough.
          </h2>
          <div className="mt-6 grid gap-px border-2 border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            <Outcome label="Households in TA" value={fmt(opening.ta)} />
            <Outcome label="Settled placements this year" value={fmt(years.at(-1)!.placements)} />
            <Outcome label="Repair backlog" value={fmt(opening.backlog)} />
            <Outcome label="Cumulative funding gap" value={money(opening.funding)} />
          </div>
          <p className="mt-5 max-w-3xl text-muted-foreground">
            Shared net pressure added {fmt(years.at(-1)!.pressure)} household-equivalents. Completed
            homes enabled {fmt(years.at(-1)!.placements)} settled placements. You commissioned{" "}
            {fmt(years.at(-1)!.committed)} homes for later delivery.
          </p>
          <EvidenceCard index={years.length - 1} />
          <Ledger y={years.at(-1)!} />
          <button
            onClick={next}
            className="mt-5 border-2 border-signal bg-signal px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-primary-foreground"
          >
            Plan year {years.length + 1} →
          </button>
        </div>
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="display text-3xl">Allocate year {years.length + 1}</h2>
              <span className="display tabular text-2xl text-signal">{money(available)} available</span>
            </div>
            <div className="mt-5 space-y-4">
              {keys.map(([key, label, desc, tone]) => {
                const max = Math.max(0, available - total + policy[key]);
                return (
                  <AllocationBar
                    key={key}
                    label={label}
                    tone={tone}
                    value={policy[key] / 1e6}
                    max={max / 1e6}
                    onChange={(v) =>
                      setPolicy({ ...policy, [key]: Math.min(max, Math.max(0, v * 1e6)) })
                    }
                    hint={`${((policy[key] / available) * 100).toFixed(1)}% of the envelope · ${desc}`}
                  />
                );
              })}
            </div>
            <div className="mt-5 flex items-center justify-between border-2 border-border bg-surface p-4">
              <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Unallocated reserve
              </span>
              <strong className="display tabular text-2xl">{money(available - total)}</strong>
            </div>
            <button
              onClick={commit}
              className="mt-4 w-full border-2 border-signal bg-signal px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-primary-foreground"
            >
              Commit year {years.length + 1} →
            </button>
          </div>

          <aside className="border-2 border-border bg-surface p-5">
            <Tag kind="modelled">Before you commit</Tag>
            <h2 className="display mt-3 text-3xl">What this decision means</h2>
            <div className="mt-5 grid gap-px border-2 border-border bg-border sm:grid-cols-2">
              <Outcome label="Opening TA households" value={fmt(opening.ta)} />
              <Outcome label="Homes arriving this year" value={fmt(preview!.delivered)} />
              <Outcome label="Opening repair backlog" value={fmt(opening.backlog)} />
              <Outcome
                label="Shared annual stock pressure"
                value={((a["growth"] ?? 0) * 100).toFixed(1) + "%"}
              />
            </div>
            <div className="mt-5 border-l-2 border-alert pl-4">
              <h3 className="display text-2xl">{money(preview!.taCost)} accommodation need</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {money(policy.ta)} allocated. Category shortfall: {money(preview!.taShortfall)}.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                After genuinely unused funds are rebalanced, the total additional funding required
                this year is <strong className="text-foreground">{money(preview!.funding)}</strong>.
              </p>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {fmt(preview!.committed)} homes commissioned now arrive in year{" "}
              {years.length + 1 + (a["lag"] ?? 1)}. Each suitable home enables at most one initial
              placement.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              The baseline receives the same envelope and external pressure. It makes no additional
              investments; this is a comparison policy, not the borough&apos;s actual plan.
            </p>
            {years.length === 0 && <AssumptionEditor a={a} setA={setA} />}
          </aside>
        </div>
      )}
    </section>
  );
}
