# Make the Lifecycle Ring Readable

Keep the circular lifecycle layout but fix the three issues you flagged: stage order is hard to read, labels are cramped, and editing inside nodes is fiddly.

## 1. Make order obvious

- **"Start here" marker**: render a small chip just outside the ring next to stage 01 (12 o'clock) with the label `Start` and a downward arrow pointing into the node. Persistent — not hover-only.
- **Numbered arrows**: each connector arc gets a small numbered badge at its midpoint (`→ 2`, `→ 3`, …) so the reading order is explicit instead of inferred from clockwise direction.
- **Stronger clockwise cue**: thicken the connector arcs (1.5 → 2.5px), darken from `--border` to `--muted-foreground` at 40%, enlarge arrowheads ~50%.
- **Active-stage highlight on the path**: when a stage is selected, the arc *leading into* it gets `--primary` color so you can see "you are here" within the flow.

## 2. Fix cramped labels

- **Move labels outside the node**: nodes become smaller emoji-only discs (~72px). Title, numeral, and value tag render *outside* the disc, positioned radially (above for top half, below for bottom half, left/right for sides) so each label has room to breathe across 2 lines without truncation.
- **Larger ring container**: increase max width from 640px → 760px so labels around the perimeter don't collide with the page edges; keep `aspect-square` so it still fits one screen.
- **Subtitle preview on hover**: small tooltip on the node shows the subtitle (currently only visible after selecting). No layout cost.

## 3. Make editing not fiddly

- **Nodes become click-to-select only**. Remove inline `EditableText` for emoji and title from the ring node. The only interactive element on a node is "select this stage"; the dropdown menu (⋯) stays for reorder/delete/insert.
- **All editing happens in the magazine spread below**, which already has roomy `EditableText` for emoji, title, subtitle, and the value-tag picker. This matches the mental model: ring = navigation, spread = editing.
- **Hover affordance**: node lifts slightly + ring cursor becomes pointer; tooltip says "Open stage".

## Files

- Edit `src/components/journey/StageLifecycle.tsx`
  - Drop `EditableText` and `TagPicker` from `StageNode`; node becomes a plain emoji disc + hover tooltip + dropdown menu.
  - Compute radial label position per stage (angle → `top/right/bottom/left` placement) and render label block absolutely positioned outside the disc.
  - Add `Start` marker at angle `-π/2` outside the ring.
  - Add numbered badge SVG `<g>` at each arc midpoint.
  - Highlight the arc whose target index === selected stage.
  - Bump container `max-w-[760px]` and adjust `ringRadius` math.
- No edits to `JourneyMap.tsx`, store, or data — props stay the same; the unused `onRename` / `onValueChange` / `onManageValueTags` props on `StageLifecycle` remain accepted but become no-ops on the node (still used by the spread).

## Out of scope

- Different layout shapes (horizontal flow, timeline) — you chose to keep the circle.
- Drag-to-reorder around the ring (menu still has Move back / Move forward).
- Animating the active-arc highlight.
