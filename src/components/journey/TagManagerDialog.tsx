import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EditableText } from "./EditableText";
import { TAG_COLORS, type Tag, type TagColor } from "@/lib/journey-data";
import { cn } from "@/lib/utils";
import { TAG_DOT } from "./tag-colors";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: Tag[];
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onSetColor: (id: string, color: TagColor) => void;
  onDelete: (id: string) => void;
};

export function TagManagerDialog({
  open,
  onOpenChange,
  tags,
  onAdd,
  onRename,
  onSetColor,
  onDelete,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage tags</DialogTitle>
          <DialogDescription>
            Tags label every line as Patient, Clinic, TFP, Channel, or whatever you need.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {tags.map((t) => (
            <div
              key={t.id}
              className="group flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2"
            >
              <ColorSwatch
                color={t.color as TagColor}
                onChange={(c) => onSetColor(t.id, c)}
              />
              <EditableText
                value={t.name}
                onChange={(name) => onRename(t.id, name)}
                className="flex-1 text-sm font-medium"
              />
              <button
                title="Delete tag"
                onClick={() => {
                  if (confirm(`Delete tag "${t.name}"? Lines using it will become untagged.`)) {
                    onDelete(t.id);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground hover:text-destructive transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {tags.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No tags yet.</p>
          )}
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 self-start rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition"
        >
          <Plus className="h-3.5 w-3.5" /> Add tag
        </button>
      </DialogContent>
    </Dialog>
  );
}

function ColorSwatch({
  color,
  onChange,
}: {
  color: TagColor;
  onChange: (c: TagColor) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {TAG_COLORS.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          aria-label={c}
          className={cn(
            "h-4 w-4 rounded-full transition",
            TAG_DOT[c],
            color === c ? "ring-2 ring-offset-1 ring-foreground/60" : "opacity-60 hover:opacity-100",
          )}
        />
      ))}
    </div>
  );
}