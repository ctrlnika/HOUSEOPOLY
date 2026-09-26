# HOUSEOPOLY — Stage 1: brand, landing, explore

Port the existing House London project into this app, rename it HOUSEOPOLY, and give it a bold editorial identity with a dramatic landing page and a redesigned Explore experience. All real data and the existing five-year model logic are preserved exactly as they are.

## What stays untouched

- The published borough dataset (33 boroughs, temporary accommodation counts, spending, vacant homes, sources, assumptions, evidence notes) is copied across as-is.
- The scenario model (`engine.ts`) — yearly step, queues, delivery lag, costs, baseline comparison — is reused without changing a single calculation.
- Every source link, provenance note, "observed vs illustrative" label and the methodology page carry over.

## Stage 1 scope

1. **Port** the uploaded project into this app's routing structure: `/` (landing), `/explore`, `/methodology`. The challenge route is kept working in its current form as a placeholder so nothing breaks.
2. **Rebrand** every "House London" to HOUSEOPOLY, with an original wordmark — no Monopoly assets, colours or graphics.
3. **New design system** and landing page.
4. **Explore redesign** with game-like intervention controls and animated cause-and-effect.
5. **Game (Stage 2)** — the full pixel Housing Director game comes in the next round, on a distinct dark pixel-art screen.

## Visual identity

- Palette: near-black map canvas `#0A0A12`, paper `#E8E8F0`, signal green `#00E5A0`, alert pink `#FF3D71`. Dark-first, with neon only for live data.
- Type: heavy condensed display for numbers and headlines, plain grotesque for body. Oversized figures, tight tracking, hard 1px rules instead of card shadows.
- Motifs used sparingly: borough outlines, street-sign plates, key silhouettes, hatched construction markings, housing counters.
- No rounded white cards, no blue gradients, no glassmorphism, no repeating 3-column grids.

## Landing page

- Full-bleed opening: the wordmark, then one enormous real figure — London's annual temporary accommodation spend, counted up on load — with a supporting line about the cycle of empty homes, slow re-lets and families stuck in hotels.
- The London borough map is the centrepiece, not a widget: large, dark, choropleth by TA rate, with fixed bins. Hovering or focusing a borough throws its figures out at large scale beside the map.
- Two primary actions: EXPLORE THE DATA and PLAY HOUSEOPOLY.
- Below: a small number of oversized observed facts, each with its source link, and a plain statement that the snapshot is 2024–25.

## Explore mode

- Same borough picker and same calculations, new presentation.
- Interventions become physical controls rather than form sliders: allocation bars you drag, housing blocks that fill as homes come back into use, money visibly moving between categories.
- Outcomes animate on change: projected savings, households moved out of temporary accommodation, homes returned to use, remaining TA cost, five-year trajectory.
- Assumptions stay editable and stay labelled observed / proxy / illustrative, with the funding ledger kept as an expandable detail.

## Boroughs with incomplete data

All 33 boroughs stay selectable. Where a borough is missing a TA count or spend figure, the app fills the gap using a London-level average and marks that figure visibly as "modelled, not observed" everywhere it appears — never silently. Missing values are never shown as zero.

## Accessibility and responsiveness

Keyboard navigation and visible focus throughout, semantic headings, contrast checked on the dark palette, reduced-motion support for all counters and transitions, non-colour indicators on the map. On small screens the map and controls restructure rather than shrink.

## Technical notes

- Data files land in `public/data/` and are loaded as today; `london-boundaries.geojson` is fetched client-side.
- Structure: `src/lib/model/engine.ts` (unchanged logic), `src/lib/data.ts` (typed loaders, average-fill for missing boroughs, clearly flagged), `src/components/landing/*`, `src/components/explore/*`, `src/components/map/*`.
- The current 108-line monolithic `main.tsx` is split into route files and components; the hash router is replaced by real routes.
- Design tokens go into `src/styles.css` as semantic variables; no hardcoded colour utilities in components.
- The existing model unit tests are ported and must still pass.
