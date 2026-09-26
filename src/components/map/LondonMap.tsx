import { useEffect, useState } from "react";
import { boroughs, manifest, type Borough } from "@/lib/data";

export type Geo = {
  features: {
    properties: { code: string; name: string };
    geometry: { type: string; coordinates: number[][][] | number[][][][] };
  }[];
};

/** Five fixed bins, dark canvas → signal green. Bins never rescale on selection. */
export const BIN_COLOURS = ["#123b33", "#1b5f4e", "#1f8a68", "#16c489", "#00e5a0"];
export const BIN_LABELS = ["<5", "5–<10", "10–<20", "20–<30", "30+"];

export function useLondonGeo() {
  const [geo, setGeo] = useState<Geo | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let live = true;
    fetch("/data/london-boundaries.geojson")
      .then((r) => {
        if (!r.ok) throw new Error("geo");
        return r.json();
      })
      .then((g) => live && setGeo(g))
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, []);
  return { geo, error };
}

export function binIndex(rate: number) {
  return manifest.mapBins.filter((v) => rate >= v).length;
}

export function LondonMap({
  geo,
  selected,
  onSelect,
  onHover,
}: {
  geo: Geo;
  selected: string;
  onSelect: (code: string) => void;
  onHover?: (code: string | null) => void;
}) {
  const all = geo.features.flatMap((f) =>
    (f.geometry.coordinates as unknown[]).flat(f.geometry.type === "MultiPolygon" ? 2 : 1),
  ) as number[][];
  const k = Math.cos((51.5 * Math.PI) / 180);
  const xs = all.map((p) => (p[0] ?? 0) * k);
  const ys = all.map((p) => p[1] ?? 0);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scale = Math.min(940 / (maxX - minX), 600 / (maxY - minY));
  const project = (p: number[]) => [
    ((p[0] ?? 0) * k - minX) * scale + 20,
    (maxY - (p[1] ?? 0)) * scale + 20,
  ];
  const path = (f: Geo["features"][number]) =>
    (f.geometry.type === "MultiPolygon"
      ? (f.geometry.coordinates as number[][][][]).flat(1)
      : (f.geometry.coordinates as number[][][]))
      .map(
        (ring) =>
          ring
            .map((p, i) => {
              const [x, y] = project(p);
              return `${i ? "L" : "M"}${(x ?? 0).toFixed(1)},${(y ?? 0).toFixed(1)}`;
            })
            .join("") + "Z",
      )
      .join("");

  return (
    <svg
      viewBox="0 0 980 640"
      className="w-full"
      role="group"
      aria-label="London boroughs shaded by temporary accommodation rate. Tab to a borough and press Enter to select it."
    >
      <defs>
        <pattern id="ho-missing" width="7" height="7" patternUnits="userSpaceOnUse">
          <rect width="7" height="7" fill="#1a1a26" />
          <path d="M0 7L7 0" stroke="#5c5c72" strokeWidth="1" />
        </pattern>
      </defs>
      {geo.features.map((f) => {
        const b: Borough | undefined = boroughs.find((x) => x.code === f.properties.code);
        if (!b) return null;
        const isSelected = selected === b.code;
        const observedRate = b.rate;
        const fill = observedRate == null ? "url(#ho-missing)" : BIN_COLOURS[binIndex(observedRate)];
        return (
          <path
            key={b.code}
            d={path(f)}
            fill={fill}
            stroke={isSelected ? "#FF3D71" : "#0A0A12"}
            strokeWidth={isSelected ? 4 : 1.5}
            className="cursor-pointer transition-[fill-opacity,stroke] duration-200 hover:fill-opacity-80 focus:outline-none"
            fillOpacity={isSelected ? 1 : 0.92}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            aria-label={`${b.name}: ${observedRate == null ? "rate not reported, modelled from the London average" : `${b.rate?.toFixed(1)} per 1,000 households`}, 31 March 2025.`}
            onMouseEnter={() => onHover?.(b.code)}
            onMouseLeave={() => onHover?.(null)}
            onFocus={() => onHover?.(b.code)}
            onBlur={() => onHover?.(null)}
            onClick={() => onSelect(b.code)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(b.code);
              }
            }}
          >
            <title>
              {b.name}: {observedRate?.toFixed(1) ?? "not reported"} per 1,000
            </title>
          </path>
        );
      })}
    </svg>
  );
}

export function MapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
      <span className="eyebrow">TA per 1,000 households</span>
      {BIN_LABELS.map((n, i) => (
        <span key={n} className="flex items-center gap-2">
          <i
            aria-hidden="true"
            className="inline-block h-3 w-5 border border-border"
            style={{ background: BIN_COLOURS[i] }}
          />
          {n}
        </span>
      ))}
      <span className="flex items-center gap-2">
        <i aria-hidden="true" className="hatch inline-block h-3 w-5 border border-border" />
        Not reported
      </span>
    </div>
  );
}
