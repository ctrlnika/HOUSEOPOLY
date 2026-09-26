import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  assumptionSpecs,
  boroughs,
  evidence,
  fmt,
  londonGrossReported,
  londonGrossSpend,
  manifest,
  money,
  moneyExact,
  register,
  sources,
} from "@/lib/data";
import { SectionHeading, Source, Tag } from "@/components/site/bits";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "Methodology & sources — HOUSEOPOLY" },
      {
        name: "description",
        content:
          "Every number in HOUSEOPOLY, labelled: what is observed, what is assumed, what is modelled, and where each figure came from.",
      },
      { property: "og:title", content: "Methodology & sources — HOUSEOPOLY" },
      {
        property: "og:description",
        content: "Observed data, illustrative assumptions and modelled projections, kept apart.",
      },
    ],
  }),
  component: Methodology,
});

function Methodology() {
  const [q, setQ] = useState("");
  const scenarioReady = boroughs.filter((b) => b.scenarioReady).length;
  const missingTa = boroughs.filter((b) => b.ta == null).length;
  const filtered = register.filter((r) =>
    (r.title + " " + r.publisher + " " + r.theme + " " + r.goodFor).toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <section className="mx-auto max-w-[1100px] px-4 py-12 md:px-8">
      <SectionHeading
        eyebrow="Methodology"
        title={
          <>
            Nothing here is
            <br />
            invented.
          </>
        }
      >
        <p>
          HOUSEOPOLY keeps three kinds of number strictly apart. Every screen labels which one you
          are looking at.
        </p>
      </SectionHeading>

      <div className="mt-8 grid gap-px border-2 border-border bg-border md:grid-cols-3">
        {[
          {
            kind: "observed" as const,
            title: "Observed",
            text: "Published figures from government releases, copied without adjustment. Household counts, spending outturns, empty-home counts.",
          },
          {
            kind: "assumption" as const,
            title: "Assumption",
            text: "Illustrative inputs the model needs but no public dataset provides: unit costs, eligible pools, delivery lags. You can change every one of them.",
          },
          {
            kind: "modelled" as const,
            title: "Modelled",
            text: "Outputs of the scenario model, and any gap-filled borough value. Projections under stated assumptions — never forecasts.",
          },
        ].map((c) => (
          <article key={c.title} className="bg-background p-5">
            <Tag kind={c.kind} />
            <h3 className="display mt-3 text-2xl">{c.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{c.text}</p>
          </article>
        ))}
      </div>

      <h2 className="display mt-14 text-3xl">The data snapshot</h2>
      <dl className="mt-4 grid gap-px border-2 border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Data version", manifest.dataVersion],
          ["Model version", manifest.modelVersion],
          ["London TA households", fmt(manifest.londonTotal)],
          ["Sum of borough figures", fmt(manifest.boroughSum)],
          ["Authorities covered", fmt(boroughs.length)],
          ["Authorities with full scenario data", fmt(scenarioReady)],
          ["Authorities missing a TA count", fmt(missingTa)],
          [
            "Gross direct TA spend reported",
            `${money(londonGrossSpend)} · ${londonGrossReported} authorities`,
          ],
        ].map(([k, v]) => (
          <div key={k} className="bg-background p-4">
            <dd className="display text-2xl">{v}</dd>
            <dt className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">{k}</dt>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm text-muted-foreground">
        The London total exceeds the sum of borough figures because the regional release includes
        estimates for authorities that did not report. Missing values are never shown as zero: they
        are labelled &ldquo;not available&rdquo;, or filled from the London average and labelled
        modelled.
      </p>

      <h2 className="display mt-14 text-3xl">How the map is calculated</h2>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        Borough shading uses households in temporary accommodation per 1,000 households, in fixed
        bins of {manifest.mapBins.join(", ")} — fixed so boroughs stay comparable between releases.
        Authorities with no published count are hatched rather than shaded. The denominator is the
        release&apos;s own household estimate, which is a 2018-based projection for 2020 and is now
        dated; rates are indicative of scale rather than exact.
      </p>

      <h2 className="display mt-14 text-3xl">How a modelled year works</h2>
      <ol className="mt-4 space-y-3">
        {[
          "External pressure is added along a shared reference path, so your decisions never shrink the pressure you are judged against.",
          "Homes commissioned in earlier years arrive after the delivery lag and become available.",
          "Settled placements are capped by both the number of suitable homes and by remaining need — one home enables at most one initial placement.",
          "Re-let and acquisition funding commissions homes for later years; repair funding clears backlog and retrofits, which does not create extra housing.",
          "Accommodation cost is charged for whoever is still in temporary accommodation. Underfunding becomes a funding gap, never fewer households.",
          "Unspent allocations roll into reserve; any remaining shortfall is recorded as external funding required.",
        ].map((t, i) => (
          <li key={i} className="flex gap-4 border-t-2 border-border pt-3">
            <span className="display text-2xl text-signal">{i + 1}</span>
            <span className="text-sm text-muted-foreground">{t}</span>
          </li>
        ))}
      </ol>

      <h2 className="display mt-14 text-3xl">Money rules</h2>
      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
        <li className="border-l-2 border-alert pl-4">
          All figures are in fixed 2024–25 prices. No inflation, discounting or resale value.
        </li>
        <li className="border-l-2 border-alert pl-4">
          Gross direct expenditure is used throughout; income and net figures are shown for context
          only.
        </li>
        <li className="border-l-2 border-alert pl-4">
          Homes acquired keep their value beyond the fifth year, which the five-year comparison does
          not credit. Savings are therefore conservative in that respect and optimistic in others.
        </li>
        <li className="border-l-2 border-alert pl-4">
          The annual envelope is a simplification: 120% of observed gross temporary-accommodation
          spend. Real capital, revenue, grant and housing-account rules are separate.
        </li>
      </ul>

      <h2 className="display mt-14 text-3xl">Every assumption, and why</h2>
      <div className="mt-4 overflow-auto border-2 border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="eyebrow bg-surface">
            <tr className="text-left">
              <th className="p-3">Assumption</th>
              <th className="p-3 text-right">Default</th>
              <th className="p-3">Status</th>
              <th className="p-3">Why this value</th>
            </tr>
          </thead>
          <tbody>
            {assumptionSpecs.map((s) => (
              <tr key={s.id} className="border-t border-border align-top">
                <th className="p-3 text-left font-medium">
                  {s.label}
                  <small className="mt-1 block font-normal text-muted-foreground">
                    Affects: {s.affects}
                  </small>
                </th>
                <td className="tabular p-3 text-right">
                  {s.unit.startsWith("£") ? moneyExact(s.value) : s.value}
                  <small className="block text-muted-foreground">{s.unit}</small>
                </td>
                <td className="p-3">
                  <Tag kind={s.status === "proxy" ? "modelled" : "assumption"}>{s.status}</Tag>
                </td>
                <td className="p-3 text-muted-foreground">
                  {s.explanation}
                  <span className="mt-2 flex flex-wrap gap-3">
                    {s.sourceIds.map((id) => (
                      <Source key={id} id={id} />
                    ))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="display mt-14 text-3xl">Evidence library</h2>
      <div className="mt-4 grid gap-px border-2 border-border bg-border md:grid-cols-2">
        {evidence.map((c) => (
          <article key={c.id} className="bg-background p-5">
            <h3 className="display text-xl">{c.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{c.text}</p>
            <p className="mt-2 text-xs text-muted-foreground">Shown when: {c.reason}</p>
            <div className="mt-2">
              <Source id={c.sourceId} /> <span className="text-xs text-muted-foreground">{c.locator}</span>
            </div>
          </article>
        ))}
      </div>

      <h2 className="display mt-14 text-3xl">Sources used in this build</h2>
      <div className="mt-4 space-y-px border-2 border-border bg-border">
        {sources.map((s) => (
          <article key={s.id} className="bg-background p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3 className="font-bold">{s.title}</h3>
              <span className="text-xs text-muted-foreground">
                {s.publisher} · published {s.publicationDate} · retrieved {s.retrieved}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {s.locator} · {s.licence}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{s.caveats}</p>
            <div className="mt-2 flex flex-wrap gap-4">
              <Source id={s.id}>Source page</Source>
              {s.fileUrl && (
                <a
                  href={s.fileUrl}
                  className="border-b border-signal/50 text-xs font-medium text-signal"
                >
                  Download the file ↓
                </a>
              )}
            </div>
          </article>
        ))}
      </div>

      <h2 className="display mt-14 text-3xl">Wider dataset register</h2>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
        {register.length} datasets reviewed while building this, including ones not used. Search
        by theme, publisher or use.
      </p>
      <label className="mt-4 block">
        <span className="sr-only">Search the dataset register</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search e.g. rents, vacancy, boundaries"
          className="w-full border-2 border-border bg-surface px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-signal focus:outline-none"
        />
      </label>
      <p className="mt-2 text-xs text-muted-foreground" role="status">
        {filtered.length} of {register.length} datasets shown.
      </p>
      <div className="mt-4 space-y-px border-2 border-border bg-border">
        {filtered.map((r) => (
          <article key={r.id} className="bg-background p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3 className="font-bold">{r.title}</h3>
              <span className="eyebrow">{r.theme}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{r.publisher}</p>
            <dl className="mt-3 grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
              <div>
                <dt className="font-bold uppercase tracking-[0.12em]">Grain</dt>
                <dd>
                  {r.spatialGrain} · {r.temporalGrain}
                </dd>
              </div>
              <div>
                <dt className="font-bold uppercase tracking-[0.12em]">Access</dt>
                <dd>
                  {r.access} · updated {r.updateFrequency}
                </dd>
              </div>
              <div>
                <dt className="font-bold uppercase tracking-[0.12em]">Good for</dt>
                <dd>{r.goodFor}</dd>
              </div>
              <div>
                <dt className="font-bold uppercase tracking-[0.12em]">Caveats</dt>
                <dd>{r.caveats}</dd>
              </div>
            </dl>
            <a
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block border-b border-signal/50 text-xs font-medium text-signal"
            >
              Open dataset ↗
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
