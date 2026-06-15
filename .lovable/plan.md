## Cleanup (dead weight)

- Delete `src/lib/api/example.functions.ts`, `src/lib/api/` folder, and `src/lib/config.server.ts` (unused template boilerplate).
- Remove unused `ChevronLeft`, `ChevronRight` imports from `JourneyMap.tsx`.
- Remove the stale `{/* Stage strip */}` comment.
- Remove the redundant "Begin" empty-state card at the bottom of `JourneyMap.tsx` (center summary already prompts the user).
- Remove the decorative footer ("Auto-saved locally · Click any text to edit").
- Drop the v1 migration path (`migrateV1`, `LEGACY_KEY`) from `journey-store.ts`. Keep v2 migration for one release.

## Ring readability & duplication

- When a stage is selected, slim the center summary to just `STAGE 02 / 11` + value-tag dot/name. The big title/subtitle stay only in the magazine spread below — no duplication.
- Center summary keeps the full "Select a stage" copy when nothing is selected.
- Add an empty-stage cue: nodes whose stage has zero lines render with a dashed border + reduced opacity so gaps are visible at a glance.
- Add a placeholder outline dot when a stage has no value tag, so the visual slot is consistent.

## Accessibility

- Convert `StageNode` from a `role="button"` div to a real `<button>` with `aria-label`, `aria-pressed={active}`, native focus ring (`focus-visible:ring-2 ring-foreground/60`), and `tabIndex` in DOM order.
- Add keyboard navigation on the ring container: `←/→` cycle selection, `Home`/`End` jump to first/last, `Enter`/`Space` toggle, `Esc` deselect.
- Wrap the page body in a single `<main>` inside `JourneyMap.tsx` (currently no landmark).
- Ensure icon-only header tool buttons already have `aria-label` (they do via the `tool()` helper — verify).
- Swap `min-h-screen` for `min-h-dvh` on the root container.

## Mobile

- Make the ring responsive: `max-w-[min(680px,90vw)]` and scale label font down one step under `sm:`.
- On viewports < 640px, hide stage labels around the ring and rely on the center summary + node numbers (labels reflow into a list below the ring).

## Small features

- Add a "Money on fire" counter next to the toolbar toggle: `Money on fire · 3/11` when any are flagged.
- Add a stage-completeness counter to the center summary's idle state: `11 STAGES · 2 EMPTY`.

## SSR hydration

- Gate the first render on the `hydrated` flag from `useJourney()` so users don't see seed-then-swap. Render a minimal skeleton (header only) until hydrated.

## Files touched

- `src/components/journey/JourneyMap.tsx` — main, dvh, cleanup, fire counter, hydration gate.
- `src/components/journey/StageLifecycle.tsx` — `<button>` nodes, keyboard nav, empty/no-tag cues, responsive sizing, slimmer center.
- `src/lib/journey-store.ts` — drop v1 migration.
- Delete: `src/lib/api/example.functions.ts`, `src/lib/api/`, `src/lib/config.server.ts`.

## Out of scope (deferred)

- Undo/redo, CSV/Markdown/PDF export, search across lines, og:image/favicon polish — flag-only.
