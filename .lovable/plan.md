# HOUSEOPOLY Pixel Challenge — Stage 2

## Goal
Turn the existing five-year Housing Director Challenge into a polished, replayable pixel-art strategy game while preserving the verified housing model, real borough inputs, baseline comparison, evidence, and methodology links.

## What will change

### 1. Borough setup screen
- Add a focused game-start screen with all 33 London boroughs.
- Show each borough’s opening households in temporary accommodation, annual spending, and data status before play.
- Clearly mark London-average substitutions as modelled rather than observed.
- Keep Newham as the initial highlighted choice, not the only playable borough.

### 2. Pixel-art game world
- Rebuild `/challenge` as a full-width 8-bit council control room and borough streetscape using CSS pixel art and semantic HTML.
- Visualise temporary accommodation pressure, available homes, repairs, acquisitions, reserves, and funding gaps as changing world elements rather than static cards.
- Preserve the established near-black, signal-green, alert-pink HOUSEOPOLY palette while making the game visually distinct from the editorial data pages.
- Keep all controls keyboard accessible, readable without animation, and usable on mobile.

### 3. Five-turn decision loop
Each year will follow a clear game rhythm:

```text
Event arrives → allocate the budget → preview trade-offs → commit → watch consequences → year report
```

- Retain the four existing allocations: temporary accommodation, faster re-lets, repairs and retrofit, and settled-home acquisition.
- Turn allocations into physical pixel controls with moving coins, filled meters, and immediate world feedback.
- Keep the same budget limits and calculation rules already enforced by the model.
- Make pending homes and their delivery lag visible across future years.

### 4. Event system
- Add a deterministic five-card event deck drawn from the requested pressures: private rents rise, repair backlog, government grant, landlord ends contract, winter pressure, and new development.
- Each event will state its exact temporary modifier before the player allocates funds.
- Treat every event effect as a labelled game assumption, never as observed borough data.
- Apply modifiers through a separate game layer so the verified core housing model remains unchanged and testable.

### 5. Animated cause and effect
- After commitment, play a short, skippable sequence showing households entering pressure, homes returning to use, repairs completing, acquired homes entering the delivery queue, and money moving from the envelope.
- Use restrained pixel movement and number transitions, with an instant reduced-motion version.
- Ensure animation never changes the underlying result or blocks keyboard users from continuing.

### 6. Year-end and final record
- Replace the current year review with a pixel newspaper/report screen containing outcomes, event impact, funding ledger, and one sourced evidence card.
- Finish with a five-year record against the same baseline: households in temporary accommodation, placements, delivered homes, repair backlog, intervention cost, savings or additional cost, and funding required.
- Label all forecasts as modelled projections and retain links to Explore and Methodology.
- Add replay with the same borough and restart with a different borough.

## Technical approach
- Keep `src/lib/model/engine.ts` as the source of truth for annual housing calculations.
- Add a small, typed game-event layer that derives a per-turn configuration from the selected borough and event; no event logic will be embedded in visual components.
- Split the game into focused setup, world, allocation, event, report, and final-record components rather than expanding the existing route into one large file.
- Use existing shared formatters, borough data, source labels, and design tokens; add only semantic pixel-game tokens and motion utilities where required.
- Use deterministic event ordering for reproducible results and tests.

## Verification
- Add focused tests for event modifiers, deterministic event order, budget enforcement, delivery lag, and five-year comparison integrity.
- Play a complete five-year run in the preview, including borough selection, every event, each year report, final comparison, and replay.
- Check desktop and mobile layouts, keyboard navigation, reduced motion, overflow, console errors, route metadata, and the latest preview build status.
