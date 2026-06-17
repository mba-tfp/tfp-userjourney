## Problem

In the roadmap table (`src/components/journey/RoadmapTable.tsx`), drag-and-drop currently:

- Uses `useDraggable` + `useDroppable` on lines/cells, so lines can only jump between cells — **no reordering within a cell**, and no in-between insertion point.
- Highlights the **entire destination cell** while dragging, so you can't see *where* in the list the line will land.
- Has a small 4 px activation distance which feels twitchy when you're just trying to click into a line to edit.

The store already supports precise placement via `moveLineToCell({ toIndex })`, so we only need UI work.

## Fix

Rework drag-and-drop in `RoadmapTable.tsx` to use sortable lists per cell, with a visible insertion indicator.

### 1. Sortable lines, per-cell context

- Wrap each `Cell`'s `<ul>` in a `SortableContext` with `verticalListSortingStrategy` and the cell's line IDs.
- Replace `DraggableLine`'s `useDraggable` with `useSortable`. This gives smooth lift / shift animations and natural within-cell reordering for free.
- Keep the drag handle (`GripVertical`) as the only listener target so clicking the text still focuses the editor — no accidental drags.

### 2. Cross-cell moves + within-cell reorder unified

- Switch the `DndContext` from `pointerWithin` to `closestCorners` (better for vertical lists with insertion gaps).
- Add `onDragOver` to handle the "hovering over another cell" case: track the current target cell + index in local state for the drop indicator.
- In `onDragEnd`:
  - line-over-line, same cell → `moveLineToCell({ fromStageId, lineId, toStageId: same, exists: same, toIndex })` (reorders in place).
  - line-over-line, different cell → same call with the new `toStageId`/`exists` and the over-line's index.
  - line-over-empty-cell → append (omit `toIndex`).
- Stage column drag stays as today.

### 3. Drop indicator

- Inside `DraggableLine`, read `isOver` + `activeIndex`/`overIndex` from `useSortable` and render a 2 px horizontal accent bar above (or below, depending on direction) the hovered line. Use `bg-primary` so it's clearly visible on both light cells and the destructive gap cells.
- For empty cells, keep the existing cell-wide ring highlight; add a 2 px placeholder bar inside the empty `<ul>` while a line is dragged over it so users see "drop here" even with no rows.
- Hide the indicator on the currently-dragged item itself.

### 4. Calmer activation

- Bump `PointerSensor` `activationConstraint` from `{ distance: 4 }` to `{ distance: 6, delay: 0 }` (or `{ distance: 8 }`) so a quick click on a line never starts a drag. The grip handle remains the obvious affordance.

### 5. DragOverlay polish

- Keep the existing `DragOverlay` card, but apply a subtle `rotate-1` and `shadow-xl` so the lifted line clearly reads as detached. Hide the source row with `opacity-30` (already in place via `isDragging`).

## Scope

- Only `src/components/journey/RoadmapTable.tsx` changes. No store changes (already supports `toIndex`). No data model or props changes for parent components.
- Other drag surfaces (tags page sortable list, stage column reorder) are untouched — they already work well.

## Out of scope

- Multi-select drag.
- Touch long-press tuning beyond the activation-distance bump.
- Cross-bucket drag *while keeping the original tag set* — current behavior is preserved.
