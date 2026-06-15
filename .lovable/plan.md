## Goal

Treat **Exists Today / Doesn't Exist Today** as a true bucket on the conclusion roadmap, not as tags. Add a leading "Status" column on the left; each line lives in exactly one of the two status rows per stage, driven by the existing `line.exists` boolean. Tags become an orthogonal per-line attribute (shown as pills on the line), not row groupings.

## Roadmap layout (new)

```text
            │ Stage 1 │ Stage 2 │ Stage 3 │ ...
────────────┼─────────┼─────────┼─────────┼────
Exists      │ lines…  │ lines…  │ lines…  │
Today       │         │         │         │
────────────┼─────────┼─────────┼─────────┼────
Doesn't     │ lines…  │ lines…  │ lines…  │
Exist Today │         │         │         │
```

- Two fixed rows. No tag rows, no Untagged row.
- Each line cell shows its text + tag pills (click pill area to add/remove tags via `TagPicker`).
- Drag a line between the two status rows → flips `exists`.
- Drag a line between cells in the same row → moves stage.
- Stage columns still drag-reorder horizontally.
- "Add line" button per cell creates a line with the right `exists` value.

## One-time migration

On doc load (inside `normalize` in `src/lib/journey-store.ts`):
1. Find tag ids whose `name` (case-insensitive, trimmed) is `"What Exists Today"` or `"What Doesn't Exist Today"` (also accept "Doesn't Exist Today" / "Does Not Exist Today").
2. For every line, if it carries the "exists" tag → set `exists = true` and strip that tag id. If it carries the "doesn't exist" tag → set `exists = false` and strip it.
3. Remove those tag entries from `doc.tags`.
4. Also strip them from any stage's `valueTagIds` defensively.

Migration runs once per load; because results are saved through the existing debounced save, the cleaned doc persists.

## Seed cleanup

In `src/lib/journey-data.ts`:
- Drop `{ name: "What Exists Today", color: "slate" }` from `tagDefs`.
- In `sourceRows`, the rows tagged "What Exists Today" become lines with `gap: false` (already the default) and **no** tag → they'll fall into the Exists row purely via the bucket. Other tagged rows (Patient/Clinic/TFP/Channel) keep their tags.

## Files

- **edit** `src/lib/journey-data.ts` — remove the seeded tag; adjust seed rows that referenced it so those lines simply have no tag (still `exists: true`).
- **edit** `src/lib/journey-store.ts` — add migration step in `normalize` (runs for both freshly loaded and seeded docs); no new store actions needed — `moveLineToCell` already supports `toTagId: null`, and we'll add a tiny `setLineExists(stageId, lineId, exists)` helper for the cross-bucket drag.
- **edit** `src/components/journey/RoadmapTable.tsx` — replace tag-row layout with two fixed status rows; remove `UNTAGGED`/`rowTags` logic; render tag pills inline on each line (reuse `TagPicker` in a popover trigger); update DnD to use row ids `row:exists` / `row:gap` and cell ids `cell:{stageId}:{exists|gap}`; update `onDragEnd` to call `setLineExists` + `moveLineToCell` accordingly.
- **no change** to `JourneyMap.tsx`, tags page, schema, or server functions.

## Out of scope

Map view (`/`) keeps its current Exists/Gap split — already bucket-shaped there. Tag management page is untouched; users can still create/edit/delete other tags.
