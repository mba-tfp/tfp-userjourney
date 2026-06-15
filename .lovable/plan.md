## Goal

A third view at `/quadrant` that plots every **gap** line on a faux-3D isometric cube with axes **Impact (X) · Urgency (Y) · Effort (Z, depth)**. Same edit model as the other views (auto-saved, undo/redo, drag to reposition, inline edit).

## Data model

Extend `Line` (in `src/lib/journey-data.ts`) with three optional numeric scores, 1–5:

```ts
type Line = {
  // …existing
  impact?: number;   // 1–5
  urgency?: number;  // 1–5
  effort?: number;   // 1–5
};
```

`normalize()` in `journey-store.ts` clamps to 1–5 and auto-seeds any missing values:

- **urgency** — gap lines start at 4 if the stage is `onFire`, else 3. Exists lines default 2.
- **impact** — start at 4 if the line's stage is `onFire`, else 3.
- **effort** — default 3 (neutral).

Scores persist via the existing debounced save; no schema/migration needed.

New store action: `setLineScores(stageId, lineId, patch: { impact?, urgency?, effort? })` (clamps 1–5, goes through `update()` → undo/redo works automatically).

## Route & navigation

- New file `src/routes/_authenticated/quadrant.tsx` → `/quadrant`.
- Add a "Quadrant" link to the existing nav (Back-to-map / Conclusion strip) on both `/` (JourneyMap) and `/conclusion`, plus a "Back to map" link on the quadrant page.

## Faux-3D isometric grid (`src/components/journey/QuadrantBoard.tsx`)

Pure SVG, no Three.js. One large `<svg>` viewBox; isometric projection matrix:

```text
screenX = originX + (impact - urgency) * tileX
screenY = originY + (impact + urgency) * tileY - effort * depthY
```

Where `tileX ≈ 60`, `tileY ≈ 30`, `depthY ≈ 70`. Result: classic 30° isometric grid with vertical lift for effort.

Elements rendered (back-to-front):

1. **Floor grid** — 5×5 diamond, axis labels "Low Impact → High Impact" along the front-right edge and "Low Urgency → High Urgency" along the front-left edge.
2. **Effort pillars** — a faint vertical line from each dot down to the floor so depth reads clearly.
3. **Dots** — one circle per gap line. Color = stage's value tag (reuses `TAG_DOT`). Radius scales slightly with `impact + urgency` so high-priority pops. On-fire stages get a red ring.
4. **Hover/active card** — floating card to the right of the cube shows: stage breadcrumb, line text, the three sliders, and an "Open in roadmap" link that navigates `/conclusion` with the line scrolled into view (querystring hash, best-effort).

### Interactions

- **Click a dot** → selects it, opens the side panel (sliders + text).
- **Drag a dot** — converts pointer delta back through the inverse projection to update impact + urgency live (effort stays unchanged during planar drag). Hold `Shift` while dragging vertically to change effort. dnd-kit not needed; raw pointer events on the SVG.
- **Sliders** in the side panel call `setLineScores` (debounced via the existing store save).
- **Filter strip** on top: stage chips (multi-select) + value-tag chips. Defaults to all on.
- **Legend** explaining axes + dot color + size.

### Collision handling

Quick deterministic jitter: if two dots project to within 14px of each other, offset later ones by `(hash(lineId) % 8 - 4, hash(lineId+1) % 8 - 4)` so they don't fully overlap. No physics needed.

## Files

- **edit** `src/lib/journey-data.ts` — extend `Line` type with optional `impact/urgency/effort`.
- **edit** `src/lib/journey-store.ts` — auto-seed in `normalize`, add `setLineScores` action.
- **add** `src/components/journey/QuadrantBoard.tsx` — the SVG isometric board + drag + side panel.
- **add** `src/routes/_authenticated/quadrant.tsx` — header (title, filters, undo/redo, sign out), renders `QuadrantBoard`.
- **edit** `src/components/journey/JourneyMap.tsx` and `src/routes/_authenticated/conclusion.tsx` — add a "Quadrant" link next to the existing nav buttons.

## Out of scope

No new tables, no AI scoring. Effort manipulation by dragging is shift-modified; primary drag is planar (impact × urgency) to keep it readable.
