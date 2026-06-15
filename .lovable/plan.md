## Conclusion / Roadmap page

Add a new read-only summary route at `/conclusion` that compiles every stage, its lifecycle value (Capacity/Revenue/Cost), money-on-fire status, and all of its lines grouped by tag — laid out as a horizontal roadmap table.

### Route
- Create `src/routes/_authenticated/conclusion.tsx` → `createFileRoute("/_authenticated/conclusion")`.
- Reuses `useJourney()` so it reflects the live, synced doc (no extra fetching).

### Layout

```text
┌─ Stage 1 ──────┬─ Stage 2 ──────┬─ Stage 3 ──────┬ …
│ 🔍 Awareness   │ 🤔 Considera…  │ 📇 Referral 🔥 │
│ [Capacity]     │ [Revenue]      │ [Cost]         │
├────────────────┼────────────────┼────────────────┤
│ What Exists    │ What Exists    │ What Exists    │   ← tag row
│ • line         │ • line         │ • line (gap)   │
├────────────────┼────────────────┼────────────────┤
│ Patient        │ Patient        │ Patient        │
│ • line         │ • line         │ • line         │
├────────────────┼────────────────┼────────────────┤
│ …per tag…      │                │                │
└────────────────┴────────────────┴────────────────┘
```

- One column per stage (horizontally scrollable on small screens, sticky header row).
- One row per tag in `doc.tags` (sticky left label column with the tag's color pill).
- Each cell lists the matching lines for that stage+tag, with gap lines styled distinctly (muted + dashed border, matching the existing gap treatment).
- Header cell shows emoji, title, subtitle, the value-tag pill, and a 🔥 indicator when `onFire`.
- Read-only — no editing, no drag handles.

### Toolbar / nav
- Add a "Conclusion" (or "Roadmap") link to the JourneyMap toolbar next to the existing Tags button so users can reach it.
- The conclusion page has a "Back to map" link returning to `/`.

### Summary strip (top of page)
A small header band with quick totals derived from the doc:
- Total stages, total lines, gap count, money-on-fire count.
- Count per value tag (Capacity / Revenue / Cost).

### Files
- **New:** `src/routes/_authenticated/conclusion.tsx` (route + page component, including the table; small enough to keep in one file, can extract later).
- **Edit:** `src/components/journey/JourneyMap.tsx` — add a nav link/button to `/conclusion`.

No schema, store, or server-function changes — purely a new presentational view over the existing `JourneyDoc`.