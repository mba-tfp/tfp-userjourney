## What changes

Three related changes to the roadmap table.

### 1. "Money on fire" becomes per-line

Today `stage.onFire` tints an entire column. Move the flag onto each `Line`.

- Add `onFire?: boolean` to the `Line` type in `src/lib/journey-data.ts`.
- In `RoadmapTable.tsx`:
  - Remove the Fire toggle button and red column tint from `StageHeader`.
  - In `SortableLine`, add a small flame icon button (next to the existing line-options dot menu) that toggles `line.onFire`. Active state uses the same destructive-red treatment.
  - When the global "Money on fire" header toggle is ON: dim every line whose `onFire` is not true (`opacity-40`) and keep on-fire lines at full opacity with a subtle red ring/background. When OFF: render normally, with a small flame badge visible on on-fire lines so users can still see which are flagged.
- In `src/routes/_authenticated/index.tsx`, change `stats.fires` to count lines with `onFire === true` across all stages instead of stages.
- Store: add `toggleLineOnFire(stageId, lineId)`; remove the now-unused `toggleStageOnFire` call site (keep the store method for back-compat or delete it — delete it since it has only one caller).
- Migration in `journey-store.ts` `normalize()`: for any stored doc where `stage.onFire === true`, set `line.onFire = true` on every gap line in that stage (lines with `exists === false`). This preserves the prior "money on fire" intent by promoting the column flag down to its red gap lines. After migration, drop `stage.onFire` from output.
- Seed data: replace the `ON_FIRE_INDEXES` stage-level seeding with line-level seeding. The five `FIRE_GAP_LINES` already produced by the prior migration get `onFire: true` automatically when prepended; mark the same seed-side prepend with `onFire: true` so a fresh user gets them flagged. Other gap lines in the same five stages stay un-flagged unless the user toggles them.

### 2. Value tags (Capacity / Revenue / Cost) move from stage to line

Today `stage.valueTagIds` shows Capacity/Revenue/Cost pills in the column header and powers the per-value stats in the page header. Move them onto lines so each line can carry its own value tag(s).

- In `StageHeader`, remove the Value `TagPicker`.
- In `SortableLine`, render a second `TagPicker` immediately below the existing tag picker, bound to `doc.valueTags` and `line.valueTagIds`, labelled "Value". Keep the regular tag picker (Patient/Clinic/TFP/Channel/Bloomic) untouched. Two separate pickers keep the distinction clear and avoid merging two semantically different palettes.
- Add `valueTagIds: string[]` to the `Line` type, default `[]`.
- Store: add `updateLine` already handles arbitrary patches; add explicit normalization for `valueTagIds` (`Array.from(new Set(...))`) the same way it does for `tagIds`. `addLine` and `addLineInCell` initialize `valueTagIds: []`.
- Stats in `_authenticated/index.tsx`: change `byValue` to sum across `doc.lines[*].valueTagIds` instead of `stage.valueTagIds`. Stat pills in the header keep working unchanged.
- Migration in `normalize()`: for each stored stage with non-empty `valueTagIds`, copy those ids onto every line in that stage (union with any existing `line.valueTagIds`). Then clear `stage.valueTagIds` to `[]`. This preserves the meaning the user already encoded at the column level by pushing it down to each line that lived in that column. The user can then prune per line.
- `Stage.valueTagIds` field stays on the type for one release for back-compat reading; UI no longer writes to it. Drop it later.

### 3. Fix undo / redo

Root cause: `past` and `future` are refs, and `canUndo`/`canRedo` are read off `past.current.length` at hook return. `bumpHistory()` is called from inside another `setState` updater, which under StrictMode and concurrent rendering does not reliably re-render in time for the toolbar buttons to flip from disabled to enabled. The buttons therefore appear stuck.

Fix:

- Track history lengths as real state: `const [pastLen, setPastLen] = useState(0)` and `const [futureLen, setFutureLen] = useState(0)`.
- After every push/pop, call `setPastLen(past.current.length)` and `setFutureLen(future.current.length)` from outside the `setDoc` updater. Concretely, refactor `update`, `undo`, `redo`, `reset`, `importDoc` to compute the mutation first, then call both `setDoc(next)` and the length setters at the top level (no nested setState).
- Return `canUndo: pastLen > 0` and `canRedo: futureLen > 0`.
- Remove `historyTick` and `_historyTick`.

This also fixes the keyboard shortcut path (Cmd/Ctrl+Z) which currently relies on the same broken signal to update the toolbar.

## Files touched

- `src/lib/journey-data.ts` — `Line.onFire`, `Line.valueTagIds`, seed lines flag the prepended fire gap lines.
- `src/lib/journey-store.ts` — migration (stage.onFire → line.onFire on gap lines; stage.valueTagIds → line.valueTagIds), `toggleLineOnFire`, history state, remove `toggleStageOnFire`.
- `src/components/journey/RoadmapTable.tsx` — remove fire toggle and value picker from `StageHeader`; add flame toggle, value picker, and on-fire visual treatment to `SortableLine`; drop column-level fire tint.
- `src/routes/_authenticated/index.tsx` — stats compute from lines.

## Out of scope

- Tag manager UI, TipTap modal, drag-and-drop, save/load wiring — unchanged.
- `LineRow.tsx` (the older row component used in another spot) — unchanged; this work is in `RoadmapTable.tsx`.
