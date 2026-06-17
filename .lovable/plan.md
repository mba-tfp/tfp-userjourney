## Approach

Replace the inline hover toolbar on each row/tile with a single **three-dot (kebab) menu** button. All secondary actions (move up, move down, swap section, delete) collapse into that menu, so nothing floats over the text while you're editing.

## Where it applies

Audit every place that currently shows an inline action cluster and convert each to a kebab menu:

1. **`src/components/journey/LineRow.tsx`** — primary offender. Replace the 4-button absolute cluster with one `MoreHorizontal` button → `DropdownMenu` containing: Move up, Move down, Move to other section, Delete (destructive style).
2. **`src/components/journey/LineListCard.tsx`** — if it exposes card-level actions (add/clear/etc.), give it the same kebab pattern in the card header.
3. **`src/components/journey/StageLifecycle.tsx`** and **`src/components/journey/RoadmapTable.tsx`** — apply the same pattern to any row-level edit/delete controls so the UI is consistent across the app.
4. **`src/routes/_authenticated/tags.tsx`** — tag rows with edit/delete get the same kebab treatment.

I'll grep for `Trash2`, `ChevronUp`, `ArrowLeftRight`, and similar inline action icons to make sure nothing is missed.

## UI details

- Use the existing shadcn `DropdownMenu` (already in the project under `src/components/ui/`).
- Trigger: small ghost icon button with `MoreHorizontal` (lucide), visible on row hover *and* always visible on touch / when the row is focused — so it never disappears mid-edit.
- Menu items in order: **Move up**, **Move down**, separator, **Move to other section**, separator, **Delete** (red, `text-destructive`).
- Trigger sits in a reserved right-side slot (flex child, not absolute) so it can't overlap the editable text.
- Keyboard: trigger is a real `<button>`, menu items are reachable via arrow keys (shadcn handles this).

## Out of scope

- No confirm dialog before delete (can add later if you want).
- No change to data model, props shape, or parent components beyond passing the same callbacks into the menu.
- No drag-and-drop reordering (still uses up/down).
