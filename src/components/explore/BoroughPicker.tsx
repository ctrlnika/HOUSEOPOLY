import { useEffect, useMemo, useRef, useState } from "react";
import type { Borough } from "@/lib/data";

/**
 * Compact, searchable borough picker. Filters by name as you type and shows a
 * small scrollable dropdown instead of a giant native <select> list.
 */
export function BoroughPicker({
  boroughs,
  value,
  onChange,
}: {
  boroughs: Borough[];
  value: string;
  onChange: (code: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = boroughs.find((b) => b.code === value);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return boroughs;
    return boroughs.filter((b) => b.name.toLowerCase().includes(q));
  }, [boroughs, query]);

  // Keep active index in range when the match list changes.
  useEffect(() => {
    setActive((i) => Math.min(i, Math.max(0, matches.length - 1)));
  }, [matches.length]);

  // Close on outside click / escape.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function choose(code: string) {
    onChange(code);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  return (
    <div ref={wrapperRef} className="relative block max-w-2xl">
      <span className="mb-2 block text-sm font-bold uppercase tracking-[0.16em]">
        Explore a borough
      </span>
      <div className="flex items-center gap-2 border-2 border-signal bg-background px-4 py-3">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="borough-listbox"
          aria-autocomplete="list"
          aria-label="Search boroughs"
          placeholder={selected ? selected.name : "Type a borough name…"}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((i) => Math.min(i + 1, matches.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && open && matches[active]) {
              e.preventDefault();
              choose(matches[active].code);
            }
          }}
          className="display w-full bg-transparent text-2xl text-foreground placeholder:text-muted-foreground focus:outline-none sm:text-3xl"
        />
        <button
          type="button"
          aria-label={open ? "Close borough list" : "Open borough list"}
          onClick={() => {
            setOpen((o) => !o);
            if (!open) inputRef.current?.focus();
          }}
          className="display text-2xl text-signal"
        >
          {open ? "−" : "+"}
        </button>
      </div>

      {open && (
        <ul
          id="borough-listbox"
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto border-2 border-border bg-background"
        >
          {matches.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">No boroughs match “{query}”.</li>
          ) : (
            matches.map((b, i) => (
              <li key={b.code} role="option" aria-selected={b.code === value}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(b.code)}
                  className={`flex w-full items-center justify-between px-4 py-2 text-left text-lg ${
                    i === active ? "bg-surface-2 text-foreground" : "text-foreground/90"
                  } ${b.code === value ? "border-l-4 border-signal" : "border-l-4 border-transparent"}`}
                >
                  <span className="display">{b.name}</span>
                  {b.rate != null && (
                    <span className="tabular text-xs text-muted-foreground">{b.rate.toFixed(1)}/1k</span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
