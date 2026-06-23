## Replace inline editing with a TipTap modal editor

Switch every editable text field in the journey map (stage emoji, stage title, stage subtitle, line text) from inline editing to a centered modal dialog with a minimal TipTap rich text editor.

### Dependencies to add

- `@tiptap/react`
- `@tiptap/starter-kit` (provides bold, italic, bullet list, ordered list, history)
- `@tiptap/extension-underline` (underline is not in StarterKit)
- `@tailwindcss/typography` (provides `prose` classes for rendering HTML)

Wire `@tailwindcss/typography` into `src/styles.css` via `@plugin "@tailwindcss/typography";` (Tailwind v4 plugin syntax).

### New component: `EditableTextModal`

File: `src/components/journey/EditableTextModal.tsx`.

Props (same call sites as today's `EditableText` so swap-in is mechanical):

- `value: string` — stored HTML (or plain text from legacy data)
- `onChange: (v: string) => void`
- `className?: string` — applied to the trigger
- `multiline?: boolean` — kept for API compat; modal supports rich content regardless
- `placeholder?: string`
- `label?: string` — modal title ("Edit line", "Edit stage title", etc.). Defaults to "Edit text".
- `plainText?: boolean` — NEW. When true, the trigger renders text content only (no HTML) and Save stores plain text via `editor.getText()`. Used for stage emoji and any field that must not render markup.

Behavior:

- Trigger: a `<div>` (or `<span>` for inline fields) with `role="button"`, `tabIndex={0}`, click + Enter/Space open the modal. Renders existing value:
  - `plainText` mode: render `value` as text (current emoji behavior preserved).
  - Default mode: render with `dangerouslySetInnerHTML` wrapped in `prose prose-sm max-w-none prose-p:my-0 prose-ul:my-1 prose-ol:my-1` so bullets/bold/italic display correctly inside compact cells.
  - Empty value falls back to muted placeholder text.
- Modal: shadcn `Dialog` (already installed). `DialogContent` provides centered layout, subtle backdrop overlay, Escape to close, click-outside to close — matches the requirements out of the box.
- Inside the modal:
  - `DialogHeader` with `DialogTitle` showing the `label` prop.
  - Toolbar: icon buttons for Bold, Italic, Underline, Bullet list, Numbered list, Clear formatting (lucide icons: `Bold`, `Italic`, `Underline`, `List`, `ListOrdered`, `RemoveFormatting`). Buttons toggle `editor.chain().focus().toggleBold().run()` etc. Active state styled via `editor.isActive('bold')`.
  - TipTap `EditorContent` styled with `prose prose-sm max-w-none min-h-[180px]` inside a bordered container.
  - Footer with Cancel (closes, discards) and Save (calls `onChange(editor.getHTML())` or `editor.getText()` when `plainText`, then closes).
- TipTap setup:
  - `useEditor({ extensions: [StarterKit, Underline], content: value, autofocus: 'end' })`.
  - When the dialog opens, call `editor.commands.setContent(value, false)` and `editor.commands.focus('end')` so prior formatting renders and focus lands in the editor.
  - Destroy editor when dialog closes (or rely on component unmount with `key` on `EditorContent` per-open).
- Keyboard: focus enters editor on open. Tab order follows DOM: editor → toolbar buttons after editor are skipped (toolbar lives above editor, so it's reachable by Shift+Tab); place toolbar buttons before the editor in the DOM so Tab cycles toolbar → editor → Cancel → Save. shadcn Dialog handles focus trap and Escape automatically.

### Apply to call sites

`src/components/journey/RoadmapTable.tsx`:

- Stage emoji (`stage.emoji`): `EditableTextModal` with `plainText` and `label="Edit stage emoji"`.
- Stage title (`stage.title`): `EditableTextModal` with `plainText` and `label="Edit stage title"`.

  Reason: per the user's own warning, the stage title is also used as the drag-handle title attribute and the `aria-label` for the stage options menu (`aria-label={\`Options for stage ${stage.title}\`}`). Stripping markup at render time is brittle; storing the title as plain text avoids the problem entirely while still opening the same modal UI on click. Bold/italic/lists are unnecessary for a stage title.

- Stage subtitle (`stage.subtitle`): rich HTML mode, `label="Edit stage subtitle"`.
- Line text (`line.text`): rich HTML mode, `label="Edit line"`.

`src/components/journey/LineRow.tsx`: same swap for `line.text`.

### Delete old component

Remove `src/components/journey/EditableText.tsx`. Update both import sites to `EditableTextModal`.

### Out of scope

- No store, Supabase, drag-and-drop, or tag changes.
- No migration of existing plain-text values — TipTap accepts plain strings as content and wraps them in `<p>` on first save; existing data continues to render via `prose`.
- Doc title in the page header (`{doc.title}` in `src/routes/_authenticated/index.tsx`) is not currently editable and is unchanged.

### Files touched

- Add: `src/components/journey/EditableTextModal.tsx`
- Delete: `src/components/journey/EditableText.tsx`
- Edit: `src/components/journey/RoadmapTable.tsx`, `src/components/journey/LineRow.tsx`, `src/styles.css`, `package.json` (via `bun add`)