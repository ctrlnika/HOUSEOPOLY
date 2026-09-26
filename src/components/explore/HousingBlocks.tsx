import { fmt } from "@/lib/data";

/**
 * Housing counters: each block is a unit of housing. Fills as homes come back
 * into use. Status is carried by shape and label as well as colour.
 */
export function HousingBlocks({
  total,
  occupied,
  label,
  caption,
  tone = "signal",
  unitLabel = "homes",
}: {
  total: number;
  occupied: number;
  label: string;
  caption?: string;
  tone?: "signal" | "alert";
  unitLabel?: string;
}) {
  const cells = 40;
  const perCell = Math.max(1, Math.ceil(total / cells));
  const shown = Math.min(cells, Math.max(0, Math.ceil(total / perCell)));
  const lit = Math.min(shown, Math.round(occupied / perCell));
  const litColour = tone === "alert" ? "bg-alert" : "bg-signal";

  return (
    <div className="border-2 border-border p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.14em]">{label}</span>
        <span className="tabular display text-2xl">
          {fmt(occupied)}
          <span className="text-muted-foreground"> / {fmt(total)}</span>
        </span>
      </div>
      <div
        className="mt-3 flex flex-wrap gap-1"
        role="img"
        aria-label={`${fmt(occupied)} of ${fmt(total)} ${unitLabel}. Each block represents about ${fmt(perCell)}.`}
      >
        {Array.from({ length: shown }, (_, i) => (
          <span
            key={i}
            aria-hidden="true"
            className={`h-3.5 w-3.5 border transition-colors duration-300 ${
              i < lit ? `${litColour} border-transparent` : "border-border bg-surface-2"
            }`}
          />
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {caption ? caption + " " : ""}Each block ≈ {fmt(perCell)} {unitLabel}.
      </p>
    </div>
  );
}
