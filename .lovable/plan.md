## Redesign — Editorial Cloud White

Locked tokens: Cloud White palette `#fafbfc / #e8ecf1 / #94a3b8 / #3b82f6`, Space Grotesk (display) + DM Sans (body), Magazine layout.

### Tokens & fonts
- `src/routes/__root.tsx` — add Google Fonts `<link>` for Space Grotesk + DM Sans.
- `src/styles.css` — rewrite `:root` to Cloud White in oklch, register `--font-display` and `--font-sans` in `@theme`, set body to DM Sans, headings/numerals to Space Grotesk. Add `--shadow-card` and a `.dot-bg` utility (faint dot pattern for the page background).

### Header (masthead)
- Sticky, generous vertical space. Thin uppercase eyebrow ("The Fertility Partners · Patient Journey"), oversized editable title in Space Grotesk with tight tracking.
- Toolbar collapses to icon-only ghost buttons with tooltips (Add Lens, Add Stage, Export, Import, Reset).

### Stage strip
- Horizontal scroll-snap row of stage cards. Each card: large display numeral "01"–"11" in Space Grotesk, circular monochrome glyph for the emoji, stage title, one-line subtitle, sentiment pill (emoji + label) at bottom.
- Inactive cards: hairline border, off-white surface, soft hover lift. Active card: accent blue underline + lifted shadow, others dim to 70%.
- Edge fade masks on left/right; left/right chevron buttons appear on hover.

### Expanded magazine spread
- When a stage is selected, a full-width band unfurls below with a subtle dot background.
- Left feature column (~⅓): huge "Stage 07" eyebrow + numeral, title in display type, subtitle, sentiment pill, quiet Collapse link.
- Right column (~⅔): 2-col bento of lens cards. Lens card = small uppercase eyebrow, hairline border, generous padding, lines rendered as chip rows with a small dot. Gap lines become a soft red-tinted pill with an alert icon — never raw red body text.

### Micro-interactions
- `EditableText`: hover shows a thin dotted underline; focus state uses a soft ring. No bg fill on hover.
- `CellEditor`: per-line controls live in a faint right-side tray that fades in on hover. Add-line is a discreet "+ Add" link below the list.
- Transitions ≤200ms ease-out for expand/collapse and active stage.

### Files
- `src/styles.css`
- `src/routes/__root.tsx`
- `src/components/journey/JourneyMap.tsx`
- `src/components/journey/CellEditor.tsx`
- `src/components/journey/EditableText.tsx`

### Out of scope
- Data model, editing flows, persistence.
- Dark mode visual tuning.
- New libraries (no Motion, no Magic UI).
