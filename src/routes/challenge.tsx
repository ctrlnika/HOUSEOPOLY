import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ChevronRight, RotateCcw, SkipForward } from "lucide-react";
import { AllocationBar, AssumptionEditor } from "@/components/explore/controls";
import { Trajectory } from "@/components/explore/Trajectory";
import { PixelWorld } from "@/components/challenge/PixelWorld";
import { Source, Tag } from "@/components/site/bits";
import { Button } from "@/components/ui/button";
import {
  boroughAssumptions,
  boroughs,
  evidence,
  fmt,
  getBorough,
  makeConfig,
  money,
  type Borough,
} from "@/lib/data";
import { compare, initial, stepYear, type Assumptions, type Policy, type Year } from "@/lib/model/engine";
import { baselinePolicy, configForEvent, eventDeck, runEventBaseline } from "@/lib/model/events";

type Phase = "setup" | "plan" | "resolving" | "report" | "final";

export const Route = createFileRoute("/challenge")({
  validateSearch: (search: Record<string, unknown>) => ({
    b: typeof search.b === "string" ? search.b : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Play the Housing Director Challenge — HOUSEOPOLY" },
      {
        name: "description",
        content: "Run any London borough for five turbulent years in HOUSEOPOLY's pixel-art housing strategy challenge.",
      },
      { property: "og:title", content: "Play the Housing Director Challenge — HOUSEOPOLY" },
      {
        property: "og:description",
        content: "Pick a London borough, face five events and test a housing strategy against the modelled baseline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Challenge,
});

const sortedBoroughs = [...boroughs].sort((a, b) => a.name.localeCompare(b.name));

function Challenge() {
  const search = Route.useSearch();
  const initialBorough = getBorough(search.b ?? "E09000025");
  const [selectedCode, setSelectedCode] = useState(initialBorough.code);
  const [borough, setBorough] = useState<Borough>(initialBorough);
  const [assumptions, setAssumptions] = useState<Assumptions>(() => boroughAssumptions(initialBorough));
  const [years, setYears] = useState<Year[]>([]);
  const [phase, setPhase] = useState<Phase>("setup");
  const baseConfig = makeConfig(borough, assumptions);
  const deck = useMemo(() => eventDeck(borough.code), [borough.code]);
  const turn = Math.min(years.length, 4);
  const event = deck[turn] as (typeof deck)[number];
  const turnConfig = configForEvent(baseConfig, event);
  const opening = years.at(-1)?.state ?? initial(baseConfig);
  const [policy, setPolicy] = useState<Policy>(() => baselinePolicy(turnConfig));
  const reportHeading = useRef<HTMLHeadingElement>(null);
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baseline = runEventBaseline(baseConfig, deck);
  const preview = phase === "plan" ? stepYear(opening, policy, turnConfig) : null;
  const total = Object.values(policy).reduce((sum, value) => sum + value, 0);
  const available = turnConfig.envelope + opening.reserve;
  const result = phase === "final" ? compare(years, baseline) : null;

  function launch() {
    const nextBorough = getBorough(selectedCode);
    const nextAssumptions = boroughAssumptions(nextBorough);
    const nextBase = makeConfig(nextBorough, nextAssumptions);
    setBorough(nextBorough);
    setAssumptions(nextAssumptions);
    setYears([]);
    setPolicy(baselinePolicy(configForEvent(nextBase, eventDeck(nextBorough.code)[0] as (typeof deck)[number])));
    setPhase("plan");
  }

  function finishResolution() {
    if (pendingTimer.current) clearTimeout(pendingTimer.current);
    pendingTimer.current = null;
    setPhase("report");
    window.setTimeout(() => reportHeading.current?.focus(), 20);
  }

  function commit() {
    if (phase !== "plan") return;
    const completed = stepYear(opening, policy, turnConfig);
    setYears((current) => [...current, completed]);
    setPhase("resolving");
    pendingTimer.current = setTimeout(finishResolution, 1100);
  }

  function nextYear() {
    if (years.length >= 5) {
      setPhase("final");
      return;
    }
    const nextEvent = deck[years.length] as (typeof deck)[number];
    const nextConfig = configForEvent(baseConfig, nextEvent);
    setPolicy(baselinePolicy(nextConfig));
    setPhase("plan");
  }

  function replay(sameBorough: boolean) {
    if (pendingTimer.current) clearTimeout(pendingTimer.current);
    setYears([]);
    setPolicy(baselinePolicy(configForEvent(baseConfig, deck[0] as (typeof deck)[number])));
    setPhase(sameBorough ? "plan" : "setup");
  }

  if (phase === "setup") {
    const choice = getBorough(selectedCode);
    return <GameSetup choice={choice} selectedCode={selectedCode} setSelectedCode={setSelectedCode} launch={launch} />;
  }

  const latest = years.at(-1);
  return (
    <div className="pixel-game min-h-screen border-b-2 border-border">
      <section className="mx-auto max-w-[1500px] px-4 py-8 md:px-8">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <span className="pixel text-xs text-alert">HOUSING DIRECTOR // {borough.name.toUpperCase()}</span>
            <h1 className="display mt-3 text-4xl md:text-6xl">Five years. One borough.</h1>
          </div>
          <Button variant="outline" onClick={() => replay(false)} className="rounded-none border-2 font-bold uppercase tracking-[0.12em]">
            <RotateCcw aria-hidden="true" /> Change borough
          </Button>
        </header>

        <ol className="mt-6 grid grid-cols-5 gap-1" aria-label="Five-year progress">
          {[1, 2, 3, 4, 5].map((number) => (
            <li key={number} className={`pixel-year ${number <= years.length ? "is-done" : number === years.length + 1 ? "is-current" : ""}`}>
              <span>{number <= years.length ? "✓" : number}</span>
              <small>YR {number}</small>
            </li>
          ))}
        </ol>

        {phase !== "final" && (
          <div className="mt-4">
            <PixelWorld state={opening} preview={preview} event={event} year={turn + 1} animating={phase === "resolving"} />
          </div>
        )}

        {phase === "plan" && preview && (
          <PlanTurn
            borough={borough}
            assumptions={assumptions}
            setAssumptions={setAssumptions}
            event={event}
            policy={policy}
            setPolicy={setPolicy}
            preview={preview}
            available={available}
            total={total}
            turn={turn}
            commit={commit}
          />
        )}

        {phase === "resolving" && (
          <div className="mt-5 flex justify-end">
            <Button variant="outline" onClick={finishResolution} className="rounded-none border-2 font-bold uppercase tracking-[0.12em]">
              <SkipForward aria-hidden="true" /> Skip animation
            </Button>
          </div>
        )}

        {phase === "report" && latest && (
          <YearReport year={latest} event={deck[years.length - 1] as (typeof deck)[number]} index={years.length - 1} headingRef={reportHeading} next={nextYear} />
        )}

        {phase === "final" && result && (
          <FinalRecord borough={borough} years={years} baseline={baseline} result={result} replay={replay} headingRef={reportHeading} />
        )}
      </section>
    </div>
  );
}

function GameSetup({ choice, selectedCode, setSelectedCode, launch }: { choice: Borough; selectedCode: string; setSelectedCode: (code: string) => void; launch: () => void }) {
  return (
    <section className="pixel-game min-h-[82vh] border-b-2 border-border px-4 py-10 md:px-8">
      <div className="mx-auto grid max-w-[1400px] gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <span className="pixel text-xs text-alert">INSERT STRATEGY // PRESS START</span>
          <h1 className="display mt-4 text-6xl md:text-8xl">Housing Director Challenge</h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Take charge of a London borough for five years. Every turn brings a new pressure. Every pound has a consequence.
          </p>
          <div className="mt-8 border-l-4 border-modelled pl-4 text-sm text-muted-foreground">
            <Tag kind="modelled">Five-year projection</Tag>
            <p className="mt-3">A simplified strategy game built on the borough&apos;s 2024–25 opening data. Event effects are explicit assumptions.</p>
          </div>
        </div>
        <div className="pixel-panel p-5 md:p-7">
          <label htmlFor="borough-game-select" className="pixel text-xs text-signal">CHOOSE YOUR BOROUGH</label>
          <select
            id="borough-game-select"
            value={selectedCode}
            onChange={(event) => setSelectedCode(event.target.value)}
            className="pixel mt-3 h-14 w-full border-2 border-signal bg-background px-3 text-sm text-foreground"
          >
            {sortedBoroughs.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
          </select>
          <div className="mt-5 grid gap-px border-2 border-border bg-border sm:grid-cols-3">
            <SetupStat label="Households in TA" value={fmt(choice.taEff)} modelled={choice.modelled.includes("ta")} />
            <SetupStat label="Annual direct spend" value={money(choice.grossEff)} modelled={choice.modelled.includes("gross")} />
            <SetupStat label="Annual envelope" value={money(choice.grossEff * 1.2)} modelled />
          </div>
          {!choice.isFullyObserved && (
            <p className="mt-4 text-xs text-modelled">
              ◐ London-average substitutions used for: {choice.modelled.join(", ")}. They are modelled, never shown as observed.
            </p>
          )}
          <Button onClick={launch} size="lg" className="pixel mt-6 h-14 w-full rounded-none border-2 border-signal text-xs tracking-[0.12em]">
            Start five-year term <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
}

function SetupStat({ label, value, modelled }: { label: string; value: string; modelled?: boolean }) {
  return <div className="bg-background p-3"><strong className="pixel block text-lg">{value}</strong><span className="mt-2 block text-[0.62rem] uppercase text-muted-foreground">{label}</span>{modelled && <span className="mt-1 block text-[0.6rem] text-modelled">◐ modelled</span>}</div>;
}

function PlanTurn({ borough, assumptions, setAssumptions, event, policy, setPolicy, preview, available, total, turn, commit }: {
  borough: Borough; assumptions: Assumptions; setAssumptions: (a: Assumptions) => void; event: ReturnType<typeof eventDeck>[number]; policy: Policy; setPolicy: (p: Policy) => void; preview: Year; available: number; total: number; turn: number; commit: () => void;
}) {
  const controls: [keyof Policy, string, string, "signal" | "alert" | "modelled"][] = [
    ["ta", "Temporary accommodation", "Covers current accommodation need.", "alert"],
    ["voids", "Faster re-lets", `${money(assumptions.voidCost)} returns one eligible empty home.`, "signal"],
    ["repairs", "Repairs & retrofit", "Clears occupied-home repairs and improves energy performance.", "modelled"],
    ["acquire", "Acquire settled homes", `${money(assumptions.purchaseCost)} per home, delivered after ${assumptions.lag} year.`, "signal"],
  ];
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <section aria-labelledby="allocation-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><span className="pixel text-xs text-signal">TURN {turn + 1}: ALLOCATE</span><h2 id="allocation-title" className="display mt-2 text-4xl">Move the money</h2></div>
          <strong className="pixel text-lg text-signal">{money(available - total)} LEFT</strong>
        </div>
        <div className="mt-4 space-y-3">
          {controls.map(([key, label, hint, tone]) => {
            const max = Math.max(0, available - total + policy[key]);
            return <AllocationBar key={key} label={label} hint={hint} tone={tone} value={policy[key] / 1e6} max={max / 1e6} onChange={(value) => setPolicy({ ...policy, [key]: Math.min(max, Math.max(0, value * 1e6)) })} />;
          })}
        </div>
        <Button onClick={commit} size="lg" className="pixel mt-4 h-14 w-full rounded-none border-2 border-signal text-xs tracking-[0.12em]">
          Commit year {turn + 1} <ChevronRight aria-hidden="true" />
        </Button>
        {turn === 0 && <AssumptionEditor a={assumptions} setA={setAssumptions} />}
      </section>
      <aside className="space-y-4">
        <div className={`pixel-event is-${event.tone}`}>
          <span className="pixel text-[0.65rem]">INCOMING EVENT // ASSUMPTION</span>
          <h2 className="display mt-3 text-4xl">{event.title}</h2>
          <p className="mt-3">{event.bulletin}</p>
          <strong className="pixel mt-5 block text-xs">{event.effect}</strong>
        </div>
        <div className="pixel-panel p-5">
          <Tag kind="modelled">Live projection</Tag>
          <h3 className="display mt-3 text-3xl">If you commit now</h3>
          <div className="mt-4 grid grid-cols-2 gap-px border-2 border-border bg-border">
            <SetupStat label="TA at year end" value={fmt(preview.state.ta)} modelled />
            <SetupStat label="Settled placements" value={fmt(preview.placements)} modelled />
            <SetupStat label="Homes commissioned" value={fmt(preview.committed)} modelled />
            <SetupStat label="Funding this year" value={money(preview.funding)} modelled />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">The baseline faces the same event and spending envelope, but makes no additional investments. {borough.name}&apos;s source data remains unchanged.</p>
        </div>
      </aside>
    </div>
  );
}

function YearReport({ year, event, index, headingRef, next }: { year: Year; event: ReturnType<typeof eventDeck>[number]; index: number; headingRef: React.RefObject<HTMLHeadingElement | null>; next: () => void }) {
  const card = evidence[Math.min(index, evidence.length - 1)] as (typeof evidence)[number];
  return (
    <section className="pixel-report mt-6 p-5 md:p-8">
      <span className="pixel text-xs text-alert">THE BOROUGH BULLETIN // YEAR {index + 1}</span>
      <h2 ref={headingRef} tabIndex={-1} className="display mt-3 text-5xl md:text-7xl">The year in numbers</h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">{event.title} shaped this turn. Its effect was applied as a game assumption.</p>
      <div className="mt-6 grid gap-px border-2 border-foreground bg-foreground sm:grid-cols-2 lg:grid-cols-4">
        <ReportStat label="Households in TA" value={fmt(year.state.ta)} />
        <ReportStat label="Settled placements" value={fmt(year.placements)} />
        <ReportStat label="Repairs completed" value={fmt(year.repairCompletions)} />
        <ReportStat label="Funding required" value={money(year.funding)} alert={year.funding > 0} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="border-2 border-border p-4"><span className="pixel text-[0.65rem] text-signal">WHAT MOVED</span><p className="mt-3 text-sm text-muted-foreground">Pressure added {fmt(year.pressure)} household-equivalents. {fmt(year.delivered)} homes arrived, {fmt(year.placements)} placements were made, and {fmt(year.committed)} homes entered the pipeline.</p></div>
        <div className="border-2 border-signal p-4"><span className="pixel text-[0.65rem] text-signal">EVIDENCE FILE</span><h3 className="display mt-2 text-2xl">{card.title}</h3><p className="mt-2 text-sm text-muted-foreground">{card.text}</p><div className="mt-2"><Source id={card.sourceId} /></div></div>
      </div>
      <Ledger year={year} />
      <Button onClick={next} size="lg" className="pixel mt-6 h-14 rounded-none border-2 border-signal px-6 text-xs tracking-[0.12em]">
        {index === 4 ? "See five-year record" : `Plan year ${index + 2}`} <ArrowRight aria-hidden="true" />
      </Button>
    </section>
  );
}

function Ledger({ year }: { year: Year }) {
  const rows: [string, number][] = [["Available", year.available], ["Accommodation cost", year.taCost], ["Intervention spend", year.interventionCost], ["Operating cost", year.operatingCost], ["Closing reserve", year.state.reserve], ["External funding", year.funding]];
  return <details className="mt-5 border-2 border-border p-4"><summary className="pixel cursor-pointer text-xs">OPEN FUNDING LEDGER</summary><table className="mt-3 w-full text-sm"><tbody>{rows.map(([label, value]) => <tr key={label} className="border-b border-border"><th className="py-2 text-left font-medium">{label}</th><td className="tabular py-2 text-right">{money(value)}</td></tr>)}</tbody></table></details>;
}

function ReportStat({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return <div className="bg-background p-4"><strong className={`pixel block text-xl ${alert ? "text-alert" : "text-signal"}`}>{value}</strong><span className="mt-2 block text-[0.65rem] uppercase text-muted-foreground">{label}</span></div>;
}

function FinalRecord({ borough, years, baseline, result, replay, headingRef }: { borough: Borough; years: Year[]; baseline: Year[]; result: ReturnType<typeof compare>; replay: (same: boolean) => void; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  const final = years.at(-1)?.state;
  if (!final) return null;
  return (
    <section className="pixel-report mt-6 p-5 md:p-8">
      <span className="pixel text-xs text-signal">TERM COMPLETE // MODELLED PROJECTION</span>
      <h2 ref={headingRef} tabIndex={-1} className="display mt-3 text-6xl md:text-8xl">Your five-year record</h2>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{borough.name}, April 2025–March 2030. Your choices compared with continuing the event-adjusted baseline.</p>
      <div className="mt-7 grid gap-px border-2 border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        <ReportStat label="Fewer households in TA" value={fmt(result.householdDifference)} />
        <ReportStat label={result.netSaving >= 0 ? "Net programme saving" : "Additional programme cost"} value={money(Math.abs(result.netSaving))} alert={result.netSaving < 0} />
        <ReportStat label="Homes delivered" value={fmt(result.homesDelivered)} />
        <ReportStat label="Funding required" value={money(result.funding)} alert={result.funding > 0} />
        <ReportStat label="Additional placements" value={fmt(result.additionalPlacements)} />
        <ReportStat label="Gross TA cost avoided" value={money(result.grossAvoided)} />
        <ReportStat label="Repair backlog" value={fmt(result.backlog)} alert={result.backlog > 0} />
        <ReportStat label="Households still in TA" value={fmt(final.ta)} alert={final.ta > 0} />
      </div>
      <div className="mt-7 border-2 border-border bg-surface p-4"><Trajectory player={years} baseline={baseline} opening={borough.taEff} /></div>
      <p className="mt-5 max-w-3xl text-sm text-muted-foreground">These are model outputs, not promised outcomes. Events are explicit game assumptions; observed opening figures and source records are unchanged. Owned homes retain value beyond five years, but no sale value is credited.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={() => replay(true)} size="lg" className="rounded-none border-2 border-signal font-bold uppercase tracking-[0.12em]"><RotateCcw aria-hidden="true" /> Replay {borough.name}</Button>
        <Button onClick={() => replay(false)} size="lg" variant="outline" className="rounded-none border-2 font-bold uppercase tracking-[0.12em]">Choose another borough</Button>
        <Button asChild size="lg" variant="outline" className="rounded-none border-2 font-bold uppercase tracking-[0.12em]"><Link to="/methodology"><Check aria-hidden="true" /> Check the method</Link></Button>
      </div>
    </section>
  );
}