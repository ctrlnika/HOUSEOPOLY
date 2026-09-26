import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { boroughs, dateLabel, fmt, getBorough, londonReference, money } from "@/lib/data";
import { LondonMap, MapLegend, useLondonGeo } from "@/components/map/LondonMap";
import { Source, Tag } from "@/components/site/bits";

type Search = { b?: string };

export const Route = createFileRoute("/explore")({
  validateSearch: (search: Record<string, unknown>): Search =>
    typeof search["b"] === "string" ? { b: search["b"] } : {},
  head: () => ({
    meta: [
      { title: "Temporary Accommodation Explorer — HOUSEOPOLY" },
      {
        name: "description",
        content:
          "Choose a London borough and see its temporary accommodation rate, recent change, spending and vacant homes in one clear story.",
      },
      { property: "og:title", content: "Temporary Accommodation Explorer — HOUSEOPOLY" },
      {
        property: "og:description",
        content:
          "Explore the real temporary accommodation story for every London borough in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Explore,
});

const observed = boroughs.filter((borough) => borough.rate != null);
const maxRate = Math.max(...observed.map((borough) => borough.rate ?? 0));
const maxVacants = Math.max(...observed.map((borough) => borough.allVacants ?? 0));

function changeSummary(values: { date: string; value: number | null }[]) {
  const valid = values.filter(
    (entry): entry is { date: string; value: number } => entry.value != null,
  );
  const first = valid[0];
  const last = valid.at(-1);
  if (!first || !last || first === last || first.value === 0) return null;
  return {
    percent: ((last.value - first.value) / first.value) * 100,
    count: last.value - first.value,
    from: first.date,
    to: last.date,
  };
}

function signed(value: number, digits = 0) {
  const rounded = value.toFixed(digits);
  return `${value > 0 ? "+" : ""}${rounded}`;
}

function Explore() {
  const { b: searchCode } = Route.useSearch();
  const [code, setCode] = useState(searchCode ?? "E09000025");
  const [showMap, setShowMap] = useState(false);
  const { geo, error } = useLondonGeo();

  useEffect(() => {
    if (searchCode) setCode(searchCode);
  }, [searchCode]);

  const borough = getBorough(code);
  const change = changeSummary(borough.history);
  const rateComparison =
    borough.rate == null ? null : ((borough.rate - londonReference.ratePer1000) / londonReference.ratePer1000) * 100;
  const spendPerHousehold = borough.taUnitCost;

  const selectedPosition = useMemo(() => {
    if (borough.rate == null || borough.allVacants == null) return null;
    return {
      x: 54 + (borough.allVacants / maxVacants) * 782,
      y: 32 + (1 - borough.rate / maxRate) * 296,
    };
  }, [borough]);

  return (
    <div className="border-b-2 border-border">
      <section className="mx-auto max-w-[1200px] px-4 py-10 md:px-8 md:py-16">
        <header className="max-w-3xl">
          <span className="eyebrow text-signal">Temporary Accommodation Explorer</span>
          <h1 className="display mt-4 text-5xl sm:text-6xl md:text-8xl">
            One borough.<br />The whole story.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Choose a borough to see how many households are affected, whether the number is rising,
            what it costs and how many homes stand vacant.
          </p>
        </header>

        <div className="mt-9">
          <BoroughPicker boroughs={boroughs} value={borough.code} onChange={setCode} />
        </div>

        <article className="mt-10 border-y-2 border-border py-8 md:py-10" aria-live="polite">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Tag kind="observed">Observed · 31 March 2025</Tag>
              <h2 className="display mt-4 text-5xl md:text-7xl">{borough.name}</h2>
            </div>
            {borough.rate != null && rateComparison != null && (
              <p className="max-w-xs border-l-2 border-alert pl-4 text-sm text-muted-foreground">
                <strong className="text-foreground">
                  {Math.abs(rateComparison).toFixed(0)}% {rateComparison >= 0 ? "above" : "below"}
                </strong>{" "}
                the observed London borough rate.
              </p>
            )}
          </div>

          {borough.rate == null || borough.ta == null ? (
            <div className="mt-8 border-2 border-modelled p-6">
              <h3 className="display text-3xl text-modelled">TA figure not reported</h3>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                This release does not contain a temporary accommodation count for {borough.name}.
                HOUSEOPOLY does not fill the gap with an estimate here. Other reported figures remain below.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-end">
              <div>
                <strong className="display tabular block text-[clamp(5rem,14vw,10rem)] leading-none text-signal">
                  {borough.rate.toFixed(1)}
                </strong>
                <p className="mt-3 max-w-lg text-lg">
                  households in temporary accommodation for every 1,000 households
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {fmt(borough.ta)} households in total · <Source id="ta-202503" />
                </p>
              </div>

              <div className="border-l-2 border-border pl-5">
                <span className="eyebrow">Change over the available year</span>
                {change ? (
                  <>
                    <strong className={`display tabular mt-3 block text-5xl ${change.percent > 0 ? "text-alert" : "text-signal"}`}>
                      {signed(change.percent, 1)}%
                    </strong>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {signed(change.count)} households, from {dateLabel(change.from)} to {dateLabel(change.to)}.
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">Not available in this release.</p>
                )}
              </div>
            </div>
          )}
        </article>

        <section className="py-10" aria-labelledby="money-homes-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="eyebrow">What does that mean?</span>
              <h2 id="money-homes-heading" className="display mt-3 text-4xl md:text-5xl">
                The money and the homes
              </h2>
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              Reported values only. A vacant home is not necessarily suitable or available for a household in need.
            </p>
          </div>

          <dl className="mt-7 grid border-2 border-border md:grid-cols-2">
            <div className="border-b-2 border-border p-5 md:border-b-0 md:border-r-2 md:p-7">
              <dt className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Gross direct TA spending
              </dt>
              <dd className="display tabular mt-3 text-5xl text-alert md:text-6xl">
                {borough.gross == null ? "Not reported" : money(borough.gross)}
              </dd>
              <p className="mt-3 text-xs text-muted-foreground">2024–25 · accommodation only · <Source id="ro4" /></p>
            </div>
            <div className="p-5 md:p-7">
              <dt className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Approximate annual cost per occupied household
              </dt>
              <dd className="display tabular mt-3 text-5xl md:text-6xl">
                {spendPerHousehold == null ? "Not available" : money(spendPerHousehold)}
              </dd>
              <p className="mt-3 text-xs text-muted-foreground">
                Calculated: gross spend ÷ average of four quarter-end TA counts. Not cost per distinct family.
              </p>
            </div>
          </dl>

          <dl className="grid border-x-2 border-b-2 border-border sm:grid-cols-2">
            <div className="border-b-2 border-border p-5 sm:border-b-0 sm:border-r-2 md:p-7">
              <dt className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                All-tenure vacant dwellings
              </dt>
              <dd className="display tabular mt-2 text-4xl">{fmt(borough.allVacants)}</dd>
              <p className="mt-2 text-xs text-muted-foreground">7 October 2024 · not a verified housing pool</p>
            </div>
            <div className="p-5 md:p-7">
              <dt className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Council-owned vacant dwellings
              </dt>
              <dd className="display tabular mt-2 text-4xl">{fmt(borough.councilVacants)}</dd>
              <p className="mt-2 text-xs text-muted-foreground">31 March 2025 · eligibility unknown · <Source id="vacants" /></p>
            </div>
          </dl>
        </section>

        <section className="border-t-2 border-border py-10" aria-labelledby="compare-heading">
          <span className="eyebrow">Across London</span>
          <h2 id="compare-heading" className="display mt-3 text-4xl md:text-5xl">
            Pressure and empty homes
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Each dot is a borough with reported data. Select a dot to change the borough above. Vacant homes are context,
            not a claim that they can all be used for temporary accommodation.
          </p>

          <div className="mt-6 overflow-x-auto border-2 border-border bg-surface p-3 sm:p-5">
            <svg
              viewBox="0 0 880 380"
              className="min-w-[620px] w-full"
              role="group"
              aria-label="London boroughs plotted by temporary accommodation rate and all-tenure vacant dwellings"
            >
              <line x1="54" y1="328" x2="836" y2="328" className="stroke-border" strokeWidth="2" />
              <line x1="54" y1="32" x2="54" y2="328" className="stroke-border" strokeWidth="2" />
              <line
                x1="54"
                y1={32 + (1 - londonReference.ratePer1000 / maxRate) * 296}
                x2="836"
                y2={32 + (1 - londonReference.ratePer1000 / maxRate) * 296}
                className="stroke-muted-foreground"
                strokeDasharray="7 7"
              />
              <text x="62" y={24 + (1 - londonReference.ratePer1000 / maxRate) * 296} className="fill-muted-foreground text-[11px]">
                London borough rate
              </text>
              {observed.map((point) => {
                if (point.allVacants == null || point.rate == null) return null;
                const x = 54 + (point.allVacants / maxVacants) * 782;
                const y = 32 + (1 - point.rate / maxRate) * 296;
                const selected = point.code === borough.code;
                return (
                  <circle
                    key={point.code}
                    cx={x}
                    cy={y}
                    r={selected ? 10 : 6}
                    role="button"
                    tabIndex={0}
                    aria-label={`${point.name}: ${point.rate.toFixed(1)} per 1,000 and ${fmt(point.allVacants)} vacant dwellings`}
                    className={`${selected ? "fill-alert stroke-foreground" : "fill-signal stroke-background"} cursor-pointer transition-[r] hover:fill-alert focus:outline-none`}
                    strokeWidth="3"
                    onClick={() => setCode(point.code)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setCode(point.code);
                      }
                    }}
                  >
                    <title>{point.name}</title>
                  </circle>
                );
              })}
              {selectedPosition && (
                <text x={Math.min(selectedPosition.x + 14, 760)} y={selectedPosition.y - 12} className="fill-foreground text-[13px] font-bold">
                  {borough.name}
                </text>
              )}
              <text x="445" y="366" textAnchor="middle" className="fill-muted-foreground text-[12px]">
                All-tenure vacant dwellings →
              </text>
              <text x="18" y="180" textAnchor="middle" transform="rotate(-90 18 180)" className="fill-muted-foreground text-[12px]">
                TA households per 1,000 →
              </text>
            </svg>
          </div>
        </section>

        <section className="border-t-2 border-border pt-8">
          <button
            type="button"
            onClick={() => setShowMap((current) => !current)}
            aria-expanded={showMap}
            className="flex w-full items-center justify-between py-2 text-left"
          >
            <span>
              <span className="eyebrow block">Prefer the map?</span>
              <span className="display mt-2 block text-3xl">Choose a borough on the map</span>
            </span>
            <span aria-hidden="true" className="display text-3xl text-signal">{showMap ? "−" : "+"}</span>
          </button>
          {showMap && (
            <div className="mt-5 border-2 border-border bg-surface p-3 sm:p-5">
              {geo ? (
                <LondonMap geo={geo} selected={borough.code} onSelect={setCode} />
              ) : (
                <div className="grid h-64 place-items-center text-sm text-muted-foreground">
                  {error ? "Map unavailable. Use the borough selector above." : "Loading London boundaries…"}
                </div>
              )}
              <div className="mt-4 border-t-2 border-border pt-4"><MapLegend /></div>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}