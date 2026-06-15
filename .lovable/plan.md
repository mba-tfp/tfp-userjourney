# Make the Roadmap fully editable

Bring the `/conclusion` table to feature parity with the main map: inline edits, add/delete, and drag-and-drop for stages (columns), tags (rows), and lines (cells).

## What you'll be able to do

**Column headers (stages)**
- Edit emoji, title, subtitle inline (existing `EditableText`)
- Change value tag and toggle Money-on-fire (existing `TagPicker` + flame button)
- Drag a column left/right to reorder stages
- Add stage (➕ button at end of header row) and delete stage (× on hover)

**Row headers (tags)**
- Edit tag name inline; change color via the existing color popover
- Drag a row up/down to reorder tags
- Add tag (➕ row at bottom) and delete tag (× on hover, with confirm)

**Cells (stage × tag)**
- Each line is editable inline (text)
- Toggle a line between "exists" / "gap" (small pill, same styling as today)
- Delete a line (× on hover)
- Add a line directly in the cell (➕ button at the bottom of each cell — defaults to `exists: true`, pre-tagged with this row's tag and assigned to this column's stage)
- Drag a line to another cell. Dropping into a different **column** moves it to that stage; dropping into a different **row** swaps its tag for that row's tag. Dropping in the same cell reorders within the cell.

**Toolbar**
- Same masthead pattern as JourneyMap: Tags, Map (back), Add stage, Money-on-fire toggle, Sign out.

## Technical details

Library: `@dnd-kit/core` + `@dnd-kit/sortable` (already installed — used by `SortableTagPill`).

New store actions in `src/lib/journey-store.ts`:
- `reorderStages(nextOrder: string[])` — mirrors `reorderTags`
- `moveLineToCell(fromStageId, lineId, toStageId, toTagId?, toIndex?)` — pops the line from `lines[fromStageId]`, sets/replaces its single-tag-for-this-row (replace the row's old tag id with `toTagId` if provided, otherwise keep tags as is), and inserts into `lines[toStageId]` at `toIndex`. Cell membership is derived from `line.tagIds.includes(rowTagId)`, so changing tag = changing row.

New component file: `src/components/journey/RoadmapTable.tsx`
- Wraps the table in a single `DndContext` with `closestCenter` + a custom collision strategy that prefers cell drop targets, then column targets, then row targets.
- Three `SortableContext`s: stages (horizontal), tags (vertical), and one per-cell list of lines.
- `useDraggable` on the column-header drag handle and row-header drag handle; `useSortable` on lines inside cells.
- Drop zones: each `<td>` is a droppable with id `cell:{stageId}:{tagId}`; column headers expose `col:{stageId}`; row headers expose `row:{tagId}`.
- `onDragEnd` dispatches to `reorderStages` / `reorderTags` / `moveLineToCell` based on the active+over ids.

Update `src/routes/_authenticated/conclusion.tsx` to render `<RoadmapTable />` plus the existing summary strip and Back-to-map link. Keep the sticky headers and current visual styling (tag pills, value pill, on-fire chip, dashed gap styling).

Reuse existing primitives: `EditableText`, `TagPicker` (for value tag on stage headers and for line tag chips), the color popover currently used in the Tags page (extract into a small `TagColorPopover` if it isn't already a standalone component — otherwise inline a minimal version).

No schema, server-function, or routing changes. Persistence keeps working through the existing `useJourney()` debounced save.

## Files

- edit `src/lib/journey-store.ts` — add `reorderStages` and `moveLineToCell`
- new `src/components/journey/RoadmapTable.tsx` — DnD-aware editable table
- edit `src/routes/_authenticated/conclusion.tsx` — swap the static table for `<RoadmapTable />`, keep header/summary
