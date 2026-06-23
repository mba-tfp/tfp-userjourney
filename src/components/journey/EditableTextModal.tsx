import { useEffect, useState, type KeyboardEvent, type MouseEvent } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  RemoveFormatting,
  Underline as UnderlineIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
  label?: string;
  /** When true, store/render as plain text (no HTML markup). */
  plainText?: boolean;
};

const PROSE_CLASSES =
  "prose prose-sm max-w-none prose-p:my-0 prose-ul:my-1 prose-ol:my-1 prose-li:my-0";

export function EditableTextModal({
  value,
  onChange,
  className,
  placeholder,
  label = "Edit text",
  plainText,
}: Props) {
  const [open, setOpen] = useState(false);

  const openModal = () => setOpen(true);
  const onTriggerKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openModal();
    }
  };
  const stop = (e: MouseEvent) => e.stopPropagation();

  const isEmpty = !value || value === "<p></p>";

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          stop(e);
          openModal();
        }}
        onKeyDown={onTriggerKey}
        className={cn(
          "cursor-text rounded transition-colors hover-underline",
          isEmpty && "text-muted-foreground italic",
          !plainText && !isEmpty && PROSE_CLASSES,
          className,
        )}
        {...(plainText || isEmpty
          ? { children: isEmpty ? placeholder || "Click to edit" : value }
          : { dangerouslySetInnerHTML: { __html: value } })}
      />
      {open && (
        <EditorDialog
          open={open}
          onOpenChange={setOpen}
          initialValue={value}
          label={label}
          plainText={!!plainText}
          onSave={(next) => {
            if (next !== value) onChange(next);
          }}
        />
      )}
    </>
  );
}

function EditorDialog({
  open,
  onOpenChange,
  initialValue,
  label,
  plainText,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialValue: string;
  label: string;
  plainText: boolean;
  onSave: (next: string) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: initialValue || "",
    autofocus: "end",
    editorProps: {
      attributes: {
        class: cn(
          PROSE_CLASSES,
          "min-h-[180px] w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring/40",
        ),
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(initialValue || "", { emitUpdate: false });
    editor.commands.focus("end");
  }, [editor, initialValue]);

  const handleSave = () => {
    if (!editor) return;
    const next = plainText ? editor.getText() : editor.getHTML();
    onSave(next);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onOpenAutoFocus={(e) => {
          // Let TipTap autofocus the editor instead of the close button.
          e.preventDefault();
          editor?.commands.focus("end");
        }}
      >
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>

        {!plainText && editor && <Toolbar editor={editor} />}

        <EditorContent editor={editor} />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Toolbar({ editor }: { editor: NonNullable<ReturnType<typeof useEditor>> }) {
  const btn = (active: boolean) =>
    cn(
      "inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      active && "bg-secondary text-foreground border-border",
    );

  return (
    <div className="flex items-center gap-1 border-b border-border pb-2">
      <button
        type="button"
        aria-label="Bold"
        title="Bold"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={btn(editor.isActive("bold"))}
      >
        <Bold className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Italic"
        title="Italic"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btn(editor.isActive("italic"))}
      >
        <Italic className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Underline"
        title="Underline"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={btn(editor.isActive("underline"))}
      >
        <UnderlineIcon className="h-4 w-4" />
      </button>
      <span className="mx-1 h-5 w-px bg-border" />
      <button
        type="button"
        aria-label="Bullet list"
        title="Bullet list"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btn(editor.isActive("bulletList"))}
      >
        <List className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Numbered list"
        title="Numbered list"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={btn(editor.isActive("orderedList"))}
      >
        <ListOrdered className="h-4 w-4" />
      </button>
      <span className="mx-1 h-5 w-px bg-border" />
      <button
        type="button"
        aria-label="Clear formatting"
        title="Clear formatting"
        onClick={() =>
          editor.chain().focus().clearNodes().unsetAllMarks().run()
        }
        className={btn(false)}
      >
        <RemoveFormatting className="h-4 w-4" />
      </button>
    </div>
  );
}