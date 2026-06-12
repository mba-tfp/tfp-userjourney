# Answering your questions first

- **"Mark as gap"** isn't a button anymore. The ↔ icon on each line just moves the line between the two cards ("What Exists Today" ↔ "What Doesn't Exist Today"). The card a line lives in *is* its gap status — there's no separate flag. I'll relabel the tooltip to "Move to other card" so this is obvious.
- **Capacity / Revenue / Cost aren't editable today** because they're hardcoded in `JourneyMap.tsx` (`VALUE_LABELS`, `VALUE_STYLES`). I'll lift them into the same editable registry pattern as tags so you can rename, recolor, add, and delete them.

# What I'll build

## 1. Side-by-side comparison
Change the magazine spread's right column from `space-y-5` (stacked) to a 2-column grid so "What Exists Today" and "What Doesn't Exist Today" sit beside each other on desktop, stacking on narrow screens. The left feature column (numeral, stage title) stays as-is.

## 2. Tag legend + counts per card
Above each card's line list, add a compact legend strip:
- One pill per tag used by lines *in that card*, colored with the tag's color, suffixed with the count (e.g. `Patient 3`, `Clinic 1`).
- An "Untagged N" pill when applicable.
- Hidden when the card has 0 lines.

## 3. Tag filter chips per card
The same pills double as filter chips. Click toggles a per-card filter set (independent for Exists vs Doesn't-Exist). Active chips get a solid background; the line list only renders matching lines. A small "Clear" link appears when any filter is active. Filter state is local component state (per stage view) — not persisted.

## 4. Per-stage money-on-fire
Today, the global "Money on fire" toggle highlights a fixed set of stage indexes. I'll change it so:
- Each stage carries `onFire?: boolean` in its data (default seeded from the current `MONEY_ON_FIRE_INDEXES` set so existing visuals don't change).
- The stage card's dropdown menu (the ⋮) gets a "Toggle money on fire" item.
- The selected-stage feature column gets a 🔥 toggle button next to the Value tag.
- The global toolbar button stays, but now just *shows/hides* the highlight (it doesn't decide which stages are on fire).

## 5. Editable Value tags (Capacity / Revenue / Cost)
- Introduce `valueTags: ValueTag[]` on the doc (id, name, color) seeded with Capacity (teal), Revenue (blue), Cost (amber).
- Stage's `value` field becomes a `valueTagId` reference.
- The `ValueTag` button reads name+color from the registry; the picker dropdown lists registry entries plus "Manage value tags…".
- Extend the existing `TagManagerDialog` with a second section "Value tags" (same add/rename/recolor/delete UI) — one dialog, two registries.
- Migration: on load, map existing string values (`"capacity"`/`"revenue"`/`"cost"`) to the corresponding seeded value-tag id.

# Files touched

- `src/lib/journey-data.ts` — add `ValueTag` type, `valueTags` on doc, change `Stage.value` to `valueTagId?: string`, seed value tags, add per-stage `onFire`.
- `src/lib/journey-store.ts` — migration for string→id and `onFire` seed; CRUD for value tags (`addValueTag`, `renameValueTag`, `setValueTagColor`, `deleteValueTag`); `toggleStageOnFire`.
- `src/components/journey/JourneyMap.tsx` — side-by-side grid; per-stage on-fire wiring; replace hardcoded `VALUE_STYLES`/`VALUE_LABELS` with registry-driven `ValueTag` component; rename ↔ tooltip.
- `src/components/journey/LineListCard.tsx` *(new)* — extracted from `JourneyMap.tsx`, owns legend + filter chip state.
- `src/components/journey/TagManagerDialog.tsx` — add Value-tags section; accept both registries via props.
- `src/components/journey/LineRow.tsx` — tooltip copy update only.

# Out of scope
Drag-and-drop reordering, cross-stage filtering, persisting filter selections, exporting filter state, changing the underlying "exists/gap" semantics.
