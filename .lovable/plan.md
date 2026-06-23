## Goal
Remove the map view and promote the roadmap (currently `/conclusion`) to be the home page at `/`.

## Changes

1. **Promote roadmap to home**
   - Rename `src/routes/_authenticated/conclusion.tsx` → `src/routes/_authenticated/index.tsx` (overwriting the current index).
   - Update `createFileRoute("/_authenticated/conclusion")` → `createFileRoute("/_authenticated/")`.
   - Remove the "Back to map" link in the header.
   - Add the `head()` meta block (title, description, OG) from the old index so SEO is preserved.

2. **Delete the map view**
   - Delete `src/components/journey/JourneyMap.tsx`.
   - Delete `src/components/journey/LineListCard.tsx` and `src/components/journey/StageLifecycle.tsx` if they're only used by `JourneyMap` (will verify before deleting; keep any that `RoadmapTable` / `LineRow` still import).

3. **Fix stale links**
   - Search for any `to="/conclusion"` or `Link`/`navigate` references and either remove them or point them at `/`.
   - `routeTree.gen.ts` regenerates automatically — no manual edit.

4. **Header copy**
   - Drop the "Conclusion · Roadmap" eyebrow label, or shorten it to just "Roadmap", since it's now the only view.

## Out of scope
- No changes to the data model, store, drag-and-drop, tags, or auth.
- No redirect from `/conclusion` — the route simply ceases to exist (acceptable since the app is internal and not yet widely shared at that URL).
