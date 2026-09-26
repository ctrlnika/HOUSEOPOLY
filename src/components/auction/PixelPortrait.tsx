import type { Speculator } from "@/lib/game/auction";

/**
 * Renders a speculator's 10x10 pixel portrait as a CSS grid.
 * Purely presentational; the art data lives with the character.
 */
export function PixelPortrait({
  who,
  size = 8,
  className = "",
}: {
  who: Speculator;
  size?: number;
  className?: string;
}) {
  const cols = who.art[0]?.length ?? 10;
  return (
    <div
      role="img"
      aria-label={`${who.name}, ${who.archetype}`}
      className={`shrink-0 border-2 border-border bg-surface-2 p-1 ${className}`}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, ${size}px)`,
        gridAutoRows: `${size}px`,
        imageRendering: "pixelated",
      }}
    >
      {who.art.flatMap((row, y) =>
        row.split("").map((ch, x) => (
          <span
            key={`${y}-${x}`}
            style={{ background: who.palette[ch] ?? "transparent" }}
          />
        )),
      )}
    </div>
  );
}

export function SpeculatorCard({ who }: { who: Speculator }) {
  const accent =
    who.tone === "alert" ? "border-alert" : who.tone === "signal" ? "border-signal" : "border-modelled";
  return (
    <div className={`flex gap-4 border-2 ${accent} bg-surface p-4`}>
      <PixelPortrait who={who} size={7} />
      <div className="min-w-0">
        <p className="pixel text-[0.7rem] leading-tight text-foreground">{who.name}</p>
        <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {who.archetype}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{who.blurb}</p>
      </div>
    </div>
  );
}
