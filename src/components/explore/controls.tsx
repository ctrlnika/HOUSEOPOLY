import { useId } from "react";
import { assumptionSpecs, money } from "@/lib/data";
import type { Assumptions } from "@/lib/model/engine";
import { Tag } from "@/components/site/bits";

/**
 * A budget lever. Renders as a filled allocation bar you can drag, plus
 * keyboard-accessible range input semantics and coarse +/- steps.
 */
export function AllocationBar({
  label,
  hint,
  value,
  max,
  step = 0.1,
  onChange,
  tone = "signal",
  disabled = false,
}: {
  label: string;
  hint: string;
  /** Value in £ millions. */
  value: number;
  max: number;
  step?: number;
  onChange: (next: number) => void;
  tone?: "signal" | "alert" | "modelled";
  disabled?: boolean;
}) {
  const id = useId();
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const barColour =
    tone === "alert" ? "bg-alert" : tone === "modelled" ? "bg-modelled" : "bg-signal";
  const textColour =
    tone === "alert" ? "text-alert" : tone === "modelled" ? "text-modelled" : "text-signal";
  const clamp = (n: number) => Math.max(0, Math.min(max, Number.isFinite(n) ? n : 0));

  return (
    <div className={`border-2 border-border p-4 ${disabled ? "opacity-50" : ""}`}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-bold uppercase tracking-[0.14em]">
          {label}
        </label>
        <span className={`display tabular text-2xl ${textColour}`}>{money(value * 1e6)}</span>
      </div>

      <div className="relative mt-3 h-8 border-2 border-border bg-surface-2">
        <div
          aria-hidden="true"
          className={`h-full ${barColour} transition-[width] duration-300`}
          style={{ width: `${pct}%` }}
        />
        <input
          id={id}
          type="range"
          min={0}
          max={Math.max(max, step)}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(clamp(+e.target.value))}
          aria-valuetext={`${money(value * 1e6)} of ${money(max * 1e6)}`}
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0 disabled:cursor-not-allowed"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{hint}</p>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(clamp(value - 1))}
            aria-label={`Decrease ${label} by £1m`}
            className="border-2 border-border px-2 py-1 text-xs font-bold hover:border-signal"
          >
            − £1m
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(clamp(value + 1))}
            aria-label={`Increase ${label} by £1m`}
            className="border-2 border-border px-2 py-1 text-xs font-bold hover:border-signal"
          >
            + £1m
          </button>
        </div>
      </div>
    </div>
  );
}

export function NumericSlider({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  unit = "",
  description,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max: number;
  step?: number;
  unit?: string;
  description?: string;
}) {
  const id = useId();
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Number.isFinite(v) ? v : min)));
  return (
    <div className="border-t border-border pt-3">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-xs font-bold uppercase tracking-[0.12em]">
          {label}
        </label>
        <span className="tabular text-xs text-signal">
          {unit === "GBP" ? money(value) : `${Number(value.toFixed(4))} ${unit}`}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => set(+e.target.value)}
          className="h-1 w-full accent-[var(--signal)]"
          aria-valuetext={`${value} ${unit}`}
        />
        <input
          type="number"
          aria-label={`${label} numeric value in ${unit || "units"}`}
          min={min}
          max={max}
          step={step}
          value={Number(value.toFixed(4))}
          onChange={(e) => set(+e.target.value)}
          className="tabular w-24 border-2 border-border bg-background px-2 py-1 text-xs"
        />
      </div>
      {description && <p className="mt-2 text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

export function AssumptionEditor({
  a,
  setA,
}: {
  a: Assumptions;
  setA: (a: Assumptions) => void;
}) {
  return (
    <details className="mt-10 border-2 border-border bg-surface p-5">
      <summary className="cursor-pointer text-sm font-bold uppercase tracking-[0.16em]">
        Inspect and edit scenario assumptions
      </summary>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Tag kind="assumption" />
        <p className="text-xs text-muted-foreground">
          These are assumptions, not council commitments or statistical confidence intervals. The
          pressure default uses observed stock change as a proxy.
        </p>
      </div>
      <div className="mt-4 grid gap-x-8 gap-y-2 md:grid-cols-2">
        {assumptionSpecs.map((spec) => {
          const x = spec as typeof spec & { id: keyof Assumptions };
          return (
          <NumericSlider
            key={x.id}
            label={x.label}
            value={a[x.id] ?? x.value}
            min={x.min}
            max={x.max}
            step={x.step}
            unit={x.unit}
            onChange={(n) => setA({ ...a, [x.id]: n })}
            description={`${x.status.charAt(0).toUpperCase() + x.status.slice(1)}. ${x.explanation}`}
          />
          );
        })}
      </div>
    </details>
  );
}
