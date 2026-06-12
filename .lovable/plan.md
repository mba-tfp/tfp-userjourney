# Circular Lifecycle Stage Layout

Replace the horizontal scrolling stage strip with a closed-loop circle so every stage is visible at once. Click behavior and the existing magazine detail spread stay exactly as they are today.

## Layout

- New component `StageLifecycle.tsx` renders a single square SVG (responsive, max ~640px) inside the existing `<section>` that currently holds the strip.
- Stages are evenly distributed around a circle (angle = `i * 2π / n`, starting at 12 o'clock).
- Between each adjacent pair, draw a thin arc segment with a small arrowhead at the midpoint — the arrows go clockwise around the ring, closing the loop back to stage 1 so it reads as a lifecycle.
- Each stage is rendered as an absolutely-positioned node (HTML overlay on top of the SVG, using percentage coords) so existing typography, emoji bubble, edit affordances, and the `ValueTag` picker can be reused without re-implementing in SVG.

## Stage node

Compact circular node (~120px) replacing the 280px card:
- Top: numeral (`01`, `02`, …) — small, muted; primary color when active.
- Center: existing 56px emoji bubble (editable via `EditableText`, same as today).
- Below bubble: stage title (single line, truncated, editable on click-through guard).
- Tiny `ValueTag` chip under the title.
- `MoreVertical` menu appears on hover (same dropdown items as today: move left/right, insert after, toggle money on fire, delete) — "left/right" semantics keep working because stages still have an array order.
- Active state: ring + slight scale-up; inactive when another is selected: dim to 55% (mirrors current `dim` behavior).
- Money-on-fire ring stays via the existing `ValueTag` wrapper.

Subtitle is dropped from the ring node (no room); it remains visible/editable in the magazine spread below.

## Click behavior

- Clicking a node toggles `selectedStageId` exactly like today.
- The magazine spread (`What Exists Today` / `What Doesn't Exist Today`, feature column, ValueTag, money-on-fire button) renders unchanged below the ring.
- Collapse button in the spread still clears selection.

## Files

- New: `src/components/journey/StageLifecycle.tsx` — SVG ring + arc connectors + arrowheads + HTML node overlay. Pure presentational; receives `stages`, `selectedStageId`, `valueTags`, `showMoneyOnFire`, and the same callbacks `StageCard` uses today (`onSelect`, `onRename`, `onValueChange`, `onToggleOnFire`, `onManageValueTags`, `onMove`, `onInsertAfter`, `onDelete`).
- Edit: `src/components/journey/JourneyMap.tsx`
  - Remove `stripRef`, `scrollStrip`, the two scroll arrow buttons, the `<ol>` strip, and the inline `StageCard` component.
  - Replace that whole `<section>` body with `<StageLifecycle ... />`.
  - Keep the "Add stage" toolbar button; add-stage still appends to the array, which simply adds another node to the ring.
  - Empty-state copy ("Select a stage above…") updated to "Select a stage in the ring to read its details."

No changes to `journey-data.ts`, `journey-store.ts`, `LineRow.tsx`, `LineListCard.tsx`, `TagManagerDialog.tsx`, `TagPicker.tsx`, or persisted data shape.

## Responsiveness

- Ring is `aspect-square` with `width: min(100%, 640px)` and centered.
- Node size and font shrink slightly at <480px (e.g. 96px nodes) so 8–10 stages still fit without overlap. If stage count exceeds ~12, nodes scale down further proportionally (`nodeSize = clamp(72, ringRadius * sin(π/n) * 1.6, 132)`).

## Out of scope

- Drag-to-reorder around the ring (Move left/right in the menu still works).
- Animated arc transitions.
- Changing the detail spread, tags, value tags, or persistence.
