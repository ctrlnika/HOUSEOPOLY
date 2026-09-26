# HOUSEOPOLY

```text
  _   _  ___  _   _ ____  _____ ___  ____   ___  _  __   __
 | | | |/ _ \| | | / ___|| ____/ _ \|  _ \ / _ \| | \ \ / /
 | |_| | | | | | | \___ \|  _|| | | | |_) | | | | |  \ V /
 |  _  | |_| | |_| |___) | |__| |_| |  __/| |_| | |___| |
 |_| |_|\___/ \___/|____/|_____\___/|_|    \___/|_____|_|
     THE REALITY OF LONDON HOUSING · POWERED BY REAL DATA
```

An editorial data experience and satirical strategy game exposing London's **£1.4B+ annual temporary accommodation crisis** across all 33 boroughs using real statutory records.

**Live site:** <https://houseopoly.lovable.app>

---

## The Concept

Over **73,000 London households** live in emergency temporary accommodation (B&Bs, nightly-paid private hotels). HOUSEOPOLY turns dry open data into a visceral, playable inquiry:

1. **Editorial dashboard (`/`, `/explore`)** — statutory homelessness pressures, council vacancies and emergency spending, borough by borough.
2. **Council vs Speculator (`/auction`)** — a 90-second tactical auction where you act as Borough Housing Director outbidding predatory speculators on scarce London homes.
3. **Data transparency (`/sources`)** — every figure tagged **Observed** (statutory MHCLG/DLUHC), **Modelled** (derived/imputed) or **Assumption** (planning parameter).

---

## Core Game: Council vs Speculator

- **Objective** — house families and preserve long-term stock on a tight municipal budget (~40% of auction total).
- **Format** — 6 lots, 15-second decision timer, mid-game curveballs (GLA grants, judicial reviews).
- **Moves per lot**
  - **Outbid & Buy Back** — high capital cost, guarantees long-term council homes.
  - **Compulsory Repair Order** — cheaper enforcement, risk of speculator appeal.
  - **Pass / Concede** — save cash, families pushed into emergency B&Bs.
- **Rivals (10×10 pixel sprites)**
  - **Sir Rupert Vance** — buy-to-let tycoon carving terraces into micro-studios.
  - **Chloe "Keybox Queen"** — short-let hustler flipping flats to £280/night tourist pads.
  - **Apex Offshore Capital** — faceless fund parking capital at 0% occupancy.
  - **Terry Higgins** — flipper leasing mouldy flats back to councils as emergency hostels.

---

## Tech Stack

```text
┌────────────────────┬────────────────────────────────────────────┐
│ Layer              │ Technology                                 │
├────────────────────┼────────────────────────────────────────────┤
│ Framework          │ TanStack Start v1 (Full-stack SSR / Edge)  │
│ UI & Routing       │ React 19.2 · @tanstack/react-router v1.170 │
│ Styling & Tokens   │ Tailwind CSS v4 (@theme, OKLCH, 0px radii) │
│ State & Query      │ @tanstack/react-query v5                   │
│ Game Engine        │ Deterministic TypeScript engine (mulberry) │
│ Visuals            │ Inline SVG GeoJSON map · 10×10 CSS sprites │
│ Testing & Typing   │ Vitest v5 · TypeScript 5 (bunx tsgo)       │
└────────────────────┴────────────────────────────────────────────┘
```

### Architectural highlights

- **No heavy game engine** — event-driven React state machine, deterministic PRNG maths and CSS-grid pixel rendering instead of WebGL/Canvas runtimes.
- **Strict data labelling** — no silent fallbacks; missing borough records use auditable London-average fills with visible tags.
- **Design identity** — Night Map palette (`#0A0A12` base, signal green `#00E5A0`, alert crimson `#FF3D71`); Anton, Space Grotesk and Silkscreen type.

---

## Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Start dev server (http://localhost:8080)
npm run dev

# 3. Run test suite
bunx vitest run

# 4. Strict typecheck
bunx tsgo --noEmit
```

---

## Data Sources & Licence

Data used under the **Open Government Licence v3.0** from:

- **MHCLG** — Statutory Homelessness Live Tables
- **DLUHC** — RO4 Revenue Outturn (lines 11–13)
- **ONS** — Digital Local Authority Boundaries
