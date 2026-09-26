import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { register, sources } from "@/lib/data";
import { SectionHeading, Source } from "@/components/site/bits";

export const Route = createFileRoute("/sources")({
  head: () => ({
    meta: [
      { title: "Sources — HOUSEOPOLY" },
      { name: "description", content: "Every public dataset behind HOUSEOPOLY, with publisher, date, licence and caveats." },
      { property: "og:title", content: "Sources — HOUSEOPOLY" },
      { property: "og:description", content: "The public datasets behind HOUSEOPOLY's London housing figures." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Sources,
});

function Sources() {
  const [q, setQ] = useState("");
  const filtered = register.filter((r) =>
    (r.title + " " + r.publisher + " " + r.theme + " " + r.goodFor).toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <section className="mx-auto max-w-[1100px] px-4 py-12 md:px-8">
      <SectionHeading eyebrow="Sources" title={<>Where the<br />numbers come from.</>}>
        <p>Every figure in HOUSEOPOLY comes from a published public dataset.</p>
      </SectionHeading>

      <h2 className="display mt-10 text-3xl">Sources used</h2>
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
