import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyResolution,
  avoidedCost,
  buildAuction,
  curveballFor,
  EMPTY_SCORE,
  grade,
  LOT_COUNT,
  resolveLot,
  SPECULATORS,
  type AuctionSetup,
  type Curveball,
  type Lot,
  type Move,
  type Resolution,
  type Score,
} from "@/lib/game/auction";
import { boroughs, getBorough, money, moneyExact, fmt } from "@/lib/data";
import { PixelPortrait, SpeculatorCard } from "@/components/auction/PixelPortrait";
import { SectionHeading, Stat, Tag } from "@/components/site/bits";

export const Route = createFileRoute("/auction")({
  head: () => ({
    meta: [
      { title: "Council vs Speculator — HOUSEOPOLY" },
      {
        name: "description",
        content:
          "A ninety-second London property auction. Outbid the speculators, bring homes back into council stock, and keep families out of temporary accommodation.",
      },
      { property: "og:title", content: "Council vs Speculator — HOUSEOPOLY" },
      {
        property: "og:description",
        content:
          "Six lots, one capital pot, four speculators. A fast auction game built on real London borough data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { b?: string } => {
    const b = search["b"];
    return typeof b === "string" ? { b } : {};
  },
  component: AuctionPage,
});

type Phase = "setup" | "bid" | "result" | "final";

const TURN_SECONDS = 15;

function AuctionPage() {
  const search = Route.useSearch();
  const [code, setCode] = useState(search.b ?? "E09000025");
  const [phase, setPhase] = useState<Phase>("setup");
  const [setup, setSetup] = useState<AuctionSetup | null>(null);
  const [index, setIndex] = useState(0);
  const [capital, setCapital] = useState(0);
  const [score, setScore] = useState<Score>(EMPTY_SCORE);
  const [log, setLog] = useState<{ lot: Lot; r: Resolution }[]>([]);
  const [result, setResult] = useState<Resolution | null>(null);
  const [curveball, setCurveball] = useState<Curveball | null>(null);
  const [timed, setTimed] = useState(true);
  const [seconds, setSeconds] = useState(TURN_SECONDS);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const borough = useMemo(() => getBorough(code), [code]);
  const lot = setup?.lots[index] ?? null;

  const start = () => {
    const s = buildAuction(borough);
    setSetup(s);
    setCapital(s.budget);
    setScore(EMPTY_SCORE);
    setLog([]);
    setResult(null);
    setCurveball(curveballFor(s, 0));
    setIndex(0);
    setSeconds(TURN_SECONDS);
    setPhase("bid");
  };

  const play = useCallback(
    (move: Move) => {
      if (!setup || !lot) return;
      const r = resolveLot(lot, move, capital);
      setResult(r);
      setCapital((c) => c - r.spend);
      setScore((s) => applyResolution(s, r));
      setLog((l) => [...l, { lot, r }]);
      setPhase("result");
    },
    [setup, lot, capital],
  );

  // Countdown. Running out of time concedes the lot, which is the point.
  useEffect(() => {
    if (phase !== "bid" || !timed) return;
    if (seconds <= 0) {
      play("pass");
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timed, seconds, play]);

  const next = () => {
    if (!setup) return;
    const n = index + 1;
    if (n >= setup.lots.length) {
      setPhase("final");
      return;
    }
    const cb = curveballFor(setup, n);
    if (cb) setCapital((c) => Math.max(0, c + cb.capital));
    setCurveball(cb);
    setIndex(n);
    setResult(null);
    setSeconds(TURN_SECONDS);
    setPhase("bid");
    headingRef.current?.focus();
  };

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-10 md:px-8">
      {phase === "setup" && (
        <Setup
          code={code}
          setCode={setCode}
          timed={timed}
          setTimed={setTimed}
          onStart={start}
        />
      )}

      {setup && phase !== "setup" && (
        <div className="space-y-6">
          <Scoreboard
            setup={setup}
            capital={capital}
            score={score}
            index={index}
            phase={phase}
            seconds={timed && phase === "bid" ? seconds : null}
          />

          {curveball && phase === "bid" && (
            <div
              className={`pixel-event ${curveball.tone === "alert" ? "is-alert" : "is-signal"} p-4`}
            >
              <p className="pixel text-[0.65rem] uppercase">{curveball.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{curveball.text}</p>
              <p
                className={`mt-2 text-sm font-bold ${curveball.capital > 0 ? "text-signal" : "text-alert"}`}
              >
                {curveball.capital > 0 ? "+" : "−"}
                {money(Math.abs(curveball.capital)).replace("£", "£")} capital
              </p>
            </div>
          )}

          {phase === "bid" && lot && (
            <LotCard lot={lot} capital={capital} onPlay={play} headingRef={headingRef} />
          )}

          {phase === "result" && lot && result && (
            <ResultCard lot={lot} r={result} onNext={next} last={index + 1 >= LOT_COUNT} />
          )}

          {phase === "final" && (
            <FinalCard
              setup={setup}
              score={score}
              capital={capital}
              log={log}
              onReplay={() => setPhase("setup")}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Setup({
  code,
  setCode,
  timed,
  setTimed,
  onStart,
}: {
  code: string;
  setCode: (c: string) => void;
  timed: boolean;
  setTimed: (t: boolean) => void;
  onStart: () => void;
}) {
  const borough = getBorough(code);
  const preview = useMemo(() => buildAuction(borough), [borough]);
  return (
    <div className="space-y-10">
      <SectionHeading eyebrow="Ninety seconds" title={<>Council <span className="text-alert">vs</span> Speculator</>}>
        <p>
          Six London properties come up for sale. You have one capital pot and a
          room full of investors who move faster than you do. Every home you win
          comes back into council stock. Every home you lose pushes families into
          temporary accommodation.
        </p>
      </SectionHeading>

      <div className="grid gap-6 md:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {SPECULATORS.map((s) => (
              <SpeculatorCard key={s.id} who={s} />
            ))}
          </div>
        </div>

        <aside className="space-y-5 border-2 border-border bg-surface p-5">
          <div>
            <label
              htmlFor="auction-borough"
              className="eyebrow block"
            >
              Your borough
            </label>
            <select
              id="auction-borough"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-2 w-full border-2 border-border bg-background px-3 py-2 text-sm"
            >
              {boroughs.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <dl className="space-y-3 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">Acquisitions pot</dt>
              <dd className="tabular font-bold">{money(preview.budget)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">Households in TA now</dt>
              <dd className="tabular font-bold">{fmt(borough.taEff)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">Cost per household / year</dt>
              <dd className="tabular font-bold">{money(borough.unitCostEff)}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2">
            <Tag kind="observed">Borough figures</Tag>
            <Tag kind="assumption">Prices &amp; pot</Tag>
          </div>

          <label className="flex items-center gap-3 border-t-2 border-border pt-4 text-sm">
            <input
              type="checkbox"
              checked={timed}
              onChange={(e) => setTimed(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-signal)]"
            />
            Bid clock ({TURN_SECONDS}s a lot)
          </label>

          <button
            type="button"
            onClick={onStart}
            className="w-full border-2 border-signal bg-signal px-5 py-3 pixel text-[0.7rem] text-primary-foreground"
          >
            Enter the saleroom
          </button>
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Scoreboard({
  setup,
  capital,
  score,
  index,
  phase,
  seconds,
}: {
  setup: AuctionSetup;
  capital: number;
  score: Score;
  index: number;
  phase: Phase;
  seconds: number | null;
}) {
  const done = phase === "final";
  return (
    <div className="pixel-panel flex flex-wrap items-center justify-between gap-4 p-4">
      <div>
        <p className="pixel text-[0.6rem] text-muted-foreground">
          {setup.borough.name.toUpperCase()} SALEROOM
        </p>
        <p className="pixel mt-2 text-[0.9rem] text-signal">{money(capital)} LEFT</p>
      </div>
      <div className="flex items-center gap-2">
        {setup.lots.map((l, i) => (
          <span
            key={l.id}
            className={`pixel-year ${done || i < index ? "is-done" : i === index ? "is-current" : ""}`}
          >
            <span>{i + 1}</span>
          </span>
        ))}
      </div>
      <div className="flex gap-5 text-right">
        <div>
          <p className="pixel text-[0.8rem] text-signal">{score.housed}</p>
          <p className="text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">
            Housed
          </p>
        </div>
        <div>
          <p className="pixel text-[0.8rem] text-alert">{score.pushedToTA}</p>
          <p className="text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">
            To B&amp;Bs
          </p>
        </div>
        {seconds != null && (
          <div>
            <p className={`pixel text-[0.8rem] ${seconds <= 5 ? "text-alert" : "text-foreground"}`}>
              {seconds}s
            </p>
            <p className="text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">
              Hammer
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const KIND_ART: Record<Lot["kind"], string[]> = {
  exCouncil: ["████", "█▓▓█", "█▓▓█", "█░░█"],
  derelict: ["▒  ▒", "▒▒▒▒", "▒░▒▒", "▒▒░▒"],
  terrace: [" ██ ", "████", "█▓▓█", "█░▓█"],
  block: ["████", "▓▓▓▓", "████", "▓░▓░"],
  newBuild: ["▁▁▁▁", "████", "████", "█░░█"],
};

function LotCard({
  lot,
  capital,
  onPlay,
  headingRef,
}: {
  lot: Lot;
  capital: number;
  onPlay: (m: Move) => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const canOutbid = capital >= lot.outbidPrice;
  const canRepair = lot.repairOrderCost != null && capital >= lot.repairOrderCost;
  return (
    <div className="pixel-panel p-5 md:p-7">
      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div>
          <p className="eyebrow">Lot on the block</p>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="display mt-2 text-3xl md:text-4xl"
          >
            {lot.title}
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">{lot.story}</p>

          <div className="mt-5 flex flex-wrap gap-6 text-sm">
            <div>
              <p className="tabular text-2xl font-bold">{money(lot.guidePrice)}</p>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Guide price
              </p>
            </div>
            <div>
              <p className="tabular text-2xl font-bold text-alert">{money(lot.rivalBid)}</p>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Rival bid
              </p>
            </div>
            <div>
              <p className="tabular text-2xl font-bold text-signal">{lot.units}</p>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {lot.units === 1 ? "Household" : "Households"} it could house
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              disabled={!canOutbid}
              onClick={() => onPlay("outbid")}
              className="border-2 border-signal bg-signal px-4 py-3 text-left text-primary-foreground disabled:cursor-not-allowed disabled:border-border disabled:bg-transparent disabled:text-muted-foreground"
            >
              <span className="pixel block text-[0.65rem]">OUTBID</span>
              <span className="mt-1 block text-xs">{moneyExact(lot.outbidPrice)}</span>
            </button>
            <button
              type="button"
              disabled={!canRepair}
              onClick={() => onPlay("repair")}
              className="border-2 border-foreground px-4 py-3 text-left disabled:cursor-not-allowed disabled:border-border disabled:text-muted-foreground"
            >
              <span className="pixel block text-[0.65rem]">REPAIR ORDER</span>
              <span className="mt-1 block text-xs">
                {lot.repairOrderCost == null
                  ? "Not an empty home"
                  : `${moneyExact(lot.repairOrderCost)} · can be appealed`}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onPlay("pass")}
              className="border-2 border-alert px-4 py-3 text-left text-alert"
            >
              <span className="pixel block text-[0.65rem]">PASS</span>
              <span className="mt-1 block text-xs">Save the money, lose the homes</span>
            </button>
          </div>
        </div>

        <aside className="space-y-4 border-2 border-border bg-surface-2 p-4">
          <pre
            aria-hidden="true"
            className="pixel text-center text-[1.1rem] leading-[1.1] text-signal"
          >
            {KIND_ART[lot.kind].join("\n")}
          </pre>
          <div className="flex gap-3">
            <PixelPortrait who={lot.rival} size={6} />
            <div className="min-w-0">
              <p className="pixel text-[0.6rem] leading-tight">{lot.rival.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{lot.rival.outcome}</p>
            </div>
          </div>
          <p className="border-t-2 border-border pt-3 text-xs text-muted-foreground">
            Lose it and <strong className="text-alert">{lot.displaced}</strong>{" "}
            {lot.displaced === 1 ? "household goes" : "households go"} into temporary
            accommodation.
          </p>
        </aside>
      </div>
    </div>
  );
}

function ResultCard({
  lot,
  r,
  onNext,
  last,
}: {
  lot: Lot;
  r: Resolution;
  onNext: () => void;
  last: boolean;
}) {
  return (
    <div
      className={`pixel-event ${r.won ? "is-signal" : "is-alert"} p-5 md:p-7`}
      role="status"
    >
      <p className="eyebrow">{lot.title}</p>
      <h2 className={`display mt-2 text-3xl md:text-4xl ${r.won ? "text-signal" : "text-alert"}`}>
        {r.headline}
      </h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">{r.detail}</p>

      <div className="mt-5 flex items-start gap-4">
        {r.speaker === "rival" ? (
          <PixelPortrait who={lot.rival} size={6} />
        ) : (
          <span className="pixel grid h-[60px] w-[60px] place-items-center border-2 border-signal text-signal">
            YOU
          </span>
        )}
        <p className="pixel max-w-md border-2 border-border bg-surface p-3 text-[0.65rem] leading-relaxed">
          “{r.line}”
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-6">
        <span className="tabular text-sm">
          Spent <strong>{moneyExact(r.spend)}</strong>
        </span>
        <span className="tabular text-sm text-signal">
          Housed <strong>{r.housed}</strong>
        </span>
        <span className="tabular text-sm text-alert">
          Into TA <strong>{r.pushedToTA}</strong>
        </span>
        <button
          type="button"
          onClick={onNext}
          autoFocus
          className="ml-auto border-2 border-foreground px-5 py-2.5 pixel text-[0.65rem]"
        >
          {last ? "See the result" : "Next lot"}
        </button>
      </div>
    </div>
  );
}

function FinalCard({
  setup,
  score,
  capital,
  log,
  onReplay,
}: {
  setup: AuctionSetup;
  score: Score;
  capital: number;
  log: { lot: Lot; r: Resolution }[];
  onReplay: () => void;
}) {
  const g = grade(score);
  const avoided = avoidedCost(score, setup.unitCost);
  return (
    <div className="pixel-report space-y-8 p-6 md:p-10">
      <div>
        <p className="eyebrow">{setup.borough.name} · saleroom closed</p>
        <h2 className="display mt-2 text-4xl md:text-6xl">{g.title}</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">{g.note}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Stat value={score.homes} label="Homes into council stock" tone="signal" />
        <Stat value={score.pushedToTA} label="Households into TA" tone="alert" />
        <Stat value={money(score.spend)} label="Capital spent" detail={`${money(capital)} unspent`} />
        <Stat
          value={money(avoided)}
          label="Emergency cost avoided a year"
          detail="Projection: homes secured × this borough's cost per household"
          tone="signal"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Tag kind="observed">Borough cost per household</Tag>
        <Tag kind="modelled">Cost avoided</Tag>
        <Tag kind="assumption">Prices, bids, appeal odds</Tag>
      </div>

      <div>
        <h3 className="display text-2xl">The lot book</h3>
        <ul className="mt-4 divide-y-2 divide-border border-y-2 border-border">
          {log.map(({ lot, r }, i) => (
            <li key={lot.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <span className="pixel text-[0.6rem] text-muted-foreground">{i + 1}</span>
              <span className="min-w-0 flex-1">{lot.title}</span>
              <span className={r.won ? "text-signal" : "text-alert"}>{r.headline}</span>
              <span className="tabular text-muted-foreground">{moneyExact(r.spend)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onReplay}
          className="border-2 border-signal bg-signal px-5 py-3 pixel text-[0.65rem] text-primary-foreground"
        >
          Play again
        </button>
        <Link
          to="/explore"
          search={{ b: setup.borough.code }}
          className="border-2 border-border px-5 py-3 pixel text-[0.65rem]"
        >
          Explore this borough
        </Link>
      </div>
    </div>
  );
}
