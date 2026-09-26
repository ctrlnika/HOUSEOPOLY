import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  boroughs,
  fmt,
  londonGrossSpend,
  manifest,
  money,
  moneyExact,
  type Borough,
} from "@/lib/data";
import { Counter, SectionHeading, Source, Tag } from "@/components/site/bits";
import { LondonMap, MapLegend, useLondonGeo } from "@/components/map/LondonMap";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HOUSEOPOLY — London's housing crisis, in numbers you can move" },
      {
        name: "description",
        content:
          "London councils spend billions a year on temporary accommodation while council homes sit empty. Explore the real borough data, then take the Housing Director challenge.",
      },
      { property: "og:title", content: "HOUSEOPOLY — London's housing crisis, in numbers you can move" },
      {
        property: "og:description",
        content:
          "Real borough data on temporary accommodation, empty homes, repairs and the cost of housing decisions.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { geo, error } = useLondonGeo();
  const [code, setCode] = useState("E09000025");
  const [hover, setHover] = useState<string | null>(null);
  const active: Borough = useMemo(
    () => boroughs.find((b) => b.code === (hover ?? code)) ?? boroughs[0]!,
    [hover, code],
  );
  const [view, setView] = useState<"map" | "list">("map");
  const [sort, setSort] = useState<"rate" | "name" | "ta">("rate");

  const sorted = useMemo(
    () =>
      [...boroughs].sort((x, y) =>
        sort === "name"
          ? x.name.localeCompare(y.name)
          : sort === "ta"
            ? (y.ta ?? -1) - (x.ta ?? -1)
            : (y.rate ?? -1) - (x.rate ?? -1),
      ),
    [sort],
  );

  return (
    <>
      {/* ---------------- HERO ---------------- */}
      <section className="grid-canvas relative overflow-hidden border-b-2 border-border">
        <div className="mx-auto max-w-[1400px] px-4 py-16 md:px-8 md:py-24">
          <span className="eyebrow flex items-center gap-3">
            <span aria-hidden="true" className="inline-block h-px w-10 bg-alert" />
            33 authorities · one housing market · 2024–25
          </span>
          <h1 className="display mt-6 text-[clamp(3rem,11vw,9rem)]">
            London&apos;s housing
            <br />
            crisis costs
            <br />
            <span className="text-signal">
              <Counter value={londonGrossSpend} format={(n) => moneyExact(n)} duration={1600} />
            </span>
            <br />
            a year.
          </h1>
          <div className="mt-8 grid gap-8 md:grid-cols-[1.1fr_1fr]">
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              That is gross direct spending on <strong className="text-foreground">temporary
              accommodation</strong> — hotels, nightly-paid rooms, leased flats — reported by{" "}
              {fmt(manifest.londonTotal)} households&apos; worth of need. Meanwhile council homes
              sit empty waiting for repairs and re-lets, and every month a family stays in a hotel
              is a month the money buys nothing lasting.
            </p>
            <div className="flex flex-col justify-end gap-3">
              <Link
                to="/explore"
                className="group flex items-center justify-between border-2 border-signal bg-signal px-6 py-4 text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                <span className="display text-2xl">Explore the data</span>
                <span aria-hidden="true" className="display text-2xl">↗</span>
              </Link>
              <Link
                to="/challenge"
                search={{}}
                className="group flex items-center justify-between border-2 border-alert px-6 py-4 text-alert transition-transform hover:-translate-y-0.5"
              >
                <span className="display text-2xl">Play HOUSEOPOLY</span>
                <span aria-hidden="true" className="pixel text-lg">▶</span>
              </Link>
              <p className="text-xs text-muted-foreground">
                Gross direct accommodation spend summed across boroughs reporting it, 2024–25.{" "}
                <Source id="ro4">MHCLG · RO4</Source>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- MAP ---------------- */}
      <section className="border-b-2 border-border">
        <div className="mx-auto max-w-[1400px] px-4 py-14 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading eyebrow="Uneven pressure" title={<>Where the need<br />is greatest</>}>
              <p>
                Households in temporary accommodation per 1,000 households, 31 March 2025. Fixed
                bins — the scale never rescales when you select a borough.
              </p>
            </SectionHeading>
            <div className="flex border-2 border-border" role="group" aria-label="Data view">
              {(["map", "list"] as const).map((v) => (
                <button
                  key={v}
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  className={`px-5 py-2 text-xs font-bold uppercase tracking-[0.18em] ${
                    view === v ? "bg-signal text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
            <div className="border-2 border-border bg-surface p-3 md:p-5">
              {view === "map" ? (
                geo ? (
                  <LondonMap geo={geo} selected={code} onSelect={setCode} onHover={setHover} />
                ) : (
                  <div className="grid h-72 place-items-center text-sm text-muted-foreground">
                    {error
                      ? "Map unavailable. Every authority is still reachable in the list."
                      : "Loading London boundaries…"}
                  </div>
                )
              ) : (
                <div className="max-h-[36rem] overflow-auto">
                  <label className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Sort by
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as typeof sort)}
                      className="border-2 border-border bg-background px-2 py-1 text-foreground"
                    >
                      <option value="rate">Highest rate</option>
                      <option value="name">Name</option>
                      <option value="ta">Household count</option>
                    </select>
                  </label>
                  <table className="w-full text-sm">
                    <thead className="eyebrow">
                      <tr className="border-b-2 border-border text-left">
                        <th className="py-2">Authority</th>
                        <th className="py-2 text-right">Households</th>
                        <th className="py-2 text-right">Per 1,000</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((x) => (
                        <tr
                          key={x.code}
                          className={`border-b border-border ${code === x.code ? "bg-surface-2" : ""}`}
                        >
                          <th className="py-1.5 text-left font-medium">
                            <button
                              onClick={() => setCode(x.code)}
                              aria-pressed={code === x.code}
                              className="hover:text-signal"
                            >
                              {x.name}
                            </button>
                          </th>
                          <td className="tabular py-1.5 text-right">{fmt(x.ta)}</td>
                          <td className="tabular py-1.5 text-right">
                            {x.rate?.toFixed(1) ?? "Not reported"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-4 border-t-2 border-border pt-3">
                <MapLegend />
              </div>
            </div>

            {/* Borough readout */}
            <aside className="flex flex-col justify-between border-2 border-border bg-surface p-5">
              <div>
                <span className="eyebrow">Selected authority</span>
                <h3 className="display mt-2 text-4xl md:text-5xl">{active.name}</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Tag kind={active.ta == null ? "modelled" : "observed"}>
                    {active.ta == null ? "TA count modelled" : "TA count observed"}
                  </Tag>
                  {active.gross == null && <Tag kind="modelled">Spend modelled</Tag>}
                </div>
                <dl className="mt-6 space-y-5">
                  <div className="border-t-2 border-border pt-3">
                    <dd className="display text-5xl text-signal">
                      <Counter value={active.taEff} format={(n) => fmt(n)} />
                    </dd>
                    <dt className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      households in temporary accommodation
                    </dt>
                  </div>
                  <div className="border-t-2 border-border pt-3">
                    <dd className="display text-4xl">
                      <Counter value={active.grossEff} format={(n) => money(n)} />
                    </dd>
                    <dt className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      gross direct TA spend, 2024–25
                    </dt>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border-t-2 border-border pt-3">
                      <dd className="display text-3xl text-alert">
                        <Counter value={active.councilVacants ?? 0} format={(n) => fmt(n)} />
                      </dd>
                      <dt className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        council homes empty
                      </dt>
                    </div>
                    <div className="border-t-2 border-border pt-3">
                      <dd className="display text-3xl">
                        <Counter
                          value={active.rateEff}
                          format={(n) => n.toFixed(1)}
                        />
                      </dd>
                      <dt className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        per 1,000 households
                      </dt>
                    </div>
                  </div>
                </dl>
              </div>
              <div className="mt-6">
                {active.modelled.length > 0 && (
                  <p className="mb-3 border-l-2 border-modelled pl-3 text-xs text-muted-foreground">
                    This authority does not report every figure in this release. Values marked
                    modelled are filled from the London average — they are not observations.
                  </p>
                )}
                <Link
                  to="/explore"
                  search={{ b: active.code }}
                  className="flex items-center justify-between border-2 border-signal px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-signal"
                >
                  Explore {active.name} <span aria-hidden="true">→</span>
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ---------------- THE CYCLE ---------------- */}
      <section className="border-b-2 border-border bg-surface">
        <div className="mx-auto max-w-[1400px] px-4 py-16 md:px-8">
          <SectionHeading eyebrow="The loop that keeps spinning" title={<>Money in. Nothing<br />lasting out.</>} />
          <ol className="mt-10 grid gap-px border-2 border-border bg-border md:grid-cols-3">
            {[
              [
                "01",
                "An urgent place to stay",
                "A household becomes homeless. The council must accommodate them — usually in a hotel or nightly-paid room, at rates far above social rent.",
              ],
              [
                "02",
                "Homes wait empty",
                "Council homes sit vacant between tenancies or need works. Every extra week empty is a week that home can't end someone's stay in temporary accommodation.",
              ],
              [
                "03",
                "The bill compounds",
                "Spending rises, the stock doesn't. Money that could buy or repair a permanent home pays another month of temporary rent instead.",
              ],
            ].map(([n, title, text]) => (
              <li key={n} className="bg-background p-7">
                <span className="display text-6xl text-alert/40">{n}</span>
                <h3 className="display mt-4 text-2xl">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------- CHALLENGE TEASER ---------------- */}
      <section className="mx-auto max-w-[1400px] px-4 py-20 md:px-8">
        <div className="flex flex-col items-start justify-between gap-8 border-2 border-alert p-8 md:flex-row md:items-center md:p-12">
          <div>
            <span className="pixel text-xs uppercase tracking-[0.2em] text-alert">
              Housing Director Challenge
            </span>
            <h2 className="display mt-4 text-4xl md:text-6xl">
              Five years. One borough.
              <br />
              A budget under pressure.
            </h2>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Take the chair. Split the money between accommodation, repairs, re-lets and new
              homes, then live with what happens.
            </p>
          </div>
          <Link
            to="/challenge"
            search={{}}
            className="shrink-0 border-2 border-alert bg-alert px-8 py-5 text-center text-accent-foreground"
          >
            <span className="display text-2xl">Take your seat →</span>
          </Link>
        </div>
      </section>
    </>
  );
}
