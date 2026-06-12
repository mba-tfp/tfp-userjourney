## Otto Multi-lenses Journey — Interactive Editable Map

Build a web app that renders the journey grid from the screenshot and lets you edit every cell, add/remove stages and lenses, and persist changes.

### Layout
- Header: editable title ("otto Multi-lenses Journey") + Fertility Partners logo placeholder.
- Grid: rows = lenses (Stage, Sentiment, What Exists Today, Patient, Clinic, TFP, Channel), columns = 11 stages (Stage 1–11). Sticky first column with row labels; horizontal scroll for stages.
- Each stage column header shows: "Stage N", emoji/icon, title, short subtitle.
- Each cell is click-to-edit (inline textarea). Sentiment row has emoji + label. "What Exists Today" supports checkmark (✓) / cross (✗) lines with red highlight for gaps.

### Editing
- Click any text to edit inline; blur or Enter to save.
- Per-stage controls: rename, change emoji, delete stage, insert stage left/right, reorder (drag handle).
- Per-row (lens) controls: rename lens, add lens, delete lens, reorder.
- Cell formatting: support multi-line; toggle a "gap" flag that renders the text red (matches the red X items in the source).
- Toolbar: Add Stage, Add Lens, Reset to default, Export JSON, Import JSON.

### Persistence
- Store the whole document in `localStorage` (single-user, no backend). Auto-save on every change.
- Seed with the exact content from the uploaded screenshot so it opens looking like the source.

### Tech / Files
- Single TanStack route `/` renders the editor.
- `src/lib/journey-data.ts` — TypeScript types + seed data transcribed from the image.
- `src/lib/journey-store.ts` — small zustand-style hook over `useState` + localStorage (no new deps; plain React).
- `src/components/journey/JourneyMap.tsx` — grid renderer.
- `src/components/journey/EditableText.tsx` — click-to-edit primitive.
- `src/components/journey/StageHeader.tsx`, `CellEditor.tsx`, `Toolbar.tsx`.
- Use existing shadcn `button`, `input`, `textarea`, `dropdown-menu`, `dialog` for controls. Drag-reorder via simple HTML5 drag handlers (no new library).

### Out of scope (unless asked)
- Multi-user sync / Lovable Cloud backend.
- Rich text, images per cell, comments/history, PDF export.
- Auth.

Want me to add any of the out-of-scope items (e.g. Cloud-backed sharing, export to PDF/PNG) before I build?
