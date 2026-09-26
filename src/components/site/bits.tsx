import { useEffect, useRef, useState, type ReactNode } from "react";
import { sourceById } from "@/lib/data";

export function Source({ id, children }: { id: string; children?: ReactNode }) {
  const s = sourceById(id);
  if (!s) return null;
  return (
    <a
      className="inline-flex items-center gap-1 border-b border-signal/50 text-xs font-medium text-signal transition-colors hover:border-signal hover:text-foreground"
      href={s.url}
      target="_blank"
      rel="noreferrer"
    >
      {children || s.publisher} <span aria-hidden="true">↗</span>
    </a>
  );
}

type TagKind = "observed" | "assumption" | "modelled";

export function Tag({ kind, children }: { kind: TagKind; children?: ReactNode }) {
  const label = children ?? (kind === "observed" ? "Observed" : kind === "modelled" ? "Modelled" : "Assumption");
  const cls =
    kind === "observed"
      ? "border-signal text-signal"
      : kind === "modelled"
        ? "border-modelled text-modelled"
        : "border-alert text-alert";
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.18em] ${cls}`}
    >
      <span aria-hidden="true" className="text-[0.7em]">
        {kind === "observed" ? "●" : kind === "modelled" ? "◐" : "○"}
      </span>
      {label}
    </span>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = () => setReduced(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

/** Counts a number up when it changes. Respects reduced-motion. */
export function Counter({
  value,
  format,
  duration = 900,
  className = "",
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const frame = useRef(0);

  useEffect(() => {
    if (reduced) {
      setShown(value);
      from.current = value;
      return;
    }
    const start = performance.now();
    const origin = from.current;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(origin + (value - origin) * eased);
      if (p < 1) frame.current = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [value, duration, reduced]);

  return (
    <span className={`tabular ${className}`}>
      {format(shown)}
    </span>
  );
}

export function Stat({
  value,
  label,
  detail,
  tone = "default",
}: {
  value: ReactNode;
  label: string;
  detail?: ReactNode;
  tone?: "default" | "signal" | "alert";
}) {
  const colour =
    tone === "signal" ? "text-signal" : tone === "alert" ? "text-alert" : "text-foreground";
  return (
    <div className="border-t-2 border-border pt-3">
      <strong className={`display block text-4xl md:text-5xl ${colour}`}>{value}</strong>
      <span className="mt-2 block text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="max-w-3xl">
      <span className="eyebrow flex items-center gap-3">
        <span aria-hidden="true" className="inline-block h-px w-8 bg-signal" />
        {eyebrow}
      </span>
      <h2 className="display mt-4 text-4xl md:text-6xl">{title}</h2>
      {children && <div className="mt-4 text-muted-foreground">{children}</div>}
    </div>
  );
}
