## Goal
Replace the 5 lens cards per stage with two cards — "What Exists Today" and "What Doesn't Exist Today" — where each line carries a colored tag (Patient, Clinic, TFP, Channel, What Exists Today). The tag list is editable globally. Each line has an explicit exists/doesn't-exist toggle that decides which card it appears in.

## Data model

`CellLine` becomes line-level with its own metadata, and lines live in a single per-stage pool rather than per-lens cells.

```ts
type Tag = { id: string; name: string; color: string };
type Line = { id: string; text: string; tagId?: string; exists: boolean };
type Stage = { id; emoji; title; subtitle; value? };
type JourneyDoc = {
  title: string;
  stages: Stage[];
  tags: Tag[];                  // editable, replaces lenses
  lines: Record<string, Line[]>; // lines[stageId] = ordered Line[]
};
```

Seed `tags` from the current lens names (What Exists Today, Patient, Clinic, TFP, Channel) with the existing palette. Migrate every existing cell line into `lines[stageId]`, set `tagId` to the lens it came from, and set `exists = !line.gap` (so today's red "✗ No …" lines auto-land in "What Doesn't Exist").

Persisted docs in localStorage are migrated on load (one-shot v1 → v2 migration keyed on doc shape).

## UI

**Magazine spread (expanded stage)** — replace the bento grid with two stacked cards:

```text
┌─ What Exists Today ──────────────┐
│ • [Patient] No digital resource… │
│ • [TFP]     52% of market…       │
│ + Add line                       │
└──────────────────────────────────┘
┌─ What Doesn't Exist Today ───────┐
│ • [Clinic]  No REI waitlist…     │
│ • [Channel] No HCP co-marketing… │
│ + Add line                       │
└──────────────────────────────────┘
```

Each line shows:
- Tag pill on the left — click to open a picker (existing tags + "Manage tags…").
- Editable text (existing `EditableText`).
- Hover tray: toggle exists/doesn't-exist (moves the line between cards), delete.

"+ Add line" inside each card creates a line pre-set to that card's exists value, tag empty.

**Tag manager** — a small dialog (or popover from any tag picker) to rename, add, delete, recolor tags. Used by tag pickers across all stages.

**Stage card (collapsed)** — keep as-is; the sentiment area is already gone. No tag chips here to keep the strip uncluttered.

## Components

- `src/lib/journey-data.ts` — new types, seed tags, seed `lines` derived from existing rows.
- `src/lib/journey-store.ts` — replace `setCell` with line CRUD (`addLine`, `updateLine`, `deleteLine`, `moveLine`, `setLineExists`, `setLineTag`); add tag CRUD (`addTag`, `renameTag`, `setTagColor`, `deleteTag`). Add migration in `load()` for v1 docs.
- `src/components/journey/JourneyMap.tsx` — swap the lens bento for two `LineList` cards.
- `src/components/journey/LineList.tsx` (new) — renders one card (title, lines, add button).
- `src/components/journey/LineRow.tsx` (new) — tag pill + editable text + hover tray.
- `src/components/journey/TagPicker.tsx` (new) — dropdown listing tags with color swatches and "Manage tags…".
- `src/components/journey/TagManagerDialog.tsx` (new) — add/rename/recolor/delete tags.
- `CellEditor.tsx` — retired (delete) once the new components are in place.

## Out of scope
- Drag-to-reorder lines (use up/down in hover tray instead).
- Per-tag filtering on the spread.
- Bulk re-tagging.
- Changes to the stage strip, masthead, or money-on-fire toggle.

## Notes
- Existing `gap`-flagged lines automatically migrate to "What Doesn't Exist"; everything else lands in "What Exists Today". You can flip any line afterward with the toggle.
- Tag colors reuse the existing token palette so the redesign stays on-theme.