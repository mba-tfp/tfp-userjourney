## Goal

Replace the inline `TagManagerDialog` with a dedicated **/tags** management screen, add merge for duplicates, prevent duplicate tags on the same stage/line, and make tag pills drag-reorderable everywhere they appear.

## 1. New route: `src/routes/tags.tsx`

A real page (linked from the toolbar "Manage tags…" entry and from the `TagPicker` dropdown footer instead of opening a modal). Two sections — **Line tags** and **Value tags** — each a sortable list with the same row controls.

Per-row controls:
- Drag handle (reorder the registry — controls default display order everywhere)
- Color swatch picker (existing `TAG_COLORS` palette)
- Inline-editable name with **duplicate-name validation** (case-insensitive, trimmed) — invalid state shows a red border + inline message and the rename is rejected on blur/Enter
- **Merge into…** dropdown — pick another tag in the same section; all references on lines/stages are rewritten to the target id (de-duped), then the source tag is deleted
- Delete (existing behavior)
- "Used in N lines / N stages" counter for context

Header actions: "Add line tag", "Add value tag", and a back link to `/`.

## 2. Duplicate-tag validation on stages & lines

In `journey-store.ts`, change the tag-id setters so they always de-dupe:
- When `Line.tagIds` or `Stage.valueTagIds` is updated, run `Array.from(new Set(ids))` before commit.
- `TagPicker.onChange` already toggles, but add a defensive `Set` pass so paste/import/merge can't introduce dupes.
- Surface a subtle toast ("Already tagged") only when the picker rejects a duplicate from a programmatic source (merge); the toggle UI itself silently no-ops.

Tag-registry duplicate-name rule (separate from id-dedupe above) lives in the /tags screen as described in §1 — quick adds in `TagPicker` are unaffected (they only pick existing tags, never create).

## 3. Drag-and-drop reordering of tag pills

Install `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` (already a common shadcn-compatible pick; small footprint).

Refactor `TagPicker` so the selected-pill row uses a `DndContext` + `SortableContext` (horizontal strategy). Dragging a pill reorders the `values: string[]` and calls `onChange(nextOrder)`. The `+` add button and dropdown stay outside the sortable list.

Because `Line.tagIds` / `Stage.valueTagIds` already preserve array order, reordering pills in any one place persists and is reflected wherever those tags render (LineRow, StageNode dots, center summary).

The /tags screen reuses the same dnd-kit setup vertically to reorder the registry itself; that order is the default order used when a brand-new tag is added to a line/stage.

## 4. Wire-up changes

- `JourneyMap.tsx`: replace `TagManagerDialog` mount + state with a `<Link to="/tags">` in the toolbar; remove the dialog import.
- `TagPicker.tsx`: change `onManage` prop to navigate to `/tags` (keep the prop name; pass `() => navigate({ to: '/tags' })` from callers).
- `LineRow.tsx`, `StageLifecycle.tsx`: no API change — they already pass through `tagIds` arrays; reordering "just works" once `TagPicker` is sortable.
- Delete `TagManagerDialog.tsx` after the route is live.

## 5. Out of scope

- Multi-select bulk merge, tag groups/categories, server-side persistence (still localStorage v4 — no schema bump needed; ordering is already array-based).
- Cross-section merge (line tag ↔ value tag).

## Files

- **Add:** `src/routes/tags.tsx`, small `src/components/journey/SortableTagPill.tsx` helper.
- **Edit:** `src/lib/journey-store.ts` (de-dupe + `mergeTag` / `mergeValueTag` actions + `reorderTags` / `reorderValueTags`), `src/components/journey/TagPicker.tsx` (dnd-kit sortable pills, navigate on manage), `src/components/journey/JourneyMap.tsx` (drop dialog, add link).
- **Delete:** `src/components/journey/TagManagerDialog.tsx`.
- **Install:** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
