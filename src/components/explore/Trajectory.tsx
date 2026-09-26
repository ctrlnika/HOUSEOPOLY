import { fmt } from "@/lib/data";
import type { Year } from "@/lib/model/engine";

/** Five-year modelled TA household trajectory: your scenario vs the baseline. */
export function Trajectory({
  player,
  baseline,
  opening,
}: {
  player: Year[];
  baseline: Year[];
  opening: number;
}) {
  const p = [opening, ...player.map((y) => y.state.ta)];
  const b = [opening, ...baseline.map((y) => y.state.ta)];
  const top = Math.ceil(Math.max(...p, ...b) / 1000) * 1000 || 1000;
  const y = (v: number) => 225 - (v / top) * 190;
  const points = (arr: number[]) => arr.map((v, i) => `${55 + i * 94},${y(v)}`).join(" ");

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <i aria-hidden="true" className="inline-block h-0.5 w-6 bg-signal" />
          Your modelled scenario
        </span>
        <span className="flex items-center gap-2">
          <i
            aria-hidden="true"
            className="inline-block h-0 w-6 border-t-2 border-dashed border-muted-foreground"
          />
          Modelled baseline
        </span>
      </div>
      <svg
        viewBox="0 0 565 270"
        className="w-full"
        role="img"
        aria-label="Modelled temporary accommodation households over five years. Exact values are in the table below."
      >
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line x1="55" x2="525" y1={y(top * v)} y2={y(top * v)} stroke="#2b2b3a" />
            <text x="45" y={y(top * v) + 4} textAnchor="end" fill="#8d8da3" fontSize="11">
              {fmt(top * v)}
            </text>
          </g>
        ))}
        {Array.from({ length: 6 }, (_, i) => (
          <text key={i} x={55 + i * 94} y="252" textAnchor="middle" fill="#8d8da3" fontSize="11">
            {i === 0 ? "Start" : "Y" + i}
          </text>
        ))}
        <polyline
          points={points(b)}
          stroke="#8d8da3"
          strokeDasharray="6 6"
          strokeWidth="2.5"
          fill="none"
        />
        <polyline points={points(p)} stroke="#00E5A0" strokeWidth="3.5" fill="none" />
        {p.map((v, i) => (
          <circle key={i} cx={55 + i * 94} cy={y(v)} r="4.5" fill="#00E5A0" />
        ))}
      </svg>
      <details className="mt-2">
        <summary className="cursor-pointer text-xs uppercase tracking-[0.14em] text-muted-foreground">
          View chart data · households
        </summary>
        <div className="mt-2 overflow-auto">
          <table className="w-full text-sm">
            <thead className="eyebrow">
              <tr className="border-b-2 border-border text-left">
                <th className="py-1">Year</th>
                <th className="py-1 text-right">Your scenario</th>
                <th className="py-1 text-right">Baseline</th>
              </tr>
            </thead>
            <tbody>
              {p.map((v, i) => (
                <tr key={i} className="border-b border-border">
                  <th className="py-1 text-left font-medium">{i === 0 ? "Opening" : i}</th>
                  <td className="tabular py-1 text-right">{fmt(v)}</td>
                  <td className="tabular py-1 text-right">{fmt(b[i])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
