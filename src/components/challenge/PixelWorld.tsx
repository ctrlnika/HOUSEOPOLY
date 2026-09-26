import { Building2, Hammer, Home, Hotel, Landmark, TimerReset, Users } from "lucide-react";
import { fmt, money } from "@/lib/data";
import type { GameEvent } from "@/lib/model/events";
import type { State, Year } from "@/lib/model/engine";

function PixelBuilding({ kind, lit }: { kind: "ta" | "home" | "repair"; lit: number }) {
  const Icon = kind === "ta" ? Hotel : kind === "home" ? Home : Hammer;
  const tone = kind === "ta" ? "text-alert" : kind === "home" ? "text-signal" : "text-modelled";
  return (
    <div className={`pixel-building ${tone}`} aria-hidden="true">
      <Icon className="h-8 w-8" strokeWidth={2.5} />
      <div className="mt-3 grid grid-cols-3 gap-1">
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} className={index < lit ? "bg-current" : "bg-border"} />
        ))}
      </div>
    </div>
  );
}

export function PixelWorld({
  state,
  preview,
  event,
  year,
  animating = false,
}: {
  state: State;
  preview: Year | null;
  event: GameEvent;
  year: number;
  animating?: boolean;
}) {
  const shown = preview?.state ?? state;
  const queue = shown.queue.reduce((sum, item) => sum + item.homes, 0);
  const taLights = Math.max(1, Math.min(6, Math.ceil(shown.ta / Math.max(1, state.ta / 6))));
  const homeLights = Math.min(6, Math.ceil((shown.placements - state.placements + (preview?.committed ?? 0)) / 8));
  const repairLights = Math.min(6, Math.ceil((preview?.repairCompletions ?? 0) / 20));

  return (
    <section className={`pixel-world ${animating ? "is-resolving" : ""}`} aria-label="Borough status">
      <div className="pixel-skyline" aria-hidden="true" />
      <div className="relative z-10 grid gap-5 p-4 md:p-6 lg:grid-cols-[1fr_auto]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="pixel border-2 border-alert bg-background px-2 py-1 text-[0.65rem] text-alert">
              YEAR {year}/5
            </span>
            <span className="pixel text-xs text-modelled">EVENT: {event.title.toUpperCase()}</span>
          </div>
          <div className="mt-8 flex min-h-44 items-end justify-around gap-3 border-b-4 border-signal/50 pb-3">
            <PixelBuilding kind="ta" lit={taLights} />
            <PixelBuilding kind="repair" lit={repairLights} />
            <PixelBuilding kind="home" lit={homeLights} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[0.62rem] uppercase text-muted-foreground">
            <span>Temporary stays</span><span>Homes repaired</span><span>Settled homes</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px self-end border-2 border-border bg-border lg:w-80">
          <WorldReadout icon={Users} label="Households in TA" value={fmt(shown.ta)} />
          <WorldReadout icon={Home} label="Placements" value={fmt(shown.placements)} />
          <WorldReadout icon={Hammer} label="Repair backlog" value={fmt(shown.backlog)} />
          <WorldReadout icon={TimerReset} label="Homes in pipeline" value={fmt(queue)} />
          <WorldReadout icon={Landmark} label="Reserve" value={money(shown.reserve)} />
          <WorldReadout icon={Building2} label="Funding gap" value={money(shown.funding)} alert={shown.funding > 0} />
        </div>
      </div>
      {animating && (
        <div className="pixel-transfer" aria-live="polite">
          <span>£</span><span>→</span><span>⌂</span><span>→</span><span>●</span>
          <strong>CALCULATING CONSEQUENCES…</strong>
        </div>
      )}
    </section>
  );
}

function WorldReadout({ icon: Icon, label, value, alert = false }: { icon: typeof Home; label: string; value: string; alert?: boolean }) {
  return (
    <div className="bg-background p-3">
      <Icon className={alert ? "text-alert" : "text-signal"} size={15} aria-hidden="true" />
      <strong className="pixel mt-2 block text-sm">{value}</strong>
      <span className="mt-1 block text-[0.6rem] uppercase text-muted-foreground">{label}</span>
    </div>
  );
}