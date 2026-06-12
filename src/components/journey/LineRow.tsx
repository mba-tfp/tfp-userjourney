import { ArrowLeftRight, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { EditableText } from "./EditableText";
import { TagPicker } from "./TagPicker";
import type { Line, Tag } from "@/lib/journey-data";
import { cn } from "@/lib/utils";

type Props = {
  line: Line;
  tags: Tag[];
  onChange: (patch: Partial<Line>) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
  onToggleExists: () => void;
  onManageTags: () => void;
  isGap?: boolean;
};

export function LineRow({
  line,
  tags,
  onChange,
  onMove,
  onDelete,
  onToggleExists,
  onManageTags,
  isGap,
}: Props) {
  return (
    <div
      className={cn(
        "group/line relative flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
        isGap
          ? "border-destructive/20 bg-destructive/[0.04]"
          : "border-transparent bg-secondary/40 hover:border-border",
      )}
    >
      <div className="pt-0.5">
        <TagPicker
          tags={tags}
          value={line.tagId}
          onChange={(tagId) => onChange({ tagId })}
          onManage={onManageTags}
        />
      </div>
      <EditableText
        multiline
        value={line.text}
        onChange={(text) => onChange({ text })}
        placeholder="Add a note…"
        className="flex-1 min-w-0 text-[13.5px] leading-relaxed"
      />
      <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 opacity-0 group-hover/line:opacity-100 transition">
        <button
          title={isGap ? "Move to 'Exists today'" : "Move to 'Doesn't exist'"}
          onClick={onToggleExists}
          className="rounded p-1 text-muted-foreground hover:bg-background/80 hover:text-foreground"
        >
          <ArrowLeftRight className="h-3 w-3" />
        </button>
        <button
          title="Move up"
          onClick={() => onMove(-1)}
          className="rounded p-1 text-muted-foreground hover:bg-background/80 hover:text-foreground"
        >
          <ChevronUp className="h-3 w-3" />
        </button>
        <button
          title="Move down"
          onClick={() => onMove(1)}
          className="rounded p-1 text-muted-foreground hover:bg-background/80 hover:text-foreground"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
        <button
          title="Delete line"
          onClick={onDelete}
          className="rounded p-1 text-muted-foreground hover:bg-background/80 hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}