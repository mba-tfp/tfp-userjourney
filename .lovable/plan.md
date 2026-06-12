## Goal
Add a single colored "Value" tag (Capacity / Revenue / Cost) under each stage name, plus a top-bar toggle that highlights money-losing stages with a red outline. Lens rows (Patient, Clinic, TFP, Channel, etc.) stay exactly as they are.

## Changes

### 1. `src/lib/journey-data.ts`
- Extend `Stage` type with `value: "capacity" | "revenue" | "cost"`.
- Add the same field to `stageDefs` with this mapping (stages are 1-indexed):
  - 1 Capacity, 2 Revenue, 3 Cost, 4 Capacity, 5 Cost, 6 Revenue, 7 Capacity, 8 Capacity, 9 Revenue, 10 Revenue, 11 Revenue.

### 2. `src/components/journey/JourneyMap.tsx`
- Add `showMoneyOnFire` state (default `false`) and a `MONEY_ON_FIRE_INDEXES = new Set([2,5,8,9,10])` (0-based for stages 3, 6, 9, 10, 11).
- In the masthead toolbar, add a labeled toggle (small pill button with Flame icon + "Money on fire" label, active state = filled accent). Keep tooltip; visually distinct from the icon-only tools.
- New `ValueTag` component: small pill (`text-[10px] uppercase tracking-wide`, rounded-full, px-2 py-0.5) with color variants:
  - capacity → teal (`bg-teal-100 text-teal-800 border-teal-200` style via inline classes, or token equivalents)
  - revenue → blue (`bg-blue-100 text-blue-800 border-blue-200`)
  - cost → amber (`bg-amber-100 text-amber-900 border-amber-200`)
  - When `onFire` prop true → add `ring-2 ring-destructive ring-offset-1` red outline.
- Pass `value` and `onFire` to `StageCard`. Render the tag inside the card directly under the title (before the subtitle).
- Also render the tag in the magazine spread's feature column next to the sentiment pill, so the value is visible while expanded.

### 3. No changes
- `CellEditor`, `EditableText`, `journey-store`, lens rows, persisted JSON migration handled by spreading defaults — existing localStorage docs missing `value` will simply render no tag until reset; acceptable per scope (mention in closing message).

## Out of scope
- Editing the value per stage from the UI.
- Persisting the money-on-fire toggle.
- Changing lens content.
